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
        
        # ─── Probability-weighted time-to-spoilage estimate ───
        # Base survival hours per class (empirical grain storage literature):
        #   Safe   = 720 h (30 days)  — grain in good condition
        #   Risky  = 168 h ( 7 days)  — conditions degrading
        #   Spoiled =  24 h ( 1 day)  — already compromised
        base_survival = {0: 720, 1: 168, 2: 24}
        
        # Weighted estimate: ΣPᵢ × base_hours_i
        weighted_hours = sum(
            probabilities[cls] * base_survival.get(cls, 720)
            for cls in range(len(probabilities))
        )
        
        # Environmental severity adjustment factors
        temp = input_data.get('temperature', 25)
        humidity = input_data.get('humidity', 60)
        grain_moist = input_data.get('grain_moisture', 14)
        airflow_val = input_data.get('airflow', 1.0)
        pest = input_data.get('pest_presence', 0)
        storage = input_data.get('storage_days', 1)
        
        severity_factor = 1.0
        
        # Temperature penalty (exponential decay above 28 °C)
        if temp > 35:
            severity_factor *= 0.35
        elif temp > 30:
            severity_factor *= 0.55
        elif temp > 28:
            severity_factor *= 0.75
        
        # Humidity penalty
        if humidity > 85:
            severity_factor *= 0.35
        elif humidity > 80:
            severity_factor *= 0.50
        elif humidity > 70:
            severity_factor *= 0.70
        
        # Grain moisture penalty
        if grain_moist > 20:
            severity_factor *= 0.40
        elif grain_moist > 18:
            severity_factor *= 0.60
        elif grain_moist > 16:
            severity_factor *= 0.80
        
        # Pest presence penalty
        if pest > 0:
            severity_factor *= 0.65
        
        # Low airflow penalty (0 = no ventilation)
        if airflow_val < 0.2:
            severity_factor *= 0.80
        
        # Long storage penalty (grain degrades over time)
        if storage > 90:
            severity_factor *= 0.70
        elif storage > 60:
            severity_factor *= 0.85
        
        # Final estimate (clamp to 1 h minimum)
        time_to_spoilage = max(1, int(weighted_hours * severity_factor))
        
        # ─── Key risk factors ───
        risk_factors = []
        if temp > 30:
            risk_factors.append('high_temperature')
        elif temp > 28:
            risk_factors.append('elevated_temperature')
        if humidity > 80:
            risk_factors.append('high_humidity')
        elif humidity > 70:
            risk_factors.append('elevated_humidity')
        if grain_moist > 18:
            risk_factors.append('high_grain_moisture')
        elif grain_moist > 16:
            risk_factors.append('elevated_grain_moisture')
        if pest > 0:
            risk_factors.append('pest_presence')
        if airflow_val < 0.2:
            risk_factors.append('low_airflow')
        if storage > 60:
            risk_factors.append('long_storage_duration')
        
        # Per-class probabilities for transparency
        class_probs = {}
        for cls_idx, cls_label in label_map.items():
            if cls_idx < len(probabilities):
                class_probs[cls_label] = round(float(probabilities[cls_idx]), 4)
        
        return {
            'prediction': prediction_label,
            'confidence': float(confidence),
            'risk_score': risk_score,
            'time_to_spoilage_hours': time_to_spoilage,
            'time_to_spoilage_method': 'probability_weighted_survival',
            'class_probabilities': class_probs,
            'key_risk_factors': risk_factors,
            'severity_factor': round(severity_factor, 3),
            'weighted_base_hours': round(weighted_hours, 1),
            'model_used': 'SmartBin-RiceSpoilage-XGBoost',
            'features_used': 9,
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
