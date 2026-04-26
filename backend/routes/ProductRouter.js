import express from "express";
import { InferenceSession, Tensor } from "onnxruntime-node";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import upload from "../middleware/multer.js";
import {
  addproperty,
  listproperty,
  removeproperty,
  updateproperty,
  singleproperty,
  myProperties,
} from "../controller/productcontroller.js";
import propertymodel from "../models/propertymodel.js";
import userModel from "../models/Usermodel.js";
import { protect } from "../middleware/authmiddleware.js";

const { CombinedProperty } = propertymodel;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const propertyrouter = express.Router();

// Cosine similarity function
const cosineSimilarity = (vecA, vecB) => {
  if (vecA.length !== vecB.length) return 0;
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const normA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const normB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return normA === 0 || normB === 0 ? 0 : dotProduct / (normA * normB);
};

// Parse array fields
const parseArrayField = (field) => {
  if (!field) return [];
  if (Array.isArray(field)) return field;
  if (typeof field === "string") {
    try {
      const parsed = JSON.parse(field);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return field
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item);
    }
  }
  return [];
};

// Predict price
const predictPrice = async (property) => {
  try {
    console.log(
      "Predicting price with property data:",
      JSON.stringify(property, null, 2)
    );
    const modelPath =
      "C:\\Users\\hp\\Desktop\\Home Rentals main\\frontend\\src\\components\\ai\\dataset\\price_prediction_model.onnx";
    if (!fs.existsSync(modelPath)) {
      throw new Error("Price prediction model file is missing");
    }
    const session = await InferenceSession.create(modelPath);
    const validCities = [
      "Bardiya",
      "Bhaktapur",
      "Biratnagar",
      "Butwal",
      "Chitwan",
      "Dhading",
      "Dharan",
      "Jhapa",
      "Kapilvastu",
      "Kathmandu",
      "Kavre",
      "Kirtipur",
      "Lalitpur",
      "Makwanpur",
      "Morang",
      "Nawalpur",
      "Parsa",
      "Pokhara",
      "Sunsari",
      "Surkhet",
    ];
    const city = validCities.includes(property.city)
      ? property.city
      : "Kathmandu";
    const amenities = Array.isArray(property.amenities)
      ? JSON.stringify(property.amenities)
      : property.amenities || "[]";
    const listing_type =
      property.listing_type ||
      (property.category === "Homestay" || property.type === "Shared Room"
        ? "rent"
        : "sale");

    const feeds = {
      city: new Tensor("string", [city], [1, 1]),
      amenities: new Tensor("string", [amenities], [1, 1]),
      bedroom_count: new Tensor(
        "float32",
        [parseFloat(property.bedroom_count || 1)],
        [1, 1]
      ),
      bathroom_count: new Tensor(
        "float32",
        [parseFloat(property.bathroom_count || 1)],
        [1, 1]
      ),
      area_sqft: new Tensor(
        "float32",
        [parseFloat(property.area_sqft || property.area || 1000)],
        [1, 1]
      ),
      build_area_sqft: new Tensor(
        "float32",
        [
          parseFloat(
            property.build_area_sqft ||
              property.build_area ||
              (property.area_sqft * 0.8) ||
              800
          ),
        ],
        [1, 1]
      ),
      location_score: new Tensor(
        "float32",
        [parseFloat(property.location_score || 0.6)],
        [1, 1]
      ),
      rating: new Tensor(
        "float32",
        [parseFloat(property.rating || 4.0)],
        [1, 1]
      ),
      listing_type: new Tensor("string", [listing_type], [1, 1]),
      floors: new Tensor(
        "float32",
        [parseFloat(property.floors || 1)],
        [1, 1]
      ),
      parking: new Tensor(
        "float32",
        [parseFloat(property.parking || 0)],
        [1, 1]
      ),
      road_width: new Tensor(
        "float32",
        [parseFloat(property.road_width || 10)],
        [1, 1]
      ),
      face: new Tensor("string", [property.face || "Unknown"], [1, 1]),
      year: new Tensor(
        "float32",
        [parseFloat(property.year || 2010)],
        [1, 1]
      ),
    };

    console.log("Model input feeds:", feeds);
    const output = await session.run(feeds);
    const outputKey = Object.keys(output)[0];
    let predictedPrice = output[outputKey].data[0];
    predictedPrice = Math.expm1(predictedPrice);
    predictedPrice = Math.max(1000000, Math.round(predictedPrice));
    console.log("Predicted price:", predictedPrice);
    return predictedPrice;
  } catch (error) {
    console.error("Error predicting price:", error.message);
    return null;
  }
};

