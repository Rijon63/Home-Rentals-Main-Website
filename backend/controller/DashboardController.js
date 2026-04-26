import asyncHandler from 'express-async-handler';
import userModel from '../models/Usermodel.js';
import propertymodel from '../models/propertymodel.js';
import transporter from "../config/nodemailer.js";
import { getEmailTemplate } from "../email.js";

const { Property } = propertymodel;

// Helper function to extract location from property data
const getPropertyLocation = (property) => {
  // Priority order for location extraction
  if (property.location) return property.location;
  
  // Build location from address components
  const locationParts = [
    property.streetAddress,
    property.wardNumber ? `Ward ${property.wardNumber}` : null,
    property.municipality,
    property.district,
    property.province
  ].filter(Boolean);
  
  if (locationParts.length > 0) {
    return locationParts.join(', ');
  }
  
  // Extract from title as last resort
  if (property.title) {
    const titleLower = property.title.toLowerCase();
    
    // Common patterns in property titles
    const locationPatterns = [
      /at\s+([^,\n]+)/i,  // "at Location"
      /in\s+([^,\n]+)/i,  // "in Location"
      /near\s+([^,\n]+)/i, // "near Location"
      /-\s*([^,\n]+)$/i   // "- Location" at end
    ];
    
    for (const pattern of locationPatterns) {
      const match = property.title.match(pattern);
      if (match && match[1]) {
        const extracted = match[1].trim();
        // Filter out common non-location words
        const nonLocationWords = ['sale', 'rent', 'house', 'apartment', 'room', 'land', 'story', 'storied', 'entire property', 'apartment/flat', 'single room', 'homestay'];
        if (!nonLocationWords.some(word => extracted.toLowerCase().includes(word))) {
          return extracted;
        }
      }
    }
  }
  
  return 'Location not available';
};

// Helper function to generate default dates
const generateDefaultDates = (availability) => {
  const now = new Date();
  
  if (availability?.toLowerCase().includes('rent')) {
    // For rentals: start from tomorrow, end after 30 days
    const checkIn = new Date(now);
    checkIn.setDate(checkIn.getDate() + 1);
    const checkOut = new Date(checkIn);
    checkOut.setDate(checkOut.getDate() + 30);
    
    return { checkInDate: checkIn, checkOutDate: checkOut };
  } else {
    // For purchase/sale: return null dates
    return { checkInDate: null, checkOutDate: null };
  }
};

// Add property to favorites
const addFavorite = asyncHandler(async (req, res) => {
  const { propertyId } = req.body;
  const userId = req.user._id;

  if (!propertyId) {
    res.status(400);
    throw new Error('Property ID is required');
  }

  const user = await userModel.findById(userId);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  const property = await Property.findById(propertyId);
  if (!property) {
    res.status(404);
    throw new Error('Property not found');
  }

  if (!user.favorites.includes(propertyId)) {
    user.favorites.push(propertyId);
    await user.save();
  }

  res.json({ message: 'Property added to favorites', success: true });
});

// Remove property from favorites
const removeFavorite = asyncHandler(async (req, res) => {
  const { propertyId } = req.body;
  const userId = req.user._id;

  if (!propertyId) {
    res.status(400);
    throw new Error('Property ID is required');
  }

  const user = await userModel.findById(userId);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  user.favorites = user.favorites.filter(id => id.toString() !== propertyId);
  await user.save();

  res.json({ message: 'Property removed from favorites', success: true });
});

// Get user's favorite properties - FIXED TO INCLUDE IMAGE
const getFavorites = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const user = await userModel.findById(userId).populate({
    path: 'favorites',
    select: 'title location availability type rating image price price_per_night streetAddress wardNumber municipality district province'
  });
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  res.json({ favorites: user.favorites, success: true });
});

