// Import required models
import Stats from '../models/statsModel.js'; // Model for tracking API statistics
import propertyModels from '../models/propertymodel.js'; // Property model
import Appointment from '../models/appointmentModel.js'; // Appointment model
import User from '../models/Usermodel.js'; // User model
import transporter from "../config/nodemailer.js"; // Nodemailer configuration for sending emails
import { getSchedulingEmailTemplate, getEmailTemplate } from '../email.js'; // Utility functions for email templates

// Destructure Property model from propertyModels
const { Property } = propertyModels;

// Format recent properties for recent activity
const formatRecentProperties = (properties) => {
  return properties.map(property => ({
    type: 'property', // Activity type
    description: `New property listed: ${property.title}`, // Activity description
    timestamp: property.createdAt // Creation timestamp
  }));
};

// Format recent appointments for recent activity
const formatRecentAppointments = (appointments) => {
  return appointments.map(appointment => ({
    type: 'appointment', // Activity type
    description: `${appointment.userId.name} scheduled viewing for ${appointment.propertyId.title}`, // Detailed description
    timestamp: appointment.createdAt // Creation timestamp
  }));
};

// Controller to fetch admin dashboard statistics
export const getAdminStats = async (req, res) => {
  try {
    // Fetch multiple statistics concurrently using Promise.all
    const [
      totalProperties, // Total number of properties
      activeListings, // Number of active properties
      totalUsers, // Total number of users
      pendingAppointments, // Number of pending appointments
      recentActivity, // Recent activities (properties and appointments)
      viewsData, // Data for property views chart
      revenue // Total revenue from properties
    ] = await Promise.all([
      Property.countDocuments(), // Count all properties
      Property.countDocuments({ status: 'active' }), // Count active properties
      User.countDocuments(), // Count all users
      Appointment.countDocuments({ status: 'pending' }), // Count pending appointments
      getRecentActivity(), // Fetch recent activity
      getViewsData(), // Fetch chart data for property views
      calculateRevenue() // Calculate total revenue
    ]);

    // Send successful response with stats
    res.json({
      success: true,
      stats: {
        totalProperties,
        activeListings,
        totalUsers,
        pendingAppointments,
        recentActivity,
        viewsData,
        revenue
      }
    });
  } catch (error) {
    console.error('Admin stats error:', error); // Log error
    res.status(500).json({
      success: false,
      message: 'Error fetching admin statistics'
    });
  }
};

// Function to fetch recent activity (properties and appointments)
const getRecentActivity = async () => {
  try {
    // Fetch recent data concurrently
    const [recentProperties, recentAppointments] = await Promise.all([
      // Fetch 5 most recent properties
      Property.find()
        .sort({ createdAt: -1 }) // Sort by newest
        .limit(5)
        .select('title createdAt'), // Select only title and createdAt
      // Fetch 5 most recent appointments
      Appointment.find()
        .sort({ createdAt: -1 }) // Sort by newest
        .limit(5)
        .populate('propertyId', 'title') // Populate property title
        .populate('userId', 'name') // Populate user name
    ]);

    // Combine and sort activities
    return [
      ...formatRecentProperties(recentProperties),
      ...formatRecentAppointments(recentAppointments)
    ].sort((a, b) => b.timestamp - a.timestamp); // Sort by newest
  } catch (error) {
    console.error('Error getting recent activity:', error); // Log error
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
          method: 'GET',
          timestamp: { $gte: thirtyDaysAgo } // Filter for last 30 days
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } // Group by date
          },
          count: { $sum: 1 } // Count views per day
        }
      },
      { $sort: { "_id": 1 } } // Sort by date ascending
    ]);

    // Generate labels and data for the last 30 days
    const labels = [];
    const data = [];
    for (let i = 30; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
      labels.push(dateString);
      const stat = stats.find(s => s._id === dateString);
      data.push(stat ? stat.count : 0); // Use view count or 0 if no data
    }

    // Return chart data structure
    return {
      labels,
      datasets: [{
        label: 'Property Views',
        data,
        borderColor: 'rgb(75, 192, 192)', // Line color
        backgroundColor: 'rgba(75, 192, 192, 0.2)', // Fill color
        tension: 0.4, // Line smoothness
        fill: true // Fill area under the line
      }]
    };
  } catch (error) {
    console.error('Error generating chart data:', error); // Log error
    // Return empty chart data structure on error
    return {
      labels: [],
      datasets: [{
        label: 'Property Views',
        data: [],
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.4,
        fill: true
      }]
    };
  }
};

// Function to calculate total revenue from properties
const calculateRevenue = async () => {
  try {
    const properties = await Property.find(); // Fetch all properties
    // Sum up prices of all properties
    return properties.reduce((total, property) => total + Number(property.price), 0);
  } catch (error) {
    console.error('Error calculating revenue:', error); // Log error
    return 0; // Return 0 on error
  }
};

