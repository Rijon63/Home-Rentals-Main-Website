import React, { useState, useEffect } from 'react';
import { X, Loader, User } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import AdminChatWindow from './AdminChatWindow';
import { backendurl } from '../App';

const AdminChatDashboard = ({ propertyId, onClose, propertyTitle }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const isAdmin = localStorage.getItem('isAdmin') === 'true';
        if (!token || !isAdmin) {
          setError('Please log in as admin');
          toast.error('Session expired or unauthorized. Please log in again.');
          navigate('/login');
          return;
        }

        console.log('Fetching users with token:', token);
        const response = await axios.get(`${backendurl}/api/messages/users/${propertyId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.data.success) {
          setUsers(response.data.users);
        } else {
          setError(response.data.message || 'Failed to load users');
        }
      } catch (err) {
        console.error('Error fetching users:', err.response?.data?.message || err.message);
        if (err.response?.status === 401 || err.response?.status === 403) {
          setError('Session expired or unauthorized. Please log in again.');
          toast.error('Session expired or unauthorized. Please log in again.');
          localStorage.removeItem('token');
          localStorage.removeItem('isAdmin');
          localStorage.removeItem('userId');
          navigate('/login');
        } else {
          setError(err.response?.data?.message || 'Failed to load users. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [propertyId, navigate]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl h-[80vh] flex overflow-hidden">
        <div className="w-1/3 border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800">
              Messages for {propertyTitle}
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 transition-all duration-200"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
          ) : error ? (
            <div className="flex-1 flex items-center justify-center text-red-500">
              {error}
            </div>
          ) : users.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              No messages for this property yet.
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              {users.map((user) => (
                <div
                  key={user._id}
                  onClick={() => setSelectedUser(user)}
                  className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-all duration-200 ${
                    selectedUser?._id === user._id ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">{user.name}</p>
                      <p className="text-sm text-gray-500 truncate">{user.email}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="w-2/3 flex flex-col">
          {selectedUser ? (
            <AdminChatWindow
              propertyId={propertyId}
              userId={selectedUser._id}
              userName={selectedUser.name}
              onClose={() => setSelectedUser(null)}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              Select a user to start chatting
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default AdminChatDashboard;