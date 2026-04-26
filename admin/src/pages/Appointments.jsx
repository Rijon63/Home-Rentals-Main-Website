// Import required React hooks for state and effect management
import React, { useState, useEffect } from "react";
// Import axios for making HTTP requests to the backend
import axios from "axios";
// Import Framer Motion for animations
import { motion } from "framer-motion";
// Import icons for UI elements
import {
  Calendar,
  Clock,
  User,
  Home,
  Check,
  X,
  Loader,
  Filter,
  Search,
  Link as LinkIcon,
  Send,
} from "lucide-react";
// Import toast for displaying success/error notifications
import { toast } from "react-hot-toast";
// Import backend URL from the main app configuration
import { backendurl } from "../App";

// Appointments component for managing property viewing appointments
const Appointments = () => {
  // State to store list of appointments
  const [appointments, setAppointments] = useState([]);
  // State to manage loading status during data fetching
  const [loading, setLoading] = useState(true);
  // State to filter appointments by status (all, pending, confirmed, cancelled)
  const [filter, setFilter] = useState("all");
  // State to manage search term for filtering appointments
  const [searchTerm, setSearchTerm] = useState("");
  // State to track which appointment is being edited for meeting link
  const [editingMeetingLink, setEditingMeetingLink] = useState(null);
  // State to store the meeting link input value
  const [meetingLink, setMeetingLink] = useState("");

  // Function to fetch appointments from the backend
  const fetchAppointments = async () => {
    try {
      setLoading(true); // Set loading state
      const response = await axios.get(`${backendurl}/api/appointments/all`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }, // Include auth token
      });

      if (response.data.success) {
        // Filter out appointments with missing user or property data
        const validAppointments = response.data.appointments.filter(
          (apt) => apt.userId && apt.propertyId
        );
        setAppointments(validAppointments); // Update appointments state
      } else {
        toast.error(response.data.message); // Show error if API call fails
      }
    } catch (error) {
      console.error("Error fetching appointments:", error); // Log error
      toast.error("Failed to fetch appointments"); // Show user-facing error
    } finally {
      setLoading(false); // Clear loading state
    }
  };

  // Function to update appointment status (confirmed or cancelled)
  const handleStatusChange = async (appointmentId, newStatus) => {
    try {
      const response = await axios.put(
        `${backendurl}/api/appointments/status`,
        {
          appointmentId,
          status: newStatus,
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }, // Include auth token
        }
      );

      if (response.data.success) {
        toast.success(`Appointment ${newStatus} successfully`); // Show success notification
        fetchAppointments(); // Refresh appointments list
      } else {
        toast.error(response.data.message); // Show error if API call fails
      }
    } catch (error) {
      console.error("Error updating appointment:", error); // Log error
      toast.error("Failed to update appointment status"); // Show user-facing error
    }
  };

  // Function to update or send a meeting link for an appointment
  const handleMeetingLinkUpdate = async (appointmentId) => {
    try {
      if (!meetingLink) {
        toast.error("Please enter a meeting link"); // Validate meeting link input
        return;
      }

      const response = await axios.put(
        `${backendurl}/api/appointments/update-meeting`,
        {
          appointmentId,
          meetingLink,
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }, // Include auth token
        }
      );

      if (response.data.success) {
        toast.success("Meeting link sent successfully"); // Show success notification
        setEditingMeetingLink(null); // Clear editing state
        setMeetingLink(""); // Clear meeting link input
        fetchAppointments(); // Refresh appointments list
      } else {
        toast.error(response.data.message); // Show error if API call fails
      }
    } catch (error) {
      console.error("Error updating meeting link:", error); // Log error
      toast.error("Failed to update meeting link"); // Show user-facing error
    }
  };

  // Effect to fetch appointments on component mount
  useEffect(() => {
    fetchAppointments();
  }, []);

  // Filter appointments based on search term and status filter
  const filteredAppointments = appointments.filter((apt) => {
    const matchesSearch =
      searchTerm === "" ||
      apt.propertyId?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      apt.userId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      apt.userId?.email?.toLowerCase().includes(searchTerm.toLowerCase()); // Match search term in title, name, or email

    const matchesFilter = filter === "all" || apt.status === filter; // Match selected status filter

    return matchesSearch && matchesFilter; // Combine search and filter conditions
  });

  // Function to determine status badge color based on appointment status
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

  // Render loading spinner while fetching data
  if (loading) {
    return (
      <div className="min-h-screen pt-32 flex items-center justify-center">
        <Loader className="w-8 h-8 text-blue-500 animate-spin" /> {/* Loading spinner */}
      </div>
    );
  }

  // Render the appointments table UI
  return (
    <div className="min-h-screen pt-32 px-4 bg-gray-50">
      {/* Main container with max-width */}
      <div className="max-w-7xl mx-auto">
        {/* Header and Search Section */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">
              Appointments
            </h1>
            <p className="text-gray-600">
              Manage and track property viewing appointments
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* Search input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search appointments..."
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
                <option value="all">All Appointments</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {/* Appointments table */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Property
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Meeting Link
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredAppointments.map((appointment) => (
                  <motion.tr
                    key={appointment._id}
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
                            {appointment.propertyId.title}
                          </p>
                          <p className="text-sm text-gray-500">
                            {appointment.propertyId.location}
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
                            {appointment.userId?.name || "Unknown"}
                          </p>
                          <p className="text-sm text-gray-500">
                            {appointment.userId?.email || "Unknown"}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Date & Time */}
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <Calendar className="w-5 h-5 text-gray-400 mr-2" /> {/* Calendar icon */}
                        <div>
                          <p className="font-medium text-gray-900">
                            {new Date(appointment.date).toLocaleDateString()} {/* Format date */}
                          </p>
                          <div className="flex items-center text-sm text-gray-500">
                            <Clock className="w-4 h-4 mr-1" /> {/* Clock icon */}
                            {appointment.time}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                          appointment.status
                        )}`}
                      >
                        {appointment.status.charAt(0).toUpperCase() +
                          appointment.status.slice(1)} {/* Capitalize status */}
                      </span>
                    </td>

                    {/* Meeting Link */}
                    <td className="px-6 py-4">
                      {editingMeetingLink === appointment._id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="url"
                            value={meetingLink}
                            onChange={(e) => setMeetingLink(e.target.value)} // Update meeting link input
                            placeholder="Enter meeting link"
                            className="px-2 py-1 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm w-full"
                          />
                          <button
                            onClick={() =>
                              handleMeetingLinkUpdate(appointment._id)
                            }
                            className="p-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                          >
                            <Send className="w-4 h-4" /> {/* Send icon */}
                          </button>
                          <button
                            onClick={() => {
                              setEditingMeetingLink(null); // Cancel editing
                              setMeetingLink(""); // Clear input
                            }}
                            className="p-1 bg-gray-500 text-white rounded hover:bg-gray-600"
                          >
                            <X className="w-4 h-4" /> {/* Cancel icon */}
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          {appointment.meetingLink ? (
                            <a
                              href={appointment.meetingLink}
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
                          {appointment.status === "confirmed" && (
                            <button
                              onClick={() => {
                                setEditingMeetingLink(appointment._id); // Start editing meeting link
                                setMeetingLink(appointment.meetingLink || "");
                              }}
                              className="ml-2 text-gray-400 hover:text-gray-600"
                            >
                              <LinkIcon className="w-4 h-4" /> {/* Edit link icon */}
                            </button>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4">
                      {appointment.status === "pending" && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              handleStatusChange(appointment._id, "confirmed")
                            }
                            className="p-1 bg-green-500 text-white rounded hover:bg-green-600"
                          >
                            <Check className="w-4 h-4" /> {/* Confirm icon */}
                          </button>
                          <button
                            onClick={() =>
                              handleStatusChange(appointment._id, "cancelled")
                            }
                            className="p-1 bg-red-500 text-white rounded hover:bg-red-600"
                          >
                            <X className="w-4 h-4" /> {/* Cancel icon */}
                          </button>
                        </div>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Empty state message */}
          {filteredAppointments.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No appointments found
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Export the component for use in other parts of the app
export default Appointments;