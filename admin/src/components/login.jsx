// Import required React hooks for state management
import React, { useState } from 'react';
// Import useNavigate hook for programmatic navigation
import { useNavigate } from 'react-router-dom';
// Import axios for making HTTP requests to the backend
import axios from 'axios';
// Import toast for displaying success/error notifications
import { toast } from 'react-hot-toast';
// Import backend URL from the main app configuration
import { backendurl } from '../App';

// Login component for admin authentication
const Login = () => {
  // State to manage email input
  const [email, setEmail] = useState('');
  // State to manage password input
  const [password, setPassword] = useState('');
  // Hook to navigate to different routes
  const navigate = useNavigate();

  // Handle form submission for admin login
  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevent default form submission behavior
    try {
      console.log('Attempting admin login with email:', email); // Log login attempt
      // Send POST request to admin login endpoint
      const response = await axios.post(`${backendurl}/api/users/admin`, {
        email,
        password,
      });

      if (response.data.success) {
        // Store authentication token and user details in localStorage
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('isAdmin', response.data.isAdmin);
        localStorage.setItem('userId', response.data.user._id);
        console.log('Admin login successful, token:', response.data.token); // Log success
        toast.success('Admin login successful!'); // Show success notification
        navigate('/list'); // Redirect to list page
      } else {
        // Show error notification if login fails
        toast.error(response.data.message || 'Admin login failed');
      }
    } catch (error) {
      // Log and handle login errors
      console.error('Admin login error:', error.response?.data?.message || error.message);
      toast.error(error.response?.data?.message || 'Admin login failed. Please try again.');
    }
  };

  // Render the login form UI
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Container for the login form */}
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Admin Login</h2>
        {/* Form for email and password input */}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 mb-2" htmlFor="email">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)} // Update email state
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              placeholder="Enter your email"
              required // Make field mandatory
            />
          </div>
          <div className="mb-6">
            <label className="block text-gray-700 mb-2" htmlFor="password">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)} // Update password state
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              placeholder="Enter your password"
              required // Make field mandatory
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-all duration-200"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
};

// Export the component for use in other parts of the app
export default Login;