// Add a booking
const addBooking = asyncHandler(async (req, res) => {
  const { propertyId, checkInDate, checkOutDate } = req.body;
  const userId = req.user._id;

  if (!propertyId) {
    res.status(400);
    throw new Error('Property ID is required');
  }

  const property = await Property.findById(propertyId);
  if (!property) {
    res.status(404);
    throw new Error('Property not found');
  }

  const user = await userModel.findById(userId);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  const normalizedAvailability = property.availability?.toLowerCase() || '';
  const validAvailabilities = ['for rent', 'rent', 'for sale', 'sale'];
  if (!validAvailabilities.includes(normalizedAvailability)) {
    res.status(400);
    throw new Error(`Invalid property availability: ${property.availability}`);
  }

  // Check for existing pending or confirmed booking for the same property by the same user
  const existingBooking = user.bookings.find(
    (booking) => booking.propertyId?.toString() === propertyId && ['pending', 'confirmed'].includes(booking.status)
  );
  if (existingBooking) {
    res.status(400);
    throw new Error('You already have an active booking for this property');
  }

  const bookingData = { 
    propertyId, 
    status: 'pending', 
    availability: property.availability,
    meetingLink: null // Initialize meetingLink
  };

  // Handle dates based on availability
  if (normalizedAvailability.includes('rent')) {
    // For rentals, require valid dates
    if (!checkInDate || !checkOutDate) {
      res.status(400);
      throw new Error('Check-in and check-out dates are required for rental bookings');
    }

    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);

    if (isNaN(checkIn) || isNaN(checkOut)) {
      res.status(400);
      throw new Error('Invalid check-in or check-out date format');
    }

    if (checkIn >= checkOut) {
      res.status(400);
      throw new Error('Check-out date must be after check-in date');
    }

    bookingData.checkInDate = checkIn;
    bookingData.checkOutDate = checkOut;
    console.log(`Using provided dates for rental: checkIn=${checkIn.toISOString()}, checkOut=${checkOut.toISOString()}`);
  } else {
    // For purchases, set dates to null
    bookingData.checkInDate = null;
    bookingData.checkOutDate = null;
    console.log(`Set null dates for purchase booking`);
  }

  user.bookings.push(bookingData);
  await user.save();

  // Email notification
  const mailOptions = {
    from: process.env.EMAIL,
    to: user.email,
    subject: `Booking Request Submitted - Home Rentals`,
    html: getEmailTemplate({
      propertyId: {
        _id: property._id,
        title: property.title,
        location: getPropertyLocation(property),
        availability: property.availability,
        type: property.type,
        rating: property.rating
      },
      userId: {
        _id: user._id,
        name: user.name,
        email: user.email,
      },
      checkInDate: bookingData.checkInDate,
      checkOutDate: bookingData.checkOutDate,
      availability: property.availability,
      meetingLink: null,
    }, 'pending'),
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (emailError) {
    console.error('Error sending email:', emailError);
  }

  console.log(`Booking added: User=${user.email}, Property=${property.title}, Availability=${property.availability}, BookingID=${bookingData._id}`);
  res.json({ 
    message: `Booking request for ${property.availability} submitted successfully`, 
    success: true,
    booking: {
      _id: bookingData._id,
      propertyId: {
        _id: property._id,
        title: property.title,
        location: getPropertyLocation(property),
        availability: property.availability,
        type: property.type,
        rating: property.rating
      },
      userId: {
        _id: user._id,
        name: user.name,
        email: user.email,
      },
      checkInDate: bookingData.checkInDate,
      checkOutDate: bookingData.checkOutDate,
      status: bookingData.status,
      availability: bookingData.availability,
      meetingLink: null,
      createdAt: bookingData.createdAt,
    }
  });
});

// Get user's bookings - FIXED TO INCLUDE IMAGE
const getBookings = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const user = await userModel.findById(userId).populate({
    path: 'bookings.propertyId',
    select: 'title location availability type rating image price price_per_night streetAddress wardNumber municipality district province'
  });
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  const validBookings = user.bookings.filter(booking => booking.propertyId?._id).map(booking => {
    return {
      _id: booking._id,
      propertyId: {
        _id: booking.propertyId._id,
        title: booking.propertyId.title || 'Unknown Property',
        location: getPropertyLocation(booking.propertyId),
        availability: booking.propertyId.availability || 'Unknown',
        type: booking.propertyId.type || 'Unknown',
        rating: booking.propertyId.rating || 0,
        image: booking.propertyId.image || [],
        price: booking.propertyId.price || 0,
        price_per_night: booking.propertyId.price_per_night || 0
      },
      userId: {
        _id: user._id,
        name: user.name || 'Unknown',
        email: user.email || 'Unknown',
      },
      checkInDate: booking.checkInDate,
      checkOutDate: booking.checkOutDate,
      status: booking.status,
      availability: booking.availability,
      meetingLink: booking.meetingLink || null,
      createdAt: booking.createdAt,
    };
  });
  res.json({ bookings: validBookings, success: true });
});

