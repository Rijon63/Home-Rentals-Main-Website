import React, { useEffect, useState, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { X, Send, Loader } from 'lucide-react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { Backendurl } from '../../App';

const socket = io(import.meta.env.VITE_BACKEND_URL, {
  reconnectionAttempts: 5,
  timeout: 10000,
});

const convertToLocalTime = (utcDateStr) => {
  const utcDate = new Date(utcDateStr);
  const offsetMs = (5 * 60 + 45) * 60 * 1000; // IST offset (+5:45)
  const localMs = utcDate.getTime() + offsetMs;
  const localDate = new Date(localMs);
  return localDate.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

const ChatModal = ({ propertyId, ownerId, onClose }) => {
  const { user, isLoggedIn } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const endRef = useRef(null);
  const messageIds = useRef(new Set());

  useEffect(() => {
    if (!isLoggedIn || !user?._id) {
      alert('Please log in to chat.');
      onClose();
      return;
    }

    const userId = user._id;
    socket.emit('joinRoom', { userId, propertyId });

    const fetchMessages = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        console.log('Fetching messages for property:', propertyId, 'user:', userId);
        const response = await axios.get(
          `${Backendurl}/api/messages/${propertyId}/${userId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (response.data.success) {
          const fetchedMessages = response.data.messages.map((msg) => ({
            ...msg,
            timestamp: convertToLocalTime(msg.createdAt),
            isSentByCurrentUser: String(msg.sender._id || msg.sender) === userId,
          }));
          setMessages(fetchedMessages);
          messageIds.current = new Set(fetchedMessages.map((msg) => msg._id));
          setError(null);

          if (response.data.messages.some((msg) => String(msg.recipient._id || msg.recipient) === userId && !msg.read)) {
            await axios.post(
              `${Backendurl}/api/messages/mark-read`,
              { userId, propertyId },
              { headers: { Authorization: `Bearer ${token}` } }
            );
            socket.emit('markMessagesRead', { userId, propertyId });
          }
        } else {
          setError(response.data.message || 'Failed to fetch messages');
        }
      } catch (error) {
        console.error('Error fetching messages:', error);
        setError('Failed to load messages. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();

    // Log Socket.IO connection status
    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    const handleChatHistory = (msgs) => {
      console.log('Received chatHistory:', msgs);
      const newMessages = msgs
        .filter((msg) => !messageIds.current.has(msg._id))
        .map((msg) => ({
          ...msg,
          timestamp: convertToLocalTime(msg.createdAt),
          isSentByCurrentUser: String(msg.sender._id || msg.sender) === userId,
        }));
      setMessages((prev) => {
        const updated = [...prev, ...newMessages];
        return updated.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      });
      newMessages.forEach((msg) => messageIds.current.add(msg._id));
    };

    const handleMessage = (msg) => {
      console.log('Received new message:', msg);
      if (!messageIds.current.has(msg._id)) {
        const formattedMsg = {
          ...msg,
          timestamp: convertToLocalTime(msg.createdAt),
          isSentByCurrentUser: String(msg.sender._id || msg.sender) === userId,
        };
        setMessages((prev) => {
          const updated = [...prev, formattedMsg];
          return updated.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        });
        messageIds.current.add(msg._id);
      }
    };

    const handleNotification = (notif) => {
      if (String(notif.from) !== userId) {
        console.log('Received notification:', notif);
        alert(`📩 New message: ${notif.text}`);
      }
    };

    const handleError = (err) => {
      console.error('Socket error:', err);
      setError(err.message);
    };

    socket.on('chatHistory', handleChatHistory);
    socket.on('message', handleMessage);
    socket.on('notification', handleNotification);
    socket.on('error', handleError);

    return () => {
      socket.emit('leaveRoom', { userId, propertyId });
      socket.off('connect');
      socket.off('disconnect');
      socket.off('chatHistory', handleChatHistory);
      socket.off('message', handleMessage);
      socket.off('notification', handleNotification);
      socket.off('error', handleError);
    };
  }, [user, isLoggedIn, propertyId, ownerId, onClose]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async () => {
    if (!isLoggedIn || !user?._id) {
      alert('Please log in to send a message.');
      return;
    }

    if (!input.trim()) return;

    const userId = user._id;
    const recipientId = userId === ownerId ? null : ownerId;
    const token = localStorage.getItem('token');

    try {
      console.log('Sending message:', { userId, propertyId, text: input, recipientId });
      const response = await axios.post(
        `${Backendurl}/api/messages`,
        { userId, propertyId, text: input, recipientId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        const newMessage = {
          ...response.data.message,
          timestamp: convertToLocalTime(response.data.message.createdAt),
          isSentByCurrentUser: true,
        };
        if (!messageIds.current.has(newMessage._id)) {
          setMessages((prev) => {
            const updated = [...prev, newMessage];
            return updated.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
          });
          messageIds.current.add(newMessage._id);
          socket.emit('chatMessage', {
            userId,
            propertyId,
            text: input,
            recipientId: response.data.message.recipient,
            createdAt: new Date(),
            _id: newMessage._id,
          });
        }
        setInput('');
        setError(null);
      } else {
        setError(response.data.message || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message. Please try again.');
    }
  }, [input, user, isLoggedIn, propertyId, ownerId]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
    >
      <div className="bg-white rounded-lg p-4 w-full max-w-md shadow-lg relative">
        <button
          className="absolute top-2 right-2"
          onClick={onClose}
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>
        <h2 className="text-lg font-semibold mb-4">Chat with Owner</h2>

        {error && (
          <div className="text-red-500 text-sm mb-2">{error}</div>
        )}

        <div className="h-64 overflow-y-auto bg-gray-50 border rounded p-2 flex flex-col space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center text-gray-500 text-sm">
              No messages yet. Start the conversation!
            </div>
          ) : (
            messages.map((msg, idx) => (
              <motion.div
                key={msg._id || idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-3 text-sm max-w-[70%] flex flex-col ${
                  msg.isSentByCurrentUser
                    ? 'bg-blue-500 text-white self-end rounded-tl-lg rounded-tr-lg rounded-bl-lg'
                    : 'bg-gray-200 text-gray-800 self-start rounded-tr-lg rounded-tl-lg rounded-br-lg'
                }`}
              >
                <span>{msg.text}</span>
                <div className="text-xs mt-1 flex justify-between items-center">
                  <span>{msg.timestamp}</span>
                  {msg.isSentByCurrentUser && (
                    <span className={msg.read ? 'text-blue-100' : 'text-gray-300'}>
                      {msg.read ? 'Seen' : 'Delivered'}
                    </span>
                  )}
                </div>
              </motion.div>
            ))
          )}
          <div ref={endRef} />
        </div>

        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            className="flex-1 border rounded px-3 py-2 text-gray-500 focus:ring-2 focus:ring-blue-400 focus:border-transparent"
            placeholder="Type message..."
            disabled={!isLoggedIn}
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={sendMessage}
            className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-blue-700 transition-all duration-200"
            disabled={!isLoggedIn}
          >
            <Send className="w-5 h-5" />
            Send
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

export default ChatModal;