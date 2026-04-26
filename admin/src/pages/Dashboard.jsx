// Import required React hooks for state and effect management
import React, { useState, useEffect } from "react";
// Import axios for making HTTP requests to the backend
import axios from "axios";
// Import Framer Motion for animations
import { motion } from "framer-motion";
// Import Chart.js components for rendering line charts
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
// Import Line component from react-chartjs-2 for rendering charts
import { Line } from "react-chartjs-2";
// Import icons for UI elements
import {
  Home,
  Activity,
  Users,
  Calendar,
  TrendingUp,
  Eye,
  AlertCircle,
  Loader,
  BookOpen,
} from "lucide-react";
// Import backend URL from the main app configuration
import { backendurl } from "../App";

// Register Chart.js components for use in the Line chart
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

// Dashboard component for displaying property management statistics
const Dashboard = () => {
  // State to store dashboard statistics and status
  const [stats, setStats] = useState({
    totalProperties: 0, // Total number of properties
    activeListings: 0, // Number of active listings
    totalViews: 0, // Total property page views
    pendingAppointments: 0, // Number of pending appointments
    pendingBookings: 0, // Number of pending bookings
    recentActivity: [], // List of recent activities
    viewsData: {}, // Data for the views chart
    loading: true, // Loading state for data fetching
    error: null, // Error state for failed requests
  });

  // Chart configuration options for the Line chart
  const chartOptions = {
    responsive: true, // Make chart responsive to container size
    maintainAspectRatio: false, // Allow chart to fill container height
    plugins: {
      legend: {
        position: "top", // Position legend at the top
      },
      title: {
        display: true,
        text: "Property Views Over Time", // Chart title
      },
      tooltip: {
        mode: 'index',
        intersect: false, // Show tooltip for all datasets at cursor position
      },
    },
    scales: {
      y: {
        beginAtZero: true, // Start y-axis at zero
        ticks: {
          stepSize: 1, // Whole number increments
          precision: 0, // No decimal places
        },
      },
      x: {
        grid: {
          display: false, // Hide x-axis grid lines
        },
        ticks: {
          maxRotation: 45, // Rotate x-axis labels for better readability
          minRotation: 45,
        },
      },
    },
    interaction: {
      intersect: false,
      mode: 'index', // Show tooltip for all data points at x-axis position
    },
    elements: {
      line: {
        tension: 0.4, // Smooth line curves
      },
      point: {
        radius: 4, // Default point size
        hoverRadius: 6, // Larger point size on hover
      },
    },
  };

  // Function to fetch dashboard statistics from the backend
  const fetchStats = async () => {
    try {
      const response = await axios.get(`${backendurl}/api/admin/stats`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }, // Include auth token
      });
      if (response.data.success) {
        setStats((prev) => ({
          ...prev,
          ...response.data.stats, // Update stats with API response
          loading: false,
          error: null,
        }));
      } else {
        throw new Error(response.data.message || "Failed to fetch stats"); // Handle API error
      }
    } catch (error) {
      setStats((prev) => ({
        ...prev,
        loading: false,
        error: error.message || "Failed to fetch dashboard data", // Set error state
      }));
      console.error("Error fetching stats:", error); // Log error
    }
  };

  // Effect to fetch stats on component mount and refresh every 5 minutes
  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 300000); // Refresh every 5 minutes
    return () => clearInterval(interval); // Cleanup interval on unmount
  }, []);

  // Array of stat card configurations for display
  const statCards = [
    {
      title: "Total Properties",
      value: stats.totalProperties,
      icon: Home,
      color: "bg-blue-500",
      description: "Total properties listed",
    },
    {
      title: "Active Listings",
      value: stats.activeListings,
      icon: Activity,
      color: "bg-green-500",
      description: "Currently active listings",
    },
    {
      title: "Total Views",
      value: stats.totalViews,
      icon: Eye,
      color: "bg-purple-500",
      description: "Property page views",
    },
    {
      title: "Pending Appointments",
      value: stats.pendingAppointments,
      icon: Calendar,
      color: "bg-orange-500",
      description: "Awaiting confirmation",
    },
    {
      title: "Pending Bookings",
      value: stats.pendingBookings,
      icon: BookOpen,
      color: "bg-yellow-500",
      description: "Awaiting confirmation",
    },
  ];

  // Render loading state
  if (stats.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" /> {/* Loading spinner */}
          <p className="text-gray-600">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (stats.error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" /> {/* Error icon */}
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Error Loading Dashboard
          </h3>
          <p className="text-gray-500 mb-4">{stats.error}</p>
          <button
            onClick={fetchStats}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 
              transition-colors duration-200 flex items-center gap-2 mx-auto"
          >
            <TrendingUp className="w-4 h-4" /> {/* Retry icon */}
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Render the dashboard UI
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} // Animation initial state
      animate={{ opacity: 1, y: 0 }} // Animation final state
      className="min-h-screen pt-32 px-4 bg-gray-50"
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">Dashboard</h1>
            <p className="text-gray-600">Overview of your property management system</p>
          </div>
          <button
            onClick={fetchStats}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 
              transition-colors duration-200 flex items-center gap-2"
          >
            <TrendingUp className="w-4 h-4" /> {/* Refresh icon */}
            Refresh Data
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }} // Animation initial state
              animate={{ opacity: 1, y: 0 }} // Animation final state
              transition={{ delay: index * 0.1 }} // Staggered animation
              className="bg-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${stat.color}`}>
                  <stat.icon className="w-6 h-6 text-white" /> {/* Stat icon */}
                </div>
                <span className="text-sm font-medium text-gray-500">
                  Last 30 days
                </span>
              </div>
              <h3 className="text-lg font-medium text-gray-900">{stat.title}</h3>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
              <p className="text-sm text-gray-500 mt-1">{stat.description}</p>
            </motion.div>
          ))}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Property Views Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} // Animation initial state
            animate={{ opacity: 1, y: 0 }} // Animation final state
            className="bg-white p-6 rounded-lg shadow-lg"
          >
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              Property Views
            </h2>
            <div className="h-[400px]">
              {stats.viewsData && Object.keys(stats.viewsData).length > 0 ? (
                <Line data={stats.viewsData} options={chartOptions} /> // Render Line chart
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-gray-500">No view data available</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} // Animation initial state
            animate={{ opacity: 1, y: 0 }} // Animation final state
            className="bg-white p-6 rounded-lg shadow-lg"
          >
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              Recent Activity
            </h2>
            <div className="space-y-4 max-h-[400px] overflow-y-auto">
              {stats.recentActivity?.length > 0 ? (
                stats.recentActivity.map((activity, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }} // Animation initial state
                    animate={{ opacity: 1, x: 0 }} // Animation final state
                    transition={{ delay: index * 0.1 }} // Staggered animation
                    className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-lg 
                      transition-colors duration-200"
                  >
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Users className="w-5 h-5 text-blue-600" /> {/* Activity icon */}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {activity.description}
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(activity.timestamp).toLocaleString()} {/* Format timestamp */}
                      </p>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No recent activity
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

// Export the component for use in other parts of the app
export default Dashboard;