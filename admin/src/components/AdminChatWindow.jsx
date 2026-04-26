import React, { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { X, Send, Loader } from 'lucide-react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { backendurl } from '../App';

const socket = io(import.meta.env.VITE_BACKEND_URL, {
  reconnectionAttempts: 5,
  timeout: 10000,
});

const convertToLocalTime = (utcDateStr) => {
  const utcDate = new Date(utcDateStr);
  const offsetMs = (5 * 60 + 45) * 60 * 1000; // IST offset
  const localMs = utcDate.getTime() + offsetMs;
  const localDate = new Date(localMs);
  return localDate.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

const AdminChatWindow = ({ propertyId, userId, userName, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const endRef = useRef(null);
  const adminId = localStorage.getItem('userId') || 'admin';

  useEffect(() => {
    socket.emit('joinRoom', { userId: adminId, propertyId });

    const fetchMessages = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const response = await axios.get(
          `${backendurl}/api/messages/${propertyId}/${adminId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (response.data.success) {
          setMessages(
            response.data.messages.map((msg) => ({
              ...msg,
              timestamp: convertToLocalTime(msg.createdAt),
              isSentByCurrentUser: String(msg.sender._id) === adminId,
            }))
          );
          setError(null);

          // Mark messages as read
          await axios.post(
            `${backendurl}/api/messages/mark-read`,
            { userId: adminId, propertyId },
            { headers: { Authorization: `Bearer ${token}` } }
          );
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

    socket.on('chatHistory', (msgs) => {
      console.log('Received chatHistory:', msgs);
      setMessages(
        msgs.map((msg) => ({
          ...msg,
          timestamp: convertToLocalTime(msg.createdAt),
          isSentByCurrentUser: String(msg.sender._id) === adminId,
        }))
      );
    });

    socket.on('message', (msg) => {
      console.log('Received new message:', msg);
      setMessages((prev) => [
        ...prev,
        {
          ...msg,
          timestamp: convertToLocalTime(msg.createdAt),
          isSentByCurrentUser: String(msg.sender._id) === adminId,
        },
      ]);
    });

    socket.on('notification', (notif) => {
      if (String(notif.from) !== adminId) {
        console.log('Received notification:', notif);
        alert(`📩 New message from ${userName}: ${notif.text}`);
      }
    });

    socket.on('error', (err) => {
      console.error('Socket error:', err);
      setError(err.message);
    });

    return () => {
      socket.emit('leaveRoom', { userId: adminId, propertyId });
      socket.off('chatHistory');
      socket.off('message');
      socket.off('notification');
      socket.off('error');
    };
  }, [propertyId, userId, adminId, userName]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    try {
      const token = localStorage.getItem('token');
      console.log('Sending message:', { userId: adminId, propertyId, text: input, recipientId: userId });
      const response = await axios.post(
        `${backendurl}/api/messages`,
        { userId: adminId, propertyId, text: input, recipientId: userId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        socket.emit('chatMessage', {
          userId: adminId,
          propertyId,
          text: input,
          recipientId: userId,
          createdAt: new Date(),
        });
        setInput('');
        setError(null);
      } else {
        setError(response.data.message || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message. Please try again.');
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-800">Chat with {userName}</h3>
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-gray-100 transition-all duration-200"
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {error && (
        <div className="text-red-500 text-sm p-4">{error}</div>
      )}

      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-500 text-sm">
            No messages yet. Start the conversation!
          </div>
        ) : (
          <div className="flex flex-col space-y-4">
            {messages.map((msg, idx) => (
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
            ))}
            <div ref={endRef} />
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-200 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          className="flex-1 border rounded-lg px-3 py-2 text-gray-700 focus:ring-2 focus:ring-blue-400 focus:border-transparent"
          placeholder="Type your message..."
        />
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={sendMessage}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-all duration-200"
        >
          <Send className="w-5 h-5" />
          Send
        </motion.button>
      </div>
    </div>
  );
};

export default AdminChatWindow;