// Controller to fetch all appointments
export const getAllAppointments = async (req, res) => {
  try {
    // Fetch all appointments, populate related data, and sort by newest
    const appointments = await Appointment.find()
      .populate('propertyId', 'title location') // Populate property title and location
      .populate('userId', 'name email') // Populate user name and email
      .sort({ createdAt: -1 }); // Sort by newest

    res.json({
      success: true,
      appointments // Return appointments data
    });
  } catch (error) {
    console.error('Error fetching appointments:', error); // Log error
    res.status(500).json({
      success: false,
      message: 'Error fetching appointments'
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
    ).populate('propertyId userId');

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found' // Handle missing appointment
      });
    }

    // Prepare email notification
    const mailOptions = {
      from: process.env.EMAIL, // Sender email
      to: appointment.userId.email, // Recipient email
      subject: `Viewing Appointment ${status.charAt(0).toUpperCase() + status.slice(1)} - Home Rentals`, // Email subject with capitalized status
      html: getEmailTemplate(appointment, status) // Generate email content
    };

    await transporter.sendMail(mailOptions); // Send email

    res.json({
      success: true,
      message: `Appointment ${status} successfully`,
      appointment // Return updated appointment
    });
  } catch (error) {
    console.error('Error updating appointment:', error); // Log error
    res.status(500).json({
      success: false,
      message: 'Error updating appointment'
    });
  }
};

// Controller to schedule a new viewing appointment
export const scheduleViewing = async (req, res) => {
  try {
    const { propertyId, date, time, notes } = req.body; // Extract request body data

    // req.user is set by the protect middleware
    const userId = req.user._id; // Get user ID from middleware

    // Check if property exists
    const property = await Property.findById(propertyId);
    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found' // Handle missing property
      });
    }

    // Check for duplicate appointments
    const existingAppointment = await Appointment.findOne({
      propertyId,
      date,
      time,
      status: { $ne: 'cancelled' } // Exclude cancelled appointments
    });

    if (existingAppointment) {
      return res.status(400).json({
        success: false,
        message: 'This time slot is already booked' // Handle duplicate booking
      });
    }

    // Create new appointment
    const appointment = new Appointment({
      propertyId,
      userId,
      date,
      time,
      notes,
      status: 'pending' // Set initial status
    });

    await appointment.save(); // Save appointment
    await appointment.populate(['propertyId', 'userId']); // Populate related data

    // Send confirmation email
    const mailOptions = {
      from: process.env.EMAIL, // Sender email
      to: req.user.email, // Recipient email
      subject: "Viewing Scheduled - Home Rentals", // Email subject
      html: getSchedulingEmailTemplate(appointment, date, time, notes) // Generate email content
    };

    await transporter.sendMail(mailOptions); // Send email

    res.status(201).json({
      success: true,
      message: 'Viewing scheduled successfully',
      appointment // Return created appointment
    });
  } catch (error) {
    console.error('Error scheduling viewing:', error); // Log error
    res.status(500).json({
      success: false,
      message: 'Error scheduling viewing'
    });
  }
};

// Controller to cancel an appointment
export const cancelAppointment = async (req, res) => {
  try {
    const appointmentId = req.params.id; // Extract appointment ID from params
    // Fetch appointment and populate related data
    const appointment = await Appointment.findById(appointmentId)
      .populate('propertyId', 'title')
      .populate('userId', 'email');

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found' // Handle missing appointment
      });
    }

    // Verify user owns this appointment
    if (appointment.userId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this appointment' // Handle unauthorized access
      });
    }

    // Update appointment status and reason
    appointment.status = 'cancelled';
    appointment.cancelReason = req.body.reason || 'Cancelled by user';
    await appointment.save();

    // Send cancellation email
    const mailOptions = {
      from: process.env.EMAIL, // Sender email
      to: appointment.userId.email, // Recipient email
      subject: 'Appointment Cancelled - Home Rentals', // Email subject
      html: `
        <div style="max-width: 600px; margin: 20px auto; padding: 30px; background: #ffffff; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h1 style="color: #2563eb; text-align: center;">Appointment Cancelled</h1>
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p>Your viewing appointment for <strong>${appointment.propertyId.title}</strong> has been cancelled.</p>
            <p><strong>Date:</strong> ${new Date(appointment.date).toLocaleDateString()}</p>
            <p><strong>Time:</strong> ${appointment.time}</p>
            ${appointment.cancelReason ? `<p><strong>Reason:</strong> ${appointment.cancelReason}</p>` : ''}
          </div>
          <p style="color: #4b5563;">You can schedule another viewing at any time.</p>
        </div>
      ` // Email content
    };

    await transporter.sendMail(mailOptions); // Send email

    res.json({
      success: true,
      message: 'Appointment cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling appointment:', error); // Log error
    res.status(500).json({
      success: false,
      message: 'Error cancelling appointment'
    });
  }
};

// Controller to fetch appointments for the authenticated user
export const getAppointmentsByUser = async (req, res) => {
  try {
    // Fetch user's appointments, populate related data, and sort by date
    const appointments = await Appointment.find({ userId: req.user._id })
      .populate('propertyId', 'title location image') // Populate property details
      .sort({ date: 1 }); // Sort by date ascending

    res.json({
      success: true,
      appointments // Return appointments data
    });
  } catch (error) {
    console.error('Error fetching user appointments:', error); // Log error
    res.status(500).json({
      success: false,
      message: 'Error fetching appointments'
    });
  }
};

