import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";
import {
  Heart,
  BookOpen,
  MapPin,
  Calendar,
  Loader,
  ArrowLeft,
  Building,
  AlertCircle,
  Image as ImageIcon,
  Edit,
  Trash2,
  Home,
  Plus,
  MessageSquare,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Backendurl } from "../App";
import ChatModal from "./properties/ChatModal";

// Optimized Image Component with better performance
const PropertyImage = React.memo(({ src, alt, className, onError }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(src);

  // Reset state when src changes
  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
    setCurrentSrc(src);
  }, [src]);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    setHasError(false);
  }, []);

  const handleError = useCallback(() => {
    if (currentSrc !== "/placeholder-image.jpg") {
      setCurrentSrc("/placeholder-image.jpg");
      setIsLoaded(false);
    } else {
      setHasError(true);
      setIsLoaded(true);
    }
    onError?.();
  }, [currentSrc, onError]);

  if (hasError) {
    return (
      <div className={`${className} bg-gray-100 rounded-lg flex items-center justify-center`}>
        <ImageIcon className="w-8 h-8 text-gray-400" />
      </div>
    );
  }

  return (
    <div className={`relative ${className} bg-gray-100 rounded-lg overflow-hidden`}>
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <Loader className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      )}
      <img
        src={currentSrc}
        alt={alt}
        className={`${className} transition-opacity duration-200 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        onLoad={handleLoad}
        onError={handleError}
        loading="lazy"
        decoding="async"
      />
    </div>
  );
});

PropertyImage.displayName = 'PropertyImage';

const Dashboard = () => {
  const { isLoggedIn, isAdmin, user, loading: authLoading } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [myProperties, setMyProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  const getImageUrl = useCallback((imageArray) => {
    if (!imageArray || !Array.isArray(imageArray) || imageArray.length === 0) {
      return "/placeholder-image.jpg";
    }
    
    const image = imageArray[0];
    if (!image) return "/placeholder-image.jpg";
    
    if (typeof image === 'string') {
      if (image.startsWith('http')) return image;
      if (image.startsWith('/')) return `${Backendurl.replace(/\/$/, '')}${image}`;
      return `${Backendurl.replace(/\/$/, '')}/${image}`;
    }
    
    if (typeof image === 'object' && image.url) {
      const url = image.url;
      if (url.startsWith('http')) return url;
      if (url.startsWith('/')) return `${Backendurl.replace(/\/$/, '')}${url}`;
      return `${Backendurl.replace(/\/$/, '')}/${url}`;
    }
    
    return "/placeholder-image.jpg";
  }, []);

  const formatPrice = useCallback((price) => {
    const numPrice = Number(price) || 0;
    return numPrice.toLocaleString("en-NP");
  }, []);

  const formatDate = useCallback((dateString) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Invalid Date";
      return date.toLocaleDateString("en-US");
    } catch (error) {
      console.error("Date formatting error:", error);
      return "Invalid Date";
    }
  }, []);

  const fetchDashboardData = useCallback(async () => {
    if (!isLoggedIn || !user?._id) {
      setError("Please log in to view your dashboard");
      setLoading(false);
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setError("No authentication token found");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const config = {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      };

      const [favoritesResult, bookingsResult, propertiesResult] = await Promise.allSettled([
        axios.get(`${Backendurl}/api/dashboard/favorites`, config),
        axios.get(`${Backendurl}/api/dashboard/bookings`, config),
        axios.get(`${Backendurl}/api/products/my`, config),
      ]);

      if (favoritesResult.status === 'fulfilled' && favoritesResult.value.data?.success) {
        console.log("Favorites response:", favoritesResult.value.data);
        setFavorites(favoritesResult.value.data.favorites || []);
      } else {
        console.error("Favorites fetch failed:", favoritesResult.reason);
        setFavorites([]);
      }

      if (bookingsResult.status === 'fulfilled' && bookingsResult.value.data?.success) {
        console.log("Bookings response:", bookingsResult.value.data);
        setBookings(bookingsResult.value.data.bookings || []);
      } else {
        console.error("Bookings fetch failed:", bookingsResult.reason);
        setBookings([]);
      }

      if (propertiesResult.status === 'fulfilled' && propertiesResult.value.data?.success) {
        console.log("Properties response:", propertiesResult.value.data);
        setMyProperties(propertiesResult.value.data.properties || []);
      } else {
        console.error("My properties fetch failed:", propertiesResult.reason);
        setMyProperties([]);
      }

      if (favoritesResult.status === 'rejected' && bookingsResult.status === 'rejected' && propertiesResult.status === 'rejected') {
        throw new Error("Failed to load dashboard data. Please check your connection.");
      }

    } catch (err) {
      console.error("Dashboard fetch error:", err);
      const errorMessage = err.response?.data?.message || err.message || "Failed to load dashboard data";
      setError(errorMessage);
      
      if (err.response?.status === 401 || err.response?.status === 403) {
        toast.error("Session expired. Please log in again.");
        localStorage.removeItem("token");
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn, user?._id, navigate]);

  const handleRemoveFavorite = useCallback(async (propertyId) => {
    if (!propertyId) {
      toast.error("Invalid property ID");
      return;
    }

    setFavorites(prev => prev.filter(fav => fav._id !== propertyId));

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Please log in again");
        navigate("/login");
        return;
      }

      const response = await axios.post(
        `${Backendurl}/api/dashboard/favorites/remove`,
        { propertyId },
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 5000
        }
      );

      if (response.data?.success) {
        toast.success("Removed from favorites");
      } else {
        throw new Error(response.data?.message || "Failed to remove favorite");
      }
    } catch (err) {
      setFavorites(prev => {
        const existsAlready = prev.some(fav => fav._id === propertyId);
        if (!existsAlready) {
          const originalProperty = favorites.find(fav => fav._id === propertyId);
          if (originalProperty) {
            return [...prev, originalProperty];
          }
        }
        return prev;
      });

      console.error("Error removing favorite:", err);
      toast.error(err.response?.data?.message || "Failed to remove favorite");
      
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem("token");
        navigate("/login");
      }
    }
  }, [navigate, favorites]);

  const handleDeleteProperty = useCallback(async (propertyId) => {
    if (!propertyId) {
      toast.error("Invalid property ID");
      return;
    }

    if (!window.confirm("Are you sure you want to delete this property?")) {
      return;
    }

    setMyProperties(prev => prev.filter(p => p._id !== propertyId));

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Please log in again");
        navigate("/login");
        return;
      }

      const response = await axios.post(
        `${Backendurl}/api/products/remove`,
        { id: propertyId },
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 5000
        }
      );

      if (response.data?.success) {
        toast.success("Property deleted successfully");
      } else {
        throw new Error(response.data?.message || "Failed to delete property");
      }
    } catch (err) {
      setMyProperties(prev => {
        const existsAlready = prev.some(p => p._id === propertyId);
        if (!existsAlready) {
          const originalProperty = myProperties.find(p => p._id === propertyId);
          if (originalProperty) {
            return [...prev, originalProperty];
          }
        }
        return prev;
      });

      console.error("Error deleting property:", err);
      toast.error(err.response?.data?.message || "Failed to delete property");
      
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem("token");
        navigate("/login");
      }
    }
  }, [navigate, myProperties]);

  const handleOpenChat = useCallback((property) => {
    setSelectedProperty(property);
    setIsChatOpen(true);
  }, []);

  const handleCloseChat = useCallback(() => {
    setIsChatOpen(false);
    setSelectedProperty(null);
  }, []);

  const renderedFavorites = useMemo(() => {
    return favorites.map((property) => {
      if (!property?._id) return null;
      
      return (
        <motion.div
          key={property._id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="flex items-center space-x-4 border-b border-gray-100 pb-4 last:border-b-0"
        >
          <Link 
            to={`/properties/single/${property._id}`}
            className="flex-shrink-0"
          >
            <PropertyImage
              src={getImageUrl(property.image)}
              alt={property.title || "Property"}
              className="w-24 h-24 object-cover hover:scale-105 transition-transform duration-200"
            />
          </Link>
          
          <div className="flex-1 min-w-0">
            <Link to={`/properties/single/${property._id}`}>
              <h3 className="text-lg font-medium text-gray-900 hover:text-blue-600 transition-colors truncate">
                {property.title || "Untitled Property"}
              </h3>
            </Link>
            <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">
                {property.location?.municipality || property.city || "Unknown Location"}
              </span>
            </p>
            <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
              <Building className="w-4 h-4 flex-shrink-0" />
              NPR {formatPrice(property.price || property.price_per_night || 0)}
            </p>
          </div>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleRemoveFavorite(property._id)}
            className="p-2 rounded-full bg-red-50 hover:bg-red-100 transition-all duration-200 flex-shrink-0"
            title="Remove from favorites"
          >
            <Heart className="w-5 h-5 text-red-500 fill-red-500" />
          </motion.button>
        </motion.div>
      );
    }).filter(Boolean);
  }, [favorites, getImageUrl, formatPrice, handleRemoveFavorite]);

  const renderedBookings = useMemo(() => {
    return bookings.map((booking) => {
      const property = booking.propertyId || {};
      
      return (
        <motion.div
          key={booking._id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center space-x-4 border-b border-gray-100 pb-4 last:border-b-0"
        >
          <Link 
            to={property._id ? `/properties/single/${property._id}` : "#"}
            className="flex-shrink-0"
          >
            <PropertyImage
              src={getImageUrl(property.image)}
              alt={property.title || "Property"}
              className="w-24 h-24 object-cover hover:scale-105 transition-transform duration-200"
            />
          </Link>
          
          <div className="flex-1 min-w-0">
            <Link to={property._id ? `/properties/single/${property._id}` : "#"}>
              <h3 className="text-lg font-medium text-gray-900 hover:text-blue-600 transition-colors truncate">
                {property.title || "Unknown Property"}
              </h3>
            </Link>
            <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">
                {property.location?.municipality || property.city || "Unknown Location"}
              </span>
            </p>
            <div className="grid grid-cols-1 gap-1 mt-2">
              <p className="text-sm text-gray-500 flex items-center gap-1">
                <Calendar className="w-4 h-4 flex-shrink-0" />
                Check-in: {formatDate(booking.checkInDate)}
              </p>
              <p className="text-sm text-gray-500 flex items-center gap-1">
                <Calendar className="w-4 h-4 flex-shrink-0" />
                Check-out: {formatDate(booking.checkOutDate)}
              </p>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Status:{" "}
              <span
                className={`capitalize font-medium ${
                  booking.status === "confirmed"
                    ? "text-green-600"
                    : booking.status === "pending"
                    ? "text-yellow-600"
                    : booking.status === "cancelled"
                    ? "text-red-600"
                    : "text-gray-600"
                }`}
              >
                {booking.status || "Unknown"}
              </span>
            </p>
          </div>
        </motion.div>
      );
    });
  }, [bookings, getImageUrl, formatDate]);

  const renderedMyProperties = useMemo(() => {
    return myProperties.map((property) => {
      if (!property?._id) return null;
      
      return (
        <motion.div
          key={property._id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="flex items-center space-x-4 border-b border-gray-100 pb-4 last:border-b-0"
        >
          <Link 
            to={`/properties/single/${property._id}`}
            className="flex-shrink-0"
          >
            <PropertyImage
              src={getImageUrl(property.image)}
              alt={property.title || "Property"}
              className="w-24 h-24 object-cover hover:scale-105 transition-transform duration-200"
            />
          </Link>
          
          <div className="flex-1 min-w-0">
            <Link to={`/properties/single/${property._id}`}>
              <h3 className="text-lg font-medium text-gray-900 hover:text-blue-600 transition-colors truncate">
                {property.title || "Untitled Property"}
              </h3>
            </Link>
            <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">
                {property.location?.municipality || property.city || "Unknown Location"}
              </span>
            </p>
            <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
              <Building className="w-4 h-4 flex-shrink-0" />
              NPR {formatPrice(property.price || property.price_per_night || 0)}
            </p>
          </div>
          
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link
              to={`/update/${property._id}`}
              className="p-2 rounded-full bg-blue-50 hover:bg-blue-100 transition-all duration-200"
              title="Edit property"
            >
              <Edit className="w-5 h-5 text-blue-500" />
            </Link>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleDeleteProperty(property._id)}
              className="p-2 rounded-full bg-red-50 hover:bg-red-100 transition-all duration-200"
              title="Delete property"
            >
              <Trash2 className="w-5 h-5 text-red-500" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleOpenChat(property)}
              className="p-2 rounded-full bg-green-50 hover:bg-green-100 transition-all duration-200"
              title="Message owner"
            >
              <MessageSquare className="w-5 h-5 text-green-500" />
            </motion.button>
          </div>
        </motion.div>
      );
    }).filter(Boolean);
  }, [myProperties, getImageUrl, formatPrice, handleDeleteProperty, handleOpenChat]);

  useEffect(() => {
    if (!authLoading) {
      console.log("Fetching dashboard data...");
      fetchDashboardData();
    }
  }, [authLoading, fetchDashboardData, location.search]);

  useEffect(() => {
    console.log("My Properties:", myProperties);
  }, [myProperties]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center mb-8">
            <Loader className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Loading your dashboard...</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl shadow-lg p-6">
                <div className="h-6 bg-gray-200 rounded-lg w-1/4 mb-4 animate-pulse"></div>
                {[1, 2].map((j) => (
                  <div key={j} className="flex items-center space-x-4 mb-4">
                    <div className="w-24 h-24 bg-gray-200 rounded-lg animate-pulse"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-5 bg-gray-200 rounded-lg w-3/4 animate-pulse"></div>
                      <div className="h-4 bg-gray-200 rounded-lg w-1/2 animate-pulse"></div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100">
        <div className="text-center p-6 bg-white rounded-2xl shadow-lg max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-500 text-lg font-medium mb-4">{error}</p>
          <div className="space-y-2">
            <button
              onClick={fetchDashboardData}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 mr-2"
            >
              Try Again
            </button>
            <Link
              to="/properties"
              className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all duration-200"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Browse Properties
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 pt-16"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {user?.name || user?.username || 'User'}!
          </h1>
          <Link
            to="/properties"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 transition-colors duration-200"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Browse Properties
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Heart className="w-5 h-5 text-red-500" />
              My Favourites ({favorites.length})
            </h2>
            
            {favorites.length === 0 ? (
              <div className="text-center py-8">
                <Heart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 mb-2">No favorite properties yet.</p>
                <Link
                  to="/properties"
                  className="text-blue-600 hover:text-blue-700 text-sm"
                >
                  Start exploring properties →
                </Link>
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                <AnimatePresence>
                  {renderedFavorites}
                </AnimatePresence>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-600" />
              My Bookings ({bookings.length})
            </h2>
            
            {bookings.length === 0 ? (
              <div className="text-center py-8">
                <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 mb-2">No bookings yet.</p>
                <Link
                  to="/properties"
                  className="text-blue-600 hover:text-blue-700 text-sm"
                >
                  Book your first property →
                </Link>
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {renderedBookings}
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Home className="w-5 h-5 text-green-600" />
              My Properties ({myProperties.length})
            </h2>
            <Link
              to="/add"
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add New Property
            </Link>
          </div>
          
          {myProperties.length === 0 ? (
            <div className="text-center py-8">
              <Home className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 mb-2">You haven't added any properties yet.</p>
              <Link
                to="/add"
                className="text-blue-600 hover:text-blue-700 text-sm"
              >
                Add your first property →
              </Link>
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              <AnimatePresence>
                {renderedMyProperties}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {isChatOpen && selectedProperty && (
        <ChatModal
          propertyId={selectedProperty._id}
          ownerId={selectedProperty.ownerId}
          onClose={handleCloseChat}
        />
      )}
    </motion.div>
  );
};

export default Dashboard;