import pandas as pd
import numpy as np
import os
import json
from datetime import datetime
from typing import Dict, List, Optional
import csv

class DataManager:
    def __init__(self, base_data_path='../../SmartBin-RiceSpoilage-main/SmartBin-RiceSpoilage-main/smartbin_rice_storage_data_enhanced.csv'):
        self.base_data_path = base_data_path
        self.new_data_path = 'new_training_data.csv'
        self.combined_data_path = 'combined_training_data.csv'
        self.data_log_path = 'data_log.json'
        
    def load_base_dataset(self):
        """Load the original dataset"""
        try:
            df = pd.read_csv(self.base_data_path)
            print(f"✅ Loaded base dataset: {len(df)} records")
            return df
        except Exception as e:
            print(f"❌ Error loading base dataset: {e}")
            return None
    
    def add_new_data(self, new_records: List[Dict]):
        """Add new training data records"""
        try:
            # Convert to DataFrame
            new_df = pd.DataFrame(new_records)
            
            # Validate required columns
            required_columns = ['Temperature', 'Humidity', 'Grain_Moisture', 'Dew_Point', 
                              'Storage_Days', 'Airflow', 'Ambient_Light', 'Pest_Presence', 
                              'Rainfall', 'Spoilage_Label']
            
            missing_columns = [col for col in required_columns if col not in new_df.columns]
            if missing_columns:
                raise ValueError(f"Missing required columns: {missing_columns}")
            
            # Save new data
            if os.path.exists(self.new_data_path):
                # Append to existing new data
                existing_df = pd.read_csv(self.new_data_path)
                combined_new_df = pd.concat([existing_df, new_df], ignore_index=True)
                combined_new_df.to_csv(self.new_data_path, index=False)
            else:
                # Create new file
                new_df.to_csv(self.new_data_path, index=False)
            
            # Log the addition
            self.log_data_addition(len(new_records))
            
            print(f"✅ Added {len(new_records)} new records")
            return True
            
        except Exception as e:
            print(f"❌ Error adding new data: {e}")
            return False
    
    def create_combined_dataset(self):
        """Combine base dataset with new data for training"""
        try:
            # Load base dataset
            base_df = self.load_base_dataset()
            if base_df is None:
                return False
            
            # Load new data if exists
            if os.path.exists(self.new_data_path):
                new_df = pd.read_csv(self.new_data_path)
                print(f"✅ Found {len(new_df)} new records")
                
                # Combine datasets
                combined_df = pd.concat([base_df, new_df], ignore_index=True)
                combined_df.to_csv(self.combined_data_path, index=False)
                
                print(f"✅ Created combined dataset: {len(combined_df)} total records")
                return True
            else:
                # No new data, use base dataset
                base_df.to_csv(self.combined_data_path, index=False)
                print(f"✅ Using base dataset: {len(base_df)} records")
                return True
                
        except Exception as e:
            print(f"❌ Error creating combined dataset: {e}")
            return False
    
    def log_data_addition(self, record_count: int):
        """Log data additions for tracking"""
        try:
            log_entry = {
                'timestamp': datetime.now().isoformat(),
                'records_added': record_count,
                'total_new_records': self.get_new_data_count()
            }
            
            if os.path.exists(self.data_log_path):
                with open(self.data_log_path, 'r') as f:
                    log_data = json.load(f)
            else:
                log_data = {'additions': []}
            
            log_data['additions'].append(log_entry)
            
            with open(self.data_log_path, 'w') as f:
                json.dump(log_data, f, indent=2)
                
        except Exception as e:
            print(f"Warning: Could not log data addition: {e}")
    
    def get_new_data_count(self):
        """Get count of new data records"""
        if os.path.exists(self.new_data_path):
            df = pd.read_csv(self.new_data_path)
            return len(df)
        return 0
    
    def get_data_summary(self):
        """Get summary of all data"""
        try:
            base_df = self.load_base_dataset()
            new_count = self.get_new_data_count()
            
            summary = {
                'base_records': len(base_df) if base_df is not None else 0,
                'new_records': new_count,
                'total_records': (len(base_df) if base_df is not None else 0) + new_count,
                'last_updated': datetime.now().isoformat()
            }
            
            return summary
            
        except Exception as e:
            print(f"Error getting data summary: {e}")
            return None
    
    def generate_sample_data(self, count: int = 10):
        """Generate sample data for testing"""
        sample_data = []
        
        for i in range(count):
            # Generate realistic rice storage data
            record = {
                'Temperature': np.random.normal(25, 5),  # 20-30°C
                'Humidity': np.random.normal(65, 10),   # 55-75%
                'Grain_Moisture': np.random.normal(14, 2),  # 12-16%
                'Dew_Point': np.random.normal(18, 3),   # 15-21°C
                'Storage_Days': np.random.randint(1, 30),  # 1-30 days
                'Airflow': np.random.normal(1.0, 0.3),  # 0.7-1.3
                'Ambient_Light': np.random.normal(100, 20),  # 80-120 lux
                'Pest_Presence': np.random.choice([0, 1], p=[0.8, 0.2]),  # 20% pest presence
                'Rainfall': np.random.exponential(2),  # 0-10mm
                'Spoilage_Label': np.random.choice(['Safe', 'Risky', 'Spoiled'], p=[0.7, 0.2, 0.1])
            }
            sample_data.append(record)
        
        return sample_data
    
    def clear_new_data(self):
        """Clear all new data (reset)"""
        try:
            if os.path.exists(self.new_data_path):
                os.remove(self.new_data_path)
            if os.path.exists(self.combined_data_path):
                os.remove(self.combined_data_path)
            print("✅ Cleared all new data")
            return True
        except Exception as e:
            print(f"❌ Error clearing data: {e}")
            return False

# Global instance
data_manager = DataManager()
