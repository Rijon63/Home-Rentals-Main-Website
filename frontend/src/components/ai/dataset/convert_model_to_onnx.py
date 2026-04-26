import pickle
import os
from skl2onnx import convert_sklearn
from skl2onnx.common.data_types import FloatTensorType, StringTensorType

# Load the trained model
with open('price_prediction_model.pkl', 'rb') as f:
    model = pickle.load(f)

# Define input types (exactly matching your training features)
initial_types = [
    ('city', StringTensorType([None, 1])),
    ('amenities', StringTensorType([None, 1])),
    ('bedroom_count', FloatTensorType([None, 1])),
    ('bathroom_count', FloatTensorType([None, 1])),
    ('area_sqft', FloatTensorType([None, 1])),
    ('build_area_sqft', FloatTensorType([None, 1])),
    ('location_score', FloatTensorType([None, 1])),
    ('rating', FloatTensorType([None, 1])),
    ('listing_type', StringTensorType([None, 1])),
    ('floors', FloatTensorType([None, 1])),
    ('parking', FloatTensorType([None, 1])),
    ('road_width', FloatTensorType([None, 1])),
    ('face', StringTensorType([None, 1])),
    ('year', FloatTensorType([None, 1]))
]

# Convert sklearn pipeline model to ONNX format
onnx_model = convert_sklearn(model, initial_types=initial_types)

# Save the ONNX model to your specified path
output_path = r"C:\Users\hp\Desktop\Home Rentals main\frontend\src\components\ai\dataset\price_prediction_model.onnx"
with open(output_path, 'wb') as f:
    f.write(onnx_model.SerializeToString())

print("✅ Model successfully converted to ONNX and saved as 'price_prediction_model.onnx'")
print("📦 File size:", os.path.getsize(output_path), "bytes")
