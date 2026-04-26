import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
  },
  resetToken: String,
  resetTokenExpire: Date,
  favorites: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
  }],
  bookings: [{
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: true,
    },
    checkInDate: {
      type: Date,
      required: false,
    },
    checkOutDate: {
      type: Date,
      required: false,
    },
    availability: {
      type: String,
      required: false,
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled'],
      default: 'pending',
    },
    meetingLink: {
      type: String,
      required: false,
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  }],
});

export default mongoose.model('User', userSchema);