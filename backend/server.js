import http from 'http';
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import compression from 'compression';
import mongoose from 'mongoose';
import { Server } from 'socket.io';
import { PythonShell } from 'python-shell';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import connectdb from './config/mongodb.js';
import Message from './models/Message.js';
import User from './models/Usermodel.js';
import propertymodel from './models/propertymodel.js';
import messageRoutes from './routes/messageRoutes.js';
import propertyrouter from './routes/ProductRouter.js';
import userrouter from './routes/UserRoute.js';
import formrouter from './routes/formrouter.js';
import newsrouter from './routes/newsRoute.js';
import appointmentRouter from './routes/appointmentRoute.js';
import adminRouter from './routes/adminRoute.js';
import propertyRoutes from './routes/propertyRoutes.js';
import dashboardRouter from './routes/DashboardRoutes.js';
import { trackAPIStats } from './middleware/statsMiddleware.js';

const { Property } = propertymodel;

// Derive __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      'http://localhost:4000',
      'http://localhost:5173',
      'http://localhost:5174',
      'https://real-estate-website-admin.onrender.com',
      'https://real-estate-website-backend-zfu7.onrender.com',
    ],
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

app.set('io', io);

// Socket.io logic
io.on('connection', (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`);

  socket.on('joinRoom', async ({ userId, propertyId }) => {
    if (!mongoose.isValidObjectId(userId) || !mongoose.isValidObjectId(propertyId)) {
      console.error('Invalid joinRoom params:', { userId, propertyId });
      socket.emit('error', { message: 'Invalid user or property ID' });
      return;
    }

    const roomId = propertyId;
    socket.join(roomId);
    console.log(`${socket.id} (userId: ${userId}) joined room: ${roomId}`);

    try {
      const messages = await Message.find({
        propertyId,
        $or: [{ sender: userId }, { recipient: userId }],
      })
        .populate('sender', 'name _id')
        .populate('recipient', 'name _id')
        .sort({ createdAt: 1 });

      socket.emit('chatHistory', messages);
    } catch (error) {
      console.error('Error fetching chat history:', error.message, error.stack);
      socket.emit('error', { message: 'Failed to load chat history' });
    }
  });

  socket.on('chatMessage', async ({ userId, propertyId, text, recipientId, createdAt }) => {
    console.log('Received chatMessage:', { userId, propertyId, text, recipientId });

    try {
      if (!mongoose.isValidObjectId(propertyId)) {
        console.error('Invalid propertyId:', propertyId);
        socket.emit('error', { message: 'Invalid property ID' });
        return;
      }

      const property = await Property.findById(propertyId);
      if (!property) {
        console.error('Property not found:', propertyId);
        socket.emit('error', { message: 'Property not found' });
        return;
      }

      let finalRecipientId = recipientId;
      if (!recipientId) {
        const recentMessage = await Message.findOne({
          propertyId,
          recipient: property.ownerId,
        }).sort({ createdAt: -1 });
        if (!recentMessage) {
          console.error('No tenant found to reply to:', propertyId);
          socket.emit('error', { message: 'No tenant to reply to' });
          return;
        }
        finalRecipientId = recentMessage.sender;
      }

      if (!mongoose.isValidObjectId(finalRecipientId)) {
        console.error('Invalid recipientId:', finalRecipientId);
        socket.emit('error', { message: 'Invalid recipient ID' });
        return;
      }

      const recipient = await User.findById(finalRecipientId);
      if (!recipient) {
        console.error('Recipient not found:', finalRecipientId);
        socket.emit('error', { message: 'Recipient not found' });
        return;
      }

      const message = new Message({
        propertyId,
        sender: userId,
        recipient: finalRecipientId,
        text,
        read: false,
        createdAt: createdAt || new Date(),
      });

      const savedMessage = await message.save();
      const populatedMessage = await Message.findById(savedMessage._id)
        .populate('sender', 'name _id')
        .populate('recipient', 'name _id');

      io.to(propertyId).emit('message', populatedMessage);

      if (String(finalRecipientId) !== String(userId)) {
        io.to(propertyId).emit('notification', {
          from: userId,
          text: text.slice(0, 50),
          propertyId,
        });
      }

      console.log('Message broadcasted:', populatedMessage);
    } catch (error) {
      console.error('Error handling chatMessage:', error.message, error.stack);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  socket.on('markMessagesRead', async ({ userId, propertyId }) => {
    console.log('Marking messages as read:', { userId, propertyId });

    try {
      if (!mongoose.isValidObjectId(userId) || !mongoose.isValidObjectId(propertyId)) {
        console.error('Invalid markMessagesRead params:', { userId, propertyId });
        socket.emit('error', { message: 'Invalid user or property ID' });
        return;
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

      io.to(propertyId).emit('chatHistory', updatedMessages);
      console.log('Messages marked as read for property:', propertyId);
    } catch (error) {
      console.error('Error marking messages as read:', error.message, error.stack);
      socket.emit('error', { message: 'Failed to mark messages as read' });
    }
  });

  socket.on('disconnect', () => {
    console.log(`❌ Socket disconnected: ${socket.id}`);
  });
});

// Middleware
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
  },
});

app.use(limiter);
app.use(helmet());
app.use(compression());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(trackAPIStats);

app.use(
  cors({
    origin: [
      'http://localhost:4000',
      'http://localhost:5174',
      'http://localhost:5173',
      'https://real-estate-website-admin.onrender.com',
      'https://real-estate-website-backend-zfu7.onrender.com',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// Recommendation endpoint
app.post('/api/recommend', async (req, res) => {
  const { city, maxPrice, propertyCategory, propertyType } = req.body;

  if (!city || !maxPrice || !propertyCategory || !propertyType) {
    return res.status(400).json({ error: 'All search parameters are required' });
  }

  const scriptPath = path.join(__dirname, 'ml', 'recommend.py');
  if (!fs.existsSync(scriptPath)) {
    console.error(`Python script not found at: ${scriptPath}`);
    return res.status(500).json({ error: 'Recommendation script not found' });
  }

  const options = {
    mode: 'text',
    pythonOptions: ['-u'],
    scriptPath: path.join(__dirname, 'ml'),
    args: [JSON.stringify({ city, maxPrice, propertyCategory, propertyType })],
  };

  try {
    const results = await PythonShell.run('recommend.py', options);
    const recommendations = JSON.parse(results[0]);
    res.json(recommendations);
  } catch (error) {
    console.error('Error running Python script:', error.message, error.stack);
    res.status(500).json({ error: `Failed to generate recommendations: ${error.message}` });
  }
});

// Routes
connectdb()
  .then(() => console.log('✅ Database connected successfully'))
  .catch((err) => console.error('❌ Database connection error:', err));

app.use('/api/products', propertyrouter);
app.use('/api/users', userrouter);
app.use('/api/forms', formrouter);
app.use('/api/news', newsrouter);
app.use('/api/appointments', appointmentRouter);
app.use('/api/admin', adminRouter);
app.use('/api', propertyRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/dashboard', dashboardRouter);

// Error Handler
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  const statusCode = err.status || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal server error',
    statusCode,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    timestamp: new Date().toISOString(),
  });
});

// Status Page
app.get('/status', (req, res) => {
  res.status(200).json({ status: 'OK', time: new Date().toISOString() });
});

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head><title>Home Rentals API</title></head>
    <body>
      <h1>Home Rentals API</h1>
      <p>Status: <span style="color: green;">Online</span></p>
      <p>Time: ${new Date().toLocaleString()}</p>
    </body>
    </html>
  `);
});

// Start Server
const port = process.env.PORT || 4000;
if (process.env.NODE_ENV !== 'test') {
  server.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${port}`);
  });
}

export default app;