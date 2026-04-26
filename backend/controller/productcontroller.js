import fs from "fs";
import mongoose from "mongoose";
import imagekit from "../config/imagekit.js";
import { Property, CombinedProperty } from "../models/propertymodel.js";

// Helper function to safely parse amenities
const parseAmenities = (amenities) => {
  if (!amenities) return [];
  if (Array.isArray(amenities)) return amenities;
  if (typeof amenities === "string") {
    try {
      const parsed = JSON.parse(amenities);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return amenities
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item);
    }
  }
  return [];
};

const addproperty = async (req, res) => {
  try {
    console.log("Received request body:", JSON.stringify(req.body, null, 2));
    console.log("Received files:", req.files);

    const {
      title,
      description,
      type,
      availability,
      province,
      district,
      municipality,
      wardNumber,
      streetAddress,
      nearbyLandmark,
      latitude,
      longitude,
      roadCondition,
      roadWidth,
      price,
      securityDeposit,
      rentalPeriod,
      bedrooms,
      bathrooms,
      squareFeet,
      builtArea,
      floors,
      yearBuilt,
      renovationYear,
      propertyFacing,
      landOwnershipType,
      amenities,
      electricityConnection,
      waterSupply,
      sewageSystem,
      gasConnection,
      phone,
      rating,
    } = req.body;

    // Validate required fields
    const requiredFields = [
      "title",
      "description",
      "type",
      "availability",
      "province",
      "district",
      "municipality",
      "price",
      "phone",
      "latitude",
      "longitude"
    ];
    const missingFields = requiredFields.filter(
      (field) => !req.body[field] || req.body[field].trim() === ""
    );
    if (missingFields.length > 0) {
      return res.status(400).json({
        message: `Missing or empty required fields: ${missingFields.join(", ")}`,
        success: false,
      });
    }

    // Validate latitude and longitude
    const lat = Number(latitude);
    const lon = Number(longitude);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      return res.status(400).json({
        message: "Latitude must be a number between -90 and 90",
        success: false,
      });
    }
    if (isNaN(lon) || lon < -180 || lon > 180) {
      return res.status(400).json({
        message: "Longitude must be a number between -180 and 180",
        success: false,
      });
    }

    // Ensure authenticated user
    if (!req.user?._id) {
      return res.status(401).json({
        message: "Authentication required",
        success: false,
      });
    }

    // Handle image uploads
    let imageUrls = [];
    if (req.files && req.files.images) {
      const images = Array.isArray(req.files.images)
        ? req.files.images
        : [req.files.images];
      imageUrls = await Promise.all(
        images.map(async (item) => {
          const result = await imagekit.upload({
            file: fs.readFileSync(item.path),
            fileName: item.originalname,
            folder: "Property",
          });
          fs.unlink(item.path, (err) => {
            if (err) console.log("Error deleting the file: ", err);
          });
          return result.url;
        })
      );
    }

    // Parse amenities safely
    const parsedAmenities = parseAmenities(amenities);

    const propertyData = {
      title,
      description,
      type,
      availability,
      province,
      district,
      municipality,
      wardNumber: wardNumber ? String(wardNumber) : undefined,
      streetAddress,
      nearbyLandmark,
      latitude: Number(latitude),
      longitude: Number(longitude),
      roadCondition,
      roadWidth: roadWidth ? Number(roadWidth) : undefined,
      price: Number(price),
      securityDeposit: securityDeposit ? Number(securityDeposit) : undefined,
      rentalPeriod,
      bedrooms: bedrooms ? Number(bedrooms) : undefined,
      bathrooms: bathrooms ? Number(bathrooms) : undefined,
      squareFeet: squareFeet ? Number(squareFeet) : undefined,
      builtArea: builtArea ? Number(builtArea) : undefined,
      floors: floors ? Number(floors) : undefined,
      yearBuilt: yearBuilt ? Number(yearBuilt) : undefined,
      renovationYear: renovationYear ? Number(renovationYear) : undefined,
      propertyFacing,
      landOwnershipType,
      amenities: parsedAmenities,
      electricityConnection:
        electricityConnection === "true" || electricityConnection === true,
      waterSupply,
      sewageSystem,
      gasConnection,
      phone,
      ownerId: req.user._id.toString(),
      image: imageUrls,
      rating: rating ? Number(rating) : 0,
    };

    console.log("Property data to save:", JSON.stringify(propertyData, null, 2));

    const property = new Property(propertyData);
    const savedProperty = await property.save();

    if (!savedProperty._id) {
      throw new Error("Failed to generate _id for Property");
    }

    const combinedProperty = new CombinedProperty({
      propertyId: savedProperty._id,
      ...propertyData,
    });

    await combinedProperty.save();

    return res.status(201).json({
      message: "Property added successfully",
      success: true,
      property: savedProperty,
    });
  } catch (error) {
    console.error("Error adding property:", error);
    return res.status(500).json({
      message: `An error occurred while adding the property: ${error.message}`,
      success: false,
    });
  }
};

