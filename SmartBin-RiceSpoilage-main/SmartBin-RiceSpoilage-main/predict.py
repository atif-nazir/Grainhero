import joblib
import numpy as np

def predict_spoilage(input_data):
    model = joblib.load('smartbin_model.pkl')
    prediction = model.predict(np.array(input_data).reshape(1, -1))

    label_map = {0: 'Safe', 1: 'Risky', 2: 'Spoiled'}
    return label_map[prediction[0]]
