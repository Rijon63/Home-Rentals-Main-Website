import pandas as pd
import numpy as np
from faker import Faker
import uuid
from datetime import datetime
import os
import random
import json
import re  # For area parsing

fake = Faker('en_US')

dataset_path = r"C:\Users\hp\Desktop\Home Rentals main\frontend\src\components\ai\dataset\2020-4-27.csv"

# -------------------------
# Step 1: Load dataset
# -------------------------
try:
    df = pd.read_csv(dataset_path)
except FileNotFoundError:
    print(f"Error: Dataset not found at {dataset_path}. Please check the file path.")
    exit()

print("Dataset columns:", df.columns.tolist())

# -------------------------
# Step 2: Expected columns with defaults (supports callables)
# -------------------------
expected_columns_with_defaults = {
    'property_id': lambda: str(uuid.uuid4()),
    'title': lambda: 'Unknown Property',
    'street_address': lambda: 'Unknown Address',
    'city': lambda: 'Unknown',
    'province': lambda: 'Other',
    'price_per_night': lambda: 1000,
    'bedroom_count': lambda: 1,
    'bathroom_count': lambda: 1,
    'floors': lambda: 1,
    'parking': lambda: 0,
    'face': lambda: 'Unknown',
    'year': lambda: 2010,
    'views': lambda: 0,
    'area': lambda: 400,
    'road': lambda: 'Unknown',
    'road_width': lambda: 10,
    'road_type': lambda: 'Paved',
    'build_area': lambda: 300,
    'posted': lambda: '2020-01-01',
    'amenities': lambda: '[]',
    'category': lambda: 'Apartment',
    'type': lambda: 'Entire Place',
    'guest_count': lambda: 2,
    'location_score': lambda: 0.6,
    'rating': lambda: 4.0,
    'booking_id': lambda: None,
    'tenant_id': lambda: None,
    'start_date': lambda: None,
    'end_date': lambda: None,
    'total_price': lambda: 0,
    'payment_status': lambda: None,
    'tax_record_id': lambda: None,
    'municipality': lambda: None,
    'tax_rate': lambda: 0.13,
    'distribution_status': lambda: None,
    'factor_id': lambda: None,
    'seasonality_index': lambda: 1.0,
    'tourism_stats': lambda: 40000,
    'local_events': lambda: 'Trekking Season',
    'inflation': lambda: 4.5,
    'cpi': lambda: 130.0,
    'listing_type': lambda: 'sale'  # default sale
}

# Fill missing expected columns
missing_columns = [col for col in expected_columns_with_defaults if col not in df.columns]
if missing_columns:
    print(f"Warning: Missing columns {missing_columns}. Filling with default values.")
    for col in missing_columns:
        default = expected_columns_with_defaults[col]
        if col == 'title' and 'Title' in df.columns:
            df[col] = df['Title'].astype(str)
        elif col == 'street_address' and 'Address' in df.columns:
            df[col] = df['Address'].astype(str)
        elif col == 'city' and 'City' in df.columns:
            df[col] = df['City'].astype(str)
        elif col == 'bedroom_count' and 'Bedroom' in df.columns:
            df[col] = df['Bedroom']
        elif col == 'bathroom_count' and 'Bathroom' in df.columns:
            df[col] = df['Bathroom']
        elif col == 'floors' and 'Floors' in df.columns:
            df[col] = df['Floors']
        elif col == 'parking' and 'Parking' in df.columns:
            df[col] = df['Parking']
        elif col == 'face' and 'Face' in df.columns:
            df[col] = df['Face']
        elif col == 'year' and 'Year' in df.columns:
            df[col] = df['Year']
        elif col == 'views' and 'Views' in df.columns:
            df[col] = df['Views']
        elif col == 'area' and 'Area' in df.columns:
            df[col] = df['Area']
        elif col == 'road' and 'Road' in df.columns:
            df[col] = df['Road']
        elif col == 'road_width' and 'Road Width' in df.columns:
            df[col] = df['Road Width']
        elif col == 'road_type' and 'Road Type' in df.columns:
            df[col] = df['Road Type']
        elif col == 'build_area' and 'Build Area' in df.columns:
            df[col] = df['Build Area']
        elif col == 'posted' and 'Posted' in df.columns:
            df[col] = df['Posted']
        elif col == 'amenities' and 'Amenities' in df.columns:
            df[col] = df['Amenities']
        else:
            # call if callable, else repeat value for length of dataset
            if callable(default):
                df[col] = [default() for _ in range(len(df))]
            else:
                df[col] = [default for _ in range(len(df))]

