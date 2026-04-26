import React, { useEffect, useState } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { XCircle, Home, RefreshCw, Phone, AlertTriangle } from "lucide-react";

const PaymentFailure = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [failureDetails, setFailureDetails] = useState({});
  const [countdown, setCountdown] = useState(15);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const details = {
      amount: searchParams.get("amt") || searchParams.get("total_amount") || "0",
      transactionId: searchParams.get("oid") || searchParams.get("transaction_uuid") || "N/A",
      reason: searchParams.get("reason") || "Payment was cancelled or failed",
      timestamp: new Date().toLocaleString(),
    };
    setFailureDetails(details);

    // Countdown timer
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate("/properties");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [location.search, navigate]);

  const handleRetryPayment = () => {
    // Go back to the previous page (property details) to retry payment
    navigate(-1);
  };

  const commonIssues = [
    {
      issue: "Insufficient Balance",
      solution: "Please check your eSewa balance or bank account balance and try again."
    },
    {
      issue: "Network Timeout",
      solution: "Please check your internet connection and retry the payment."
    },
    {
      issue: "Card Declined",
      solution: "Contact your bank to ensure your card is enabled for online transactions."
    },
    {
      issue: "Session Expired",
      solution: "The payment session may have expired. Please start the payment process again."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-lg text-center"
      >
        {/* Failure Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, duration: 0.5, type: "spring" }}
          className="mb-6"
        >
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-12 h-12 text-red-600" />
          </div>
          <motion.div
            initial={{ width: "100%" }}
            animate={{ width: "0%" }}
            transition={{ delay: 0.8, duration: 0.8 }}
            className="h-1 bg-gradient-to-r from-red-400 to-orange-500 rounded-full mx-auto"
          />
        </motion.div>

        {/* Failure Message */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Payment Failed</h1>
          <p className="text-gray-600 mb-6">
            Unfortunately, your payment could not be processed at this time.
          </p>
        </motion.div>

        {/* Failure Details */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          className="bg-red-50 border border-red-200 rounded-2xl p-6 mb-6"
        >
          <div className="flex items-center justify-center mb-4">
            <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
            <h3 className="font-semibold text-red-800">Transaction Details</h3>
          </div>
          
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Attempted Amount:</span>
              <span className="font-bold text-red-600 text-lg">
                NPR {parseFloat(failureDetails.amount || 0).toLocaleString("en-NP")}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Transaction ID:</span>
              <span className="font-mono text-xs bg-red-100 px-2 py-1 rounded">
                {failureDetails.transactionId}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Failure Reason:</span>
              <span className="text-xs text-red-700 text-right max-w-48">
                {failureDetails.reason}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Date & Time:</span>
              <span className="text-xs">{failureDetails.timestamp}</span>
            </div>
            
            <div className="flex justify-between items-center pt-2 border-t border-red-200">
              <span className="text-gray-600">Status:</span>
              <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-medium">
                FAILED
              </span>
            </div>
          </div>
        </motion.div>

        {/* Common Issues & Solutions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.5 }}
          className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6 mb-6"
        >
          <h3 className="font-semibold text-yellow-800 mb-4 text-left">Common Issues & Solutions</h3>
          <div className="space-y-3 text-left">
            {commonIssues.map((item, index) => (
              <div key={index} className="text-sm">
                <div className="font-medium text-yellow-800">{item.issue}:</div>
                <div className="text-yellow-700 ml-2">{item.solution}</div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1, duration: 0.5 }}
          className="space-y-3"
        >
          <button
            onClick={handleRetryPayment}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-xl hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center font-medium"
          >
            <RefreshCw className="w-5 h-5 mr-2" />
            Try Payment Again
          </button>

          <div className="grid grid-cols-2 gap-3">
            <Link
              to="/contact"
              className="bg-green-600 text-white py-3 px-4 rounded-xl hover:bg-green-700 transition-colors duration-200 flex items-center justify-center"
            >
              <Phone className="w-4 h-4 mr-2" />
              Contact Support
            </Link>

            <Link
              to="/properties"
              className="bg-gray-100 text-gray-700 py-3 px-4 rounded-xl hover:bg-gray-200 transition-colors duration-200 flex items-center justify-center"
            >
              <Home className="w-4 h-4 mr-2" />
              Back to Home
            </Link>
          </div>
        </motion.div>

        {/* Auto-redirect Notice */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4, duration: 0.5 }}
          className="mt-6"
        >
          <p className="text-xs text-gray-500">
            Redirecting to properties page in {countdown} seconds...
          </p>
          <div className="w-full bg-gray-200 rounded-full h-1 mt-2">
            <motion.div
              initial={{ width: "100%" }}
              animate={{ width: "0%" }}
              transition={{ duration: 15, ease: "linear" }}
              className="bg-blue-500 h-1 rounded-full"
            />
          </div>
        </motion.div>

        {/* Support Information */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.6, duration: 0.5 }}
          className="mt-6 p-4 bg-gray-50 rounded-xl"
        >
          <p className="text-xs text-gray-600 mb-2">Need immediate help?</p>
          <div className="space-y-1 text-xs text-gray-500">
            <p>📧 Email: support@yourapp.com</p>
            <p>📞 Phone: +977-1-XXXXXXX</p>
            <p>🕒 Available: 24/7 Support</p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default PaymentFailure;