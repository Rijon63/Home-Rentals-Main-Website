import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { Tooltip } from "react-tooltip";
import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip as ChartTooltip, Legend } from "chart.js";
import { toast } from "react-toastify";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import ChatModal from "./ChatModal";
import ScheduleViewing from "./ScheduleViewing";
import EsewaPayment from "./EsewaPayment";
import {
  BedDouble,
  Bath,
  Maximize,
  ArrowLeft,
  Phone,
  Calendar,
  MapPin,
  Loader,
  Share2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Compass,
  MessageCircle,
  Calculator,
  Heart,
  BookOpen,
  X,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Star,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { Backendurl } from "../../App";

// Register Chart.js components
ChartJS.register(ArcElement, ChartTooltip, Legend);

// Fix for Leaflet default marker icon issue in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1..4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const PROPERTY_TYPES = ['Entire Property', 'Apartment/Flat', 'Single Room', 'Homestay'];
const TYPE_COLORS = {
  'Entire Property': 'bg-blue-100 text-blue-800',
  'Apartment/Flat': 'bg-green-100 text-green-800',
  'Single Room': 'bg-yellow-100 text-yellow-800',
  'Homestay': 'bg-purple-100 text-purple-800',
};

// Utility function to convert decimal degrees to DMS
const decimalToDMS = (decimal, isLatitude) => {
  const absolute = Math.abs(decimal);
  const degrees = Math.floor(absolute);
  const minutesFloat = (absolute - degrees) * 60;
  const minutes = Math.floor(minutesFloat);
  const seconds = ((minutesFloat - minutes) * 60).toFixed(1);
  const direction = isLatitude
    ? decimal >= 0 ? 'N' : 'S'
    : decimal >= 0 ? 'E' : 'W';
  return `${degrees}°${minutes}'${seconds}"${direction}`;
};

const PropertyDetails = () => {
  const { id } = useParams();
  const { user, isLoggedIn, loading: authLoading } = useAuth();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showSchedule, setShowSchedule] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showBooking, setShowBooking] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [activeImage, setActiveImage] = useState(0);
  const [copySuccess, setCopySuccess] = useState(false);
  const [predictedPrice, setPredictedPrice] = useState(null);
  const [predictLoading, setPredictLoading] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [bookingForm, setBookingForm] = useState({
    startDate: "",
    endDate: "",
    message: "",
  });
  const [isTaxDetailsOpen, setIsTaxDetailsOpen] = useState(true);
  const navigate = useNavigate();

  const parseAmenities = (amenities) => {
    if (!amenities) return [];
    if (Array.isArray(amenities)) return amenities;
    if (typeof amenities === "string") {
      try {
        const parsed = JSON.parse(amenities.replace(/'/g, '"'));
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        return amenities.split(",").map((item) => item.trim()).filter((item) => item);
      }
    }
    return [];
  };

  const calculateTaxDetails = (price, availability) => {
    console.log(`Calculating tax for availability: "${availability}"`);
    const transferTaxRate = 0.045;
    const registrationFeeRate = 0.01;
    const localDevelopmentFeeRate = 0.005;
    const rentalTaxRate = 0.13;

    const avail = (availability || "").toLowerCase();

    if (avail.includes("sale") || avail.includes("buy")) {
      const transferTax = price * transferTaxRate;
      const registrationFee = price * registrationFeeRate;
      const localDevelopmentFee = price * localDevelopmentFeeRate;
      const totalTax = transferTax + registrationFee + localDevelopmentFee;

      return {
        totalTax,
        breakdown: [
          { name: "Municipal Transfer Tax", amount: transferTax, rate: "4.5%", tooltip: "A 4.5% tax levied by the municipality on property sales." },
          { name: "Registration Fee", amount: registrationFee, rate: "1.0%", tooltip: "A 1% fee for registering the property transfer." },
          { name: "Local Development Fee", amount: localDevelopmentFee, rate: "0.5%", tooltip: "A 0.5% fee for local infrastructure development." },
        ],
      };
    } else if (avail.includes("rent")) {
      const rentalTax = price * rentalTaxRate;
      const totalTax = rentalTax;

      return {
        totalTax,
        breakdown: [
          { name: "Rental Income Tax", amount: rentalTax, rate: "13%", tooltip: "A 13% tax applied to rental income." },
        ],
      };
    } else {
      return {
        totalTax: 0,
        breakdown: [
          { name: "Municipal Transfer Tax", amount: 0, rate: "0%", tooltip: "Not applicable for this property type." },
          { name: "Registration Fee", amount: 0, rate: "0%", tooltip: "Not applicable for this property type." },
          { name: "Local Development Fee", amount: 0, rate: "0%", tooltip: "Not applicable for this property type." },
        ],
      };
    }
  };

  useEffect(() => {
    const fetchPropertyAndMessages = async () => {
      try {
        setLoading(true);
        if (!isLoggedIn || !user?._id) {
          throw new Error("Please log in to view this page");
        }
        if (!id) {
          throw new Error("Property ID is missing");
        }

        const token = localStorage.getItem("token");
        const [propertyResponse, messagesResponse, favoritesResponse] = await Promise.all([
          axios.get(`${Backendurl}/api/products/single/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${Backendurl}/api/messages/${id}/${user._id}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${Backendurl}/api/dashboard/favorites`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (propertyResponse.data.success) {
          const propertyData = propertyResponse.data.property;
          const requiredFields = [
            "title",
            "price",
            "bedrooms",
            "bathrooms",
            "type",
            "availability",
            "description",
            "amenities",
            "phone",
            "province",
            "district",
            "municipality",
            "latitude",
            "longitude",
          ];
          const missingFields = requiredFields.filter(
            (field) => !propertyData[field] && propertyData[field] !== 0
          );
          if (missingFields.length > 0) {
            toast.warn(`Some property details are incomplete: ${missingFields.join(", ")}`);
          }

          const location = [
            propertyData.streetAddress,
            propertyData.ward ? `Ward ${propertyData.ward}` : null,
            propertyData.municipality,
            propertyData.district,
            propertyData.province,
          ].filter(Boolean).join(", ");

          const processedProperty = {
            ...propertyData,
            amenities: parseAmenities(propertyData.amenities),
            price: Number(propertyData.price) || 10000000,
            bedrooms: Number(propertyData.bedrooms) || 1,
            bathrooms: Number(propertyData.bathrooms) || 1,
            squareFeet: Number(propertyData.area) || 1000,
            builtArea: Number(propertyData.builtArea) || 800,
            availability: propertyData.availability || "For Sale",
            location: location || "Kathmandu, Nepal",
            title: propertyData.title || "Untitled Property",
            image: Array.isArray(propertyData.image) && propertyData.image.length > 0 ? propertyData.image : ["/placeholder-image.jpg"],
            phone: propertyData.phone || "N/A",
            description: propertyData.description || "No description available",
            type: PROPERTY_TYPES.includes(propertyData.type) ? propertyData.type : "N/A",
            ownerId: propertyData.ownerId || user._id,
            floors: Number(propertyData.floors) || 1,
            roadWidth: Number(propertyData.roadWidth) || 10,
            propertyFacing: propertyData.propertyFacing || "Unknown",
            yearBuilt: Number(propertyData.yearBuilt) || 2010,
            nearbyLandmark: propertyData.nearbyLandmark || "N/A",
            roadCondition: propertyData.roadCondition || "N/A",
            securityDeposit: Number(propertyData.securityDeposit) || null,
            rentalPeriod: propertyData.rentalPeriod || null,
            landOwnershipType: propertyData.landOwnershipType || "N/A",
            electricityConnection: propertyData.electricityConnection ? "Yes" : "No",
            waterSupply: propertyData.waterSupply || "N/A",
            sewageSystem: propertyData.sewageSystem || "N/A",
            gasConnection: propertyData.gasConnection || "N/A",
            renovationYear: Number(propertyData.renovationYear) || null,
            rating: Number(propertyData.rating) || 0,
            latitude: Number(propertyData.latitude) || 27.7172, // Default to Kathmandu coordinates
            longitude: Number(propertyData.longitude) || 85.3240,
          };
          console.log(`Loaded property availability: "${processedProperty.availability}"`);
          setProperty(processedProperty);
          setError(null);
        } else {
          throw new Error(propertyResponse.data.message || "Failed to load property details.");
        }

        if (messagesResponse.data.success) {
          const unreadCount = messagesResponse.data.messages.filter(
            (msg) => msg.recipient.toString() === user._id && !msg.read
          ).length;
          setUnreadMessages(unreadCount);
        } else {
          throw new Error(messagesResponse.data.message || "Failed to fetch messages.");
        }

        if (favoritesResponse.data.success) {
          setIsFavorite(favoritesResponse.data.favorites.some((fav) => fav._id.toString() === id));
        } else {
          throw new Error(favoritesResponse.data.message || "Failed to fetch favorites.");
        }
      } catch (err) {
        setError(err.message || "Failed to load data. Please try again.");
        if (err.response?.status === 401 || err.response?.status === 403) {
          toast.error("Session expired or unauthorized. Please log in again.");
          localStorage.removeItem("token");
          navigate("/login");
        } else if (err.response?.status === 404) {
          setError("Property not found.");
        }
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      fetchPropertyAndMessages();
    }
  }, [id, user, isLoggedIn, authLoading, navigate]);

  useEffect(() => {
    window.scrollTo(0, 0);
    setActiveImage(0);
  }, [id]);

  const handleKeyNavigation = useCallback(
    (e) => {
      if (!property?.image?.length) return;
      if (e.key === "ArrowLeft") {
        setActiveImage((prev) => (prev === 0 ? property.image.length - 1 : prev - 1));
      } else if (e.key === "ArrowRight") {
        setActiveImage((prev) => (prev === property.image.length - 1 ? 0 : prev + 1));
      } else if (e.key === "Escape" && (showSchedule || showChat || showBooking || showPaymentForm)) {
        setShowSchedule(false);
        setShowChat(false);
        setShowBooking(false);
        setShowPaymentForm(false);
      }
    },
    [property?.image?.length, showSchedule, showChat, showBooking, showPaymentForm]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyNavigation);
    return () => window.removeEventListener("keydown", handleKeyNavigation);
  }, [handleKeyNavigation]);

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: property.title,
          text: `Check out this ${property.type}: ${property.title}`,
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
        toast.success("Link copied to clipboard!");
      }
    } catch (error) {
      toast.error("Failed to share property.");
    }
  };

  const handlePredictPrice = async () => {
    setPredictLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token found. Please log in.");
      }

      const requestBody = {
        city: property.municipality || "Kathmandu",
        bedroom_count: property.bedrooms || 1,
        bathroom_count: property.bathrooms || 1,
        area_sqft: property.squareFeet || 1000,
        build_area_sqft: property.builtArea || 800,
        floors: property.floors || 1,
        road_width: property.roadWidth || 10,
        face: property.propertyFacing || "Unknown",
        year: property.yearBuilt || 2010,
        amenities: Array.isArray(property.amenities) ? JSON.stringify(property.amenities) : "[]",
        listing_type: property.availability || "For Sale",
      };

      const response = await axios.post(
        `${Backendurl}/api/products/predict-price`,
        requestBody,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        setPredictedPrice(response.data.price);
        toast.success("Price predicted successfully!");
      } else {
        throw new Error(response.data.message || "Failed to predict price.");
      }
    } catch (err) {
      setError(err.message || "Failed to predict price. Ensure all required fields are provided.");
      toast.error(
        err.message.includes("model file") || err.message.includes("feeds")
          ? "Prediction model error. Please contact support."
          : "Failed to predict price. Check input data."
      );
      if (err.response?.status === 401 || err.response?.status === 403) {
        toast.error("Session expired or unauthorized. Please log in again.");
        localStorage.removeItem("token");
        navigate("/login");
      }
    } finally {
      setPredictLoading(false);
    }
  };

  const handleFavoriteToggle = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Please log in to add to favorites.");
        navigate("/login");
        return;
      }

      const endpoint = isFavorite ? "/dashboard/favorites/remove" : "/dashboard/favorites/add";
      const response = await axios.post(
        `${Backendurl}/api${endpoint}`,
        { propertyId: id },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        setIsFavorite(!isFavorite);
        toast.success(isFavorite ? "Removed from favorites" : "Added to favorites");
      } else {
        throw new Error(response.data.message || "Failed to update favorites.");
      }
    } catch (err) {
      toast.error(err.message || "Failed to update favorites.");
      if (err.response?.status === 401 || err.response?.status === 403) {
        toast.error("Session expired or unauthorized. Please log in again.");
        localStorage.removeItem("token");
        navigate("/login");
      }
    }
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Please log in to make a booking.");
        navigate("/login");
        return;
      }

      if (!bookingForm.startDate || !bookingForm.endDate) {
        toast.error("Please select both start/meeting and end/follow-up dates.");
        return;
      }

      const startDate = new Date(bookingForm.startDate);
      const endDate = new Date(bookingForm.endDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Normalize to midnight for comparison

      if (startDate < today) {
        toast.error("Start/Meeting date cannot be in the past.");
        return;
      }

      if (endDate <= startDate) {
        toast.error("End/Follow-up date must be after the start/meeting date.");
        return;
      }

      const response = await axios.post(
        `${Backendurl}/api/dashboard/bookings/add`,
        {
          propertyId: id,
          startDate: bookingForm.startDate,
          endDate: bookingForm.endDate,
          message: bookingForm.message,
          availability: property.availability,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        toast.success(property.availability === "For Sale" ? "Reservation created successfully!" : "Booking created successfully!");
        setShowBooking(false);
        setBookingForm({ startDate: "", endDate: "", message: "" });
        setShowPaymentForm(true); // Open payment form after successful booking
      } else {
        throw new Error(response.data.message || "Failed to create booking.");
      }
    } catch (err) {
      toast.error(err.message || "Failed to create booking.");
      if (err.response?.status === 401 || err.response?.status === 403) {
        toast.error("Session expired or unauthorized. Please log in again.");
        localStorage.removeItem("token");
        navigate("/login");
      }
    }
  };

  const handleQuickFilter = (filter) => {
    const queryParams = new URLSearchParams({
      propertyType: filter.type || '',
      priceMin: filter.priceMin || '',
      priceMax: filter.priceMax || '',
      amenities: filter.amenities ? filter.amenities.join(',') : '',
      location: property.municipality || '',
    }).toString();
    navigate(`/properties?${queryParams}`);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-8">
            <div className="w-32 h-8 bg-gray-200 rounded-lg animate-pulse"></div>
            <div className="w-24 h-8 bg-gray-200 rounded-lg animate-pulse"></div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="relative h-[600px] bg-gray-200 rounded-t-2xl mb-8 animate-pulse">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/50 rounded-full"></div>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/50 rounded-full"></div>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-24 h-8 bg-black/20 rounded-full"></div>
            </div>
            <div className="p-8">
              <div className="flex justify-between items-start mb-6">
                <div className="space-y-3 w-full max-w-md">
                  <div className="h-10 bg-gray-200 rounded-lg w-3/4 animate-pulse"></div>
                  <div className="h-6 bg-gray-200 rounded-lg w-1/2 animate-pulse"></div>
                </div>
                <div className="w-12 h-12 bg-gray-200 rounded-full animate-pulse"></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="h-32 bg-blue-50 rounded-lg animate-pulse"></div>
                  <div className="grid grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-24 bg-gray-100 rounded-lg animate-pulse"></div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <div className="h-7 bg-gray-200 rounded-lg w-1/3 animate-pulse"></div>
                    <div className="h-6 bg-gray-200 rounded-lg w-1/2 animate-pulse"></div>
                  </div>
                  <div className="space-y-3">
                    <div className="h-12 bg-blue-200 rounded-lg animate-pulse"></div>
                    <div className="h-12 bg-green-200 rounded-lg animate-pulse"></div>
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="h-7 bg-gray-200 rounded-lg w-1/3 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded-lg w-full animate-pulse mt-2"></div>
                    <div className="h-4 bg-gray-200 rounded-lg w-full animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded-lg w-4/5 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded-lg w-full animate-pulse"></div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-7 bg-gray-200 rounded-lg w-1/3 animate-pulse"></div>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-6 bg-gray-200 rounded-lg animate-pulse"></div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-8 p-6 bg-blue-50 rounded-2xl animate-pulse">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 bg-gray-300 rounded-full"></div>
              <div className="h-7 bg-gray-300 rounded-lg w-1/6"></div>
            </div>
            <div className="h-5 bg-gray-300 rounded-lg w-4/5 mb-4"></div>
            <div className="h-6 bg-gray-300 rounded-lg w-1/4"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100">
        <div className="text-center p-6 bg-white rounded-2xl shadow-lg">
          <p className="text-red-500 text-lg font-medium mb-4">{error}</p>
          <Link
            to="/properties"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Properties
          </Link>
        </div>
      </div>
    );
  }

  if (!property || !property.title || !property.price) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100">
        <div className="text-center p-6 bg-white rounded-2xl shadow-lg">
          <p className="text-yellow-500 text-lg font-medium mb-4">
            Incomplete property data. Please check the listing or contact support.
          </p>
          <Link
            to="/properties"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Properties
          </Link>
        </div>
      </div>
    );
  }

  const taxDetails = calculateTaxDetails(property.price, property.availability);

  const chartData = {
    labels: taxDetails.breakdown.map((tax) => tax.name),
    datasets: [
      {
        data: taxDetails.breakdown.map((tax) => tax.amount),
        backgroundColor: ["#3B82F6", "#10B981", "#F59E0B", "#EF4444"],
        borderColor: ["#fff"],
        borderWidth: 2,
      },
    ],
  };

  const chartOptions = {
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          font: {
            size: 12,
          },
          color: "#374151",
        },
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.label || "";
            const value = context.raw || 0;
            return `${label}: NPR ${value.toLocaleString("en-NP")}`;
          },
        },
      },
    },
    maintainAspectRatio: false,
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 pt-16"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <nav className="flex items-center justify-between mb-8">
          <Link
            to="/properties"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 transition-colors duration-200"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Properties
          </Link>
          <div className="flex items-center gap-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleFavoriteToggle}
              className="p-2 rounded-full bg-white shadow-sm hover:bg-gray-100 transition-all duration-200"
            >
              <Heart className={`w-6 h-6 ${isFavorite ? "text-red-500 fill-red-500" : "text-gray-600"}`} />
            </motion.button>
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white shadow-sm hover:bg-gray-100 transition-all duration-200 relative"
            >
              {copySuccess ? (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-green-600 flex items-center gap-2"
                >
                  <Copy className="w-5 h-5" />
                  Copied!
                </motion.span>
              ) : (
                <>
                  <Share2 className="w-5 h-5" />
                  Share
                </>
              )}
            </button>
          </div>
        </nav>

        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="p-6">
            <div className="flex flex-wrap gap-2 mb-4">
              <button
                onClick={() => handleQuickFilter({ type: property.type })}
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-all duration-200 text-sm"
              >
                Other {property.type}s in {property.municipality}
              </button>
              <button
                onClick={() =>
                  handleQuickFilter({
                    priceMin: Math.max(0, property.price - 100000),
                    priceMax: property.price + 100000,
                  })
                }
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-all duration-200 text-sm"
              >
                Similar Price Range
              </button>
              <button
                onClick={() => handleQuickFilter({ amenities: property.amenities.slice(0, 2) })}
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-all duration-200 text-sm"
              >
                Similar Amenities
              </button>
            </div>
          </div>
          <div className="relative h-[600px] bg-gray-100 rounded-t-2xl overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.img
                key={activeImage}
                src={property.image[activeImage] || "/placeholder-image.jpg"}
                alt={`${property.title} - View ${activeImage + 1}`}
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.4 }}
                className="w-full h-full object-cover"
              />
            </AnimatePresence>
            {property.image && property.image.length > 1 && (
              <>
                <button
                  onClick={() =>
                    setActiveImage((prev) => (prev === 0 ? property.image.length - 1 : prev - 1))
                  }
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white transition-all duration-200 shadow-sm"
                >
                  <ChevronLeft className="w-6 h-6 text-gray-600" />
                </button>
                <button
                  onClick={() =>
                    setActiveImage((prev) => (prev === property.image.length - 1 ? 0 : prev + 1))
                  }
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white transition-all duration-200 shadow-sm"
                >
                  <ChevronRight className="w-6 h-6 text-gray-600" />
                </button>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
                  {property.image.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setActiveImage(index)}
                      className={`w-2 h-2 rounded-full ${
                        activeImage === index ? "bg-white" : "bg-white/50"
                      } transition-all duration-200`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="p-6 sm:p-8">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{property.title}</h1>
                <div className="flex items-center gap-4">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${TYPE_COLORS[property.type] || 'bg-gray-100 text-gray-800'}`}>
                    {property.type}
                  </span>
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-5 h-5 ${i < Math.round(property.rating) ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`}
                      />
                    ))}
                    <span className="ml-2 text-sm text-gray-600">({property.rating.toFixed(1)})</span>
                  </div>
                </div>
                <div className="flex items-center text-gray-500 mt-2">
                  <MapPin className="w-5 h-5 mr-2" />
                  <span className="truncate">{property.location}</span>
                </div>
              </div>
              <button
                onClick={handleShare}
                className="p-2 rounded-full bg-white shadow-sm hover:bg-gray-100 transition-all duration-200"
              >
                <Share2 className="w-6 h-6 text-gray-600" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
              <div>
                <div className="bg-blue-50 rounded-lg p-6 mb-6">
                  <p className="text-3xl font-bold text-blue-600 mb-2">
                    NPR {property.price.toLocaleString("en-NP")}
                  </p>
                  <p className="text-gray-500">Available for {property.availability}</p>
                  {property.availability === "For Rent" && (
                    <>
                      <p className="text-gray-600 mt-2">
                        <span className="font-medium">Security Deposit:</span>{" "}
                        {property.securityDeposit ? `NPR ${property.securityDeposit.toLocaleString("en-NP")}` : "N/A"}
                      </p>
                      <p className="text-gray-600">
                        <span className="font-medium">Rental Period:</span> {property.rentalPeriod || "N/A"}
                      </p>
                    </>
                  )}
                  {predictedPrice && (
                    <motion.p
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-sm text-gray-600 mt-2"
                    >
                      Predicted Price: NPR {predictedPrice.toLocaleString("en-NP")}
                      {predictedPrice > property.price ? (
                        <span className="text-green-500 ml-2">(Below Market)</span>
                      ) : (
                        <span className="text-red-500 ml-2">(Above Market)</span>
                      )}
                    </motion.p>
                  )}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handlePredictPrice}
                    disabled={predictLoading || property.price === 0}
                    className="mt-4 w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 disabled:bg-blue-400"
                  >
                    {predictLoading ? (
                      <Loader className="w-5 h-5 animate-spin" />
                    ) : (
                      <Calculator className="w-5 h-5" />
                    )}
                    Compare Predicted Price
                  </motion.button>
                </div>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-gray-50 p-4 rounded-lg text-center">
                    <BedDouble className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">
                      {property.bedrooms} {property.bedrooms > 1 ? "Beds" : "Bed"}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg text-center">
                    <Bath className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">
                      {property.bathrooms} {property.bathrooms > 1 ? "Baths" : "Bath"}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg text-center">
                    <Maximize className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">{property.squareFeet} sqft</p>
                  </div>
                </div>
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Contact Details</h2>
                  <div className="flex items-center text-gray-600">
                    <Phone className="w-5 h-5 mr-2 text-blue-600" />
                    {property.phone}
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowBooking(true)}
                  className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white py-3 rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all duration-200 flex items-center justify-center gap-2 shadow-sm"
                >
                  <BookOpen className="w-5 h-5" />
                  {property.availability === "For Sale" ? "Reserve Property" : "Book Property"}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowSchedule(true)}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 flex items-center justify-center gap-2 shadow-sm mt-3"
                >
                  <Calendar className="w-5 h-5" />
                  Schedule Viewing
                </motion.button>
                <div className="relative">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowChat(true)}
                    className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-3 rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 flex items-center justify-center gap-2 mt-3 shadow-sm"
                  >
                    <MessageCircle className="w-5 h-5" />
                    Chat with Owner
                    {unreadMessages > 0 && property.ownerId === user._id && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center"
                      >
                        {unreadMessages}
                      </motion.span>
                    )}
                  </motion.button>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowPaymentForm(true)}
                  className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-3 rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 flex items-center justify-center gap-2 mt-3 shadow-sm"
                >
                  <DollarSign className="w-5 h-5" />
                  Pay Now
                </motion.button>
              </div>
              <div>
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Description</h2>
                  <p className="text-gray-600 leading-relaxed">{property.description}</p>
                </div>
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Amenities</h2>
                  <div className="grid grid-cols-2 gap-4">
                    {property.amenities.length > 0 ? (
                      property.amenities.map((amenity, index) => (
                        <div key={index} className="flex items-center text-gray-600">
                          <Compass className="w-4 h-4 mr-2 text-blue-600" />
                          {amenity}
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-600">No amenities listed</p>
                    )}
                  </div>
                </div>
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Property Details</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Type</p>
                      <p className="text-gray-600">{property.type}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Built Area</p>
                      <p className="text-gray-600">{property.builtArea ? `${property.builtArea} sqft` : "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Floors</p>
                      <p className="text-gray-600">{property.floors}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Year Built</p>
                      <p className="text-gray-600">{property.yearBuilt}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Renovation Year</p>
                      <p className="text-gray-600">{property.renovationYear || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Property Facing</p>
                      <p className="text-gray-600">{property.propertyFacing}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Land Ownership</p>
                      <p className="text-gray-600">{property.landOwnershipType}</p>
                    </div>
                  </div>
                </div>
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Utilities</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Electricity</p>
                      <p className="text-gray-600">{property.electricityConnection}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Water Supply</p>
                      <p className="text-gray-600">{property.waterSupply}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Sewage System</p>
                      <p className="text-gray-600">{property.sewageSystem}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Gas Connection</p>
                      <p className="text-gray-600">{property.gasConnection}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mt-8 p-6 bg-blue-50 rounded-2xl shadow-sm"
        >
          <div className="flex items-center gap-2 text-blue-600 mb-4">
            <Compass className="w-5 h-5" />
            <h3 className="text-lg font-semibold">Location Details</h3>
          </div>
          <div className="space-y-2">
            <p className="text-gray-600">
              <span className="font-medium">Address:</span> {property.location}
            </p>
            <p className="text-gray-600">
              <span className="font-medium">Nearby Landmark:</span> {property.nearbyLandmark}
            </p>
            <p className="text-gray-600">
              <span className="font-medium">Road Condition:</span> {property.roadCondition}
            </p>
            <p className="text-gray-600">
              <span className="font-medium">Road Width:</span> {property.roadWidth} ft
            </p>
            <p className="text-gray-600">
              <span className="font-medium">Latitude:</span> {decimalToDMS(property.latitude, true)}
            </p>
            <p className="text-gray-600">
              <span className="font-medium">Longitude:</span> {decimalToDMS(property.longitude, false)}
            </p>
          </div>
          <div className="mt-4 h-64 rounded-lg overflow-hidden">
            <MapContainer
              center={[property.latitude, property.longitude]}
              zoom={15}
              style={{ height: "100%", width: "100%" }}
              className="rounded-lg"
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              <Marker position={[property.latitude, property.longitude]}>
                <Popup>
                  <strong>{property.title}</strong><br />
                  {property.location}
                </Popup>
              </Marker>
            </MapContainer>
          </div>
          <a
            href={`https://www.google.com/maps?q=${property.latitude},${property.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 mt-4"
          >
            <MapPin className="w-4 h-4" />
            View on Google Maps
          </a>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mt-8 p-6 bg-blue-50 rounded-2xl shadow-sm"
        >
          <button
            onClick={() => setIsTaxDetailsOpen(!isTaxDetailsOpen)}
            className="flex items-center gap-2 text-blue-600 mb-4 w-full"
          >
            <DollarSign className="w-5 h-5" />
            <h3 className="text-lg font-semibold">Tax Details</h3>
            {isTaxDetailsOpen ? (
              <ChevronUp className="w-5 h-5 ml-auto" />
            ) : (
              <ChevronDown className="w-5 h-5 ml-auto" />
            )}
          </button>
          <AnimatePresence>
            {isTaxDetailsOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <p className="text-gray-600 text-sm sm:text-base">
                      <span className="font-medium">Property Price:</span> NPR{" "}
                      {property.price.toLocaleString("en-NP")}
                    </p>
                    <p className="text-gray-600 text-sm sm:text-base">
                      <span className="font-medium">Location:</span> {property.location}
                    </p>
                    <p className="text-gray-600 text-sm sm:text-base">
                      <span className="font-medium">Area:</span> {property.squareFeet} sqft
                    </p>
                    <p className="text-gray-600 font-medium mt-4 text-sm sm:text-base">Tax Breakdown:</p>
                    {taxDetails.breakdown.map((tax, index) => (
                      <p
                        key={index}
                        className={`text-sm sm:text-base ${
                          tax.name.includes("Municipal") ? "text-blue-600" :
                          tax.name.includes("Registration") ? "text-green-600" :
                          tax.name.includes("Local") ? "text-yellow-600" :
                          "text-red-600"
                        }`}
                        data-tooltip-id={`tax-tooltip-${index}`}
                        data-tooltip-content={tax.tooltip}
                      >
                        {tax.name}: NPR {tax.amount.toLocaleString("en-NP")} ({tax.rate})
                      </p>
                    ))}
                    <Tooltip id="tax-tooltip-0" />
                    <Tooltip id="tax-tooltip-1" />
                    <Tooltip id="tax-tooltip-2" />
                    <Tooltip id="tax-tooltip-3" />
                    <p className="text-gray-900 font-semibold mt-2 text-base sm:text-lg">
                      Total Tax: NPR {taxDetails.totalTax.toLocaleString("en-NP")}
                    </p>
                    <p className="text-gray-900 font-semibold mt-2 text-base sm:text-lg">
                      Total Amount (Price + Tax): NPR{" "}
                      {(property.price + taxDetails.totalTax).toLocaleString("en-NP")}
                    </p>
                    {taxDetails.totalTax === 0 && (
                      <p className="text-yellow-600 text-sm italic mt-2">
                        Note: No taxes applied for this property type.
                      </p>
                    )}
                    {taxDetails.totalTax === 0 && (
                      <span className="inline-block bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded-full mt-2">
                        No Taxes Applicable
                      </span>
                    )}
                  </div>
                  <div className="h-64 md:h-80">
                    <Pie data={chartData} options={chartOptions} />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
        <AnimatePresence>
          {showSchedule && (
            <ScheduleViewing
              propertyId={property._id}
              propertyTitle={property.title}
              propertyLocation={property.location}
              propertyImage={property.image[0]}
              onClose={() => setShowSchedule(false)}
            />
          )}
          {showChat && (
            <ChatModal
              propertyId={property._id}
              userId={user._id}
              ownerId={property.ownerId}
              onClose={() => {
                setShowChat(false);
                const fetchMessages = async () => {
                  try {
                    const token = localStorage.getItem("token");
                    const response = await axios.get(
                      `${Backendurl}/api/messages/${id}/${user._id}`,
                      {
                        headers: { Authorization: `Bearer ${token}` },
                      }
                    );
                    const unreadCount = response.data.messages.filter(
                      (msg) => msg.recipient.toString() === user._id && !msg.read
                    ).length;
                    setUnreadMessages(unreadCount);
                  } catch (err) {
                    toast.error("Failed to refresh messages.");
                  }
                };
                fetchMessages();
              }}
            />
          )}
          {showBooking && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            >
              <div className="bg-white rounded-2xl p-6 w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {property.availability === "For Sale" ? "Reserve Property" : "Book Property"}
                  </h2>
                  <button
                    onClick={() => setShowBooking(false)}
                    className="p-2 rounded-full hover:bg-gray-100"
                  >
                    <X className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
                <form onSubmit={handleBookingSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {property.availability === "For Sale" ? "Meeting Date" : "Start Date"}
                    </label>
                    <input
                      type="date"
                      value={bookingForm.startDate}
                      onChange={(e) =>
                        setBookingForm({ ...bookingForm, startDate: e.target.value })
                      }
                      min={new Date().toISOString().split("T")[0]}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {property.availability === "For Sale" ? "Follow-up Date" : "End Date"}
                    </label>
                    <input
                      type="date"
                      value={bookingForm.endDate}
                      onChange={(e) =>
                        setBookingForm({ ...bookingForm, endDate: e.target.value })
                      }
                      min={bookingForm.startDate || new Date().toISOString().split("T")[0]}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Message to Owner (Optional)
                    </label>
                    <textarea
                      value={bookingForm.message}
                      onChange={(e) =>
                        setBookingForm({ ...bookingForm, message: e.target.value })
                      }
                      placeholder="Enter any additional details or inquiries..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                      rows={4}
                    />
                  </div>
                  <div className="flex space-x-3">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      type="submit"
                      className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-all duration-200"
                    >
                      {property.availability === "For Sale" ? "Submit Reservation" : "Submit Booking"}
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      type="button"
                      onClick={() => setShowBooking(false)}
                      className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition-all duration-200"
                    >
                      Cancel
                    </motion.button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}
          {showPaymentForm && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={() => setShowPaymentForm(false)}
            >
              <div
                className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-2xl font-bold">Complete Payment</h2>
                      <p className="text-blue-100 mt-1">Secure and fast transaction</p>
                    </div>
                    <button
                      onClick={() => setShowPaymentForm(false)}
                      className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors duration-200"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                </div>
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                  <EsewaPayment property={property} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default PropertyDetails;