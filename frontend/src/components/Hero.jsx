import React, { useRef, useEffect, useState } from "react";
import { useSpring, animated } from "@react-spring/web";
import { Search, MapPin, ArrowRight, Home, Star, Heart, SlidersHorizontal } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import heroimage from "../assets/images/heroimage2.png";
import { RadialGradient } from "react-text-gradients";
import PropertyCard from "./properties/Propertycard";
import { Backendurl } from "../App";

const PROPERTY_TYPES = ['Entire Property', 'Apartment/Flat', 'Single Room', 'Homestay'];
const popularLocations = ["Kathmandu", "Pokhara", "Chitwan", "Lalitpur", "Bhaktapur"];
const AMENITIES = {
  Basic: ['WiFi', 'Parking', 'Kitchen', 'Heating', 'AC'],
  Luxury: ['Pool', 'Gym', 'Lake View', 'Fireplace'],
};

export const AnimatedContainer = ({ children, distance = 100, direction = "vertical", reverse = false }) => {
  const [inView, setInView] = useState(false);
  const ref = useRef();

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.unobserve(ref.current);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const directions = {
    vertical: "Y",
    horizontal: "X",
  };

  const springProps = useSpring({
    from: {
      transform: `translate${directions[direction]}(${
        reverse ? `-${distance}px` : `${distance}px`
      })`,
    },
    to: inView ? { transform: `translate${directions[direction]}(0px)` } : {},
    config: { tension: 50, friction: 25 },
  });

  return (
    <animated.div ref={ref} style={springProps}>
      {children}
    </animated.div>
  );
};

