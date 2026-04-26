import { useState } from 'react';
import { motion } from 'framer-motion';
import Header from './Header';
import SearchForm from './SearchForm';
import PropertyCard from './PropertyCard';

const AIPropertyHub = () => {
  const [recommendations, setRecommendations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async (searchParams) => {
    console.log('AIPropertyHub: Received search params:', searchParams); // Debug log
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:4000/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(searchParams),
      });

      console.log('AIPropertyHub: Fetch response status:', response.status); // Debug log

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      console.log('AIPropertyHub: Received recommendations:', data); // Debug log
      setRecommendations(data);
    } catch (err) {
      console.error('AIPropertyHub: Fetch error:', err); // Debug log
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="container mx-auto px-4 sm:px-6 py-8">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto"
        >
          <SearchForm onSearch={handleSearch} isLoading={isLoading} />
          
          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-6 p-4 bg-red-50 text-red-700 rounded-lg"
            >
              Error: {error}
            </motion.div>
          )}

          {recommendations.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-8"
            >
              <h2 className="text-2xl font-bold text-gray-800 mb-6">
                Recommended Properties
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {recommendations.map((property, index) => (
                  <PropertyCard key={index} property={property} />
                ))}
              </div>
            </motion.div>
          )}

          {recommendations.length === 0 && !isLoading && !error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-8 text-center text-gray-500"
            >
              No recommendations yet. Try searching for properties!
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default AIPropertyHub;