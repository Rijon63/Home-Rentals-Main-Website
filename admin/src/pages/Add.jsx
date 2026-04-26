// Import required React hooks for state and effect management
import React, { useState, useEffect } from 'react';
// Import toast for displaying success/error notifications
import { toast } from 'react-hot-toast';
// Import axios for making HTTP requests to the backend
import axios from 'axios';
// Import icons for UI elements (upload and close)
import { Upload, X } from 'lucide-react';
// Import useNavigate for programmatic navigation
import { useNavigate } from 'react-router-dom';
// Import backend URL from the main app configuration
import { backendurl } from '../App';

// Define constant arrays for property-related dropdown options
const PROPERTY_TYPES = ['Entire Property', 'Apartment/Flat', 'Single Room', 'Homestay'];
const AVAILABILITY_TYPES = ['For Sale', 'For Rent'];
const PROVINCES = ['Koshi', 'Madhesh', 'Bagmati', 'Gandaki', 'Lumbini', 'Karnali', 'Sudurpashchim'];
// Object mapping provinces to their respective districts
const DISTRICTS = {
  Koshi: ['Morang', 'Sunsari', 'Jhapa'],
  Madhesh: ['Parsa', 'Bara', 'Rautahat'],
  Bagmati: ['Kathmandu', 'Lalitpur', 'Bhaktapur'],
  Gandaki: ['Kaski', 'Tanahun', 'Gorkha'],
  Lumbini: ['Rupandehi', 'Kapilvastu', 'Dang'],
  Karnali: ['Surkhet', 'Jumla', 'Dailekh'],
  Sudurpashchim: ['Kailali', 'Kanchanpur', 'Doti']
};
// Object mapping districts to their respective municipalities
const MUNICIPALITIES = {
  Kathmandu: ['Kathmandu Metropolitan', 'Kirtipur Municipality', 'Tokha Municipality'],
  Lalitpur: ['Lalitpur Metropolitan', 'Godawari Municipality', 'Mahalaxmi Municipality'],
  Bhaktapur: ['Bhaktapur Municipality', 'Changunarayan Municipality'],
  Morang: ['Biratnagar Metropolitan', 'Belbari Municipality'],
  Sunsari: ['Itahari Sub-Metropolitan', 'Dharan Sub-Metropolitan'],
  Jhapa: ['Birtamod Municipality', 'Damak Municipality'],
  Parsa: ['Birgunj Metropolitan', 'Pokhariya Municipality'],
  Bara: ['Kalaiya Sub-Metropolitan', 'Jitpur Simara Sub-Metropolitan'],
  Rautahat: ['Chandrapur Municipality', 'Garuda Municipality'],
  Kaski: ['Pokhara Metropolitan', 'Annapurna Rural Municipality'],
  Tanahun: ['Vyas Municipality', 'Bhanu Municipality'],
  Gorkha: ['Gorkha Municipality', 'Palungtar Municipality'],
  Rupandehi: ['Butwal Sub-Metropolitan', 'Siddharthanagar Municipality'],
  Kapilvastu: ['Kapilvastu Municipality', 'Banganga Municipality'],
  Dang: ['Tulsipur Sub-Metropolitan', 'Ghorahi Sub-Metropolitan'],
  Surkhet: ['Birendranagar Municipality', 'Gurbhakot Municipality'],
  Jumla: ['Chandannath Municipality'],
  Dailekh: ['Narayan Municipality', 'Dullu Municipality'],
  Kailali: ['Dhangadhi Sub-Metropolitan', 'Ghodaghodi Municipality'],
  Kanchanpur: ['Bhimdatta Municipality', 'Punarbas Municipality'],
  Doti: ['Dipayal Silgadhi Municipality', 'Shikhar Municipality']
};
const ROAD_CONDITIONS = ['Paved', 'Gravel', 'Dirt', 'Other'];
const RENTAL_PERIODS = ['Monthly', 'Quarterly', 'Yearly', 'Negotiable'];
const PROPERTY_FACING = ['North', 'South', 'East', 'West', 'Northeast', 'Northwest', 'Southeast', 'Southwest', 'Unknown'];
const LAND_OWNERSHIP_TYPES = ['Private', 'Government', 'Leasehold'];
const AMENITIES = [
  'Lake View', 'Fireplace', 'Central Heating and Air Conditioning', 'Dock', 'Pool', 'Garage', 'Garden', 'Gym',
  'Security System', 'Master Bathroom', 'Guest Bathroom', 'Home Theater', 'Exercise Room/Gym', 'Covered Parking',
  'High-Speed Internet Ready', 'Solar Panels', 'Rainwater Harvesting System', 'Balcony / Terrace', 'Elevator / Lift',
  'Visitor Parking', 'Mountain View', 'River View', 'Modular Kitchen', 'Solar Water Heating', 'Inverter Backup',
  'Earthquake Resistant Structure', 'Water Tank/Storage', 'Temple/Proximity to Heritage Sites', 'Pet-Friendly'
];
const WATER_SUPPLY_TYPES = ['Tap', 'Well', 'River', 'Tanker'];
const SEWAGE_SYSTEMS = ['Septic Tank', 'Public Drainage'];
const GAS_CONNECTIONS = ['LPG', 'Piped Gas', 'None'];