// Normalize numerical values
const normalize = (value, min, max) => {
  if (max === min) return 0;
  return (value - min) / (max - min);
};

// Create feature vector for a property
const createPropertyVector = (property, allAmenities, allCities) => {
  const maxPrice = 100000000;
  const maxBedrooms = 10;
  const maxBathrooms = 8;
  const maxArea = 5000;
  const maxFloors = 5;
  const maxRoadWidth = 30;
  const maxYear = 2025;

  const cityVector = allCities.map((city) =>
    property.municipality === city ? 1 : 0
  );
  const amenitiesVector = allAmenities.map((amenity) =>
    property.amenities.includes(amenity) ? 1 : 0
  );

  return [
    normalize(property.price || 1000000, 100000, maxPrice),
    normalize(property.bedrooms || 1, 0, maxBedrooms),
    normalize(property.bathrooms || 1, 0, maxBathrooms),
    normalize(property.squareFeet || 1000, 100, maxArea),
    normalize(property.floors || 1, 1, maxFloors),
    normalize(property.roadWidth || 10, 5, maxRoadWidth),
    normalize(property.yearBuilt || 2010, 1980, maxYear),
    ...(property.availability?.toLowerCase() === "for sale" ? [1, 0] : [0, 1]),
    ...cityVector,
    ...amenitiesVector,
  ];
};

// /featured endpoint
propertyrouter.get("/featured", async (req, res) => {
  try {
    // Fetch featured properties (assuming featured field or high ratings)
    const properties = await propertymodel.Property.find({ featured: true })
      .sort({ rating: -1, createdAt: -1 })
      .limit(4);
    if (!properties || properties.length === 0) {
      // Fallback to top-rated or newest properties
      const fallback = await propertymodel.Property.find()
        .sort({ rating: -1, createdAt: -1 })
        .limit(4);
      return res.json({ success: true, properties: fallback });
    }
    res.json({ success: true, properties });
  } catch (error) {
    console.error("Error fetching featured properties:", error);
    res.status(500).json({
      success: false,
      message: `Failed to fetch featured properties: ${error.message}`,
    });
  }
});

