import React, { useEffect, useState } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle, Home, Receipt, Download, Share2 } from "lucide-react";

const PaymentSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [transactionDetails, setTransactionDetails] = useState({});

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const details = {
      amount: searchParams.get("amt") || searchParams.get("total_amount") || "0",
      transactionId: searchParams.get("oid") || searchParams.get("transaction_uuid") || "N/A",
      refId: searchParams.get("refId") || "N/A",
      timestamp: new Date().toLocaleString(),
    };
    setTransactionDetails(details);

    // Auto-redirect after 10 seconds
    const timer = setTimeout(() => {
      navigate("/properties");
    }, 10000);

    return () => clearTimeout(timer);
  }, [location.search, navigate]);

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Property Payment Successful",
          text: `I've successfully completed a property payment of NPR ${transactionDetails.amount}`,
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert("Payment link copied to clipboard!");
      }
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  const downloadReceipt = () => {
    const receiptData = `
PROPERTY PAYMENT RECEIPT
========================
Amount Paid: NPR ${transactionDetails.amount}
Transaction ID: ${transactionDetails.transactionId}
Reference ID: ${transactionDetails.refId}
Date & Time: ${transactionDetails.timestamp}
Status: SUCCESS
========================
Thank you for your payment!
    `;

    const blob = new Blob([receiptData], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `receipt-${transactionDetails.transactionId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md text-center"
      >
        {/* Success Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, duration: 0.5, type: "spring" }}
          className="mb-6"
        >
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            transition={{ delay: 0.8, duration: 0.8 }}
            className="h-1 bg-gradient-to-r from-green-400 to-blue-500 rounded-full mx-auto"
          />
        </motion.div>

        {/* Success Message */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Payment Successful!</h1>
          <p className="text-gray-600 mb-6">
            Your property payment has been processed successfully.
          </p>
        </motion.div>

        {/* Transaction Details */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          className="bg-gray-50 rounded-2xl p-6 mb-6"
        >
          <div className="flex items-center justify-center mb-4">
            <Receipt className="w-5 h-5 text-blue-600 mr-2" />
            <h3 className="font-semibold text-gray-800">Transaction Details</h3>
          </div>
          
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Amount Paid:</span>
              <span className="font-bold text-green-600 text-lg">
                NPR {parseFloat(transactionDetails.amount || 0).toLocaleString("en-NP")}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Transaction ID:</span>
              <span className="font-mono text-xs bg-gray-200 px-2 py-1 rounded">
                {transactionDetails.transactionId}
              </span>
            </div>
            
            {transactionDetails.refId !== "N/A" && (
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Reference ID:</span>
                <span className="font-mono text-xs bg-gray-200 px-2 py-1 rounded">
                  {transactionDetails.refId}
                </span>
              </div>
            )}
            
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Date & Time:</span>
              <span className="text-xs">{transactionDetails.timestamp}</span>
            </div>
            
            <div className="flex justify-between items-center pt-2 border-t">
              <span className="text-gray-600">Status:</span>
              <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium">
                SUCCESS
              </span>
            </div>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.5 }}
          className="space-y-3"
        >
          <button
            onClick={downloadReceipt}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-xl hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center font-medium"
          >
            <Download className="w-5 h-5 mr-2" />
            Download Receipt
          </button>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleShare}
              className="bg-gray-100 text-gray-700 py-3 px-4 rounded-xl hover:bg-gray-200 transition-colors duration-200 flex items-center justify-center"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </button>

            <Link
              to="/properties"
              className="bg-gray-100 text-gray-700 py-3 px-4 rounded-xl hover:bg-gray-200 transition-colors duration-200 flex items-center justify-center"
            >
              <Home className="w-4 h-4 mr-2" />
              Home
            </Link>
          </div>
        </motion.div>

        {/* Auto-redirect Notice */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.5 }}
          className="text-xs text-gray-500 mt-6"
        >
          You will be redirected to the properties page in a few seconds...
        </motion.p>

        {/* Celebration Animation */}
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: [0, 1, 0], scale: [0, 1.2, 0] }}
          transition={{ delay: 0.2, duration: 2, repeat: 2 }}
          className="absolute top-4 left-4 text-yellow-400 text-2xl"
        >
          🎉
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: [0, 1, 0], scale: [0, 1.2, 0] }}
          transition={{ delay: 0.4, duration: 2, repeat: 2 }}
          className="absolute top-4 right-4 text-yellow-400 text-2xl"
        >
          🎊
        </motion.div>
      </motion.div>
    </div>
  );
};

export default PaymentSuccess;