// Get all bookings (admin) - FIXED TO INCLUDE IMAGE
const getAllBookings = asyncHandler(async (req, res) => {
  try {
    console.log('Fetching all bookings with proper population...');
    
    const users = await userModel.find().populate({
      path: 'bookings.propertyId',
      select: 'title location availability type rating image price price_per_night streetAddress wardNumber municipality district province',
    });

    console.log(`Found ${users.length} users with bookings`);

    const seenBookings = new Set();
    const bookings = [];

    for (const user of users) {
      if (user.bookings && user.bookings.length > 0) {
        console.log(`Processing user: ${user.name} (${user.email}) with ${user.bookings.length} bookings`);
        
        for (const booking of user.bookings) {
          // Skip if booking already processed or missing required data
          if (!booking._id || seenBookings.has(booking._id.toString())) {
            continue;
          }

          // Skip if property is missing
          if (!booking.propertyId || !booking.propertyId._id) {
            console.log(`Skipping booking with missing property: ${booking.propertyId}`);
            continue;
          }

          seenBookings.add(booking._id.toString());

          // Get property location using helper function
          const propertyLocation = getPropertyLocation(booking.propertyId);
          
          console.log(`Location resolution for ${booking.propertyId.title}:`, {
            originalLocation: booking.propertyId.location,
            extractedLocation: propertyLocation === 'Location not available' ? null : propertyLocation,
            finalLocation: propertyLocation
          });

          const bookingData = {
            _id: booking._id,
            propertyId: {
              _id: booking.propertyId._id,
              title: booking.propertyId.title || 'Unknown Property',
              location: propertyLocation,
              availability: booking.propertyId.availability || 'Unknown',
              type: booking.propertyId.type || 'Unknown',
              rating: booking.propertyId.rating || 0,
              image: booking.propertyId.image || [],
              price: booking.propertyId.price || 0,
              price_per_night: booking.propertyId.price_per_night || 0
            },
            userId: {
              _id: user._id,
              name: user.name || 'Unknown',
              email: user.email || 'Unknown',
            },
            checkInDate: booking.checkInDate,
            checkOutDate: booking.checkOutDate,
            status: booking.status,
            availability: booking.availability || booking.propertyId.availability || 'Unknown',
            meetingLink: booking.meetingLink || null,
            createdAt: booking.createdAt,
          };

          bookings.push(bookingData);
          
          console.log(`Added booking:`, {
            id: booking._id,
            property: booking.propertyId.title,
            location: propertyLocation,
            user: user.name,
            availability: booking.propertyId.availability,
            bookingAvailability: booking.availability,
            checkInDate: booking.checkInDate,
            checkOutDate: booking.checkOutDate,
            hasCheckInDate: !!booking.checkInDate,
            hasCheckOutDate: !!booking.checkOutDate,
            hasImage: !!(booking.propertyId.image && booking.propertyId.image.length > 0)
          });
        }
      }
    }

    console.log(`Total valid bookings found: ${bookings.length}`);
    res.json({ success: true, bookings });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ success: false, message: 'Error fetching bookings' });
  }
});

// Update booking status
const updateBookingStatus = asyncHandler(async (req, res) => {
  try {
    const { bookingId, status } = req.body;

    if (!['confirmed', 'cancelled'].includes(status)) {
      res.status(400);
      throw new Error('Invalid status');
    }

    const user = await userModel.findOne({ 'bookings._id': bookingId });
    if (!user) {
      res.status(404);
      throw new Error('Booking not found');
    }

    const booking = user.bookings.id(bookingId);
    if (!booking) {
      res.status(404);
      throw new Error('Booking not found');
    }

    if (!booking.propertyId) {
      res.status(400);
      throw new Error('Invalid booking: Missing propertyId');
    }

    booking.status = status;
    await user.save();

    const populatedUser = await userModel.findById(user._id).populate({
      path: 'bookings.propertyId',
      select: 'title location availability type rating image price price_per_night streetAddress wardNumber municipality district province',
    });
    const populatedBooking = populatedUser.bookings.id(bookingId);

    // Get proper location for email
    const propertyLocation = getPropertyLocation(populatedBooking.propertyId);

    const mailOptions = {
      from: process.env.EMAIL,
      to: user.email,
      subject: `Booking ${status.charAt(0).toUpperCase() + status.slice(1)} - Home Rentals`,
      html: getEmailTemplate({
        propertyId: {
          _id: populatedBooking.propertyId._id,
          title: populatedBooking.propertyId.title,
          location: propertyLocation,
          availability: populatedBooking.propertyId.availability,
          type: populatedBooking.propertyId.type,
          rating: populatedBooking.propertyId.rating
        },
        userId: {
          _id: user._id,
          name: user.name || 'Unknown',
          email: user.email || 'Unknown',
        },
        checkInDate: populatedBooking.checkInDate,
        checkOutDate: populatedBooking.checkOutDate,
        availability: populatedBooking.availability,
        meetingLink: populatedBooking.meetingLink || null,
      }, status),
    };

    await transporter.sendMail(mailOptions);

    console.log(`Booking ${bookingId} updated to status: ${status}`);
    res.json({ 
      success: true, 
      message: `Booking ${status} successfully`, 
      booking: {
        _id: populatedBooking._id,
        propertyId: {
          _id: populatedBooking.propertyId._id,
          title: populatedBooking.propertyId.title,
          location: propertyLocation,
          availability: populatedBooking.propertyId.availability,
          type: populatedBooking.propertyId.type,
          rating: populatedBooking.propertyId.rating,
          image: populatedBooking.propertyId.image || [],
          price: populatedBooking.propertyId.price || 0,
          price_per_night: populatedBooking.propertyId.price_per_night || 0
        },
        userId: {
          _id: user._id,
          name: user.name,
          email: user.email,
        },
        checkInDate: populatedBooking.checkInDate,
        checkOutDate: populatedBooking.checkOutDate,
        status: populatedBooking.status,
        availability: populatedBooking.availability,
        meetingLink: populatedBooking.meetingLink,
        createdAt: populatedBooking.createdAt
      }
    });
  } catch (error) {
    console.error('Error updating booking:', error);
    res.status(500).json({ success: false, message: 'Error updating booking' });
  }
});