// /recommend endpoint
propertyrouter.get("/recommend", async (req, res) => {
  try {
    const { userId } = req.query;

    // Fetch all properties
    const properties = await propertymodel.Property.find();
    if (!properties || properties.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No properties found",
      });
    }

    // Get all unique cities and amenities for vectorization
    const allCities = [...new Set(properties.map((p) => p.municipality))];
    const allAmenities = [
      ...new Set(properties.flatMap((p) => parseArrayField(p.amenities))),
    ];

    let recommendations = [];

    if (userId) {
      // Authenticated user: use preferences from favorites and bookings
      const user = await userModel
        .findById(userId)
        .populate("favorites bookings.propertyId");
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Create user preference vector
      let userPreferences = {
        price: 0,
        bedrooms: 0,
        bathrooms: 0,
        squareFeet: 0,
        floors: 0,
        roadWidth: 0,
        yearBuilt: 0,
        availability: "For Sale",
        municipality: "Kathmandu",
        amenities: [],
        count: 0,
      };

      // Aggregate preferences from favorites
      if (user.favorites.length > 0) {
        user.favorites.forEach((fav) => {
          userPreferences.price += fav.price || 1000000;
          userPreferences.bedrooms += fav.bedrooms || 1;
          userPreferences.bathrooms += fav.bathrooms || 1;
          userPreferences.squareFeet += fav.squareFeet || 1000;
          userPreferences.floors += fav.floors || 1;
          userPreferences.roadWidth += fav.roadWidth || 10;
          userPreferences.yearBuilt += fav.yearBuilt || 2010;
          userPreferences.availability = fav.availability || "For Sale";
          userPreferences.municipality = fav.municipality || "Kathmandu";
          userPreferences.amenities.push(...parseArrayField(fav.amenities));
          userPreferences.count += 1;
        });
      }

      // Aggregate preferences from bookings
      if (user.bookings.length > 0) {
        user.bookings.forEach((booking) => {
          const prop = booking.propertyId;
          if (prop) {
            userPreferences.price += prop.price || 1000000;
            userPreferences.bedrooms += prop.bedrooms || 1;
            userPreferences.bathrooms += prop.bathrooms || 1;
            userPreferences.squareFeet += prop.squareFeet || 1000;
            userPreferences.floors += prop.floors || 1;
            userPreferences.roadWidth += prop.roadWidth || 10;
            userPreferences.yearBuilt += prop.yearBuilt || 2010;
            userPreferences.availability = prop.availability || "For Sale";
            userPreferences.municipality = prop.municipality || "Kathmandu";
            userPreferences.amenities.push(...parseArrayField(prop.amenities));
            userPreferences.count += 1;
          }
        });
      }

      // Average preferences
      if (userPreferences.count > 0) {
        userPreferences.price /= userPreferences.count;
        userPreferences.bedrooms = Math.round(
          userPreferences.bedrooms / userPreferences.count
        );
        userPreferences.bathrooms = Math.round(
          userPreferences.bathrooms / userPreferences.count
        );
        userPreferences.squareFeet = Math.round(
          userPreferences.squareFeet / userPreferences.count
        );
        userPreferences.floors = Math.round(
          userPreferences.floors / userPreferences.count
        );
        userPreferences.roadWidth = Math.round(
          userPreferences.roadWidth / userPreferences.count
        );
        userPreferences.yearBuilt = Math.round(
          userPreferences.yearBuilt / userPreferences.count
        );
        userPreferences.amenities = [...new Set(userPreferences.amenities)];
      } else {
        // Default preferences if no favorites/bookings
        userPreferences = {
          price: 5000000,
          bedrooms: 2,
          bathrooms: 2,
          squareFeet: 1500,
          floors: 2,
          roadWidth: 15,
          yearBuilt: 2015,
          availability: "For Sale",
          municipality: "Kathmandu",
          amenities: ["Parking", "WiFi"],
        };
      }

      // Create user vector
      const userVector = createPropertyVector(
        userPreferences,
        allAmenities,
        allCities
      );

      // Compute similarity for each property
      recommendations = properties
        .map((property) => ({
          ...property._doc,
          similarity: cosineSimilarity(
            userVector,
            createPropertyVector(property, allAmenities, allCities)
          ),
        }))
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 4);
    } else {
      // Unauthenticated user: return trending properties
      const trending = await propertymodel.Property.find()
        .sort({ createdAt: -1 })
        .limit(4);
      recommendations = trending.map((p) => p._doc);
    }

    res.json({ success: true, properties: recommendations });
  } catch (error) {
    console.error("Error fetching recommendations:", error);
    res.status(500).json({
      success: false,
      message: `Failed to fetch recommendations: ${error.message}`,
    });
  }
});

// Existing routes
propertyrouter.post(
  "/add",
  protect,
  upload.fields([{ name: "images", maxCount: 4 }]),
  async (req, res) => {
    const propertyData = {
      ...req.body,
      amenities: parseArrayField(req.body.amenities),
      listing_type:
        req.body.listing_type ||
        (req.body.category === "Homestay" || req.body.type === "Shared Room"
          ? "rent"
          : "sale"),
    };
    const predictedPrice = await predictPrice(propertyData);
    propertyData.predicted_price = predictedPrice;
    return addproperty({ ...req, body: propertyData }, res);
  }
);

propertyrouter.get("/list", listproperty);

propertyrouter.post("/remove", protect, removeproperty);

propertyrouter.post(
  "/update",
  protect,
  upload.fields([{ name: "images", maxCount: 4 }]),
  async (req, res) => {
    const propertyData = {
      ...req.body,
      amenities: parseArrayField(req.body.amenities),
      listing_type:
        req.body.listing_type ||
        (req.body.category === "Homestay" || req.body.type === "Shared Room"
          ? "rent"
          : "sale"),
    };
    const predictedPrice = await predictPrice(propertyData);
    propertyData.predicted_price = predictedPrice;
    return updateproperty({ ...req, body: propertyData }, res);
  }
);

propertyrouter.get("/single/:id", singleproperty);

propertyrouter.post("/predict-price", async (req, res) => {
  try {
    const property = {
      ...req.body,
      amenities: parseArrayField(req.body.amenities),
      listing_type:
        req.body.listing_type ||
        (req.body.category === "Homestay" || req.body.type === "Shared Room"
          ? "rent"
          : "sale"),
    };
    const predictedPrice = await predictPrice(property);
    if (predictedPrice === null) {
      return res.status(500).json({
        message: "Prediction failed",
        success: false,
      });
    }
    res.json({ success: true, price: predictedPrice });
  } catch (error) {
    res.status(500).json({ message: error.message, success: false });
  }
});

propertyrouter.get("/my", protect, myProperties);

export default propertyrouter;