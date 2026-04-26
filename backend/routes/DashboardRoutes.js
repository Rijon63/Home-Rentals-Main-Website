import express from "express";
import { protect } from '../middleware/authmiddleware.js';
import {
  addFavorite,
  removeFavorite,
  getFavorites,
  addBooking,
  getBookings,
  getAllBookings,
  updateBookingStatus
} from "../controller/DashboardController.js";

const router = express.Router();

// User routes
router.post("/favorites/add", protect, addFavorite);
router.post("/favorites/remove", protect, removeFavorite);
router.get("/favorites", protect, getFavorites);
router.post("/bookings/add", protect, addBooking);
router.get("/bookings", protect, getBookings);

// Admin routes
router.get("/bookings/all", protect, getAllBookings);
router.put("/bookings/status", protect, updateBookingStatus);

export default router;