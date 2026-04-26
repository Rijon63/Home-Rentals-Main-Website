from pymongo import MongoClient

# MongoDB Atlas connection string
MONGODB_URI = "mongodb+srv://rijon63:Rijon3430@cluster0.9byyo.mongodb.net/Houses?retryWrites=true&w=majority&appName=Cluster0"

# Connect to MongoDB Atlas
client = MongoClient(MONGODB_URI)
db = client['Houses']
combined_collection = db['combined']

# Define collections
properties_coll = db['properties']
bookings_coll = db['bookings']
tax_records_coll = db['tax_records']
external_factors_coll = db['external_factors']

# Clear existing collections (optional)
properties_coll.delete_many({})
bookings_coll.delete_many({})
tax_records_coll.delete_many({})
external_factors_coll.delete_many({})

# Extract and insert data
for doc in combined_collection.find():
    # Properties
    property_doc = {k: doc[k] for k in [
        'property_id', 'title', 'street_address', 'city', 'province', 'price_per_night',
        'bedroom_count', 'bathroom_count', 'floors', 'parking', 'face', 'year', 'views',
        'area', 'road', 'road_width', 'road_type', 'build_area', 'posted', 'amenities',
        'category', 'type', 'guest_count', 'location_score', 'rating'] if k in doc}
    properties_coll.update_one({'property_id': doc['property_id']}, {'$set': property_doc}, upsert=True)

    # Bookings
    booking_doc = {k: doc[k] for k in [
        'booking_id', 'property_id', 'User._id', 'start_date', 'end_date', 'total_price',
        'tax_amount', 'payment_status'] if k in doc}
    bookings_coll.insert_one(booking_doc)

    # Tax Records
    tax_doc = {k: doc[k] for k in [
        'tax_record_id', 'booking_id', 'municipality', 'tax_rate', 'tax_amount', 'distribution_status'] if k in doc}
    tax_records_coll.insert_one(tax_doc)

    # External Factors
    external_doc = {k: doc[k] for k in [
        'factor_id', 'city', 'seasonality_index', 'tourism_stats', 'local_events', 'inflation', 'cpi'] if k in doc}
    external_factors_coll.update_one({'factor_id': doc['factor_id']}, {'$set': external_doc}, upsert=True)

print(f"Properties: {properties_coll.count_documents({})}")
print(f"Bookings: {bookings_coll.count_documents({})}")
print(f"Tax Records: {tax_records_coll.count_documents({})}")
print(f"External Factors: {external_factors_coll.count_documents({})}")
client.close()