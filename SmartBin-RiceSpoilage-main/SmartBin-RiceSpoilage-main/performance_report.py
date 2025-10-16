import joblib
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import classification_report, confusion_matrix
from preprocessing import load_and_preprocess_data

# Load trained model
model = joblib.load("smartbin_model.pkl")

# Load test data
_, X_test, _, y_test = load_and_preprocess_data("smartbin_rice_storage_data_enhanced.csv")

# Predict
y_pred = model.predict(X_test)

# Classification Report
print("\nClassification Report:\n")
print(classification_report(y_test, y_pred, target_names=['Safe', 'Risky', 'Spoiled']))

# Confusion Matrix
cm = confusion_matrix(y_test, y_pred)
labels = ['Safe', 'Risky', 'Spoiled']

# Plot Confusion Matrix
plt.figure(figsize=(6, 5))
sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', xticklabels=labels, yticklabels=labels)
plt.xlabel("Predicted Label")
plt.ylabel("True Label")
plt.title("Confusion Matrix")
plt.tight_layout()

# Save the plot
plt.savefig("confusion_matrix.png")
plt.show()
