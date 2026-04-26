// components/OwnerMessagesModal.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { X } from "lucide-react";

const OwnerMessagesModal = ({ propertyId, ownerId, onClose }) => {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await axios.get(
          `http://localhost:4000/api/messages/${propertyId}/${ownerId}`
        );
        setMessages(res.data || []);
      } catch (error) {
        console.error("Failed to fetch messages:", error);
      }
    };

    fetchMessages();
  }, [propertyId, ownerId]);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-4 w-full max-w-md shadow-lg relative">
        <button className="absolute top-2 right-2" onClick={onClose}>
          <X />
        </button>
        <h2 className="text-lg font-semibold mb-4">Tenant Messages</h2>

        <div className="h-64 overflow-y-auto bg-gray-50 border rounded p-2">
          {messages.length === 0 ? (
            <p className="text-center text-gray-500">No messages yet.</p>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={idx}
                className="mb-2 p-2 rounded text-sm bg-gray-100 text-left"
              >
                <strong>From: {msg.sender}</strong>
                <p>{msg.text}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default OwnerMessagesModal;
