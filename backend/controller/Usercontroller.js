import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import validator from 'validator';
import crypto from 'crypto';
import userModel from '../models/Usermodel.js';
import transporter from '../config/nodemailer.js';
import { getWelcomeTemplate, getPasswordResetTemplate } from '../email.js';
import asyncHandler from 'express-async-handler';
import  Property  from '../models/propertymodel.js';

dotenv.config();

const createtoken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  console.log('Login attempt for email:', email);

  const Registeruser = await userModel.findOne({ email });
  if (!Registeruser) {
    console.error('User not found for email:', email);
    res.status(401);
    throw new Error('Email not found');
  }

  const isMatch = await bcrypt.compare(password, Registeruser.password);
  if (!isMatch) {
    console.error('Password mismatch for email:', email);
    res.status(401);
    throw new Error('Invalid password');
  }

  const token = createtoken(Registeruser._id);
  console.log('Login successful for user:', Registeruser._id, 'email:', Registeruser.email);
  res.json({
    token,
    user: { name: Registeruser.name, email: Registeruser.email },
    success: true,
  });
});

const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  console.log('Register attempt for email:', email);

  if (!validator.isEmail(email)) {
    console.error('Invalid email format:', email);
    res.status(400);
    throw new Error('Invalid email');
  }

  const existingUser = await userModel.findOne({ email });
  if (existingUser) {
    console.error('Email already exists:', email);
    res.status(400);
    throw new Error('Email already exists');
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = new userModel({ name, email, password: hashedPassword });
  await newUser.save();

  const token = createtoken(newUser._id);

  const mailOptions = {
    from: process.env.EMAIL,
    to: email,
    subject: 'Welcome to Home Rentals - Your Account Has Been Created',
    html: getWelcomeTemplate(name),
  };

  await transporter.sendMail(mailOptions);
  console.log('Welcome email sent to:', email);

  res.json({
    token,
    user: { name: newUser.name, email: newUser.email },
    success: true,
  });
});

const forgotpassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  console.log('Forgot password request for email:', email);

  const user = await userModel.findOne({ email });
  if (!user) {
    console.error('User not found for email:', email);
    res.status(404);
    throw new Error('Email not found');
  }

  const resetToken = crypto.randomBytes(20).toString('hex');
  user.resetToken = resetToken;
  user.resetTokenExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
  await user.save();

  const resetUrl = `${process.env.WEBSITE_URL}/reset/${resetToken}`;
  const mailOptions = {
    from: process.env.EMAIL,
    to: email,
    subject: 'Password Reset - Home Rentals Security',
    html: getPasswordResetTemplate(resetUrl),
  };

  await transporter.sendMail(mailOptions);
  console.log('Password reset email sent to:', email);

  res.status(200).json({ message: 'Email sent', success: true });
});

const resetpassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;
  console.log('Reset password attempt for token:', token);

  const user = await userModel.findOne({
    resetToken: token,
    resetTokenExpire: { $gt: Date.now() },
  });

  if (!user) {
    console.error('Invalid or expired token:', token);
    res.status(400);
    throw new Error('Invalid or expired token');
  }

  user.password = await bcrypt.hash(password, 10);
  user.resetToken = undefined;
  user.resetTokenExpire = undefined;
  await user.save();

  console.log('Password reset successful for email:', user.email);
  res.status(200).json({ message: 'Password reset successful', success: true });
});

const adminlogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  console.log('Admin login attempt for email:', email);

  const user = await userModel.findOne({ email });
  if (!user) {
    console.error('User not found for email:', email);
    res.status(401);
    throw new Error('Invalid email or password');
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    console.error('Password mismatch for email:', email);
    res.status(401);
    throw new Error('Invalid email or password');
  }

  if (user.role !== 'admin' && email !== process.env.ADMIN_EMAIL) {
    console.error('Non-admin user attempted admin login:', email);
    res.status(403);
    throw new Error('Admin access required');
  }

  const token = createtoken(user._id);
  console.log('Admin login successful for user:', user._id, 'email:', user.email);
  res.json({
    token,
    success: true,
    isAdmin: true,
    user: { name: user.name, email: user.email, _id: user._id },
  });
});

const logout = asyncHandler(async (req, res) => {
  console.log('Logout request');
  res.json({ message: 'Logged out', success: true });
});

const getname = asyncHandler(async (req, res) => {
  console.log('Fetching user details for ID:', req.user._id);
  const user = await userModel.findById(req.user._id).select('-password');
  if (!user) {
    console.error('User not found for ID:', req.user._id);
    res.status(404);
    throw new Error('User not found');
  }
  res.json(user);
});

const createBooking = asyncHandler(async (req, res) => {
  const { propertyId, moveInDate, duration, message } = req.body;
  const userId = req.user._id;

  if (!propertyId || !moveInDate || !duration) {
    res.status(400);
    throw new Error('Property ID, move-in date, and duration are required');
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

  const booking = {
    propertyId,
    checkInDate: new Date(moveInDate),
    checkOutDate: new Date(new Date(moveInDate).setMonth(new Date(moveInDate).getMonth() + Number(duration))),
    availability: property.availability,
    status: 'pending',
    message,
    createdAt: new Date(),
  };

  user.bookings.push(booking);
  await user.save();

  // Notify property owner (optional: implement email or socket.io notification)
  const mailOptions = {
    from: process.env.EMAIL,
    to: property.phone, // Assuming phone is an email or replace with owner email lookup
    subject: 'New Booking Request - Home Rentals',
    html: `<p>A new booking request has been made for your property "${property.title}".</p>
           <p>Details:</p>
           <ul>
             <li>User: ${user.name}</li>
             <li>Move-in Date: ${booking.checkInDate.toLocaleDateString()}</li>
             <li>Duration: ${duration} months</li>
             <li>Message: ${message || 'No message provided'}</li>
           </ul>`,
  };

  await transporter.sendMail(mailOptions);
  console.log('Booking request email sent to:', property.phone);

  res.status(200).json({ message: 'Booking request created successfully', success: true, booking });
});

export { login, register, forgotpassword, resetpassword, adminlogin, logout, getname, createBooking };