# Drop raw columns that were mapped (if present)
df.drop(columns=['Title', 'Address', 'City', 'Bedroom', 'Bathroom', 'Floors', 'Parking',
                 'Face', 'Year', 'Views', 'Area', 'Road', 'Road Width', 'Road Type',
                 'Build Area', 'Posted', 'Amenities'], inplace=True, errors='ignore')

# Keep only residential titles
df['title'] = df['title'].astype(str)
df = df[df['title'].str.contains('House|Homestay|Apartment|Flat|Bungalow|Residence', case=False, na=False)]
if df.empty:
    print("Warning: No residential properties found after filtering. Proceeding with full dataset.")
    # do not exit; keep original df (user might want whole dataset)

# -------------------------
# Step 3: Derive listing_type if missing or inconsistent
# -------------------------
def derive_listing_type(row):
    cat = str(row.get('category', '')).lower()
    typ = str(row.get('type', '')).lower()
    if 'homestay' in cat or 'shared' in typ or 'rent' in str(row.get('listing_type', '')).lower():
        return 'rent'
    return 'sale'

df['listing_type'] = df.apply(lambda r: r.get('listing_type') if pd.notna(r.get('listing_type')) and str(r.get('listing_type')).strip() != '' else derive_listing_type(r), axis=1)
df['listing_type'] = df['listing_type'].apply(lambda v: 'rent' if str(v).lower() == 'rent' else 'sale')

# -------------------------
# Step 4: Parse area strings to sqft (Nepal units included)
# -------------------------
def parse_area_to_sqft(area_str):
    s = str(area_str).lower().strip()
    # catch common separators like 'x' (e.g., "20x30") -> approximate sqft
    if 'x' in s and re.search(r'\d+\s*x\s*\d+', s):
        parts = re.findall(r'(\d+\.?\d*)', s)
        if len(parts) >= 2:
            try:
                a = float(parts[0])
                b = float(parts[1])
                return a * b
            except:
                pass
    # main regex for number + optional unit
    match = re.search(r'(\d+\.?\d*)\s*(aana|ropani|sqft|sq\.?\s*ft|sqm|sq\.?\s*m|dhur|kattha|bigha)?', s)
    if match:
        value = float(match.group(1))
        unit = (match.group(2) or '').strip()
        if unit == '':
            # treat plain numbers as sqft by default (much safer than assuming aana)
            return value
        if unit == 'aana':
            return value * 342.25
        elif unit == 'ropani':
            return value * 5476
        elif unit in ['sqft', 'sq ft', 'sq.ft', 'sq. ft', 'sq. ft.']:
            return value
        elif unit in ['sqm', 'sq m', 'sq.m']:
            return value * 10.7639
        elif unit == 'dhur':
            return value * 182.25
        elif unit == 'kattha':
            return value * 3645
        elif unit == 'bigha':
            return value * 72900
    # fallback default
    return 400

df['area_sqft'] = df['area'].apply(parse_area_to_sqft)
df['build_area_sqft'] = df['build_area'].apply(parse_area_to_sqft)

# -------------------------
# Step 5: Convert numeric fields safely
# -------------------------
numeric_cols = ['views', 'road_width', 'bedroom_count', 'bathroom_count', 'floors', 'parking', 'year', 'location_score', 'rating', 'inflation', 'cpi', 'seasonality_index']
for col in numeric_cols:
    default_val = expected_columns_with_defaults[col]() if col in expected_columns_with_defaults else 0
    df[col] = pd.to_numeric(df.get(col, default_val), errors='coerce').fillna(default_val)

df['posted'] = pd.to_datetime(df.get('posted', expected_columns_with_defaults['posted']()), format='%Y-%m-%d', errors='coerce').fillna(pd.Timestamp(expected_columns_with_defaults['posted']()))

