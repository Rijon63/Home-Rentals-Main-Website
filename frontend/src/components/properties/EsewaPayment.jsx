import React, { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import CryptoJS from "crypto-js";
import { CreditCard, Smartphone, User, Mail, Phone, MapPin, Lock, AlertCircle } from "lucide-react";

// Mock property data for demo
const mockProperty = {
  title: "Beautiful Apartment in Kathmandu",
  type: "Apartment",
  location: "Kathmandu, Nepal",
  availability: "Available Now",
  price: 25000
};

const EsewaPayment = ({ property = mockProperty }) => {
  const [paymentMethod, setPaymentMethod] = useState("esewa");
  const [isProcessing, setIsProcessing] = useState(false);
  const [cardErrors, setCardErrors] = useState({});
  
  const [personalDetails, setPersonalDetails] = useState({
    fullName: "",
    email: "",
    phoneNumber: "",
    address: "",
  });
  
  const [cardDetails, setCardDetails] = useState({
    cardNumber: "",
    expiryDate: "",
    cvv: "",
    cardholderName: "",
  });
  
  const [formData, setFormData] = useState({
    amount: property.price.toString(),
    tax_amount: "0",
    total_amount: property.price.toString(),
    transaction_uuid: uuidv4(),
    product_service_charge: "0",
    product_delivery_charge: "0",
    product_code: "EPAYTEST",
    success_url: "http://localhost:5173/paymentsuccess",
    failure_url: "http://localhost:5173/paymentfailure",
    signed_field_names: "total_amount,transaction_uuid,product_code",
    signature: "",
    secret: "8gBm/:&EnhH.1/q",
  });

  // Generate signature function
  const generateSignature = (total_amount, transaction_uuid, product_code, secret) => {
    const hashString = `total_amount=${total_amount},transaction_uuid=${transaction_uuid},product_code=${product_code}`;
    const hash = CryptoJS.HmacSHA256(hashString, secret);
    const hashedSignature = CryptoJS.enc.Base64.stringify(hash);
    return hashedSignature;
  };

  // Generate signature on component mount
  useEffect(() => {
    const { total_amount, transaction_uuid, product_code, secret } = formData;
    const hashedSignature = generateSignature(total_amount, transaction_uuid, product_code, secret);
    setFormData({ ...formData, signature: hashedSignature });
  }, []);

  const handlePersonalDetailsChange = (field, value) => {
    setPersonalDetails(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Card validation functions
  const validateCardNumber = (cardNumber) => {
    const cleaned = cardNumber.replace(/\s/g, '');
    const cardRegex = /^[0-9]{13,19}$/;
    return cardRegex.test(cleaned);
  };

  const validateExpiryDate = (expiry) => {
    const expiryRegex = /^(0[1-9]|1[0-2])\/([0-9]{2})$/;
    if (!expiryRegex.test(expiry)) return false;
    
    const [month, year] = expiry.split('/');
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear() % 100;
    const currentMonth = currentDate.getMonth() + 1;
    
    const expYear = parseInt(year);
    const expMonth = parseInt(month);
    
    if (expYear < currentYear) return false;
    if (expYear === currentYear && expMonth < currentMonth) return false;
    
    return true;
  };

  const validateCVV = (cvv) => {
    const cvvRegex = /^[0-9]{3,4}$/;
    return cvvRegex.test(cvv);
  };

  const formatCardNumber = (value) => {
    const cleaned = value.replace(/\s/g, '');
    const formatted = cleaned.replace(/(.{4})/g, '$1 ');
    return formatted.trim();
  };

  const formatExpiryDate = (value) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return cleaned.substring(0, 2) + '/' + cleaned.substring(2, 4);
    }
    return cleaned;
  };

  const handleCardDetailsChange = (field, value) => {
    let formattedValue = value;
    
    if (field === 'cardNumber') {
      formattedValue = formatCardNumber(value);
      if (formattedValue.length > 19) return;
    } else if (field === 'expiryDate') {
      formattedValue = formatExpiryDate(value);
      if (formattedValue.length > 5) return;
    } else if (field === 'cvv') {
      if (value.length > 4) return;
    }
    
    setCardDetails(prev => ({
      ...prev,
      [field]: formattedValue
    }));

    // Clear errors when user starts typing
    if (cardErrors[field]) {
      setCardErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const validatePersonalDetails = () => {
    if (!personalDetails.fullName || !personalDetails.email || !personalDetails.phoneNumber) {
      alert("Please fill in all required personal details (Name, Email, Phone)");
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(personalDetails.email)) {
      alert("Please enter a valid email address");
      return false;
    }

    const phoneRegex = /^[0-9+\-\s()]+$/;
    if (!phoneRegex.test(personalDetails.phoneNumber)) {
      alert("Please enter a valid phone number");
      return false;
    }

    return true;
  };

  const validateCardDetails = () => {
    const errors = {};
    
    if (!validateCardNumber(cardDetails.cardNumber)) {
      errors.cardNumber = 'Please enter a valid card number';
    }
    
    if (!validateExpiryDate(cardDetails.expiryDate)) {
      errors.expiryDate = 'Please enter a valid expiry date (MM/YY)';
    }
    
    if (!validateCVV(cardDetails.cvv)) {
      errors.cvv = 'Please enter a valid CVV';
    }
    
    if (!cardDetails.cardholderName.trim()) {
      errors.cardholderName = 'Please enter the cardholder name';
    }
    
    setCardErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Mock Stripe-like payment processing
  const processCardPayment = async () => {
    setIsProcessing(true);
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock payment processing
      const paymentData = {
        amount: property.price,
        currency: 'NPR',
        card: {
          number: cardDetails.cardNumber.replace(/\s/g, '').slice(-4),
          exp_month: cardDetails.expiryDate.split('/')[0],
          exp_year: cardDetails.expiryDate.split('/')[1],
        },
        billing_details: {
          name: cardDetails.cardholderName,
          email: personalDetails.email,
          phone: personalDetails.phoneNumber,
          address: personalDetails.address,
        },
        metadata: {
          property_title: property.title,
          transaction_id: formData.transaction_uuid,
        }
      };

      // Simulate success (in real implementation, this would be an API call)
      console.log('Processing payment with data:', paymentData);
      
      // Mock success response
      const mockResponse = {
        success: true,
        transaction_id: formData.transaction_uuid,
        payment_intent_id: 'pi_' + Math.random().toString(36).substr(2, 9),
        amount: property.price,
        status: 'succeeded'
      };

      if (mockResponse.success) {
        alert('Payment successful! Transaction ID: ' + mockResponse.transaction_id);
        // In real app, redirect to success page
        // window.location.href = '/payment-success?transaction_id=' + mockResponse.transaction_id;
      } else {
        throw new Error('Payment failed');
      }
      
    } catch (error) {
      console.error('Payment error:', error);
      alert('Payment failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePayNow = async (e) => {
    e.preventDefault();
    
    if (!validatePersonalDetails()) {
      return;
    }
    
    if (paymentMethod === "card" && !validateCardDetails()) {
      return;
    }

    if (paymentMethod === "card") {
      await processCardPayment();
    }
    // For eSewa, the form will submit normally
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {/* Property Summary */}
      <div className="bg-gray-50 rounded-lg p-4 border">
        <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
          <MapPin className="w-5 h-5 mr-2 text-blue-600" />
          Property Summary
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Property:</span>
            <span className="font-medium">{property.title}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Type:</span>
            <span>{property.type}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Location:</span>
            <span>{property.location}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Availability:</span>
            <span className="text-green-600 font-medium">{property.availability}</span>
          </div>
          <hr className="my-2" />
          <div className="flex justify-between text-lg font-bold text-blue-600">
            <span>Total Amount:</span>
            <span>NPR {property.price.toLocaleString("en-NP")}</span>
          </div>
        </div>
      </div>

      {/* Personal Details Form */}
      <div className="bg-white border rounded-lg p-4">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center">
          <User className="w-5 h-5 mr-2 text-blue-600" />
          Personal Details
        </h3>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={personalDetails.fullName}
              onChange={(e) => handlePersonalDetailsChange("fullName", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your full name"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="email"
                value={personalDetails.email}
                onChange={(e) => handlePersonalDetailsChange("email", e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="your.email@example.com"
                required
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="tel"
                value={personalDetails.phoneNumber}
                onChange={(e) => handlePersonalDetailsChange("phoneNumber", e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="+977 98XXXXXXXX"
                required
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address
            </label>
            <textarea
              value={personalDetails.address}
              onChange={(e) => handlePersonalDetailsChange("address", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your address (optional)"
              rows={2}
            />
          </div>
        </div>
      </div>

      {/* Payment Method Selection */}
      <div className="bg-white border rounded-lg p-4">
        <h3 className="font-semibold text-gray-800 mb-4">Choose Payment Method</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setPaymentMethod("esewa")}
            className={`p-4 border-2 rounded-lg text-left transition-all duration-200 ${
              paymentMethod === "esewa"
                ? "border-green-500 bg-green-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <div className="flex items-center">
              <Smartphone className="w-6 h-6 text-green-600 mr-3" />
              <div>
                <h4 className="font-medium text-gray-800">eSewa</h4>
                <p className="text-sm text-gray-600">Pay via eSewa Digital Wallet</p>
              </div>
              {paymentMethod === "esewa" && (
                <div className="ml-auto w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
              )}
            </div>
          </button>

          <button
            type="button"
            onClick={() => setPaymentMethod("card")}
            className={`p-4 border-2 rounded-lg text-left transition-all duration-200 ${
              paymentMethod === "card"
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <div className="flex items-center">
              <CreditCard className="w-6 h-6 text-blue-600 mr-3" />
              <div>
                <h4 className="font-medium text-gray-800">Credit/Debit Card</h4>
                <p className="text-sm text-gray-600">Pay via Bank Card</p>
              </div>
              {paymentMethod === "card" && (
                <div className="ml-auto w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
              )}
            </div>
          </button>
        </div>
      </div>

      {/* Payment Forms */}
      {paymentMethod === "esewa" ? (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <Smartphone className="w-5 h-5 text-green-600 mr-2" />
              <h4 className="font-semibold text-green-800">eSewa Payment</h4>
            </div>
            <p className="text-sm text-green-700 mb-4">
              You will be redirected to eSewa to complete your payment securely.
            </p>
            <div className="text-lg font-bold text-green-800">
              Amount to Pay: NPR {formData.amount}
            </div>
          </div>

          {/* eSewa payment fields info */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> The following payment data will be sent to eSewa:
              <br />• Amount: NPR {formData.amount}
              <br />• Transaction ID: {formData.transaction_uuid}
              <br />• Product Code: {formData.product_code}
            </p>
          </div>
          <input type="hidden" name="product_code" value={formData.product_code} />
          <input type="hidden" name="product_service_charge" value={formData.product_service_charge} />
          <input type="hidden" name="product_delivery_charge" value={formData.product_delivery_charge} />
          <input type="hidden" name="success_url" value={formData.success_url} />
          <input type="hidden" name="failure_url" value={formData.failure_url} />
          <input type="hidden" name="signed_field_names" value={formData.signed_field_names} />
          <input type="hidden" name="signature" value={formData.signature} />

          <button
            type="button"
            onClick={() => {
              if (validatePersonalDetails()) {
                // Create a temporary form and submit to eSewa
                const form = document.createElement('form');
                form.method = 'POST';
                form.action = 'https://rc-epay.esewa.com.np/api/epay/main/v2/form';
                
                // Add all hidden fields
                const fields = {
                  amount: formData.amount,
                  tax_amount: formData.tax_amount,
                  total_amount: formData.total_amount,
                  transaction_uuid: formData.transaction_uuid,
                  product_code: formData.product_code,
                  product_service_charge: formData.product_service_charge,
                  product_delivery_charge: formData.product_delivery_charge,
                  success_url: formData.success_url,
                  failure_url: formData.failure_url,
                  signed_field_names: formData.signed_field_names,
                  signature: formData.signature
                };
                
                Object.entries(fields).forEach(([key, value]) => {
                  const input = document.createElement('input');
                  input.type = 'hidden';
                  input.name = key;
                  input.value = value;
                  form.appendChild(input);
                });
                
                document.body.appendChild(form);
                form.submit();
              }
            }}
            className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-3 px-6 rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 font-medium flex items-center justify-center"
          >
            <Smartphone className="w-5 h-5 mr-2" />
            Pay Now with eSewa
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <CreditCard className="w-5 h-5 text-blue-600 mr-2" />
              <h4 className="font-semibold text-blue-800">Card Payment</h4>
            </div>
            <p className="text-sm text-blue-700 mb-4">
              Enter your card details to complete the payment securely.
            </p>
            <div className="text-lg font-bold text-blue-800">
              Amount to Pay: NPR {property.price.toLocaleString("en-NP")}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Card Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={cardDetails.cardNumber}
                onChange={(e) => handleCardDetailsChange("cardNumber", e.target.value)}
                placeholder="1234 5678 9012 3456"
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent ${
                  cardErrors.cardNumber ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                }`}
              />
              {cardErrors.cardNumber && (
                <div className="mt-1 flex items-center text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {cardErrors.cardNumber}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expiry Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={cardDetails.expiryDate}
                  onChange={(e) => handleCardDetailsChange("expiryDate", e.target.value)}
                  placeholder="MM/YY"
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent ${
                    cardErrors.expiryDate ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                  }`}
                />
                {cardErrors.expiryDate && (
                  <div className="mt-1 flex items-center text-red-600 text-sm">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {cardErrors.expiryDate}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CVV <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={cardDetails.cvv}
                  onChange={(e) => handleCardDetailsChange("cvv", e.target.value)}
                  placeholder="123"
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent ${
                    cardErrors.cvv ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                  }`}
                />
                {cardErrors.cvv && (
                  <div className="mt-1 flex items-center text-red-600 text-sm">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {cardErrors.cvv}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cardholder Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={cardDetails.cardholderName}
                onChange={(e) => handleCardDetailsChange("cardholderName", e.target.value)}
                placeholder="John Doe"
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent ${
                  cardErrors.cardholderName ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                }`}
              />
              {cardErrors.cardholderName && (
                <div className="mt-1 flex items-center text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {cardErrors.cardholderName}
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handlePayNow}
            disabled={isProcessing}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-6 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-medium flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <div className="w-5 h-5 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Processing Payment...
              </>
            ) : (
              <>
                <CreditCard className="w-5 h-5 mr-2" />
                Pay Now with Card
              </>
            )}
          </button>
        </div>
      )}

      {/* Security Notice */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <Lock className="w-5 h-5 text-green-500 mt-0.5" />
          </div>
          <div className="ml-3">
            <p className="text-sm text-gray-700">
              <span className="font-medium">Secure Payment:</span> Your payment information is encrypted and secure. We do not store your card details.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EsewaPayment;