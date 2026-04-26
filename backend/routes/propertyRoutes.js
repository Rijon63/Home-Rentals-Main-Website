import express from 'express';
import asyncHandler from 'express-async-handler';
import { searchProperties, getLocationTrends } from '../controller/propertyController.js';

const router = express.Router();
router.get(
  '/products/single/:id',
  asyncHandler(async (req, res) => {
    console.log('Fetching property with ID:', req.params.id); // Debugging log
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      res.status(400);
      throw new Error('Invalid property ID format');
    }
    const property = await Property.findById(req.params.id);
    if (!property) {
      res.status(404);
      throw new Error('Property not found');
    }
    res.json({ property, success: true });
  })
);

// Route to search for properties
router.post('/properties/search', searchProperties);

// Route to get location trends
router.get('/locations/:city/trends', getLocationTrends);

export default router;