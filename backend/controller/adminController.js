// Import required models
import Stats from "../models/statsModel.js"; // Model for tracking API statistics
import propertymodel from "../models/propertymodel.js"; // Property model
import Appointment from "../models/appointmentModel.js"; // Appointment model
import User from "../models/Usermodel.js"; // User model
import transporter from "../config/nodemailer.js"; // Nodemailer configuration for sending emails
import { getEmailTemplate } from "../email.js"; // Utility function for generating email templates

// Destructure Property model from propertymodel
const { Property } = propertymodel;

// Function to format recent properties for recent activity
const formatRecentProperties = (properties) => {
  return properties.map((property) => ({
    type: "property", // Activity type
    description: `New property listed: ${property.title}`, // Activity description
    timestamp: property.createdAt, // Creation timestamp
  }));
};

// Function to format recent appointments for recent activity
const formatRecentAppointments = (appointments) => {
  return appointments.map((appointment) => ({
    type: "appointment", // Activity type
    description:
      appointment.userId && appointment.propertyId
        ? `${appointment.userId.name} scheduled viewing for ${appointment.propertyId.title}` // Detailed description
        : "Appointment scheduled", // Fallback description
    timestamp: appointment.createdAt, // Creation timestamp
  }));
};

// Function to format recent bookings for recent activity
const formatRecentBookings = (bookings) => {
  return bookings.map((booking) => ({
    type: "booking", // Activity type
    description: `${booking.userId.name} booked ${booking.propertyId.title} (${booking.availability})`, // Detailed description
    timestamp: booking.createdAt, // Creation timestamp
  }));
};

// Controller to fetch admin dashboard statistics
export const getAdminStats = async (req, res) => {
  try {
    console.log('Property model:', Property); // Debug log for Property model
    // Validate Property model
    if (!Property || typeof Property.countDocuments !== 'function') {
      throw new Error('Property model is not properly defined');
    }

    // Fetch multiple statistics concurrently using Promise.all
    const [
      totalProperties, // Total number of properties
      activeListings, // Number of properties available for rent
      totalUsers, // Total number of users
      pendingAppointments, // Number of pending appointments
      pendingBookings, // Number of pending bookings
      recentActivity, // Recent activities (properties, appointments, bookings)
      viewsData, // Data for property views chart
    ] = await Promise.all([
      Property.countDocuments(), // Count all properties
      Property.countDocuments({ availability: "rent" }), // Count properties with 'rent' availability
      User.countDocuments(), // Count all users
      Appointment.countDocuments({ status: "pending" }), // Count pending appointments
      // Count pending bookings using aggregation
      User.aggregate([
        { $unwind: "$bookings" }, // Unwind bookings array
        { $match: { "bookings.status": "pending" } }, // Match pending bookings
        { $count: "pendingBookings" } // Count results
      ]).then(result => result[0]?.pendingBookings || 0), // Extract count or default to 0
      getRecentActivity(), // Fetch recent activity
      getViewsData(), // Fetch chart data for property views
    ]);

    // Send successful response with stats
    res.json({
      success: true,
      stats: {
        totalProperties,
        activeListings,
        totalUsers,
        pendingAppointments,
        pendingBookings,
        recentActivity,
        viewsData,
      },
    });
  } catch (error) {
    console.error("Admin stats error:", error.message); // Log error
    res.status(500).json({
      success: false,
      message: "Error fetching admin statistics",
      error: error.message,
    });
  }
};

// Function to fetch recent activity (properties, appointments, bookings)
const getRecentActivity = async () => {
  try {
    // Fetch recent data concurrently
    const [recentProperties, recentAppointments, recentBookings] = await Promise.all([
      // Fetch 5 most recent properties
      Property.find()
        .sort({ createdAt: -1 }) // Sort by newest
        .limit(5)
        .select("title createdAt"), // Select only title and createdAt
      // Fetch 5 most recent appointments
      Appointment.find()
        .sort({ createdAt: -1 }) // Sort by newest
        .limit(5)
        .populate("propertyId", "title") // Populate property title
        .populate("userId", "name"), // Populate user name
      // Fetch 5 most recent bookings using aggregation
      User.aggregate([
        { $unwind: "$bookings" }, // Unwind bookings array
        { $sort: { "bookings.createdAt": -1 } }, // Sort by newest
        { $limit: 5 }, // Limit to 5
        {
          $lookup: {
            from: "properties", // Join with properties collection
            localField: "bookings.propertyId",
            foreignField: "_id",
            as: "property",
          },
        },
        { $unwind: "$property" }, // Unwind joined properties
        {
          $project: {
            createdAt: "$bookings.createdAt", // Select booking creation date
            userId: { name: "$name" }, // Select user name
            propertyId: { title: "$property.title" }, // Select property title
            availability: "$bookings.availability", // Select booking availability
          },
        },
      ]),
    ]);

    // Filter out invalid appointments (missing userId or propertyId)
    const validAppointments = recentAppointments.filter(
      (appointment) => appointment.userId && appointment.propertyId
    );

    // Combine and sort activities, then limit to 5
    return [
      ...formatRecentProperties(recentProperties),
      ...formatRecentAppointments(validAppointments),
      ...formatRecentBookings(recentBookings),
    ].sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);
  } catch (error) {
    console.error("Error getting recent activity:", error); // Log error
    return []; // Return empty array on error
  }
};