// Update booking meeting link
const updateBookingMeetingLink = asyncHandler(async (req, res) => {
  try {
    const { bookingId, meetingLink } = req.body;

    if (!bookingId || !meetingLink) {
      res.status(400);
      throw new Error('Booking ID and meeting link are required');
    }

    const user = await userModel.findOne({ 'bookings._id': bookingId });
    if (!user) {
      res.status(404);
      throw new Error('Booking not found');
    }

    const booking = user.bookings.id(bookingId);
    if (!booking) {
      res.status(404);
      throw new Error('Booking not found');
    }

    if (booking.status !== 'confirmed') {
      res.status(400);
      throw new Error('Meeting link can only be added to confirmed bookings');
    }

    booking.meetingLink = meetingLink;
    await user.save();

    const populatedUser = await userModel.findById(user._id).populate({
      path: 'bookings.propertyId',
      select: 'title location availability type rating image price price_per_night streetAddress wardNumber municipality district province',
    });
    const populatedBooking = populatedUser.bookings.id(bookingId);

    // Get proper location for email
    const propertyLocation = getPropertyLocation(populatedBooking.propertyId);

    const mailOptions = {
      from: process.env.EMAIL,
      to: user.email,
      subject: `Meeting Link for Booking - Home Rentals`,
      html: getEmailTemplate({
        propertyId: {
          _id: populatedBooking.propertyId._id,
          title: populatedBooking.propertyId.title,
          location: propertyLocation,
          availability: populatedBooking.propertyId.availability,
          type: populatedBooking.propertyId.type,
          rating: populatedBooking.propertyId.rating
        },
        userId: {
          _id: user._id,
          name: user.name || 'Unknown',
          email: user.email || 'Unknown',
        },
        checkInDate: populatedBooking.checkInDate,
        checkOutDate: populatedBooking.checkOutDate,
        availability: populatedBooking.availability,
        meetingLink: populatedBooking.meetingLink,
      }, 'meetingLink'),
    };

    await transporter.sendMail(mailOptions);

    console.log(`Meeting link updated for booking ${bookingId}`);
    res.json({ 
      success: true, 
      message: 'Meeting link updated successfully', 
      booking: {
        _id: populatedBooking._id,
        propertyId: {
          _id: populatedBooking.propertyId._id,
          title: populatedBooking.propertyId.title,
          location: propertyLocation,
          availability: populatedBooking.propertyId.availability,
          type: populatedBooking.propertyId.type,
          rating: populatedBooking.propertyId.rating,
          image: populatedBooking.propertyId.image || [],
          price: populatedBooking.propertyId.price || 0,
          price_per_night: populatedBooking.propertyId.price_per_night || 0
        },
        userId: {
          _id: user._id,
          name: user.name,
          email: user.email,
        },
        checkInDate: populatedBooking.checkInDate,
        checkOutDate: populatedBooking.checkOutDate,
        status: populatedBooking.status,
        availability: populatedBooking.availability,
        meetingLink: populatedBooking.meetingLink,
        createdAt: populatedBooking.createdAt
      }
    });
  } catch (error) {
    console.error('Error updating meeting link:', error);
    res.status(500).json({ success: false, message: 'Error updating meeting link' });
  }
});

export { addFavorite, removeFavorite, getFavorites, addBooking, getBookings, getAllBookings, updateBookingStatus, updateBookingMeetingLink };