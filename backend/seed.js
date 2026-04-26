// backend/seed.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './models/Usermodel.js'; // Make sure to include file extensions

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://rijon63:Rijon3430@cluster0.9byyo.mongodb.net/Houses?retryWrites=true&w=majority&appName=Cluster0');
    console.log('MongoDB Connected...');
  } catch (err) {
    console.error('Database connection error:', err.message);
    process.exit(1);
  }
};

// Seed admin only
const seedAdmin = async () => {
  try {
    await connectDB();

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@buildestate.com' });
    if (existingAdmin) {
      console.log('Admin user already exists');
      process.exit(0);
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await User.create({
      name: 'Admin User',
      email: 'admin@buildestate.com',
      password: hashedPassword,
      role: 'admin',
      phone: '+1234567890',
      avatar: 'https://example.com/admin-avatar.jpg'
    });

    console.log('Admin user created successfully!');
    console.log('You can now login with:');
    console.log('Email: admin@buildestate.com');
    console.log('Password: admin123');
    
    process.exit(0);
  } catch (err) {
    console.error('Error seeding admin:', err.message);
    process.exit(1);
  }
};

seedAdmin();