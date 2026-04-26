import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { HelmetProvider } from 'react-helmet-async';
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Properties from './pages/Properties'
import PropertyDetails from './components/properties/propertydetail';
import Aboutus from './pages/About'
import Contact from './pages/Contact'
import Login from './components/login';
import Signup from './components/signup';
import ForgotPassword from './components/forgetpassword';
import ResetPassword from './components/resetpassword';
import Footer from './components/footer';
import NotFoundPage from './components/Notfound';
import { AuthProvider } from './context/AuthContext';
import AIPropertyHub from './components/ai/AIPropertyHub';
import Dashboard from "./components/Dashboard"; // New import
import PaymentSuccess from './components/properties/PaymentSuccess';
import PaymentFailure from './components/properties/PaymentFailure';
import Add from "./pages/Add";
import Update from "./pages/Update";
import 'react-toastify/dist/ReactToastify.css';


export const Backendurl = import.meta.env.VITE_API_BASE_URL;

const App = () => {
  return (
    <HelmetProvider>
    <AuthProvider>
    <Router>
      
      <Navbar />
      <Routes>
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset/:token" element={<ResetPassword />} />
        <Route path="/" element={<Home />} />
        <Route path="/properties" element={<Properties />} />
        <Route path="/properties/single/:id" element={<PropertyDetails />} />
        <Route path="/about" element={<Aboutus />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/ai-property-hub" element={<AIPropertyHub />} />
        <Route path="/dashboard" element={<Dashboard />} /> {/* New route for Dashboard */}
        <Route path="/add" element={<Add />} />
        <Route path="/update/:id" element={<Update />} />
        <Route path="*" element={<NotFoundPage />} />
        <Route path="/paymentsuccess" element={<PaymentSuccess />} />
        <Route path="/paymentfailure" element={<PaymentFailure />} />
      </Routes>
      <Footer />
      <ToastContainer />
    </Router>
    </AuthProvider>
    </HelmetProvider>
  )
}

export default App