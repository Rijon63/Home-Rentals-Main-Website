import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { Grid, List, SlidersHorizontal, MapPin, Home } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import SearchBar from "./Searchbar.jsx";
import FilterSection from "./Filtersection.jsx";
import PropertyCard from "./Propertycard.jsx";
import { Backendurl } from "../../App.jsx";

const PROPERTY_TYPES = ['Entire Property', 'Apartment/Flat', 'Single Room', 'Homestay'];

const PropertiesPage = () => {
  const [viewState, setViewState] = useState({
    isGridView: true,
    showFilters: false,
    showMap: false,
  });

  const [propertyState, setPropertyState] = useState({
    properties: [],
    loading: true,
    error: null,
    selectedProperty: null,
  });

  const [filters, setFilters] = useState({
    propertyType: "",
    priceRange: [0, Number.MAX_SAFE_INTEGER],
    bedrooms: "0",
    bathrooms: "0",
    availability: "",
    searchQuery: "",
    sortBy: "",
    amenities: [],
    location: "",
  });

  const navigate = useNavigate();

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

  const fetchProperties = async () => {
    try {
      setPropertyState((prev) => ({ ...prev, loading: true }));
      const response = await axios.get(`${Backendurl}/api/products/list`);
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
          rating: property.rating || 0,
        }));
        setPropertyState((prev) => ({
          ...prev,
          properties: parsedProperties,
          error: null,
          loading: false,
        }));
      } else {
        throw new Error(response.data.message || "Failed to fetch properties");
      }
    } catch (err) {
      setPropertyState((prev) => ({
        ...prev,
        error: "Failed to fetch properties. Please try again later.",
        loading: false,
      }));
      console.error("Error fetching properties:", err);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  const filteredProperties = useMemo(() => {
    return propertyState.properties
      .filter((property) => {
        const searchMatch =
          !filters.searchQuery ||
          [
            property.title,
            property.description,
            property.location,
            property.municipality,
            property.district,
            property.province,
            property.type,
          ].some((field) => field && field.toLowerCase().includes(filters.searchQuery.toLowerCase()));

        const typeMatch =
          !filters.propertyType ||
          property.type?.toLowerCase() === filters.propertyType.toLowerCase();

        const priceMatch =
          property.price >= filters.priceRange[0] &&
          property.price <= filters.priceRange[1];

        const bedroomsMatch =
          !filters.bedrooms ||
          filters.bedrooms === "0" ||
          property.bedrooms >= parseInt(filters.bedrooms);

        const bathroomsMatch =
          !filters.bathrooms ||
          filters.bathrooms === "0" ||
          property.bathrooms >= parseInt(filters.bathrooms);

        const availabilityMatch =
          !filters.availability ||
          property.availability?.toLowerCase() === filters.availability.toLowerCase();

        const amenitiesMatch =
          filters.amenities.length === 0 ||
          filters.amenities.every((amenity) => property.amenities.includes(amenity));

        const locationMatch =
          !filters.location ||
          property.location.toLowerCase().includes(filters.location.toLowerCase());

        return (
          searchMatch &&
          typeMatch &&
          priceMatch &&
          bedroomsMatch &&
          bathroomsMatch &&
          availabilityMatch &&
          amenitiesMatch &&
          locationMatch
        );
      })
      .sort((a, b) => {
        switch (filters.sortBy) {
          case "price-asc":
            return a.price - b.price;
          case "price-desc":
            return b.price - a.price;
          case "newest":
            return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
          case "rating-desc":
            return (b.rating || 0) - (a.rating || 0);
          default:
            return 0;
        }
      });
  }, [propertyState.properties, filters]);

  const handleFilterChange = (newFilters) => {
    setFilters((prev) => ({
      ...prev,
      ...newFilters,
    }));
  };

  const handlePredictPrice = (property) => {
    navigate('/predict-price', {
      state: {
        city: property.municipality || property.location.split(',')[0]?.trim() || "Kathmandu",
        bedroom_count: property.bedrooms || 1,
        bathroom_count: property.bathrooms || 1,
        area_sqft: property.squareFeet || 1000,
        build_area_sqft: property.builtArea || 800,
        floors: property.floors || 1,
        road_width: property.roadWidth || 10,
        face: property.propertyFacing || "Unknown",
        year: property.yearBuilt || 2010,
        amenities: parseAmenities(property.amenities),
        listing_type: property.availability || "For Sale",
      },
    });
  };

  if (propertyState.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center flex flex-col items-center"
        >
          <div className="relative mb-6">
            <motion.div
              className="w-24 h-24 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center relative shadow-lg shadow-blue-500/30"
              animate={{
                rotate: [0, 0, 360, 360, 0],
                scale: [1, 0.9, 0.9, 1, 1],
                borderRadius: ["16%", "50%", "50%", "16%", "16%"],
              }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <Home className="w-12 h-12 text-white" />
            </motion.div>
            <motion.div
              className="absolute w-3 h-3 bg-blue-300 rounded-full right-4 bottom-10"
              animate={{
                x: [0, 30, 0, -30, 0],
                y: [-30, 0, 30, 0, -30],
              }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            />
            <motion.div
              className="absolute w-2 h-2 bg-indigo-400 rounded-full"
              animate={{
                x: [0, -30, 0, 30, 0],
                y: [30, 0, -30, 0, 30],
              }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
            />
            <div
              className="absolute inset-0 bg-blue-500/10 rounded-full animate-ping"
              style={{ animationDuration: '3s' }}
            ></div>
          </div>
          <h3 className="text-2xl font-bold text-gray-800 mb-3 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Loading Properties
          </h3>
          <p className="text-gray-600 mb-5 max-w-xs text-center">
            {`We're finding the perfect homes that match your preferences...`}
          </p>
          <div className="w-64 h-2 bg-gray-200 rounded-full overflow-hidden relative">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-600 bg-size-200 absolute top-0 left-0 right-0"
              animate={{ backgroundPosition: ["0% center", "100% center", "0% center"] }}
              style={{ backgroundSize: "200% 100%" }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            />
          </div>
          <div className="flex items-center mt-4 text-xs text-blue-600">
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-2"
            />
            <span>Please wait while we curate properties for you</span>
          </div>
        </motion.div>
      </div>
    );
  }

  if (propertyState.error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center text-red-600 p-6 rounded-lg bg-red-50 max-w-md"
        >
          <p className="font-medium mb-4">{propertyState.error}</p>
          <button
            onClick={fetchProperties}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            Try Again
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-gray-50 pt-16"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.header
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Find Your Perfect Property
          </h1>
          <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
            Discover a curated collection of premium properties
          </p>
        </motion.header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <AnimatePresence mode="wait">
            {viewState.showFilters && (
              <motion.aside
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                className="lg:col-span-1"
              >
                <FilterSection
                  filters={filters}
                  setFilters={setFilters}
                  onApplyFilters={handleFilterChange}
                  propertyTypes={PROPERTY_TYPES}
                />
              </motion.aside>
            )}
          </AnimatePresence>

          <div className={`${viewState.showFilters ? "lg:col-span-3" : "lg:col-span-4"}`}>
            <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <SearchBar
                  onSearch={(query) =>
                    setFilters((prev) => ({ ...prev, searchQuery: query }))
                  }
                  className="flex-1"
                />
                <div className="flex items-center gap-4">
                  <select
                    value={filters.sortBy}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        sortBy: e.target.value,
                      }))
                    }
                    className="px-3 py-2 border rounded-lg text-sm"
                  >
                    <option value="">Sort By</option>
                    <option value="price-asc">Price: Low to High</option>
                    <option value="price-desc">Price: High to Low</option>
                    <option value="newest">Newest First</option>
                    <option value="rating-desc">Top Rated</option>
                  </select>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        setViewState((prev) => ({
                          ...prev,
                          showFilters: !prev.showFilters,
                        }))
                      }
                      className="p-2 rounded-lg hover:bg-gray-100"
                      title="Toggle Filters"
                    >
                      <SlidersHorizontal className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setViewState((prev) => ({ ...prev, isGridView: true }))}
                      className={`p-2 rounded-lg ${
                        viewState.isGridView ? "bg-blue-100 text-blue-600" : "hover:bg-gray-100"
                      }`}
                    >
                      <Grid className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setViewState((prev) => ({ ...prev, isGridView: false }))}
                      className={`p-2 rounded-lg ${
                        !viewState.isGridView ? "bg-blue-100 text-blue-600" : "hover:bg-gray-100"
                      }`}
                    >
                      <List className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <motion.div
              layout
              className={`grid gap-6 ${
                viewState.isGridView ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"
              }`}
            >
              <AnimatePresence>
                {filteredProperties.length > 0 ? (
                  filteredProperties.map((property) => (
                    <PropertyCard
                      key={property._id}
                      property={property}
                      viewType={viewState.isGridView ? "grid" : "list"}
                      onPredictPrice={() => handlePredictPrice(property)}
                    />
                  ))
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="col-span-full text-center py-12 bg-white rounded-lg shadow-sm"
                  >
                    <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No properties found
                    </h3>
                    <p className="text-gray-600">
                      Try adjusting your filters or search criteria
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default PropertiesPage;