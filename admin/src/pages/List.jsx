// Import required React hooks for state and effect management
import React, { useState, useEffect } from 'react';
// Import icons for UI elements
import {
  Trash2,
  Edit3,
  Search,
  Filter,
  Plus,
  Home,
  BedDouble,
  Bath,
  Maximize,
  MapPin,
  Building,
  Loader,
  MessageCircle,
} from 'lucide-react';
// Import axios for making HTTP requests to the backend
import axios from 'axios';
// Import toast for displaying success/error notifications
import { toast } from 'react-hot-toast';
// Import Link and useNavigate for routing
import { Link, useNavigate } from 'react-router-dom';
// Import Framer Motion for animations
import { motion, AnimatePresence } from 'framer-motion';
// Import backend URL from the main app configuration
import { backendurl } from '../App';
// Import AdminChatDashboard component for chat functionality
import AdminChatDashboard from '../components/AdminChatDashboard';

// PropertyListings component for managing and displaying property listings
const PropertyListings = () => {
  // State to store the list of properties
  const [properties, setProperties] = useState([]);
  // State to manage loading status during data fetching
  const [loading, setLoading] = useState(true);
  // State to manage search term for filtering properties
  const [searchTerm, setSearchTerm] = useState('');
  // State to filter properties by type (all, house, apartment, etc.)
  const [filterType, setFilterType] = useState('all');
  // State to sort properties (newest, price-low, price-high)
  const [sortBy, setSortBy] = useState('newest');
  // State to track unread message counts for each property
  const [unreadMessages, setUnreadMessages] = useState({});
  // State to control which property's chat is displayed
  const [showChat, setShowChat] = useState(null);
  // State to store the title of the selected property for chat
  const [selectedPropertyTitle, setSelectedPropertyTitle] = useState('');
  // Hook to programmatically navigate
  const navigate = useNavigate();

  // Function to parse amenities (handles string or array formats)
  const parseAmenities = (amenities) => {
    if (!amenities) return []; // Return empty array if amenities are null/undefined
    if (Array.isArray(amenities)) return amenities; // Return as-is if already an array
    if (typeof amenities === 'string') {
      try {
        // Attempt to parse JSON string (replacing single quotes with double quotes)
        const parsed = JSON.parse(amenities.replace(/'/g, '"'));
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        // Fallback: split string by commas and trim
        return amenities.split(',').map((item) => item.trim()).filter((item) => item);
      }
    }
    return [];
  };

  // Function to fetch properties and their associated unread message counts
  const fetchPropertiesAndMessages = async () => {
    try {
      setLoading(true); // Set loading state
      const token = localStorage.getItem('token'); // Retrieve auth token
      const isAdmin = localStorage.getItem('isAdmin') === 'true'; // Check admin status
      if (!token || !isAdmin) {
        toast.error('Please log in as admin'); // Show error if not authenticated
        navigate('/login'); // Redirect to login
        return;
      }

      // Fetch properties
      const response = await axios.get(`${backendurl}/api/products/list`, {
        headers: { Authorization: `Bearer ${token}` }, // Include auth token
      });

      if (response.data.success) {
        // Parse properties, including amenities and formatted location
        const parsedProperties = response.data.properties.map((property) => ({
          ...property,
          amenities: parseAmenities(property.amenities),
          location: [
            property.streetAddress,
            property.wardNumber ? `Ward ${property.wardNumber}` : null,
            property.municipality,
            property.district,
            property.province,
          ]
            .filter(Boolean)
            .join(', '),
        }));
        setProperties(parsedProperties); // Update properties state

        // Fetch unread message counts for each property
        const messagePromises = parsedProperties.map((property) =>
          axios
            .get(`${backendurl}/api/messages/users/${property._id}`, {
              headers: { Authorization: `Bearer ${token}` },
            })
            .catch((err) => {
              // Log errors but return fallback data to prevent Promise.all failure
              console.error(
                `Error fetching messages for property ${property._id}:`,
                err.response?.data?.message || err.message
              );
              return { data: { success: false, users: [] } };
            })
        );

        const messageResponses = await Promise.all(messagePromises); // Wait for all message requests
        const unreadCounts = {};
        messageResponses.forEach((res, index) => {
          if (res.data.success) {
            const propertyId = parsedProperties[index]._id;
            unreadCounts[propertyId] = res.data.users.length; // Store unread message count
          }
        });
        setUnreadMessages(unreadCounts); // Update unread messages state
      } else {
        toast.error(response.data.message || 'Failed to fetch properties'); // Show API error
      }
    } catch (error) {
      console.error('Error fetching properties or messages:', error.response?.data?.message || error.message); // Log error
      if (error.response?.status === 401 || error.response?.status === 403) {
        toast.error('Session expired or unauthorized. Please log in again.'); // Handle auth errors
        localStorage.removeItem('token'); // Clear token
        localStorage.removeItem('isAdmin'); // Clear admin status
        localStorage.removeItem('userId'); // Clear user ID
        navigate('/login'); // Redirect to login
      } else {
        toast.error('Failed to fetch properties or messages'); // Show general error
      }
    } finally {
      setLoading(false); // Clear loading state
    }
  };

  // Effect to fetch properties and messages on component mount
  useEffect(() => {
    fetchPropertiesAndMessages();
  }, [navigate]); // Re-run if navigate changes

  // Function to handle property deletion
  const handleRemoveProperty = async (propertyId, propertyTitle) => {
    if (window.confirm(`Are you sure you want to remove "${propertyTitle}"?`)) { // Confirm deletion
      try {
        const token = localStorage.getItem('token'); // Retrieve auth token
        if (!token) {
          toast.error('Please log in as admin'); // Show error if not authenticated
          navigate('/login'); // Redirect to login
          return;
        }
        const response = await axios.post(
          `${backendurl}/api/products/remove`,
          { id: propertyId },
          { headers: { Authorization: `Bearer ${token}` } } // Include auth token
        );

        if (response.data.success) {
          toast.success('Property removed successfully'); // Show success notification
          await fetchPropertiesAndMessages(); // Refresh properties list
        } else {
          toast.error(response.data.message); // Show API error
        }
      } catch (error) {
        console.error('Error removing property:', error.response?.data?.message || error.message); // Log error
        if (error.response?.status === 401 || error.response?.status === 403) {
          toast.error('Session expired or unauthorized. Please log in again.'); // Handle auth errors
          navigate('/login'); // Redirect to login
        } else {
          toast.error('Failed to remove property'); // Show general error
        }
      }
    }
  };

  // Filter and sort properties based on search term, type filter, and sort criteria
  const filteredProperties = properties
    .filter((property) => {
      const matchesSearch =
        !searchTerm ||
        [
          property.title,
          property.location,
          property.type,
          property.municipality,
          property.district,
          property.province,
        ]
          .some((field) => field && field.toLowerCase().includes(searchTerm.toLowerCase())); // Match search term in multiple fields

      const matchesType =
        filterType === 'all' || property.type.toLowerCase() === filterType.toLowerCase(); // Match selected type filter

      return matchesSearch && matchesType; // Combine search and type filter conditions
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return a.price - b.price; // Sort by price ascending
        case 'price-high':
          return b.price - a.price; // Sort by price descending
        case 'newest':
          return new Date(b.createdAt) - new Date(a.createdAt); // Sort by newest first
        default:
          return 0; // No sorting
      }
    });

  // Render loading state
  if (loading) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100">
        <div className="text-center">
          <Loader className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-4" /> {/* Loading spinner */}
          <p className="text-gray-700 font-medium">Loading properties...</p>
        </div>
      </div>
    );
  }

  // Render the property listings UI
  return (
    <div className="min-h-screen pt-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8 bg-white rounded-xl p-6 shadow-sm">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Property Listings</h1>
            <p className="text-gray-500 mt-1">{filteredProperties.length} Properties Found</p>
          </div>
          <Link
            to="/add"
            className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-sm"
          >
            <Plus className="w-5 h-5 mr-2" /> {/* Add icon */}
            Add Property
          </Link>
        </div>

        {/* Search and Filter Section */}
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm mb-8">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            {/* Search Input */}
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search by title, location, or type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)} // Update search term
                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200 text-gray-700 placeholder-gray-400"
              />
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" /> {/* Search icon */}
            </div>
            <div className="flex items-center gap-4">
              {/* Type Filter */}
              <div className="relative">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)} // Update type filter
                  className="appearance-none pl-10 pr-8 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200 bg-white text-gray-700"
                >
                  <option value="all">All Types</option>
                  <option value="house">Houses</option>
                  <option value="apartment">Apartments</option>
                  <option value="villa">Villas</option>
                  <option value="office">Offices</option>
                </select>
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" /> {/* Filter icon */}
              </div>
              {/* Sort Dropdown */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)} // Update sort criteria
                className="pl-4 pr-8 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200 bg-white text-gray-700"
              >
                <option value="newest">Newest First</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
              </select>
            </div>
          </div>
        </div>

        {/* Property Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredProperties.map((property) => (
              <motion.div
                key={property._id}
                initial={{ opacity: 0, y: 20 }} // Animation initial state
                animate={{ opacity: 1, y: 0 }} // Animation final state
                exit={{ opacity: 0, y: -20 }} // Animation exit state
                className="bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-lg transition-all duration-300"
              >
                {/* Property Image and Actions */}
                <div className="relative h-64 overflow-hidden group">
                  <Link to={`/properties/${property._id}`}>
                    <img
                      src={property.image[0] || '/placeholder.jpg'} // Fallback image if none provided
                      alt={property.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" /> {/* Gradient overlay */}
                    <div className="absolute bottom-4 left-4">
                      <span className="px-3 py-1 bg-blue-600 text-white text-sm font-medium rounded-full">
                        {property.type} {/* Property type badge */}
                      </span>
                    </div>
                  </Link>
                  <div className="absolute top-4 right-4 flex space-x-2">
                    {/* Edit Button */}
                    <Link
                      to={`/update/${property._id}`}
                      className="p-2 bg-white/80 backdrop-blur-sm text-blue-600 rounded-full hover:bg-blue-600 hover:text-white transition-all duration-200 relative group/button"
                    >
                      <Edit3 className="w-5 h-5" /> {/* Edit icon */}
                      <span className="absolute hidden group-hover/button:block bg-gray-800 text-white text-xs rounded py-1 px-2 -top-10 right-0">
                        Edit
                      </span>
                    </Link>
                    {/* Delete Button */}
                    <button
                      onClick={() => handleRemoveProperty(property._id, property.title)} // Trigger delete action
                      className="p-2 bg-white/80 backdrop-blur-sm text-red-600 rounded-full hover:bg-red-600 hover:text-white transition-all duration-200 relative group/button"
                    >
                      <Trash2 className="w-5 h-5" /> {/* Delete icon */}
                      <span className="absolute hidden group-hover/button:block bg-gray-800 text-white text-xs rounded py-1 px-2 -top-10 right-0">
                        Delete
                      </span>
                    </button>
                    {/* Messages Button */}
                    <div className="relative">
                      <button
                        onClick={() => {
                          setShowChat(property._id); // Show chat for this property
                          setSelectedPropertyTitle(property.title); // Set property title for chat
                        }}
                        className="p-2 bg-white/80 backdrop-blur-sm text-green-600 rounded-full hover:bg-green-600 hover:text-white transition-all duration-200 relative group/button"
                      >
                        <MessageCircle className="w-5 h-5" /> {/* Messages icon */}
                        <span className="absolute hidden group-hover/button:block bg-gray-800 text-white text-xs rounded py-1 px-2 -top-10 right-0">
                          Messages
                        </span>
                      </button>
                      {unreadMessages[property._id] > 0 && (
                        <motion.span
                          initial={{ scale: 0 }} // Animation initial state
                          animate={{ scale: 1 }} // Animation final state
                          className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center"
                        >
                          {unreadMessages[property._id]} {/* Unread messages count */}
                        </motion.span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Property Details */}
                <div className="p-5">
                  <div className="mb-4">
                    <h2 className="text-xl font-semibold text-gray-900 mb-1 truncate">
                      {property.title} {/* Property title */}
                    </h2>
                    <div className="flex items-center text-gray-500 text-sm">
                      <MapPin className="w-4 h-4 mr-1" /> {/* Location icon */}
                      <span className="truncate">{property.location}</span> {/* Formatted location */}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-4">
                    <p className="text-2xl font-bold text-blue-600">
                      NPR {property.price.toLocaleString('en-NP')} {/* Formatted price */}
                    </p>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        property.availability === 'For Rent'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      For {property.availability} {/* Availability badge */}
                    </span>
                  </div>

                  {/* Property Features */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="flex flex-col items-center p-2 bg-gray-50 rounded-lg">
                      <BedDouble className="w-5 h-5 text-gray-400 mb-1" /> {/* Bedrooms icon */}
                      <span className="text-xs text-gray-600">
                        {property.bedrooms} {property.bedrooms > 1 ? 'Beds' : 'Bed'}
                      </span>
                    </div>
                    <div className="flex flex-col items-center p-2 bg-gray-50 rounded-lg">
                      <Bath className="w-5 h-5 text-gray-400 mb-1" /> {/* Bathrooms icon */}
                      <span className="text-xs text-gray-600">
                        {property.bathrooms} {property.bathrooms > 1 ? 'Baths' : 'Bath'}
                      </span>
                    </div>
                    <div className="flex flex-col items-center p-2 bg-gray-50 rounded-lg">
                      <Maximize className="w-5 h-5 text-gray-400 mb-1" /> {/* Size icon */}
                      <span className="text-xs text-gray-600">{property.squareFeet} sqft</span>
                    </div>
                  </div>

                  {/* Amenities Section */}
                  {property.amenities.length > 0 && (
                    <div className="border-t pt-4 mt-4">
                      <h3 className="text-sm font-medium text-gray-900 mb-2">Amenities</h3>
                      <div className="flex flex-wrap gap-2">
                        {property.amenities.slice(0, 3).map((amenity, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                          >
                            <Building className="w-3 h-3 mr-1" /> {/* Amenity icon */}
                            {amenity}
                          </span>
                        ))}
                        {property.amenities.length > 3 && (
                          <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                            +{property.amenities.length - 3} more {/* Extra amenities count */}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Empty State */}
        {filteredProperties.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }} // Animation initial state
            animate={{ opacity: 1 }} // Animation final state
            className="text-center py-12 bg-white rounded-2xl shadow-sm"
          >
            <Home className="w-16 h-16 text-gray-300 mx-auto mb-4" /> {/* Empty state icon */}
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No properties found</h3>
            <p className="text-gray-500 mb-4">Try adjusting your search or filters</p>
            <Link
              to="/add"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200"
            >
              <Plus className="w-5 h-5 mr-2" /> {/* Add icon */}
              Add a Property
            </Link>
          </motion.div>
        )}

        {/* Chat Dashboard */}
        <AnimatePresence>
          {showChat && (
            <AdminChatDashboard
              propertyId={showChat}
              propertyTitle={selectedPropertyTitle}
              onClose={() => {
                setShowChat(null); // Close chat
                setSelectedPropertyTitle(''); // Clear selected title
                fetchPropertiesAndMessages(); // Refresh properties and messages
              }}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// Export the component for use in other parts of the app
export default PropertyListings;