import pandas as pd
import json
import numpy as np
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.metrics.pairwise import cosine_similarity
from pymongo import MongoClient
import os
import sys

# Connect to MongoDB
def connect_to_mongo():
    try:
        client = MongoClient(os.getenv('MONGODB_URI', 'mongodb+srv://rijon63:Rijon3430@cluster0.9byyo.mongodb.net/Houses?retryWrites=true&w=majority&appName=Cluster0'))
        db = client['Houses']
        return db['properties']
    except Exception as e:
        print(f"Error connecting to MongoDB: {e}")
        return None

# Load data from MongoDB
def load_data():
    collection = connect_to_mongo()
    if collection is None:
        return None
    try:
        properties = list(collection.find({}))
        df = pd.DataFrame(properties)
        expected_columns = ['title', 'location', 'price', 'type', 'area_sqft', 'amenities', 'description']
        available_columns = [col for col in expected_columns if col in df.columns]
        return df[available_columns]
    except Exception as e:
        print(f"Error loading data from MongoDB: {e}")
        return None

# Preprocess data
def preprocess_data(df, user_prefs):
    # Handle missing values
    df = df.fillna({
        'location': '',
        'price': df['price'].mean() if 'price' in df.columns else 0,
        'type': 'Unknown',
        'area_sqft': df['area_sqft'].mean() if 'area_sqft' in df.columns else 0,
        'amenities': '',
        'description': ''
    })

    # Initialize encoders and scalers
    location_encoder = None
    type_encoder = None
    scaler = None
    
    # Create feature vectors
    features = []
    
    # Handle location encoding
    if 'location' in df.columns:
        location_encoder = OneHotEncoder(sparse_output=False, handle_unknown='ignore')
        location_encoded = location_encoder.fit_transform(df[['location']])
        features.append(location_encoded)

    # Handle property type encoding  
    if 'type' in df.columns:
        type_encoder = OneHotEncoder(sparse_output=False, handle_unknown='ignore')
        property_type_encoded = type_encoder.fit_transform(df[['type']])
        features.append(property_type_encoded)

    # Handle numerical features
    if 'price' in df.columns and 'area_sqft' in df.columns:
        scaler = StandardScaler()
        # Use .values to convert to numpy array and avoid feature name warnings
        numerical_features = scaler.fit_transform(df[['price', 'area_sqft']].values)
        features.append(numerical_features)

    # Combine features
    if features:
        feature_matrix = np.hstack(features)
    else:
        feature_matrix = np.zeros((len(df), 1))

    # Create user preference vector
    user_vector = []
    
    # User location vector
    if location_encoder is not None:
        user_location = np.zeros(location_encoded.shape[1])
        if user_prefs['city'] in location_encoder.categories_[0]:
            idx = list(location_encoder.categories_[0]).index(user_prefs['city'])
            user_location[idx] = 1
        user_vector.append(user_location)

    # User property type vector
    if type_encoder is not None:
        user_property_type = np.zeros(property_type_encoded.shape[1])
        if user_prefs['propertyType'] in type_encoder.categories_[0]:
            idx = list(type_encoder.categories_[0]).index(user_prefs['propertyType'])
            user_property_type[idx] = 1
        user_vector.append(user_property_type)

    # User numerical vector
    if scaler is not None:
        # Convert price from crores to actual value and use mean area
        price_value = user_prefs['maxPrice'] * 10000000  # Convert crores to rupees
        area_value = df['area_sqft'].mean()
        
        # Use numpy array to avoid feature name warnings
        user_numerical = scaler.transform(np.array([[price_value, area_value]]))
        user_vector.append(user_numerical.flatten())

    if user_vector:
        user_vector = np.concatenate(user_vector)
    else:
        user_vector = np.zeros(feature_matrix.shape[1])

    return feature_matrix, user_vector, df

# Compute recommendations
def get_recommendations(user_prefs, top_n=5):
    df = load_data()
    if df is None or df.empty:
        return []

    try:
        feature_matrix, user_vector, df = preprocess_data(df, user_prefs)

        # Ensure user_vector has the right shape
        if user_vector.ndim == 1:
            user_vector = user_vector.reshape(1, -1)
        
        # Check if dimensions match
        if user_vector.shape[1] != feature_matrix.shape[1]:
            print(f"Warning: Dimension mismatch - User vector: {user_vector.shape}, Feature matrix: {feature_matrix.shape}")
            # Pad or truncate to match dimensions
            if user_vector.shape[1] < feature_matrix.shape[1]:
                padding = np.zeros((1, feature_matrix.shape[1] - user_vector.shape[1]))
                user_vector = np.hstack([user_vector, padding])
            else:
                user_vector = user_vector[:, :feature_matrix.shape[1]]

        # Compute cosine similarity
        similarities = cosine_similarity(user_vector, feature_matrix)[0]
        
        # Get top N recommendations
        top_indices = similarities.argsort()[-top_n:][::-1]
        recommendations = df.iloc[top_indices].to_dict('records')

        # Format recommendations for frontend
        formatted_recommendations = []
        for prop in recommendations:
            # Handle amenities - convert string to list if needed
            amenities = prop.get('amenities', [])
            if isinstance(amenities, str):
                # If amenities is a string, try to split it or convert to list
                amenities = [amenities] if amenities else []
            elif not isinstance(amenities, list):
                amenities = []

            formatted_recommendations.append({
                'building_name': prop.get('title', 'Unknown Property'),
                'location_address': prop.get('location', ''),
                'price': f"₹{prop.get('price', 0):,.0f}",
                'property_type': prop.get('type', 'Unknown'),
                'area_sqft': f"{prop.get('area_sqft', 0):,.0f} sq.ft",
                'description': prop.get('description', 'No description available'),
                'amenities': amenities
            })

        return formatted_recommendations

    except Exception as e:
        print(f"Error in get_recommendations: {e}")
        return []

# Main execution
if __name__ == '__main__':
    try:
        if len(sys.argv) < 2:
            print(json.dumps({'error': 'No input provided'}))
            sys.exit(1)
        
        user_input = json.loads(sys.argv[1])
        recommendations = get_recommendations(user_input)
        print(json.dumps(recommendations))
        
    except json.JSONDecodeError as e:
        print(json.dumps({'error': f'Invalid JSON input: {str(e)}'}))
        sys.exit(1)
    except Exception as e:
        print(json.dumps({'error': f'Unexpected error: {str(e)}'}))
        sys.exit(1)