// Function to generate chart data for property views over the last 30 days
const getViewsData = async () => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30); // Calculate date 30 days ago

    // Aggregate view statistics for property single page views
    const stats = await Stats.aggregate([
      {
        $match: {
          endpoint: /^\/api\/products\/single\//, // Match single property view endpoints
          method: "GET",
          timestamp: { $gte: thirtyDaysAgo }, // Filter for last 30 days
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$timestamp" }, // Group by date
          },
          count: { $sum: 1 }, // Count views per day
        },
      },
      { $sort: { _id: 1 } }, // Sort by date ascending
    ]);

    // Generate labels and data for the last 30 days
    const labels = [];
    const data = [];
    for (let i = 30; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().split("T")[0]; // Format as YYYY-MM-DD
      labels.push(dateString);
      const stat = stats.find((s) => s._id === dateString);
      data.push(stat ? stat.count : 0); // Use view count or 0 if no data
    }

    // Return chart data structure
    return {
      labels,
      datasets: [
        {
          label: "Property Views",
          data,
          borderColor: "rgb(75, 192, 192)", // Line color
          backgroundColor: "rgba(75, 192, 192, 0.2)", // Fill color
          tension: 0.4, // Line smoothness
          fill: true, // Fill area under the line
        },
      ],
    };
  } catch (error) {
    console.error("Error generating chart data:", error); // Log error
    // Return empty chart data structure on error
    return {
      labels: [],
      datasets: [
        {
          label: "Property Views",
          data: [],
          borderColor: "rgb(75, 192, 192)",
          backgroundColor: "rgba(75, 192, 192, 0.2)",
          tension: 0.4,
          fill: true,
        },
      ],
    };
  }
};

// Controller to fetch all appointments
export const getAllAppointments = async (req, res) => {
  try {
    // Fetch all appointments, populate related data, and sort by newest
    const appointments = await Appointment.find()
      .populate("propertyId", "title location") // Populate property title and location
      .populate("userId", "name email") // Populate user name and email
      .sort({ createdAt: -1 }); // Sort by newest

    res.json({
      success: true,
      appointments, // Return appointments data
    });
  } catch (error) {
    console.error("Error fetching appointments:", error); // Log error
    res.status(500).json({
      success: false,
      message: "Error fetching appointments",
    });
  }
};

// Controller to update appointment status and send email notification
export const updateAppointmentStatus = async (req, res) => {
  try {
    const { appointmentId, status } = req.body; // Extract appointment ID and new status

    // Update appointment status and populate related data
    const appointment = await Appointment.findByIdAndUpdate(
      appointmentId,
      { status },
      { new: true } // Return updated document
    ).populate("propertyId userId");

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found", // Handle missing appointment
      });
    }

    // Prepare email notification
    const mailOptions = {
      from: process.env.EMAIL, // Sender email
      to: appointment.userId.email, // Recipient email
      subject: `Viewing Appointment ${
        status.charAt(0).toUpperCase() + status.slice(1)
      } - Home Rentals`, // Email subject with capitalized status
      html: getEmailTemplate(appointment, status), // Generate email content
    };

    await transporter.sendMail(mailOptions); // Send email

    res.json({
      success: true,
      message: `Appointment ${status} successfully`,
      appointment, // Return updated appointment
    });
  } catch (error) {
    console.error("Error updating appointment:", error); // Log error
    res.status(500).json({
      success: false,
      message: "Error updating appointment",
    });
  }
};