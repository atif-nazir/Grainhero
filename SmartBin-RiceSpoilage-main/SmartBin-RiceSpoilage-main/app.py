import streamlit as st
import joblib
import numpy as np

# Load the trained model
model = joblib.load('smartbin_model.pkl')

# Title of the app
st.title("Rice Storage Spoilage Prediction")

# User input
st.subheader("Enter the Features")

temperature = st.number_input("Temperature (°C)", min_value=-50.0, max_value=50.0, value=25.0)
humidity = st.number_input("Humidity (%)", min_value=0, max_value=100, value=60)
grain_moisture = st.number_input("Grain Moisture (%)", min_value=0.0, max_value=100.0, value=15.0)
dew_point = st.number_input("Dew Point (°C)", min_value=-50.0, max_value=50.0, value=20.0)

# Feature vector for prediction
user_input = np.array([temperature, humidity, grain_moisture, dew_point]).reshape(1, -1)

# Prediction button
if st.button("Predict Spoilage"):
    prediction = model.predict(user_input)
    
    # Map prediction to labels
    prediction_label = {0: "Safe", 1: "Risky", 2: "Spoiled"}
    st.subheader(f"Predicted Spoilage: {prediction_label[prediction[0]]}")
