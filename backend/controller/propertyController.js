import firecrawlService from '../services/firecrawlService.js';
import aiService from '../services/aiService.js';
import { Property } from '../models/propertymodel.js';

export const searchProperties = async (req, res) => {
    try {
        const {
            city,
            maxPrice,
            minPrice = 0,
            propertyCategory = 'Residential',
            propertyType,
            bedrooms,
            bathrooms,
            amenities,
            limit = 6,
            sort = 'relevance',
            availability = 'For Rent'
        } = req.body;

        if (!city) {
            return res.status(400).json({ success: false, message: 'City is required' });
        }

        // Build query object
        const query = {
            province: city, // Assuming city maps to province in the model
            price: { $gte: Number(minPrice), $lte: Number(maxPrice) || Infinity },
            availability,
        };

        // Add property type filter if provided
        if (propertyType && propertyType !== 'Any') {
            query.type = propertyType;
        }

        // Add bedrooms filter if provided
        if (bedrooms && bedrooms !== 'Any') {
            query.bedrooms = Number(bedrooms);
        }

        // Add bathrooms filter if provided
        if (bathrooms && bathrooms !== 'Any') {
            query.bathrooms = Number(bathrooms);
        }

        // Add amenities filter if provided
        if (amenities && Array.isArray(amenities) && amenities.length > 0) {
            query.amenities = { $all: amenities };
        }

        // Build sort object
        let sortOption = {};
        switch (sort) {
            case 'priceLowToHigh':
                sortOption = { price: 1 };
                break;
            case 'priceHighToLow':
                sortOption = { price: -1 };
                break;
            case 'newest':
                sortOption = { createdAt: -1 };
                break;
            case 'topRated':
                sortOption = { rating: -1 };
                break;
            case 'relevance':
            default:
                // Relevance sorting requires user preferences/history, which may need AI service
                sortOption = { createdAt: -1 }; // Fallback to newest
                break;
        }

        // Fetch properties from database
        const properties = await Property.find(query)
            .sort(sortOption)
            .limit(Math.min(limit, 6))
            .lean();

        // Optionally use AI service for relevance sorting if user is logged in
        let analysis = {};
        if (sort === 'relevance' && req.user?._id) {
            try {
                analysis = await aiService.analyzeProperties(
                    properties,
                    city,
                    maxPrice,
                    propertyCategory,
                    propertyType,
                    req.user._id
                );
            } catch (aiError) {
                console.error('AI service error:', aiError);
                // Continue without analysis if AI service fails
                analysis = {};
            }
        }

        res.json({
            success: true,
            properties,
            analysis
        });
    } catch (error) {
        console.error('Error searching properties:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to search properties',
            error: error.message
        });
    }
};

export const getSimilarProperties = async (req, res) => {
    try {
        const { id } = req.params;
        const { limit = 4 } = req.query;

        const property = await Property.findById(id).lean();
        if (!property) {
            return res.status(404).json({ success: false, message: 'Property not found' });
        }

        const query = {
            type: property.type,
            province: property.province,
            price: {
                $gte: Math.max(0, property.price * 0.8), // Within 20% of price
                $lte: property.price * 1.2
            },
            _id: { $ne: id }, // Exclude the current property
            availability: 'For Rent'
        };

        // Match similar amenities
        if (property.amenities?.length > 0) {
            query.amenities = { $in: property.amenities };
        }

        const similarProperties = await Property.find(query)
            .limit(Math.min(limit, 4))
            .lean();

        res.json({
            success: true,
            properties: similarProperties
        });
    } catch (error) {
        console.error('Error fetching similar properties:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch similar properties',
            error: error.message
        });
    }
};

export const getLocationTrends = async (req, res) => {
    try {
        const { city } = req.params;
        const { limit = 5 } = req.query;

        if (!city) {
            return res.status(400).json({ success: false, message: 'City parameter is required' });
        }

        let locationsData = { locations: [] };
        let analysis = {};

        try {
            locationsData = await firecrawlService.getLocationTrends(city, Math.min(limit, 5));
        } catch (firecrawlError) {
            console.error('Firecrawl service error:', firecrawlError);
            // Continue with empty locations if service fails
        }

        try {
            analysis = await aiService.analyzeLocationTrends(locationsData.locations, city);
        } catch (aiError) {
            console.error('AI service error:', aiError);
            // Continue without analysis if AI service fails
        }

        res.json({
            success: true,
            locations: locationsData.locations,
            analysis
        });
    } catch (error) {
        console.error('Error getting location trends:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get location trends',
            error: error.message
        });
    }
};