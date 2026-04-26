import jwt from "jsonwebtoken";
import asyncHandler from "express-async-handler";
import User from "../models/Usermodel.js";

export const protect = asyncHandler(async (req, res, next) => {
  let token;
  console.log("Authorization Header:", req.headers.authorization);

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      console.log("Token:", token);
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("Decoded Token:", decoded);
      const user = await User.findById(decoded.id).select("-password");
      if (!user) {
        console.error("User not found for ID:", decoded.id);
        res.status(401);
        throw new Error("User not found");
      }
      console.log("Authenticated User:", {
        _id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
      });
      req.user = user;
      next();
    } catch (error) {
      console.error("Token verification error:", error.message);
      res.status(401);
      throw new Error(`Not authorized, token failed: ${error.message}`);
    }
  } else {
    console.error("No authorization header or invalid format");
    res.status(401);
    throw new Error("Please login to continue");
  }
});

export const checkAppointmentOwnership = asyncHandler(async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    if (appointment.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to access this appointment",
      });
    }

    req.appointment = appointment;
    next();
  } catch (error) {
    console.error("Error checking appointment ownership:", error);
    res.status(500).json({
      success: false,
      message: "Error checking appointment ownership",
    });
  }
});

export default protect;