const updateproperty = async (req, res) => {
  try {
    const { id } = req.body;
    const {
      title,
      description,
      type,
      availability,
      province,
      district,
      municipality,
      wardNumber,
      streetAddress,
      nearbyLandmark,
      latitude,
      longitude,
      roadCondition,
      roadWidth,
      price,
      securityDeposit,
      rentalPeriod,
      bedrooms,
      bathrooms,
      squareFeet,
      builtArea,
      floors,
      yearBuilt,
      renovationYear,
      propertyFacing,
      landOwnershipType,
      amenities,
      electricityConnection,
      waterSupply,
      sewageSystem,
      gasConnection,
      phone,
      rating,
    } = req.body;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Valid Property ID is required",
        success: false,
      });
    }

    // Validate latitude and longitude if provided
    if (latitude !== undefined && (isNaN(Number(latitude)) || Number(latitude) < -90 || Number(latitude) > 90)) {
      return res.status(400).json({
        message: "Latitude must be a number between -90 and 90",
        success: false,
      });
    }
    if (longitude !== undefined && (isNaN(Number(longitude)) || Number(longitude) < -180 || Number(longitude) > 180)) {
      return res.status(400).json({
        message: "Longitude must be a number between -180 and 180",
        success: false,
      });
    }

    const property = await Property.findById(id);
    if (!property) {
      return res.status(404).json({
        message: "Property not found",
        success: false,
      });
    }

    if (
      property.ownerId.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        message: "Not authorized to update this property",
        success: false,
      });
    }

    let imageUrls = property.image || [];
    if (req.files && req.files.images) {
      const images = Array.isArray(req.files.images)
        ? req.files.images
        : [req.files.images];
      imageUrls = await Promise.all(
        images.map(async (item) => {
          const result = await imagekit.upload({
            file: fs.readFileSync(item.path),
            fileName: item.originalname,
            folder: "Property",
          });
          fs.unlink(item.path, (err) => {
            if (err) console.log("Error deleting the file: ", err);
          });
          return result.url;
        })
      );
    }

    const parsedAmenities = parseAmenities(amenities);

    const updateData = {
      title: title || property.title,
      description: description || property.description,
      type: type || property.type,
      availability: availability || property.availability,
      province: province || property.province,
      district: district || property.district,
      municipality: municipality || property.municipality,
      wardNumber: wardNumber ? String(wardNumber) : property.wardNumber,
      streetAddress: streetAddress || property.streetAddress,
      nearbyLandmark: nearbyLandmark || property.nearbyLandmark,
      latitude: latitude !== undefined ? Number(latitude) : property.latitude,
      longitude: longitude !== undefined ? Number(longitude) : property.longitude,
      roadCondition: roadCondition || property.roadCondition,
      roadWidth: roadWidth ? Number(roadWidth) : property.roadWidth,
      price: price ? Number(price) : property.price,
      securityDeposit: securityDeposit
        ? Number(securityDeposit)
        : property.securityDeposit,
      rentalPeriod: rentalPeriod || property.rentalPeriod,
      bedrooms: bedrooms ? Number(bedrooms) : property.bedrooms,
      bathrooms: bathrooms ? Number(bathrooms) : property.bathrooms,
      squareFeet: squareFeet ? Number(squareFeet) : property.squareFeet,
      builtArea: builtArea ? Number(builtArea) : property.builtArea,
      floors: floors ? Number(floors) : property.floors,
      yearBuilt: yearBuilt ? Number(yearBuilt) : property.yearBuilt,
      renovationYear: renovationYear
        ? Number(renovationYear)
        : property.renovationYear,
      propertyFacing: propertyFacing || property.propertyFacing,
      landOwnershipType: landOwnershipType || property.landOwnershipType,
      amenities: parsedAmenities.length > 0 ? parsedAmenities : property.amenities,
      electricityConnection:
        electricityConnection === "true" || electricityConnection === true
          ? true
          : property.electricityConnection,
      waterSupply: waterSupply || property.waterSupply,
      sewageSystem: sewageSystem || property.sewageSystem,
      gasConnection: gasConnection || property.gasConnection,
      phone: phone || property.phone,
      image: imageUrls,
      rating: rating ? Number(rating) : property.rating,
    };

    const updatedProperty = await Property.findByIdAndUpdate(id, updateData, {
      new: true,
    });

    if (!updatedProperty) {
      return res.status(404).json({
        message: "Failed to update property",
        success: false,
      });
    }

    const updatedCombinedProperty = await CombinedProperty.findOneAndUpdate(
      { propertyId: id },
      { ...updateData, propertyId: id },
      { new: true }
    );

    if (!updatedCombinedProperty) {
      console.warn("CombinedProperty not found for update, creating new one");
      const newCombinedProperty = new CombinedProperty({
        propertyId: id,
        ownerId: property.ownerId.toString(),
        ...updateData,
      });
      await newCombinedProperty.save();
    }

    return res.status(200).json({
      message: "Property updated successfully",
      success: true,
      property: updatedProperty,
    });
  } catch (error) {
    console.error("Error updating property:", error);
    return res.status(500).json({
      message: `An error occurred while updating the property: ${error.message}`,
      success: false,
    });
  }
};

