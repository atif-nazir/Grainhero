import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

def load_and_preprocess_data(path):
    data = pd.read_csv(path)

    # Encode labels first to avoid non-numeric issues during mean()
    data['Spoilage_Label'] = data['Spoilage_Label'].map({'Safe': 0, 'Risky': 1, 'Spoiled': 2})

    # Handle missing values (after label encoding)
    data.fillna(data.mean(numeric_only=True), inplace=True)

    # Feature matrix and target vector
    X = data[['Temperature', 'Humidity', 'Grain_Moisture', 'Dew_Point']]
    y = data['Spoilage_Label']

    # Scale features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # Split data
    X_train, X_test, y_train, y_test = train_test_split(X_scaled, y, test_size=0.2, random_state=42)

    return X_train, X_test, y_train, y_test
