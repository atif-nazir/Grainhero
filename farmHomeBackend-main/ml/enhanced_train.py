import pandas as pd
import numpy as np
import joblib
import json
from datetime import datetime
from xgboost import XGBClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, classification_report, confusion_matrix
from sklearn.preprocessing import LabelEncoder
import optuna
import os

class SmartBinModelTrainer:
    def __init__(self, data_path='../../SmartBin-RiceSpoilage-main/SmartBin-RiceSpoilage-main/smartbin_rice_storage_data_enhanced.csv'):
        self.base_data_path = data_path
        self.combined_data_path = 'combined_training_data.csv'
        self.model = None
        self.label_encoder = LabelEncoder()
        self.feature_names = ['Temperature', 'Humidity', 'Grain_Moisture', 'Dew_Point', 'Storage_Days', 'Airflow', 'Ambient_Light', 'Pest_Presence', 'Rainfall']
        self.training_history = []
        
    def load_and_preprocess_data(self):
        """Load and preprocess the dataset"""
        try:
            # First, create combined dataset if it doesn't exist
            from data_manager import data_manager
            data_manager.create_combined_dataset()
            
            # Load the combined dataset
            if os.path.exists(self.combined_data_path):
                df = pd.read_csv(self.combined_data_path)
                print(f"✅ Loaded combined dataset with {len(df)} records")
            else:
                df = pd.read_csv(self.base_data_path)
                print(f"✅ Loaded base dataset with {len(df)} records")
            
            # Handle missing values
            df = df.fillna(df.median())
            
            # Prepare features and target
            X = df[self.feature_names]
            y = df['Spoilage_Label']
            
            # Encode labels
            y_encoded = self.label_encoder.fit_transform(y)
            
            # Split data
            X_train, X_test, y_train, y_test = train_test_split(
                X, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
            )
            
            print(f"✅ Data split: {len(X_train)} train, {len(X_test)} test samples")
            return X_train, X_test, y_train, y_test, df
            
        except Exception as e:
            print(f"❌ Error loading data: {e}")
            return None, None, None, None, None
    
    def hyperparameter_tuning(self, X_train, y_train, n_trials=30):
        """Optimize hyperparameters using Optuna"""
        def objective(trial):
            params = {
                'max_depth': trial.suggest_int('max_depth', 3, 12),
                'n_estimators': trial.suggest_int('n_estimators', 50, 500),
                'learning_rate': trial.suggest_float('learning_rate', 0.01, 0.3),
                'gamma': trial.suggest_float('gamma', 0, 2),
                'subsample': trial.suggest_float('subsample', 0.6, 1.0),
                'colsample_bytree': trial.suggest_float('colsample_bytree', 0.6, 1.0),
                'reg_alpha': trial.suggest_float('reg_alpha', 0, 10),
                'reg_lambda': trial.suggest_float('reg_lambda', 0, 10)
            }
            
            model = XGBClassifier(**params, random_state=42)
            scores = cross_val_score(model, X_train, y_train, cv=5, scoring='accuracy')
            return scores.mean()
        
        study = optuna.create_study(direction='maximize')
        study.optimize(objective, n_trials=n_trials)
        
        print(f"✅ Hyperparameter tuning completed. Best score: {study.best_value:.4f}")
        return study.best_params
    
    def train_model(self, X_train, X_test, y_train, y_test, best_params=None):
        """Train the XGBoost model"""
        if best_params is None:
            best_params = {
                'max_depth': 6,
                'n_estimators': 200,
                'learning_rate': 0.1,
                'gamma': 0,
                'subsample': 0.8,
                'colsample_bytree': 0.8
            }
        
        # Train model
        self.model = XGBClassifier(**best_params, random_state=42)
        self.model.fit(X_train, y_train)
        
        # Evaluate model
        y_pred = self.model.predict(X_test)
        
        # Calculate metrics
        accuracy = accuracy_score(y_test, y_pred)
        precision = precision_score(y_test, y_pred, average='weighted')
        recall = recall_score(y_test, y_pred, average='weighted')
        f1 = f1_score(y_test, y_pred, average='weighted')
        
        # Cross-validation score
        cv_scores = cross_val_score(self.model, X_train, y_train, cv=5)
        
        metrics = {
            'accuracy': float(accuracy),
            'precision': float(precision),
            'recall': float(recall),
            'f1_score': float(f1),
            'cv_mean': float(cv_scores.mean()),
            'cv_std': float(cv_scores.std()),
            'training_samples': len(X_train),
            'test_samples': len(X_test),
            'timestamp': datetime.now().isoformat()
        }
        
        print(f"✅ Model trained successfully!")
        print(f"   Accuracy: {accuracy:.4f}")
        print(f"   F1-Score: {f1:.4f}")
        print(f"   CV Score: {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")
        
        return metrics
    
    def save_model(self, metrics, best_params):
        """Save model and metadata"""
        try:
            # Save model
            joblib.dump(self.model, 'smartbin_model.pkl')
            
            # Save label encoder
            joblib.dump(self.label_encoder, 'label_encoder.pkl')
            
            # Save metadata
            metadata = {
                'model_type': 'XGBoost',
                'version': '2.0.0',
                'features': self.feature_names,
                'label_classes': self.label_encoder.classes_.tolist(),
                'best_params': best_params,
                'metrics': metrics,
                'training_date': datetime.now().isoformat()
            }
            
            with open('model_metadata.json', 'w') as f:
                json.dump(metadata, f, indent=2)
            
            print("✅ Model and metadata saved successfully")
            return True
            
        except Exception as e:
            print(f"❌ Error saving model: {e}")
            return False
    
    def incremental_training(self, new_data_path=None):
        """Perform incremental training with new data"""
        if new_data_path and os.path.exists(new_data_path):
            # Load new data
            new_df = pd.read_csv(new_data_path)
            print(f"✅ Loaded {len(new_df)} new records for incremental training")
            
            # Combine with existing data
            existing_df = pd.read_csv(self.data_path)
            combined_df = pd.concat([existing_df, new_df], ignore_index=True)
            
            # Update data path temporarily
            temp_path = 'temp_combined_data.csv'
            combined_df.to_csv(temp_path, index=False)
            self.data_path = temp_path
            
            return True
        return False
    
    def get_feature_importance(self):
        """Get feature importance from the trained model"""
        if self.model is None:
            return None
        
        importance = self.model.feature_importances_
        feature_importance = dict(zip(self.feature_names, importance))
        return sorted(feature_importance.items(), key=lambda x: x[1], reverse=True)
    
    def predict(self, input_data):
        """Make prediction on new data"""
        if self.model is None:
            return None
        
        try:
            # Ensure input is in correct format
            if isinstance(input_data, dict):
                input_array = np.array([[input_data.get(f, 0) for f in self.feature_names]])
            else:
                input_array = np.array(input_data).reshape(1, -1)
            
            prediction = self.model.predict(input_array)[0]
            probability = self.model.predict_proba(input_array)[0]
            
            # Decode prediction
            prediction_label = self.label_encoder.inverse_transform([prediction])[0]
            
            return {
                'prediction': prediction_label,
                'confidence': float(max(probability)),
                'probabilities': {
                    label: float(prob) for label, prob in zip(self.label_encoder.classes_, probability)
                }
            }
        except Exception as e:
            print(f"❌ Prediction error: {e}")
            return None

def main():
    """Main training function"""
    print("🚀 Starting SmartBin Model Training...")
    
    trainer = SmartBinModelTrainer()
    
    # Load data
    X_train, X_test, y_train, y_test, df = trainer.load_and_preprocess_data()
    if X_train is None:
        return
    
    # Hyperparameter tuning
    print("🔧 Optimizing hyperparameters...")
    best_params = trainer.hyperparameter_tuning(X_train, y_train, n_trials=20)
    
    # Train model
    print("🎯 Training model...")
    metrics = trainer.train_model(X_train, X_test, y_train, y_test, best_params)
    
    # Save model
    print("💾 Saving model...")
    success = trainer.save_model(metrics, best_params)
    
    if success:
        print("✅ Training completed successfully!")
        
        # Feature importance
        importance = trainer.get_feature_importance()
        print("\n📊 Feature Importance:")
        for feature, score in importance:
            print(f"   {feature}: {score:.4f}")
    else:
        print("❌ Training failed!")

if __name__ == "__main__":
    main()
