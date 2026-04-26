import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.metrics import r2_score, mean_absolute_error
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
import pickle
import numpy as np

# Load the refined dataset
dataset_path = r"C:\Users\hp\Desktop\Home Rentals main\frontend\src\components\ai\dataset\refined_dataset.csv"
df = pd.read_csv(dataset_path)

# Print data distribution for debugging
print("Total price distribution:")
print(df['total_price'].describe())
print("\nListing type distribution:")
print(df['listing_type'].value_counts())

# Preprocess data
df['amenities'] = df['amenities'].apply(lambda x: x if isinstance(x, str) else '[]')
df = df.dropna(subset=['total_price', 'city', 'bedroom_count', 'bathroom_count', 'area_sqft', 'location_score', 'rating', 'amenities', 'listing_type'])

# Select features and target
features = ['city', 'bedroom_count', 'bathroom_count', 'area_sqft', 'build_area_sqft', 'location_score', 'rating',
            'amenities', 'listing_type', 'floors', 'parking', 'road_width', 'face', 'year']
target = 'total_price'
X = df[features]
y = df[target]

# Log-transform the target variable to handle large price ranges
y = np.log1p(y)

# Preprocessing pipeline
preprocessor = ColumnTransformer(
    transformers=[
        ('cat', OneHotEncoder(handle_unknown='ignore'), ['city', 'amenities', 'listing_type', 'face']),
        ('num', StandardScaler(), ['bedroom_count', 'bathroom_count', 'area_sqft', 'build_area_sqft', 'location_score',
                                  'rating', 'floors', 'parking', 'road_width', 'year'])
    ])

# Create pipeline with linear regression
model = Pipeline([
    ('preprocessor', preprocessor),
    ('regressor', LinearRegression())
])

# Split data
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Train model
model.fit(X_train, y_train)

# Evaluate
y_pred_log = model.predict(X_test)
y_pred = np.expm1(y_pred_log)  # Inverse log-transform
y_test_orig = np.expm1(y_test)  # Inverse log-transform
r2 = r2_score(y_test_orig, y_pred)
mae = mean_absolute_error(y_test_orig, y_pred)
print(f"R² Score: {r2:.4f}, MAE: {mae:.2f}")

# Feature importance for linear regression (coefficients)
feature_names = (model.named_steps['preprocessor']
                 .transformers_[0][1]
                 .get_feature_names_out(['city', 'amenities', 'listing_type', 'face'])
                 .tolist() + ['bedroom_count', 'bathroom_count', 'area_sqft', 'build_area_sqft',
                              'location_score', 'rating', 'floors', 'parking', 'road_width', 'year'])
coefficients = model.named_steps['regressor'].coef_

print("\nFeature Importance:")
for name, coef in zip(feature_names, coefficients):
    print(f"{name}: {coef:.4f}")

# Save model
with open('price_prediction_model.pkl', 'wb') as f:
    pickle.dump(model, f)
print("Model saved as price_prediction_model.pkl")