import streamlit as st
from predict import predict_spoilage

st.title("SmartBin: Rice Grain Spoilage Predictor")

temp = st.slider("Temperature (°C)", 10.0, 50.0)
humidity = st.slider("Humidity (%)", 30.0, 100.0)
grain_moisture = st.slider("Grain Moisture (%)", 8.0, 30.0)
dew_point = st.slider("Dew Point (°C)", 5.0, 35.0)

if st.button("Predict Spoilage Status"):
    result = predict_spoilage([temp, humidity, grain_moisture, dew_point])
    st.success(f"Spoilage Status: {result}")
