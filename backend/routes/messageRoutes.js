import express from 'express';
import mongoose from 'mongoose';
import asyncHandler from 'express-async-handler';
import Message from '../models/Message.js';
import User from '../models/Usermodel.js';
import propertymodel from '../models/propertymodel.js';
import { protect } from '../middleware/authmiddleware.js';

const { Property } = propertymodel;

const router = express.Router();

router.get(
  '/users/:propertyId',
  protect,
  asyncHandler(async (req, res) => {
    try {
      const { propertyId } = req.params;
      console.log('Fetching users for property:', propertyId, 'by user:', req.user.email);

      if (!mongoose.isValidObjectId(propertyId)) {
        console.error('Invalid propertyId:', propertyId);
        return res.status(400).json({ success: false, message: 'Invalid property ID' });
      }

      if (req.user.email !== process.env.ADMIN_EMAIL) {
        console.warn('Non-admin user attempted access:', req.user.email);
        return res.status(403).json({ success: false, message: 'Access restricted to admin only' });
      }

      const property = await Property.findById(propertyId);
      if (!property) {
        console.error('Property not found:', propertyId);
        return res.status(404).json({ success: false, message: 'Property not found' });
      }

      const messages = await Message.find({ propertyId })
        .populate('sender', 'name email _id')
        .populate('recipient', 'name email _id');

      const validMessages = messages.filter((msg) => msg.sender && msg.recipient);
      if (validMessages.length !== messages.length) {
        console.warn(
          'Filtered out',
          messages.length - validMessages.length,
          'messages with invalid sender or recipient'
        );
      }

      const userIds = new Set();
      validMessages.forEach((msg) => {
        if (String(msg.sender._id) !== String(req.user._id)) {
          userIds.add(String(msg.sender._id));
        }
        if (String(msg.recipient._id) !== String(req.user._id)) {
          userIds.add(String(msg.recipient._id));
        }
      });

      const users = await User.find({ _id: { $in: Array.from(userIds) } }).select('name email _id');
      console.log('Users found:', users.length);
      res.status(200).json({ success: true, users });
    } catch (error) {
      console.error('Error fetching users for property:', error.message, error.stack);
      res.status(500).json({ success: false, message: 'Failed to fetch users', error: error.message });
    }
  })
);

