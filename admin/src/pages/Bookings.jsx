// Import required React hooks for state and effect management
import React, { useState, useEffect } from "react";
// Import axios for making HTTP requests to the backend
import axios from "axios";
// Import Framer Motion for animations
import { motion } from "framer-motion";
// Import icons for UI elements
import { Calendar, User, Home, Check, X, Loader, Filter, Search, Link as LinkIcon, Send } from "lucide-react";
// Import toast for displaying success/error notifications
import { toast } from "react-hot-toast";
// Import backend URL from the main app configuration
import { backendurl } from "../App";

// Bookings component for managing property bookings
const Bookings = () => {
  // State to store list of bookings
  const [bookings, setBookings] = useState([]);
  // State to manage loading status during data fetching
  const [loading, setLoading] = useState(true);
  // State to filter bookings by status (all, pending, confirmed, cancelled)
  const [filter, setFilter] = useState("all");
  // State to manage search term for filtering bookings
  const [searchTerm, setSearchTerm] = useState("");
  // State to track which booking is being edited for meeting link
  const [editingMeetingLink, setEditingMeetingLink] = useState(null);
  // State to store the meeting link input value
  const [meetingLink, setMeetingLink] = useState("");

  // Function to fetch bookings from the backend
  const fetchBookings = async () => {
    try {
      setLoading(true); // Set loading state
      const response = await axios.get(`${backendurl}/api/dashboard/bookings/all`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }, // Include auth token
      });

      if (response.data.success) {
        console.log('Raw API response:', response.data.bookings); // Log raw API response for debugging
        
        // Filter out bookings with missing property or user IDs
        const validBookings = response.data.bookings.filter(
          (b) => b.propertyId?._id && b.userId?._id
        );
        
        console.log('After filtering valid bookings:', validBookings); // Log valid bookings
        
        // Remove duplicate bookings based on property ID, user ID, and status
        const uniqueBookings = Array.from(
          new Map(
            validBookings.map(b => [`${b.propertyId._id}-${b.userId._id}-${b.status}`, b])
          ).values()
        );
        
        console.log('After deduplication:', uniqueBookings); // Log deduplicated bookings
        
        // Log date information for each booking
        uniqueBookings.forEach(booking => {
          console.log(`Booking ${booking._id}:`, {
            checkInDate: booking.checkInDate,
            checkOutDate: booking.checkOutDate,
            title: booking.propertyId?.title,
            hasValidDates: !!(booking.checkInDate && booking.checkOutDate)
          });
        });
        
        setBookings(uniqueBookings); // Update bookings state
        console.log(`Fetched ${uniqueBookings.length} valid bookings:`, uniqueBookings); // Log final bookings count
        
        // Log invalid bookings for debugging
        const invalidBookings = response.data.bookings.filter(
          (b) => !b.propertyId?._id || !b.userId?._id
        );
        if (invalidBookings.length > 0) {
          console.log(`Found ${invalidBookings.length} invalid bookings:`, invalidBookings);
        }
      } else {
        toast.error(response.data.message || "Failed to fetch bookings"); // Show error if API call fails
      }
    } catch (error) {
      console.error("Error fetching bookings:", error); // Log error
      toast.error("Failed to fetch bookings"); // Show user-facing error
    } finally {
      setLoading(false); // Clear loading state
    }
  };

  // Effect to fetch bookings on component mount
  useEffect(() => {
    fetchBookings();
  }, []);

  // Function to update booking status (confirmed or cancelled)
  const handleStatusChange = async (bookingId, newStatus) => {
    try {
      const response = await axios.put(
        `${backendurl}/api/dashboard/bookings/status`,
        { bookingId, status: newStatus },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } } // Include auth token
      );

      if (response.data.success) {
        toast.success(`Booking ${newStatus} successfully`); // Show success notification
        fetchBookings(); // Refresh bookings list
      } else {
        toast.error(response.data.message || "Failed to update booking status"); // Show error if API call fails
      }
    } catch (error) {
      console.error("Error updating booking:", error); // Log error
      toast.error("Failed to update booking status"); // Show user-facing error
    }
  };

  // Function to update or send a meeting link for a booking
  const handleMeetingLinkUpdate = async (bookingId) => {
    try {
      if (!meetingLink) {
        toast.error("Please enter a meeting link"); // Validate meeting link input
        return;
      }

      const response = await axios.put(
        `${backendurl}/api/dashboard/bookings/update-meeting`,
        { bookingId, meetingLink },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } } // Include auth token
      );

      if (response.data.success) {
        toast.success("Meeting link sent successfully"); // Show success notification
        setEditingMeetingLink(null); // Clear editing state
        setMeetingLink(""); // Clear meeting link input
        fetchBookings(); // Refresh bookings list
      } else {
        toast.error(response.data.message || "Failed to update meeting link"); // Show error if API call fails
      }
    } catch (error) {
      console.error("Error updating meeting link:", error); // Log error
      toast.error("Failed to update meeting link"); // Show user-facing error
    }
  };

  // Filter bookings based on search term and status filter
  const filteredBookings = bookings.filter((b) => {
    const matchesSearch =
      searchTerm === "" ||
      b.propertyId?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.userId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.userId?.email?.toLowerCase().includes(searchTerm.toLowerCase()); // Match search term in title, name, or email
    const matchesFilter = filter === "all" || b.status === filter; // Match selected status filter
    return matchesSearch && matchesFilter; // Combine search and filter conditions
  });

  // Function to determine status badge color based on booking status
  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800"; // Yellow for pending
      case "confirmed":
        return "bg-green-100 text-green-800"; // Green for confirmed
      case "cancelled":
        return "bg-red-100 text-red-800"; // Red for cancelled
      default:
        return "bg-gray-100 text-gray-800"; // Gray for unknown status
    }
  };

  // Function to determine booking type label (Rental or Purchase)
  const getAvailabilityLabel = (availability) => {
    if (!availability) return 'Unknown';
    const normalizedAvailability = availability.toLowerCase();
    return normalizedAvailability.includes('rent') ? 'Rental' : 'Purchase';
  };

  // Function to format dates with fallback for invalid or missing dates
  const formatDate = (date, booking) => {
    console.log('formatDate called with:', {
      date: date,
      dateType: typeof date,
      bookingId: booking._id,
      propertyTitle: booking.propertyId?.title
    });
    
    // Check if date exists and is valid
    if (date && date !== null && date !== undefined && date !== '') {
      try {
        const dateObj = new Date(date);
        console.log('Date object created:', dateObj, 'Valid:', !isNaN(dateObj.getTime()));
        
        // Check if the date is valid
        if (!isNaN(dateObj.getTime())) {
          const formatted = dateObj.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          });
          console.log('Formatted date:', formatted);
          return formatted;
        }
      } catch (error) {
        console.error('Error formatting date:', date, error); // Log date formatting error
      }
    }
    
    console.log('Date is invalid or null, returning fallback');
    // Return fallback based on booking type
    const availability = booking.availability || booking.propertyId?.availability || '';
    if (availability.toLowerCase().includes('rent')) {
      return 'Rental Period TBD';
    } else {
      return 'Meeting Date TBD';
    }
  };

  // Function to determine column labels based on booking type
  const getDateColumnLabel = (booking) => {
    const availability = booking.availability || booking.propertyId?.availability || '';
    if (availability.toLowerCase().includes('rent')) {
      return { checkIn: 'Start Date', checkOut: 'End Date' }; // Labels for rentals
    } else {
      return { checkIn: 'Meeting Date', checkOut: 'Follow-up Date' }; // Labels for purchases
    }
  };

  // Render loading spinner while fetching data
  if (loading) {
    return (
      <div className="min-h-screen pt-32 flex items-center justify-center">
        <Loader className="w-8 h-8 text-blue-500 animate-spin" /> {/* Loading spinner */}
      </div>
    );
  }

  // Render the bookings table UI
  return (
    <div className="min-h-screen pt-32 px-4 bg-gray-50">
      {/* Main container with max-width */}
      <div className="max-w-7xl mx-auto">
        {/* Header and Search Section */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">Bookings</h1>
            <p className="text-gray-600">Manage and track property bookings</p>
          </div>

          <div className="flex items-center gap-4">
            {/* Search input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search bookings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)} // Update search term
                className="pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" /> {/* Search icon */}
            </div>

            {/* Filter dropdown */}
            <div className="flex items-center gap-2">
              <Filter className="text-gray-400" /> {/* Filter icon */}
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)} // Update filter state
                className="rounded-lg border border-gray-200 px-4 py-2 focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Bookings</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {/* Bookings table */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start/Meeting Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End/Follow-up Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Meeting Link</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredBookings.map((booking) => {
                  const dateLabels = getDateColumnLabel(booking); // Get dynamic date column labels
                  return (
                    <motion.tr
                      key={booking._id}
                      initial={{ opacity: 0, y: 20 }} // Animation initial state
                      animate={{ opacity: 1, y: 0 }} // Animation final state
                      className="hover:bg-gray-50"
                    >
                      {/* Property Details */}
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <Home className="w-5 h-5 text-gray-400 mr-2" /> {/* Home icon */}
                          <div>
                            <p className="font-medium text-gray-900">
                              {booking.propertyId?.title || "Property Not Found"}
                            </p>
                            <p className="text-sm text-gray-500">
                              {booking.propertyId?.location || "Location Not Available"}
                            </p>
                          </div>
                        </div>
                      </td>
                      {/* Client Details */}
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <User className="w-5 h-5 text-gray-400 mr-2" /> {/* User icon */}
                          <div>
                            <p className="font-medium text-gray-900">
                              {booking.userId?.name || "Unknown User"}
                            </p>
                            <p className="text-sm text-gray-500">
                              {booking.userId?.email || "Unknown Email"}
                            </p>
                          </div>
                        </div>
                      </td>
                      {/* Start/Meeting Date */}
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <Calendar className="w-5 h-5 text-gray-400 mr-2" /> {/* Calendar icon */}
                          <div>
                            <p className="text-sm text-gray-900">
                              {formatDate(booking.checkInDate, booking)}
                            </p>
                            <p className="text-xs text-gray-500">
                              {dateLabels.checkIn}
                            </p>
                          </div>
                        </div>
                      </td>
                      {/* End/Follow-up Date */}
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <Calendar className="w-5 h-5 text-gray-400 mr-2" /> {/* Calendar icon */}
                          <div>
                            <p className="text-sm text-gray-900">
                              {formatDate(booking.checkOutDate, booking)}
                            </p>
                            <p className="text-xs text-gray-500">
                              {dateLabels.checkOut}
                            </p>
                          </div>
                        </div>
                      </td>
                      {/* Status */}
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                            booking.status
                          )}`}
                        >
                          {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)} {/* Capitalize status */}
                        </span>
                      </td>
                      {/* Booking Type */}
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-900">{getAvailabilityLabel(booking.availability)}</p>
                      </td>
                      {/* Meeting Link */}
                      <td className="px-6 py-4">
                        {editingMeetingLink === booking._id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="url"
                              value={meetingLink}
                              onChange={(e) => setMeetingLink(e.target.value)} // Update meeting link input
                              placeholder="Enter meeting link"
                              className="px-2 py-1 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm w-full"
                            />
                            <button
                              onClick={() => handleMeetingLinkUpdate(booking._id)}
                              className="p-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                              title="Send Meeting Link"
                            >
                              <Send className="w-4 h-4" /> {/* Send icon */}
                            </button>
                            <button
                              onClick={() => {
                                setEditingMeetingLink(null); // Cancel editing
                                setMeetingLink(""); // Clear input
                              }}
                              className="p-1 bg-gray-500 text-white rounded hover:bg-gray-600"
                              title="Cancel"
                            >
                              <X className="w-4 h-4" /> {/* Cancel icon */}
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            {booking.meetingLink ? (
                              <a
                                href={booking.meetingLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 underline flex items-center gap-1"
                              >
                                <LinkIcon className="w-4 h-4" /> {/* Link icon */}
                                View Link
                              </a>
                            ) : (
                              <span className="text-gray-500">No link yet</span>
                            )}
                            {booking.status === "confirmed" && (
                              <button
                                onClick={() => {
                                  setEditingMeetingLink(booking._id); // Start editing meeting link
                                  setMeetingLink(booking.meetingLink || "");
                                }}
                                className="ml-2 text-gray-400 hover:text-gray-600"
                                title="Edit Meeting Link"
                              >
                                <LinkIcon className="w-4 h-4" /> {/* Edit link icon */}
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                      {/* Actions */}
                      <td className="px-6 py-4">
                        {booking.status === "pending" && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleStatusChange(booking._id, "confirmed")}
                              className="p-1 bg-green-500 text-white rounded hover:bg-green-600"
                              title="Confirm Booking"
                            >
                              <Check className="w-4 h-4" /> {/* Confirm icon */}
                            </button>
                            <button
                              onClick={() => handleStatusChange(booking._id, "cancelled")}
                              className="p-1 bg-red-500 text-white rounded hover:bg-red-600"
                              title="Cancel Booking"
                            >
                              <X className="w-4 h-4" /> {/* Cancel icon */}
                            </button>
                          </div>
                        )}
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Empty state message */}
          {filteredBookings.length === 0 && (
            <div className="text-center py-8 text-gray-500">No bookings found</div>
          )}
        </div>
      </div>
    </div>
  );
};

// Export the component for use in other parts of the app
export default Bookings;