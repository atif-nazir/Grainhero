import pandas as pd
import seaborn as sns
import matplotlib.pyplot as plt

# Step 1: Load the CSV File
data_rice = pd.read_csv(r'C:\Users\rahul barun\OneDrive\Desktop\PROJECT\SmartBin\smartbin_rice_storage_data_enhanced.csv')

# Display first few rows
print(data_rice.head())

# Summary statistics
print(data_rice.describe())

# Check for missing values
print(data_rice.isnull().sum())

# Step 2: Data Visualizations
features = ['Temperature', 'Humidity', 'Grain_Moisture', 'Dew_Point']
plt.figure(figsize=(12, 10))

for i, feature in enumerate(features):
    plt.subplot(2, 3, i + 1)
    sns.histplot(data_rice[feature], kde=True)
    plt.title(f'Distribution of {feature}')

plt.tight_layout()
plt.show()

# Plot the spoilage class distribution
plt.figure(figsize=(8, 6))
sns.countplot(data=data_rice, x='Spoilage_Label', palette='Set2')
plt.title('Spoilage Class Distribution')
plt.show()

# Step 3: Correlation Analysis
corr_matrix = data_rice.corr()

# Plot the heatmap of correlations
plt.figure(figsize=(10, 8))
sns.heatmap(corr_matrix, annot=True, cmap='coolwarm', fmt=".2f", linewidths=0.5)
plt.title('Correlation Matrix')
plt.show()

# Step 4: Handle Missing Values
data_rice.fillna(data_rice.mean(), inplace=True)

# Step 5: Data Preprocessing and Feature Engineering
X = data_rice[['Temperature', 'Humidity', 'Grain_Moisture', 'Dew_Point']]
y = data_rice['Spoilage_Label']

# Encode 'Spoilage_Label' if categorical
y = y.map({'Safe': 0, 'Risky': 1, 'Spoiled': 2})
