import pandas as pd
import numpy as np
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error
import joblib
import os

def train_eta_model():
    data_path = "kerala_traffic_data_clean.csv"
    if not os.path.exists(data_path):
        # Check first existing path as fallback
        data_path = "data/ernakulam_traffic.csv"
        if not os.path.exists(data_path):
            print("No training data found!")
            return

    print(f"Loading Dataset: {data_path}")
    df = pd.read_csv(data_path)
    
    # Feature Engineering Logic
    # We map old column names to new ones if necessary
    feature_map = {
        'hour_of_day': 'hour',
        'travel_time_mins': 'duration_min',
        'distance_km': 'dist_km'
    }
    df = df.rename(columns=feature_map)

    # Required Features for High-Accuracy Kerala Model
    target = 'duration_min'
    features = ['start_lat', 'start_lng', 'end_lat', 'end_lng', 'hour', 'is_weekend', 'dist_km']
    
    if 'weather_factor' in df.columns:
        features.append('weather_factor')
    if 'day_of_week' in df.columns:
        features.append('day_of_week')

    X = df[features]
    y = df[target]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    # Advanced XGBoost Config
    model = xgb.XGBRegressor(
        n_estimators=200,      # More estimators for larger data
        learning_rate=0.05,    # Slower learning for better generalization
        max_depth=6,
        objective='reg:squarederror'
    )
    
    print(f"Training XGBoost on {len(df)} samples with features: {features}")
    model.fit(X_train, y_train)

    predictions = model.predict(X_test)
    mae = mean_absolute_error(y_test, predictions)
    print(f"Training Complete. Mean Absolute Error: {mae:.2f} mins")

    os.makedirs("models", exist_ok=True)
    joblib.dump(model, "models/eta_predictor.pkl")
    
    # Save feature names to ensure main.py uses same order
    joblib.dump(features, "models/feature_names.pkl")
    print("Model saved to models/eta_predictor.pkl")

if __name__ == "__main__":
    train_eta_model()