// Controller to update appointment meeting link
export const updateAppointmentMeetingLink = async (req, res) => {
  try {
    const { appointmentId, meetingLink } = req.body; // Extract appointment ID and meeting link

    // Update appointment with meeting link and populate related data
    const appointment = await Appointment.findByIdAndUpdate(
      appointmentId,
      { meetingLink },
      { new: true } // Return updated document
    ).populate('propertyId userId');

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found' // Handle missing appointment
      });
    }

    // Send email notification with meeting link
    const mailOptions = {
      from: process.env.EMAIL, // Sender email
      to: appointment.userId.email, // Recipient email
      subject: "Meeting Link Updated - Home Rentals", // Email subject
      html: `
        <div style="max-width: 600px; margin: 20px auto; font-family: 'Arial', sans-serif; line-height: 1.6;">
          <div style="background: linear-gradient(135deg, #2563eb, #1e40af); padding: 40px 20px; border-radius: 15px 15px 0 0; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">Meeting Link Updated</h1>
          </div>
          <div style="background: #ffffff; padding: 40px 30px; border-radius: 0 0 15px 15px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);">
            <p>Your viewing appointment for <strong>${appointment.propertyId.title}</strong> has been updated with a meeting link.</p>
            <p><strong>Date:</strong> ${new Date(appointment.date).toLocaleDateString()}</p>
            <p><strong>Time:</strong> ${appointment.time}</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${meetingLink}" 
                 style="display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #2563eb, #1e40af); 
                        color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
                Join Meeting
              </a>
            </div>
          </div>
        </div>
      ` // Email content
    };

    await transporter.sendMail(mailOptions); // Send email

    res.json({
      success: true,
      message: 'Meeting link updated successfully',
      appointment // Return updated appointment
    });
  } catch (error) {
    console.error('Error updating meeting link:', error); // Log error
    res.status(500).json({
      success: false,
      message: 'Error updating meeting link'
    });
  }
};

// Controller to fetch appointment statistics
export const getAppointmentStats = async (req, res) => {
  try {
    // Fetch counts for different appointment statuses
    const [pending, confirmed, cancelled, completed] = await Promise.all([
      Appointment.countDocuments({ status: 'pending' }), // Count pending appointments
      Appointment.countDocuments({ status: 'confirmed' }), // Count confirmed appointments
      Appointment.countDocuments({ status: 'cancelled' }), // Count cancelled appointments
      Appointment.countDocuments({ status: 'completed' }) // Count completed appointments
    ]);

    // Get stats by day for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30); // Calculate date 30 days ago

    // Aggregate daily appointment counts
    const dailyStats = await Appointment.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo } // Filter for last 30 days
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } // Group by date
          },
          count: { $sum: 1 } // Count appointments per day
        }
      },
      { $sort: { "_id": 1 } } // Sort by date ascending
    ]);

    res.json({
      success: true,
      stats: {
        total: pending + confirmed + cancelled + completed, // Total appointments
        pending,
        confirmed,
        cancelled,
        completed,
        dailyStats // Daily appointment counts
      }
    });
  } catch (error) {
    console.error('Error fetching appointment stats:', error); // Log error
    res.status(500).json({
      success: false,
      message: 'Error fetching appointment statistics'
    });
  }
};

// Controller to submit feedback for an appointment
export const submitAppointmentFeedback = async (req, res) => {
  try {
    const { id } = req.params; // Extract appointment ID
    const { rating, comment } = req.body; // Extract feedback data

    // Fetch appointment
    const appointment = await Appointment.findById(id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found' // Handle missing appointment
      });
    }

    // Verify user owns this appointment
    if (appointment.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to submit feedback for this appointment' // Handle unauthorized access
      });
    }

    // Update appointment with feedback and set status to completed
    appointment.feedback = { rating, comment };
    appointment.status = 'completed';
    await appointment.save();

    res.json({
      success: true,
      message: 'Feedback submitted successfully'
    });
  } catch (error) {
    console.error('Error submitting feedback:', error); // Log error
    res.status(500).json({
      success: false,
      message: 'Error submitting feedback'
    });
  }
};

// Controller to fetch upcoming appointments for the authenticated user
export const getUpcomingAppointments = async (req, res) => {
  try {
    const now = new Date(); // Current date
    // Fetch user's upcoming appointments
    const appointments = await Appointment.find({
      userId: req.user._id,
      date: { $gte: now }, // Future dates only
      status: { $in: ['pending', 'confirmed'] } // Only pending or confirmed
    })
      .populate('propertyId', 'title location image') // Populate property details
      .sort({ date: 1, time: 1 }) // Sort by date and time
      .limit(5); // Limit to 5 appointments

    res.json({
      success: true,
      appointments // Return appointments data
    });
  } catch (error) {
    console.error('Error fetching upcoming appointments:', error); // Log error
    res.status(500).json({
      success: false,
      message: 'Error fetching upcoming appointments'
    });
  }
};