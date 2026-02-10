import shap
import joblib
import pandas as pd
import matplotlib.pyplot as plt
from preprocessing import load_and_preprocess_data

# Load trained model
model = joblib.load("smartbin_model.pkl")

# Load data (same preprocessing used for training)
_, X_test, _, _ = load_and_preprocess_data("smartbin_rice_storage_data_enhanced.csv")

# Initialize SHAP TreeExplainer
explainer = shap.Explainer(model)
shap_values = explainer(X_test)

# Summary Plot
shap.summary_plot(shap_values, X_test, plot_type="bar", show=True)

# Optional: Save plot
plt.savefig("shap_summary_plot.png")

# Detailed feature impact
shap.summary_plot(shap_values, X_test)