# -------------------------
# Step 6: Nepal-specific price generation function
# -------------------------
def generate_total_price(row, current_year=2025):
    # Normalize city name
    city_name = str(row.get('city', 'Unknown')).strip().title()

    # Base land price per sqft (NPR) - conservative defaults; tune to local neighbourhood
    base_land_per_sqft_map = {
        'Kathmandu': 20000,  # central Kathmandu land is expensive; tune lower/higher per locality
        'Lalitpur': 18000,
        'Bhaktapur': 15000,
        'Pokhara': 12000,
        'Chitwan': 8000,
        'Unknown': 7000
    }
    base_land_per_sqft = base_land_per_sqft_map.get(city_name, 7000)

    # Land value (NPR)
    land_value = row['area_sqft'] * base_land_per_sqft

    # Build value per sqft (NPR) - depending on finish level; 3500 is a reasonable mid-range base
    build_value_per_sqft = 3500
    build_value = row['build_area_sqft'] * build_value_per_sqft

    # Age depreciation (simple linear up to 50% discount)
    age = max(0, current_year - int(row.get('year', 2010)))
    depreciation_factor = 1 - min(0.5, age * 0.01)  # 1% per year up to 50%
    build_value = build_value * depreciation_factor

    # Feature bonuses (NPR)
    bedroom_bonus = int(row.get('bedroom_count', 1)) * 400000
    bathroom_bonus = int(row.get('bathroom_count', 1)) * 250000
    parking_bonus = int(row.get('parking', 0)) * 250000
    floors_bonus = max(0, int(row.get('floors', 1)) - 1) * 800000
    views_bonus = int(row.get('views', 0)) * 1000

    # Amenities handling (expects JSON-list string or list)
    amenities_field = row.get('amenities', '[]')
    amenities_count = 0
    try:
        if isinstance(amenities_field, str):
            amenities_list = json.loads(amenities_field)
        elif isinstance(amenities_field, list):
            amenities_list = amenities_field
        else:
            amenities_list = []
        amenities_count = len(amenities_list)
    except Exception:
        amenities_count = 0
    amenities_bonus = amenities_count * 150000

    # Road and face bonuses (simple approximations)
    road_bonus = max(0, (float(row.get('road_width', 10)) - 10)) * 80000  # wider roads increase value
    face_str = str(row.get('face', '')).lower()
    face_bonus = 0.08 * (land_value + build_value) if face_str in ['south', 'south-west', 'southwest'] else 0

    # Subtotal (sale price before multipliers)
    subtotal = (land_value + build_value + bedroom_bonus + bathroom_bonus +
                parking_bonus + floors_bonus + amenities_bonus + road_bonus + face_bonus + views_bonus)

    # Multipliers: location_score, inflation, cpi
    loc = float(row.get('location_score', 0.6))
    # Avoid divide-by-zero; interpret location_score in range ~0.0-1.0. Use 0.6 as baseline so multiplier ~ loc/0.6
    location_multiplier = max(0.3, loc) / 0.6

    inflation_rate = float(row.get('inflation', 4.5)) / 100.0
    inflation_factor = (1 + inflation_rate)
    cpi_factor = float(row.get('cpi', 130.0)) / 100.0  # keeps historical indexing effect

    seasonality_multiplier = float(row.get('seasonality_index', 1.0)) if row.get('listing_type', 'sale') == 'rent' else 1.0

    subtotal *= location_multiplier * inflation_factor * cpi_factor * seasonality_multiplier

    # If listing_type == 'rent', produce a monthly rent estimate (e.g., 0.004 - 0.006 of sale)
    listing_type = str(row.get('listing_type', 'sale')).lower()
    if listing_type == 'rent':
        # monthly rent = 0.5% of sale price roughly; tuneable
        monthly_rent = subtotal * 0.005
        # add variation and return monthly rent (rounded)
        rv = monthly_rent * (1 + random.uniform(-0.08, 0.08))
        return max(5000, int(round(rv)))

    # Add a small random market variation for sale
    random_variation = random.uniform(-0.08, 0.08) * subtotal
    final_price = subtotal + random_variation

    # Safety minimum: 200,000 NPR (very small unit)
    final_price = max(200000, int(round(final_price)))

    return final_price

# Apply price generation
df['total_price'] = df.apply(generate_total_price, axis=1)

# -------------------------
# Step 7: Save final dataset
# -------------------------
output_dir = os.path.dirname(dataset_path)
output_path = os.path.join(output_dir, 'refined_dataset.csv')
df.to_csv(output_path, index=False)
print(f"Refined dataset saved as {output_path}")