const singleproperty = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid Property ID",
        success: false,
      });
    }
    const property = await Property.findById(id);
    if (!property) {
      return res.status(404).json({
        message: "Property not found",
        success: false,
      });
    }
    return res.status(200).json({ property, success: true });
  } catch (error) {
    console.error("Error fetching property:", error);
    return res.status(500).json({
      message: `An error occurred while fetching the property: ${error.message}`,
      success: false,
    });
  }
};

const listproperty = async (req, res) => {
  try {
    const properties = await Property.find();
    return res.status(200).json({ properties, success: true });
  } catch (error) {
    console.error("Error listing properties:", error);
    return res.status(500).json({
      message: `An error occurred while listing properties: ${error.message}`,
      success: false,
    });
  }
};

const removeproperty = async (req, res) => {
  try {
    const { id } = req.body;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Valid Property ID is required",
        success: false,
      });
    }

    const property = await Property.findById(id);
    if (!property) {
      return res.status(404).json({
        message: "Property not found",
        success: false,
      });
    }

    if (
      property.ownerId.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        message: "Not authorized to delete this property",
        success: false,
      });
    }

    await Property.findByIdAndDelete(id);
    await CombinedProperty.findOneAndDelete({ propertyId: id });

    return res.status(200).json({
      message: "Property deleted successfully",
      success: true,
    });
  } catch (error) {
    console.error("Error removing property:", error);
    return res.status(500).json({
      message: `An error occurred while deleting the property: ${error.message}`,
      success: false,
    });
  }
};

const myProperties = async (req, res) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({
        message: "Authentication required",
        success: false,
      });
    }

    console.log("Querying properties for ownerId:", req.user._id);
    const properties = await Property.find({
      ownerId: req.user._id.toString(),
    });
    console.log("Found properties:", properties);

    return res.status(200).json({
      message: "Properties fetched successfully",
      success: true,
      properties: properties || [],
    });
  } catch (error) {
    console.error("Error fetching my properties:", error);
    return res.status(500).json({
      message: `An error occurred while fetching properties: ${error.message}`,
      success: false,
    });
  }
};

export {
  addproperty,
  listproperty,
  removeproperty,
  updateproperty,
  singleproperty,
  myProperties,
};