router.get(
  '/:propertyId/:userId',
  protect,
  asyncHandler(async (req, res) => {
    try {
      const { propertyId, userId } = req.params;
      console.log('Fetching messages for property:', propertyId, 'user:', userId, 'by authenticated user:', req.user._id);

      if (!mongoose.isValidObjectId(propertyId) || !mongoose.isValidObjectId(userId)) {
        console.error('Invalid propertyId or userId:', { propertyId, userId });
        return res.status(400).json({ success: false, message: 'Invalid property ID or user ID' });
      }

      const property = await Property.findById(propertyId);
      if (!property) {
        console.error('Property not found:', propertyId);
        return res.status(404).json({ success: false, message: 'Property not found' });
      }

      const user = await User.findById(userId);
      if (!user) {
        console.error('User not found:', userId);
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      if (req.user.email !== process.env.ADMIN_EMAIL && String(req.user._id) !== userId) {
        console.warn('Unauthorized access attempt by:', req.user.email, 'for userId:', userId);
        return res.status(403).json({ success: false, message: 'Not authorized to view these messages' });
      }

      const messages = await Message.find({
        propertyId,
        $or: [{ sender: userId }, { recipient: userId }],
      })
        .populate('sender', 'name _id')
        .populate('recipient', 'name _id')
        .sort({ createdAt: 1 });

      const validMessages = messages.filter((msg) => msg.sender && msg.recipient);
      if (validMessages.length !== messages.length) {
        console.warn(
          'Filtered out',
          messages.length - validMessages.length,
          'messages with invalid sender or recipient'
        );
      }

      res.status(200).json({ success: true, messages: validMessages });
    } catch (error) {
      console.error('Error fetching messages:', error.message, error.stack);
      res.status(500).json({ success: false, message: 'Failed to fetch messages', error: error.message });
    }
  })
);

router.post(
  '/',
  protect,
  asyncHandler(async (req, res) => {
    try {
      const { userId, propertyId, text, recipientId } = req.body;
      console.log('Creating message from:', userId, 'to:', recipientId, 'for property:', propertyId);

      if (String(req.user._id) !== String(userId)) {
        console.warn('Unauthorized message send attempt by:', req.user._id);
        return res.status(403).json({ success: false, message: 'Not authorized to send this message' });
      }

      if (!mongoose.isValidObjectId(propertyId)) {
        console.error('Invalid propertyId:', propertyId);
        return res.status(400).json({ success: false, message: 'Invalid property ID' });
      }

      const property = await Property.findById(propertyId);
      if (!property) {
        console.error('Property not found:', propertyId);
        return res.status(404).json({ success: false, message: 'Property not found' });
      }

      let finalRecipientId = recipientId;
      if (!recipientId) {
        const recentMessage = await Message.findOne({
          propertyId,
          recipient: property.ownerId,
        }).sort({ createdAt: -1 });
        if (!recentMessage) {
          console.error('No tenant found to reply to:', propertyId);
          return res.status(400).json({ success: false, message: 'No tenant to reply to' });
        }
        finalRecipientId = recentMessage.sender;
      }

      if (!mongoose.isValidObjectId(finalRecipientId)) {
        console.error('Invalid recipientId:', finalRecipientId);
        return res.status(400).json({ success: false, message: 'Invalid recipient ID' });
      }

      const recipient = await User.findById(finalRecipientId);
      if (!recipient) {
        console.error('Recipient not found:', finalRecipientId);
        return res.status(404).json({ success: false, message: 'Recipient not found' });
      }

      const newMessage = new Message({
        propertyId,
        sender: userId,
        recipient: finalRecipientId,
        text,
        read: false,
      });

      const savedMessage = await newMessage.save();
      const populatedMessage = await Message.findById(savedMessage._id)
        .populate('sender', 'name _id')
        .populate('recipient', 'name _id');

      const io = req.app.get('io');
      io.to(propertyId).emit('message', populatedMessage);

      if (String(finalRecipientId) !== String(userId)) {
        io.to(propertyId).emit('notification', {
          from: userId,
          text: text.slice(0, 50),
          propertyId,
        });
      }

      console.log('Message created:', savedMessage._id);
      res.status(201).json({ success: true, message: populatedMessage });
    } catch (error) {
      console.error('Error creating message:', error.message, error.stack);
      res.status(500).json({ success: false, message: 'Failed to create message', error: error.message });
    }
  })
);

router.post(
  '/mark-read',
  protect,
  asyncHandler(async (req, res) => {
    try {
      const { userId, propertyId } = req.body;
      console.log('Marking messages as read for user:', userId, 'property:', propertyId);

      if (String(req.user._id) !== String(userId)) {
        console.warn('Unauthorized mark-read attempt by:', req.user._id);
        return res.status(403).json({ success: false, message: 'Not authorized to mark messages as read' });
      }

      if (!mongoose.isValidObjectId(propertyId) || !mongoose.isValidObjectId(userId)) {
        console.error('Invalid propertyId or userId:', { propertyId, userId });
        return res.status(400).json({ success: false, message: 'Invalid property ID or user ID' });
      }

      await Message.updateMany(
        { propertyId, recipient: userId, read: false },
        { $set: { read: true } }
      );

      const updatedMessages = await Message.find({
        propertyId,
        $or: [{ sender: userId }, { recipient: userId }],
      })
        .populate('sender', 'name _id')
        .populate('recipient', 'name _id')
        .sort({ createdAt: 1 });

      const io = req.app.get('io');
      io.to(propertyId).emit('chatHistory', updatedMessages);

      console.log('Messages marked as read for property:', propertyId);
      res.status(200).json({ success: true, messages: updatedMessages });
    } catch (error) {
      console.error('Error marking messages as read:', error.message, error.stack);
      res.status(500).json({ success: false, message: 'Failed to mark messages as read', error: error.message });
    }
  })
);

export default router;