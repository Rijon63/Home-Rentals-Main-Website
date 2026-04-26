import pandas as pd
from statsmodels.tsa.arima.model import ARIMA
from pymongo import MongoClient
import pickle

    # Connect to MongoDB Atlas
MONGODB_URI = "mongodb+srv://rijon63:Rijon3430@cluster0.9byyo.mongodb.net/Houses?retryWrites=true&w=majority&appName=Cluster0"
client = MongoClient(MONGODB_URI)
db = client['Houses']
collection = db['combined']  # Or 'bookings' if split

    # Load data
df = pd.DataFrame(list(collection.find()))
client.close()

    # Aggregate tax_amount by month and city
df['start_date'] = pd.to_datetime(df['start_date'])
df['month'] = df['start_date'].dt.to_period('M')
revenue_df = df.groupby(['city', 'month'])['tax_rate'].sum().reset_index()
revenue_df['month'] = revenue_df['month'].dt.to_timestamp()

    # Forecast for Kathmandu
kathmandu_revenue = revenue_df[revenue_df['city'] == 'Kathmandu'].set_index('month')['tax_rate']
model = ARIMA(kathmandu_revenue, order=(1, 1, 1), seasonal_order=(1, 1, 1, 12))
model_fit = model.fit()

    # Forecast next 12 months
forecast = model_fit.forecast(steps=12)
print("12-Month Revenue Forecast for Kathmandu:", forecast)

    # Save model
with open('revenue_forecast_model.pkl', 'wb') as f:
        pickle.dump(model_fit, f)
print("Model saved as revenue_forecast_model.pkl")