const Hero = () => {
  const navigate = useNavigate();
  const { user, isLoggedIn } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filters, setFilters] = useState({
    propertyType: "",
    priceRange: [0, Number.MAX_SAFE_INTEGER],
    bedrooms: "0",
    bathrooms: "0",
    amenities: [],
  });
  const [showFilters, setShowFilters] = useState(false);
  const [featuredProperties, setFeaturedProperties] = useState([]);
  const [recommendedProperties, setRecommendedProperties] = useState([]);
  const [loadingFeatured, setLoadingFeatured] = useState(false);
  const [loadingRecommended, setLoadingRecommended] = useState(false);
  const [error, setError] = useState(null);

  const parseAmenities = (amenities) => {
    if (!amenities) return [];
    if (Array.isArray(amenities)) return amenities;
    if (typeof amenities === "string") {
      try {
        const parsed = JSON.parse(amenities.replace(/'/g, '"'));
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        return amenities.split(',').map((item) => item.trim()).filter((item) => item);
      }
    }
    return [];
  };

  useEffect(() => {
    const fetchFeatured = async () => {
      setLoadingFeatured(true);
      try {
        const response = await axios.get(`${Backendurl}/api/products/featured`);
        if (response.data.success) {
          const parsedProperties = response.data.properties.map((property) => ({
            ...property,
            amenities: parseAmenities(property.amenities),
            location: [
              property.streetAddress,
              property.wardNumber ? `Ward ${property.wardNumber}` : null,
              property.municipality,
              property.district,
              property.province,
            ].filter(Boolean).join(', '),
            beds: property.bedrooms || 1,
            baths: property.bathrooms || 1,
            sqft: property.squareFeet || 1000,
            rating: property.rating || 0,
          }));
          setFeaturedProperties(parsedProperties.slice(0, 4));
          setError(null);
        } else {
          throw new Error(response.data.message || "Failed to fetch featured properties");
        }
      } catch (err) {
        setError("Failed to load featured properties.");
      } finally {
        setLoadingFeatured(false);
      }
    };
    fetchFeatured();
  }, []);

  useEffect(() => {
    const fetchRecommendations = async () => {
      setLoadingRecommended(true);
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(`${Backendurl}/api/products/recommend`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          params: { userId: isLoggedIn && user?._id ? user._id : null },
        });
        if (response.data.success) {
          const parsedProperties = response.data.properties.map((property) => ({
            ...property,
            amenities: parseAmenities(property.amenities),
            location: [
              property.streetAddress,
              property.wardNumber ? `Ward ${property.wardNumber}` : null,
              property.municipality,
              property.district,
              property.province,
            ].filter(Boolean).join(', '),
            beds: property.bedrooms || 1,
            baths: property.bathrooms || 1,
            sqft: property.squareFeet || 1000,
            rating: property.rating || 0,
          }));
          setRecommendedProperties(parsedProperties.slice(0, 4));
          setError(null);
        } else {
          throw new Error(response.data.message || "Failed to fetch recommendations");
        }
      } catch (err) {
        setError("Failed to load recommendations.");
        try {
          const fallback = await axios.get(`${Backendurl}/api/products/list`, {
            params: { sort: "popular" },
          });
          if (fallback.data.success) {
            const parsedProperties = fallback.data.properties.map((property) => ({
              ...property,
              amenities: parseAmenities(property.amenities),
              location: [
                property.streetAddress,
                property.wardNumber ? `Ward ${property.wardNumber}` : null,
                property.municipality,
                property.district,
                property.province,
              ].filter(Boolean).join(', '),
              beds: property.bedrooms || 1,
              baths: property.bathrooms || 1,
              sqft: property.squareFeet || 1000,
              rating: property.rating || 0,
            }));
            setRecommendedProperties(parsedProperties.slice(0, 4));
          }
        } catch (fallbackErr) {
          console.error("Fallback failed:", fallbackErr);
        }
      } finally {
        setLoadingRecommended(false);
      }
    };
    fetchRecommendations();
  }, [isLoggedIn, user]);

  const handleSubmit = () => {
    const queryParams = new URLSearchParams({
      location: searchQuery,
      propertyType: filters.propertyType,
      priceMin: filters.priceRange[0],
      priceMax: filters.priceRange[1],
      bedrooms: filters.bedrooms,
      bathrooms: filters.bathrooms,
      amenities: filters.amenities.join(','),
    }).toString();
    navigate(`/properties?${queryParams}`);
  };

  const handleFilterChange = (newFilters) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  return (
    <AnimatedContainer distance={50} direction="vertical">
      <div className="mt-20">
        {/* Hero Section */}
        <div className="relative min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 my-3 mx-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.5 }}
            className="absolute inset-0 z-0 rounded-2xl overflow-hidden"
            style={{
              backgroundImage: `url(${heroimage})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-sky-300/40 via-slate/10 to-transparent" />
          </motion.div>

          <div className="relative z-10 max-w-7xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1 }}
              className="mb-12"
            >
              <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold text-black mb-6 leading-tight">
                <RadialGradient
                  gradient={["circle, rgba(63,94,251,1) 0%, rgba(252,70,107,1) 100%"]}
                >
                  Find Your Perfect
                  <br />
                  <span className="text-gray-800">Living Space</span>
                </RadialGradient>
              </h1>
              <p className="text-slate-700 text-lg sm:text-xl mb-8 max-w-2xl mx-auto">
                Discover your dream home in the most sought-after locations
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.2 }}
              className="relative max-w-4xl mx-auto"
            >
              <div className="flex flex-col md:flex-row gap-4 p-4 bg-white/80 backdrop-blur-md rounded-2xl shadow-lg">
                <div className="relative flex-1">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    placeholder="Enter location..."
                    className="w-full pl-10 pr-4 py-3 rounded-xl border-0 bg-white/90 shadow-sm focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
                <div className="relative">
                  <select
                    value={filters.propertyType}
                    onChange={(e) => handleFilterChange({ propertyType: e.target.value })}
                    className="w-full md:w-48 pl-3 pr-8 py-3 rounded-xl border-0 bg-white/90 shadow-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Any Type</option>
                    {PROPERTY_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="p-3 rounded-xl bg-white/90 shadow-sm hover:bg-gray-100"
                >
                  <SlidersHorizontal className="w-5 h-5 text-gray-400" />
                </button>
                <button
                  onClick={handleSubmit}
                  className="md:w-auto w-full bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 font-medium shadow-md"
                >
                  <Search className="w-5 h-5" />
                  <span>Search</span>
                </button>
              </div>

              <AnimatePresence>
                {showFilters && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mt-4 bg-white/90 backdrop-blur-md rounded-xl shadow-lg p-4"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Price Range (NPR)</label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            placeholder="Min"
                            value={filters.priceRange[0] || ''}
                            onChange={(e) =>
                              handleFilterChange({
                                priceRange: [parseInt(e.target.value) || 0, filters.priceRange[1]],
                              })
                            }
                            className="w-full px-3 py-2 rounded-lg border border-gray-300"
                          />
                          <input
                            type="number"
                            placeholder="Max"
                            value={filters.priceRange[1] === Number.MAX_SAFE_INTEGER ? '' : filters.priceRange[1]}
                            onChange={(e) =>
                              handleFilterChange({
                                priceRange: [filters.priceRange[0], parseInt(e.target.value) || Number.MAX_SAFE_INTEGER],
                              })
                            }
                            className="w-full px-3 py-2 rounded-lg border border-gray-300"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Bedrooms</label>
                        <select
                          value={filters.bedrooms}
                          onChange={(e) => handleFilterChange({ bedrooms: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-gray-300"
                        >
                          <option value="0">Any</option>
                          <option value="1">1</option>
                          <option value="2">2</option>
                          <option value="3">3+</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Bathrooms</label>
                        <select
                          value={filters.bathrooms}
                          onChange={(e) => handleFilterChange({ bathrooms: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-gray-300"
                        >
                          <option value="0">Any</option>
                          <option value="1">1</option>
                          <option value="2">2</option>
                          <option value="3">3+</option>
                        </select>
                      </div>
                    </div>
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700">Amenities</label>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(AMENITIES).map(([category, amenities]) => (
                          <div key={category}>
                            <h4 className="text-xs font-semibold text-gray-500">{category}</h4>
                            {amenities.map((amenity) => (
                              <div key={amenity} className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={filters.amenities.includes(amenity)}
                                  onChange={() => {
                                    const newAmenities = filters.amenities.includes(amenity)
                                      ? filters.amenities.filter((a) => a !== amenity)
                                      : [...filters.amenities, amenity];
                                    handleFilterChange({ amenities: newAmenities });
                                  }}
                                  className="h-4 w-4 text-blue-600 rounded"
                                />
                                <label className="ml-2 text-sm text-gray-700">{amenity}</label>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {showSuggestions && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute left-0 right-0 mt-2 bg-white rounded-xl shadow-lg divide-y divide-gray-100 overflow-hidden z-20"
                  >
                    <div className="p-2">
                      <h3 className="text-xs font-medium text-gray-500 px-3 mb-2">
                        Popular Locations
                      </h3>
                      {popularLocations
                        .filter((loc) => loc.toLowerCase().includes(searchQuery.toLowerCase()))
                        .map((location) => (
                          <button
                            key={location}
                            onClick={() => {
                              setSearchQuery(location);
                              handleSubmit();
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded-lg flex items-center justify-between text-gray-700 transition-colors"
                          >
                            <div className="flex items-center">
                              <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                              <span>{location}</span>
                            </div>
                            <ArrowRight className="w-4 h-4 text-gray-400" />
                          </button>
                        ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </div>

        {/* Recommended for You Section */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.4 }}
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 bg-gradient-to-br from-blue-50 to-indigo-100"
        >
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Heart className="w-6 h-6 text-red-500 fill-current" />
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
                Recommended for You
              </h2>
            </div>
            <p className="text-gray-600 max-w-2xl mx-auto">
              {isLoggedIn
                ? "Personalized property suggestions based on your preferences and activity"
                : "Create an account to get personalized recommendations just for you"}
            </p>
          </div>

          {!isLoggedIn ? (
            <div className="text-center py-12">
              <div className="bg-white rounded-2xl p-8 shadow-lg max-w-md mx-auto">
                <Heart className="w-16 h-16 text-red-500 fill-current mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Get Personalized Recommendations
                </h3>
                <p className="text-gray-600 mb-6">
                  Sign up to receive property suggestions tailored to your preferences
                </p>
                <button
                  onClick={() => navigate("/login")}
                  className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors font-medium"
                >
                  Sign Up Now
                </button>
              </div>
            </div>
          ) : loadingRecommended ? (
            <div className="flex justify-center items-center h-64">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full"
              />
            </div>
          ) : recommendedProperties.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {recommendedProperties.map((property) => (
                <PropertyCard
                  key={property._id}
                  property={property}
                  viewType="grid"
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="bg-white rounded-2xl p-8 shadow-lg max-w-md mx-auto">
                <Star className="w-16 h-16 text-yellow-500 fill-current mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Building Your Profile
                </h3>
                <p className="text-gray-600 mb-6">
                  Start exploring properties to get personalized recommendations!
                </p>
                <button
                  onClick={() => navigate("/properties")}
                  className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors font-medium"
                >
                  Explore Properties
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatedContainer>
  );
};

export default Hero;