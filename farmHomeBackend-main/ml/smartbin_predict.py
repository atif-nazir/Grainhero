import joblib
import numpy as np
import json
import sys
import os
from datetime import datetime


def predict_spoilage(input_data):
    """SmartBin Rice Spoilage Prediction"""
    try:
        # Load the SmartBin model
        model_path = os.path.join(os.path.dirname(__file__), 'smartbin_model.pkl')
        model = joblib.load(model_path)
        
        # Prepare features in the correct order based on the original dataset
        # Features: Temperature, Humidity, Storage_Days, Airflow, Dew_Point, Ambient_Light, Pest_Presence, Grain_Moisture, Rainfall
        features = [
            input_data.get('temperature', 25.0),
            input_data.get('humidity', 60.0),
            input_data.get('storage_days', 1),
            input_data.get('airflow', 1.0),
            input_data.get('dew_point', 20.0),
            input_data.get('ambient_light', 100.0),
            input_data.get('pest_presence', 0),
            input_data.get('grain_moisture', 15.0),
            input_data.get('rainfall', 0.0)
        ]
        
        # Reshape for prediction
        feature_array = np.array(features).reshape(1, -1)
        
        feature_array[0][0] = max(0, min(feature_array[0][0], 60))    # temperature (°C)
        feature_array[0][1] = max(0, min(feature_array[0][1], 100))   # humidity (%)
        feature_array[0][7] = max(5, min(feature_array[0][7], 30))    # grain moisture (%)
        feature_array[0][8] = max(0, min(feature_array[0][8], 300))   # rainfall (mm)
            
        
        # ================= SAFETY GUARDRAILS =================
# Feature index mapping:
# 0: temperature, 1: humidity, 2: storage_days,
# 3: airflow, 4: dew_point, 5: ambient_light,
# 6: pest_presence, 7: grain_moisture, 8: rainfall

  
# =====================================================

        # Get prediction
        prediction = model.predict(feature_array)[0]
        
        # Get prediction probability
        probabilities = model.predict_proba(feature_array)[0]
        confidence = max(probabilities)
        
        # Map prediction to labels
        label_map = {0: 'Safe', 1: 'Risky', 2: 'Spoiled'}
        prediction_label = label_map.get(prediction, 'Safe')
        
        # Calculate risk score
        risk_score = int(probabilities[prediction] * 100)
        
        # Calculate time to spoilage
        base_times = {0: 720, 1: 168, 2: 24}  # Safe: 30 days, Risky: 7 days, Spoiled: 1 day
        base_time = base_times.get(prediction, 720)
        
        # Adjust based on environmental factors
        temp = input_data.get('temperature', 25)
        humidity = input_data.get('humidity', 60)
        
        temp_factor = 1.0
        if temp > 30:
            temp_factor = 0.5
        elif temp > 25:
            temp_factor = 0.7
        
        humidity_factor = 1.0
        if humidity > 80:
            humidity_factor = 0.4
        elif humidity > 70:
            humidity_factor = 0.6
        
        time_to_spoilage = int(base_time * temp_factor * humidity_factor)
        
        # Identify key risk factors
        risk_factors = []
        if temp > 30:
            risk_factors.append('high_temperature')
        if humidity > 80:
            risk_factors.append('high_humidity')
        if input_data.get('grain_moisture', 15) > 18:
            risk_factors.append('high_moisture')
        if input_data.get('pest_presence', 0) > 0:
            risk_factors.append('pest_presence')
        
        return {
            'prediction': prediction_label,
            'confidence': float(confidence),
            'risk_score': risk_score,
            'time_to_spoilage_hours': time_to_spoilage,
            'key_risk_factors': risk_factors,
            'model_used': 'SmartBin-RiceSpoilage',
            'timestamp': datetime.now().isoformat()
        }
        
    except Exception as e:
        # Fallback prediction
        return {
            'prediction': 'Safe',
            'confidence': 0.6,
            'risk_score': 30,
            'time_to_spoilage_hours': 168,
            'key_risk_factors': [],
            'model_used': 'SmartBin-Fallback',
            'timestamp': datetime.now().isoformat(),
            'error': str(e)
        }

if __name__ == "__main__":
    try:
        input_json = sys.stdin.read()
        if input_json.strip():
            input_data = json.loads(input_json)
            result = predict_spoilage(input_data)
            print(json.dumps(result))
        else:
            # Test prediction
            test_data = {
                'temperature': 28,
                'humidity': 75,
                'grain_moisture': 16,
                'dew_point': 22,
                'storage_days': 20,
                'airflow': 1.2,
                'ambient_light': 150,
                'pest_presence': 0,
                'rainfall': 0.5
            }
            result = predict_spoilage(test_data)
            print(json.dumps(result))
    except Exception as e:
        fallback_result = {
            'prediction': 'Safe',
            'confidence': 0.6,
            'risk_score': 30,
            'time_to_spoilage_hours': 168,
            'key_risk_factors': [],
            'model_used': 'SmartBin-Exception',
            'timestamp': datetime.now().isoformat(),
            'error': str(e)
        }
        print(json.dumps(fallback_result))