// Utility function to convert decimal coordinates to Degrees-Minutes-Seconds (DMS)
const decimalToDMS = (decimal, isLatitude) => {
  const absolute = Math.abs(decimal); // Get absolute value of coordinate
  const degrees = Math.floor(absolute); // Extract degrees
  const minutesFloat = (absolute - degrees) * 60; // Calculate minutes
  const minutes = Math.floor(minutesFloat);
  const seconds = ((minutesFloat - minutes) * 60).toFixed(1); // Calculate seconds
  const direction = isLatitude
    ? decimal >= 0 ? 'N' : 'S' // Determine latitude direction
    : decimal >= 0 ? 'E' : 'W'; // Determine longitude direction
  return { degrees, minutes, seconds, direction };
};

// Utility function to convert DMS coordinates to decimal format
const dmsToDecimal = (degrees, minutes, seconds, direction) => {
  const decimal = parseFloat(degrees) + (parseFloat(minutes) / 60) + (parseFloat(seconds) / 3600); // Convert to decimal
  return (direction === 'S' || direction === 'W') ? -decimal : decimal; // Adjust for direction
};

// PropertyForm component for adding new property listings
const PropertyForm = () => {
  const navigate = useNavigate(); // Hook for programmatic navigation
  // State to manage form data with default values
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: PROPERTY_TYPES[0],
    availability: AVAILABILITY_TYPES[0],
    province: PROVINCES[0],
    district: DISTRICTS[PROVINCES[0]][0],
    municipality: MUNICIPALITIES[DISTRICTS[PROVINCES[0]][0]][0],
    wardNumber: '',
    streetAddress: '',
    nearbyLandmark: '',
    latitudeDegrees: '27',
    latitudeMinutes: '43',
    latitudeSeconds: '1.9',
    latitudeDirection: 'N',
    longitudeDegrees: '85',
    longitudeMinutes: '19',
    longitudeSeconds: '26.4',
    longitudeDirection: 'E',
    roadCondition: ROAD_CONDITIONS[0],
    roadWidth: '',
    price: '',
    securityDeposit: '',
    rentalPeriod: RENTAL_PERIODS[0],
    bedrooms: '',
    bathrooms: '',
    squareFeet: '',
    builtArea: '',
    floors: '',
    yearBuilt: '',
    renovationYear: '',
    propertyFacing: PROPERTY_FACING[0],
    landOwnershipType: LAND_OWNERSHIP_TYPES[0],
    amenities: [],
    electricityConnection: false,
    waterSupply: WATER_SUPPLY_TYPES[0],
    sewageSystem: SEWAGE_SYSTEMS[0],
    gasConnection: GAS_CONNECTIONS[0],
    phone: '',
    images: [],
    rating: '0'
  });
  // State for image preview URLs
  const [previewUrls, setPreviewUrls] = useState([]);
  // State for form submission loading status
  const [loading, setLoading] = useState(false);
  // State for custom amenity input
  const [newAmenity, setNewAmenity] = useState('');
  // State for available districts based on selected province
  const [availableDistricts, setAvailableDistricts] = useState(DISTRICTS[PROVINCES[0]] || []);
  // State for available municipalities based on selected district
  const [availableMunicipalities, setAvailableMunicipalities] = useState(MUNICIPALITIES[DISTRICTS[PROVINCES[0]][0]] || []);
  // Retrieve user ID from localStorage, default to 'guest'
  const userId = localStorage.getItem("userId") || "guest";

  // Effect to check admin authentication
  useEffect(() => {
    const token = localStorage.getItem("token"); // Retrieve auth token
    const isAdmin = localStorage.getItem("isAdmin"); // Retrieve admin status
    if (!token || isAdmin !== 'true') {
      toast.error("Admin access required"); // Show error if not admin
      navigate("/login"); // Redirect to login page
    }
  }, [navigate]);

  // Effect to update districts and municipalities when province changes
  useEffect(() => {
    if (formData.province && DISTRICTS[formData.province]) {
      const districts = DISTRICTS[formData.province]; // Get districts for selected province
      setAvailableDistricts(districts); // Update available districts
      const defaultDistrict = districts.includes(formData.district) ? formData.district : districts[0]; // Set default district
      setFormData(prev => ({
        ...prev,
        district: defaultDistrict,
        municipality: defaultDistrict && MUNICIPALITIES[defaultDistrict] ? MUNICIPALITIES[defaultDistrict][0] : '' // Set default municipality
      }));
      setAvailableMunicipalities(defaultDistrict && MUNICIPALITIES[defaultDistrict] ? MUNICIPALITIES[defaultDistrict] : []); // Update municipalities
    } else {
      setAvailableDistricts([]); // Clear districts if province invalid
      setAvailableMunicipalities([]); // Clear municipalities
      setFormData(prev => ({
        ...prev,
        district: '',
        municipality: ''
      }));
    }
  }, [formData.province]);

  // Effect to update municipalities when district changes
  useEffect(() => {
    if (formData.district && MUNICIPALITIES[formData.district]) {
      const municipalities = MUNICIPALITIES[formData.district]; // Get municipalities for selected district
      setAvailableMunicipalities(municipalities); // Update available municipalities
      setFormData(prev => ({
        ...prev,
        municipality: municipalities.includes(formData.municipality) ? formData.municipality : municipalities[0] // Set default municipality
      }));
    } else {
      setAvailableMunicipalities([]); // Clear municipalities if district invalid
      setFormData(prev => ({ ...prev, municipality: '' }));
    }
  }, [formData.district]);

  // Handle input changes for form fields
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value // Handle checkbox and other inputs
    }));
  };

  // Toggle amenities in the amenities array
  const handleAmenityToggle = (amenity) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity) // Remove amenity if already selected
        : [...prev.amenities, amenity] // Add amenity if not selected
    }));
  };

  // Handle image file selection and preview
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files); // Convert file list to array
    if (files.length + previewUrls.length > 4) {
      toast.error('Maximum 4 images allowed'); // Limit to 4 images
      return;
    }
    const newPreviewUrls = files.map(file => URL.createObjectURL(file)); // Generate preview URLs
    setPreviewUrls(prev => [...prev, ...newPreviewUrls]); // Update preview URLs
    setFormData(prev => ({
      ...prev,
      images: [...prev.images, ...files] // Add new images to form data
    }));
  };

  // Remove an image from preview and form data
  const removeImage = (index) => {
    setPreviewUrls(prev => prev.filter((_, i) => i !== index)); // Remove preview URL
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index) // Remove image file
    }));
  };

  // Add a new custom amenity
  const handleAddAmenity = () => {
    if (newAmenity && !formData.amenities.includes(newAmenity)) {
      setFormData(prev => ({
        ...prev,
        amenities: [...prev.amenities, newAmenity] // Add new amenity to list
      }));
      setNewAmenity(''); // Clear input field
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevent default form submission
    setLoading(true); // Set loading state

    // Client-side validation for required fields
    const requiredFields = [
      'title', 'description', 'type', 'availability', 'province', 'district', 'municipality', 'price', 'phone',
      'latitudeDegrees', 'latitudeMinutes', 'latitudeSeconds', 'latitudeDirection',
      'longitudeDegrees', 'longitudeMinutes', 'longitudeSeconds', 'longitudeDirection'
    ];
    const missingFields = requiredFields.filter(field => !formData[field] || (typeof formData[field] === 'string' && formData[field].trim() === ''));
    if (missingFields.length > 0) {
      toast.error(`Please fill in all required fields: ${missingFields.join(', ')}`); // Show missing fields error
      setLoading(false);
      return;
    }

    // Validate DMS inputs for latitude and longitude
    const latDeg = parseFloat(formData.latitudeDegrees);
    const latMin = parseFloat(formData.latitudeMinutes);
    const latSec = parseFloat(formData.latitudeSeconds);
    const lonDeg = parseFloat(formData.longitudeDegrees);
    const lonMin = parseFloat(formData.longitudeMinutes);
    const lonSec = parseFloat(formData.longitudeSeconds);

    if (isNaN(latDeg) || latDeg < 0 || latDeg > 90) {
      toast.error('Latitude degrees must be between 0 and 90');
      setLoading(false);
      return;
    }
    if (isNaN(latMin) || latMin < 0 || latMin >= 60) {
      toast.error('Latitude minutes must be between 0 and 59');
      setLoading(false);
      return;
    }
    if (isNaN(latSec) || latSec < 0 || latSec >= 60) {
      toast.error('Latitude seconds must be between 0 and 59.9');
      setLoading(false);
      return;
    }
    if (!['N', 'S'].includes(formData.latitudeDirection)) {
      toast.error('Latitude direction must be N or S');
      setLoading(false);
      return;
    }
    if (isNaN(lonDeg) || lonDeg < 0 || lonDeg > 180) {
      toast.error('Longitude degrees must be between 0 and 180');
      setLoading(false);
      return;
    }
    if (isNaN(lonMin) || lonMin < 0 || lonMin >= 60) {
      toast.error('Longitude minutes must be between 0 and 59');
      setLoading(false);
      return;
    }
    if (isNaN(lonSec) || lonSec < 0 || lonSec >= 60) {
      toast.error('Longitude seconds must be between 0 and 59.9');
      setLoading(false);
      return;
    }
    if (!['E', 'W'].includes(formData.longitudeDirection)) {
      toast.error('Longitude direction must be E or W');
      setLoading(false);
      return;
    }

    // Convert DMS coordinates to decimal format
    const latitude = dmsToDecimal(latDeg, latMin, latSec, formData.latitudeDirection);
    const longitude = dmsToDecimal(lonDeg, lonMin, lonSec, formData.longitudeDirection);

    try {
      const token = localStorage.getItem("token"); // Retrieve auth token
      if (!token) {
        toast.error("No authentication token found. Please log in again.");
        navigate("/login");
        return;
      }

      // Create FormData object for multipart form submission
      const formdata = new FormData();
      formdata.append('title', formData.title);
      formdata.append('description', formData.description);
      formdata.append('type', formData.type);
      formdata.append('availability', formData.availability);
      formdata.append('province', formData.province);
      formdata.append('district', formData.district);
      formdata.append('municipality', formData.municipality);
      formdata.append('wardNumber', formData.wardNumber);
      formdata.append('streetAddress', formData.streetAddress);
      formdata.append('nearbyLandmark', formData.nearbyLandmark);
      formdata.append('latitude', latitude);
      formdata.append('longitude', longitude);
      formdata.append('roadCondition', formData.roadCondition);
      formdata.append('roadWidth', formData.roadWidth);
      formdata.append('price', formData.price);
      formdata.append('securityDeposit', formData.securityDeposit);
      formdata.append('rentalPeriod', formData.rentalPeriod);
      formdata.append('bedrooms', formData.bedrooms);
      formdata.append('bathrooms', formData.bathrooms);
      formdata.append('squareFeet', formData.squareFeet);
      formdata.append('builtArea', formData.builtArea);
      formdata.append('floors', formData.floors);
      formdata.append('yearBuilt', formData.yearBuilt);
      formdata.append('renovationYear', formData.renovationYear);
      formdata.append('propertyFacing', formData.propertyFacing);
      formdata.append('landOwnershipType', formData.landOwnershipType);
      formData.amenities.forEach((amenity, index) => {
        formdata.append(`amenities[${index}]`, amenity); // Append amenities as array
      });
      formdata.append('electricityConnection', formData.electricityConnection);
      formdata.append('waterSupply', formData.waterSupply);
      formdata.append('sewageSystem', formData.sewageSystem);
      formdata.append('gasConnection', formData.gasConnection);
      formdata.append('phone', formData.phone);
      formdata.append('ownerId', userId);
      formdata.append('rating', formData.rating);
      formData.images.forEach((image) => {
        formdata.append('images', image); // Append image files
      });

      // Send POST request to add property
      const response = await axios.post(`${backendurl}/api/products/add`, formdata, {
        headers: {
          'Content-Type': 'multipart/form-data', // Set content type for file upload
          Authorization: `Bearer ${token}` // Include auth token
        }
      });

      if (response.data.success) {
        toast.success('Property added successfully'); // Show success notification
        // Reset form to initial state
        setFormData({
          title: '',
          description: '',
          type: PROPERTY_TYPES[0],
          availability: AVAILABILITY_TYPES[0],
          province: PROVINCES[0],
          district: DISTRICTS[PROVINCES[0]][0],
          municipality: MUNICIPALITIES[DISTRICTS[PROVINCES[0]][0]][0],
          wardNumber: '',
          streetAddress: '',
          nearbyLandmark: '',
          latitudeDegrees: '27',
          latitudeMinutes: '43',
          latitudeSeconds: '1.9',
          latitudeDirection: 'N',
          longitudeDegrees: '85',
          longitudeMinutes: '19',
          longitudeSeconds: '26.4',
          longitudeDirection: 'E',
          roadCondition: ROAD_CONDITIONS[0],
          roadWidth: '',
          price: '',
          securityDeposit: '',
          rentalPeriod: RENTAL_PERIODS[0],
          bedrooms: '',
          bathrooms: '',
          squareFeet: '',
          builtArea: '',
          floors: '',
          yearBuilt: '',
          renovationYear: '',
          propertyFacing: PROPERTY_FACING[0],
          landOwnershipType: LAND_OWNERSHIP_TYPES[0],
          amenities: [],
          electricityConnection: false,
          waterSupply: WATER_SUPPLY_TYPES[0],
          sewageSystem: SEWAGE_SYSTEMS[0],
          gasConnection: GAS_CONNECTIONS[0],
          phone: '',
          images: [],
          rating: '0'
        });
        setPreviewUrls([]); // Clear image previews
        navigate('/dashboard?refresh=true'); // Redirect to dashboard with refresh
      } else {
        toast.error(response.data.message || 'Failed to add property'); // Show error
      }
    } catch (error) {
      console.error('Error adding property:', error); // Log error
      toast.error(error.response?.data?.message || 'An error occurred. Please try again.');
      // Handle unauthorized or forbidden errors
      if (error.response?.status === 401 || error.response?.status === 403) {
        localStorage.removeItem("token");
        localStorage.removeItem("isAdmin");
        localStorage.removeItem("userId");
        navigate("/login"); // Redirect to login
      }
    } finally {
      setLoading(false); // Clear loading state
    }
  };

  // Render the property form UI
  return (
    <div className="min-h-screen pt-32 px-4 bg-gray-50">
      {/* Form container */}
      <div className="max-w-4xl mx-auto rounded-lg shadow-xl bg-white p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Add New Property</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">Property Title</label>
              <input
                type="text"
                id="title"
                name="title"
                required
                value={formData.title}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                id="description"
                name="description"
                required
                value={formData.description}
                onChange={handleInputChange}
                rows={4}
                className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="type" className="block text-sm font-medium text-gray-700">Property Type</label>
                <select
                  id="type"
                  name="type"
                  required
                  value={formData.type}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  {PROPERTY_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="availability" className="block text-sm font-medium text-gray-700">Availability</label>
                <select
                  id="availability"
                  name="availability"
                  required
                  value={formData.availability}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  {AVAILABILITY_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="rating" className="block text-sm font-medium text-gray-700">Initial Rating (0-5)</label>
              <input
                type="number"
                id="rating"
                name="rating"
                min="0"
                max="5"
                step="0.1"
                value={formData.rating}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
          </div>

          {/* Section 2: Location Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Location Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="province" className="block text-sm font-medium text-gray-700">Province</label>
                <select
                  id="province"
                  name="province"
                  required
                  value={formData.province}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  {PROVINCES.map(province => (
                    <option key={province} value={province}>{province}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="district" className="block text-sm font-medium text-gray-700">District</label>
                <select
                  id="district"
                  name="district"
                  required
                  value={formData.district}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  disabled={!formData.province || availableDistricts.length === 0} // Disable if no province selected
                >
                  {availableDistricts.map(district => (
                    <option key={district} value={district}>{district}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="municipality" className="block text-sm font-medium text-gray-700">Municipality / Rural Municipality</label>
                <select
                  id="municipality"
                  name="municipality"
                  required
                  value={formData.municipality}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  disabled={!formData.district || availableMunicipalities.length === 0} // Disable if no district selected
                >
                  {availableMunicipalities.map(municipality => (
                    <option key={municipality} value={municipality}>{municipality}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="wardNumber" className="block text-sm font-medium text-gray-700">Ward Number</label>
                <select
                  id="wardNumber"
                  name="wardNumber"
                  value={formData.wardNumber}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="">Select Ward</option>
                  {[...Array(35).keys()].map(i => (
                    <option key={i + 1} value={i + 1}>{i + 1}</option> // Generate ward numbers 1-35
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Latitude</label>
              <div className="grid grid-cols-4 gap-2">
                <input
                  type="number"
                  id="latitudeDegrees"
                  name="latitudeDegrees"
                  required
                  min="0"
                  max="90"
                  value={formData.latitudeDegrees}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="Degrees (0-90)"
                />
                <input
                  type="number"
                  id="latitudeMinutes"
                  name="latitudeMinutes"
                  required
                  min="0"
                  max="59"
                  value={formData.latitudeMinutes}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="Minutes (0-59)"
                />
                <input
                  type="number"
                  id="latitudeSeconds"
                  name="latitudeSeconds"
                  required
                  min="0"
                  max="59.9"
                  step="0.1"
                  value={formData.latitudeSeconds}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="Seconds (0-59.9)"
                />
                <select
                  id="latitudeDirection"
                  name="latitudeDirection"
                  required
                  value={formData.latitudeDirection}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="N">N</option>
                  <option value="S">S</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Longitude</label>
              <div className="grid grid-cols-4 gap-2">
                <input
                  type="number"
                  id="longitudeDegrees"
                  name="longitudeDegrees"
                  required
                  min="0"
                  max="180"
                  value={formData.longitudeDegrees}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="Degrees (0-180)"
                />
                <input
                  type="number"
                  id="longitudeMinutes"
                  name="longitudeMinutes"
                  required
                  min="0"
                  max="59"
                  value={formData.longitudeMinutes}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="Minutes (0-59)"
                />
                <input
                  type="number"
                  id="longitudeSeconds"
                  name="longitudeSeconds"
                  required
                  min="0"
                  max="59.9"
                  step="0.1"
                  value={formData.longitudeSeconds}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="Seconds (0-59.9)"
                />
                <select
                  id="longitudeDirection"
                  name="longitudeDirection"
                  required
                  value={formData.longitudeDirection}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="E">E</option>
                  <option value="W">W</option>
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="streetAddress" className="block text-sm font-medium text-gray-700">Street Address</label>
              <input
                type="text"
                id="streetAddress"
                name="streetAddress"
                value={formData.streetAddress}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="nearbyLandmark" className="block text-sm font-medium text-gray-700">Nearby Landmark(s)</label>
              <input
                type="text"
                id="nearbyLandmark"
                name="nearbyLandmark"
                value={formData.nearbyLandmark}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="roadCondition" className="block text-sm font-medium text-gray-700">Road Condition</label>
                <select
                  id="roadCondition"
                  name="roadCondition"
                  value={formData.roadCondition}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="">Select Road Condition</option>
                  {ROAD_CONDITIONS.map(condition => (
                    <option key={condition} value={condition}>{condition}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="roadWidth" className="block text-sm font-medium text-gray-700">Road Width (Feet)</label>
                <input
                  type="number"
                  id="roadWidth"
                  name="roadWidth"
                  min="0"
                  value={formData.roadWidth}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Property Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Property Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                  Price (in NPR) {formData.availability === 'For Rent' ? '(Monthly)' : '(Total)'}
                </label>
                <input
                  type="number"
                  id="price"
                  name="price"
                  required
                  min="0"
                  value={formData.price}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              {formData.availability === 'For Rent' && (
                <div>
                  <label htmlFor="securityDeposit" className="block text-sm font-medium text-gray-700">Security Deposit (in NPR)</label>
                  <input
                    type="number"
                    id="securityDeposit"
                    name="securityDeposit"
                    min="0"
                    value={formData.securityDeposit}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
              )}
            </div>
            {formData.availability === 'For Rent' && (
              <div>
                <label htmlFor="rentalPeriod" className="block text-sm font-medium text-gray-700">Rental Period</label>
                <select
                  id="rentalPeriod"
                  name="rentalPeriod"
                  value={formData.rentalPeriod}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="">Select Rental Period</option>
                  {RENTAL_PERIODS.map(period => (
                    <option key={period} value={period}>{period}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label htmlFor="bedrooms" className="block text-sm font-medium text-gray-700">Bedrooms</label>
                <input
                  type="number"
                  id="bedrooms"
                  name="bedrooms"
                  min="0"
                  value={formData.bedrooms}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="bathrooms" className="block text-sm font-medium text-gray-700">Bathrooms</label>
                <input
                  type="number"
                  id="bathrooms"
                  name="bathrooms"
                  min="0"
                  value={formData.bathrooms}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="squareFeet" className="block text-sm font-medium text-gray-700">Square Feet (Land Area)</label>
                <input
                  type="number"
                  id="squareFeet"
                  name="squareFeet"
                  min="0"
                  value={formData.squareFeet}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="builtArea" className="block text-sm font-medium text-gray-700">Built Area (Square Feet)</label>
                <input
                  type="number"
                  id="builtArea"
                  name="builtArea"
                  min="0"
                  value={formData.builtArea}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="floors" className="block text-sm font-medium text-gray-700">Floors</label>
                <input
                  type="number"
                  id="floors"
                  name="floors"
                  min="0"
                  value={formData.floors}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="yearBuilt" className="block text-sm font-medium text-gray-700">Year Built</label>
                <input
                  type="number"
                  id="yearBuilt"
                  name="yearBuilt"
                  min="1800"
                  max={new Date().getFullYear()}
                  value={formData.yearBuilt}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="renovationYear" className="block text-sm font-medium text-gray-700">Renovation Year (Optional)</label>
                <input
                  type="number"
                  id="renovationYear"
                  name="renovationYear"
                  min="1800"
                  max={new Date().getFullYear()}
                  value={formData.renovationYear}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="propertyFacing" className="block text-sm font-medium text-gray-700">Property Facing</label>
                <select
                  id="propertyFacing"
                  name="propertyFacing"
                  value={formData.propertyFacing}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="">Select Facing</option>
                  {PROPERTY_FACING.map(facing => (
                    <option key={facing} value={facing}>{facing}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="landOwnershipType" className="block text-sm font-medium text-gray-700">Land Ownership Type</label>
                <select
                  id="landOwnershipType"
                  name="landOwnershipType"
                  value={formData.landOwnershipType}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="">Select Ownership Type</option>
                  {LAND_OWNERSHIP_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 4: Amenities & Utilities */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Amenities & Utilities</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Amenities</label>
              <div className="flex flex-wrap gap-2">
                {AMENITIES.concat(formData.amenities.filter(a => !AMENITIES.includes(a))).map((amenity, index) => (
                  <div key={index} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`amenity-${index}`}
                      name="amenities"
                      value={amenity}
                      checked={formData.amenities.includes(amenity)}
                      onChange={() => handleAmenityToggle(amenity)}
                      className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    />
                    <label htmlFor={`amenity-${index}`} className="ml-2 block text-sm text-gray-700">{amenity}</label>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center">
                <input
                  type="text"
                  value={newAmenity}
                  onChange={(e) => setNewAmenity(e.target.value)} // Update custom amenity input
                  placeholder="Add new amenity"
                  className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
                <button
                  type="button"
                  onClick={handleAddAmenity}
                  className="ml-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                >
                  Add
                </button>
              </div>
            </div>
            <div>
              <label htmlFor="electricityConnection" className="block text-sm font-medium text-gray-700">Electricity Connection</label>
              <input
                type="checkbox"
                id="electricityConnection"
                name="electricityConnection"
                checked={formData.electricityConnection}
                onChange={handleInputChange}
                className="mt-1 h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="waterSupply" className="block text-sm font-medium text-gray-700">Water Supply</label>
                <select
                  id="waterSupply"
                  name="waterSupply"
                  value={formData.waterSupply}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="">Select Water Supply</option>
                  {WATER_SUPPLY_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="sewageSystem" className="block text-sm font-medium text-gray-700">Sewage System</label>
                <select
                  id="sewageSystem"
                  name="sewageSystem"
                  value={formData.sewageSystem}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="">Select Sewage System</option>
                  {SEWAGE_SYSTEMS.map(system => (
                    <option key={system} value={system}>{system}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="gasConnection" className="block text-sm font-medium text-gray-700">Gas Connection</label>
              <select
                id="gasConnection"
                name="gasConnection"
                value={formData.gasConnection}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="">Select Gas Connection</option>
                {GAS_CONNECTIONS.map(connection => (
                  <option key={connection} value={connection}>{connection}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Section 5: Contact & Media */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Contact & Media</h3>
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Contact Phone</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                required
                pattern="\+977-[0-9]{9,10}" // Enforce phone number format
                placeholder="+977-XXXXXXXXXX"
                value={formData.phone}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Property Images (Max 4)</label>
              <div className="grid grid-cols-2 gap-4 mb-4">
                {previewUrls.map((url, index) => (
                  <div key={index} className="relative">
                    <img
                      src={url}
                      alt={`Preview ${index + 1}`}
                      className="h-40 w-full object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                    >
                      <X size={16} /> {/* Close icon for removing image */}
                    </button>
                  </div>
                ))}
              </div>
              {previewUrls.length < 4 && (
                <div className="flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                  <div className="space-y-1 text-center">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" /> {/* Upload icon */}
                    <div className="flex text-sm text-gray-600">
                      <label htmlFor="images" className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                        <span>Upload images</span>
                        <input
                          id="images"
                          name="images"
                          type="file"
                          multiple
                          accept="image/jpeg,image/png" // Restrict to JPEG/PNG
                          onChange={handleImageChange}
                          className="sr-only"
                        />
                      </label>
                    </div>
                    <p className="text-xs text-gray-500">JPG, PNG up to 10MB</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              disabled={loading} // Disable button during submission
            >
              {loading ? 'Submitting...' : 'Add Property'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Export the component for use in other parts of the app
export default PropertyForm;