// Import required React hooks for state and effect management
import React, { useState, useEffect } from 'react';
// Import axios for making HTTP requests to the backend
import axios from 'axios';
// Import Framer Motion for animations
import { motion } from 'framer-motion';
// Import icons for UI elements
import { Mail, User, Phone, Clock, Trash2 } from 'lucide-react';
// Import backend URL from the main app configuration
import { backendurl } from '../App'; // Fixed import: lowercase backendurl and correct path
// Import toast for displaying success/error notifications
import { toast } from 'react-hot-toast'; // Changed to react-hot-toast to match App.jsx

// Inbox component for managing and displaying messages
const Inbox = () => {
  // State to store the list of messages
  const [messages, setMessages] = useState([]);
  // State to manage loading status during data fetching
  const [loading, setLoading] = useState(true);

  // Effect to fetch messages from the backend on component mount
  useEffect(() => {
    // Function to fetch messages
    const fetchMessages = async () => {
      try {
        const token = localStorage.getItem('token'); // Retrieve auth token
        const response = await axios.get(`${backendurl}/api/forms/messages`, {
          headers: { Authorization: `Bearer ${token}` }, // Include auth token in request
        });
        setMessages(response.data); // Update messages state with API response
        setLoading(false); // Clear loading state
      } catch (error) {
        console.error('Error fetching messages:', error); // Log error
        toast.error('Error fetching messages'); // Show user-facing error
        setLoading(false); // Clear loading state
      }
    };

    fetchMessages(); // Call the fetch function
  }, []); // Empty dependency array to run only on mount

  // Function to handle message deletion
  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem('token'); // Retrieve auth token
      await axios.delete(`${backendurl}/api/forms/messages/${id}`, {
        headers: { Authorization: `Bearer ${token}` }, // Include auth token in request
      });
      // Update messages state by filtering out the deleted message
      setMessages(messages.filter(message => message._id !== id));
      toast.success('Message deleted successfully'); // Show success notification
    } catch (error) {
      console.error('Error deleting message:', error); // Log error
      toast.error('Error deleting message'); // Show user-facing error
    }
  };

  // Render loading spinner while fetching data
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div> {/* Loading spinner */}
      </div>
    );
  }

  // Render the inbox UI
  return (
    <motion.div
      initial={{ opacity: 0 }} // Animation initial state
      animate={{ opacity: 1 }} // Animation final state
      transition={{ duration: 0.5 }} // Animation duration
      className="max-w-7xl mx-auto px-4 py-8 mt-16" // Main container styling
    >
      <h1 className="text-3xl font-bold mb-6">Inbox</h1> {/* Page title */}
      {messages.length === 0 ? (
        <p className="text-gray-600">No messages found</p> // Empty state message
      ) : (
        <div className="space-y-4"> {/* Container for message cards */}
          {messages.map((message) => (
            <div key={message._id} className="bg-white p-6 rounded-lg shadow-md"> {/* Message card */}
              <div className="flex justify-between items-start">
                <div className="space-y-2"> {/* Message details container */}
                  {/* Sender Name */}
                  <div className="flex items-center space-x-2">
                    <User className="h-5 w-5 text-blue-600" /> {/* User icon */}
                    <p className="font-semibold">{message.name}</p> {/* Sender's name */}
                  </div>
                  {/* Sender Email */}
                  <div className="flex items-center space-x-2">
                    <Mail className="h-5 w-5 text-blue-600" /> {/* Email icon */}
                    <p>{message.email}</p> {/* Sender's email */}
                  </div>
                  {/* Sender Phone (if available) */}
                  {message.phone && (
                    <div className="flex items-center space-x-2">
                      <Phone className="h-5 w-5 text-blue-600" /> {/* Phone icon */}
                      <p>{message.phone}</p> {/* Sender's phone number */}
                    </div>
                  )}
                  {/* Message Content */}
                  <div className="flex items-start space-x-2">
                    <Mail className="h-5 w-5 text-blue-600 mt-1" /> {/* Message icon */}
                    <p className="text-gray-600">{message.message}</p> {/* Message text */}
                  </div>
                  {/* Timestamp */}
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <Clock className="h-4 w-4" /> {/* Clock icon */}
                    <p>{new Date(message.createdAt).toLocaleString()}</p> {/* Formatted timestamp */}
                  </div>
                </div>
                {/* Delete Button */}
                <button
                  onClick={() => handleDelete(message._id)} // Trigger delete action
                  className="text-red-600 hover:text-red-800" // Styling for delete button
                >
                  <Trash2 className="h-5 w-5" /> {/* Trash icon */}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

// Export the component for use in other parts of the app
export default Inbox;