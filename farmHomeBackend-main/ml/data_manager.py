import pandas as pd
import numpy as np
import os
import json
from datetime import datetime
from typing import Dict, List
import csv

class DataManager:
    """
    Manages the GrainHero ML training dataset.
    
    Base dataset:   grain_spoilage_dataset.csv  (10,000 synthetic + live readings appended by Firebase)
    New data:       new_training_data.csv        (manually added batches, if any)
    Combined:       combined_training_data.csv   (merged for training)
    """
    def __init__(self):
        self.base_data_path = os.path.join(os.path.dirname(__file__), 'rice_spoilage_10k.csv')
        self.new_data_path = os.path.join(os.path.dirname(__file__), 'new_training_data.csv')
        self.combined_data_path = os.path.join(os.path.dirname(__file__), 'combined_training_data.csv')
        self.data_log_path = os.path.join(os.path.dirname(__file__), 'data_log.json')
        
    def load_base_dataset(self):
        """Load the base + live-augmented dataset"""
        try:
            if not os.path.exists(self.base_data_path):
                print(f"❌ Base dataset not found: {self.base_data_path}")
                return None
            df = pd.read_csv(self.base_data_path)
            # Normalize column names
            df = self._normalize_columns(df)
            print(f"✅ Loaded base dataset: {len(df)} records")
            return df
        except Exception as e:
            print(f"❌ Error loading base dataset: {e}")
            return None
    
    def _normalize_columns(self, df):
        """Normalize column names to match what the training script expects"""
        renames = {}
        # Handle Spoilage_Class → Spoilage_Label
        if 'Spoilage_Class' in df.columns and 'Spoilage_Label' not in df.columns:
            # 0=Safe, 1=Risky, 2=Spoiled
            label_map = {0: 'Safe', 1: 'Risky', 2: 'Spoiled'}
            df['Spoilage_Label'] = df['Spoilage_Class'].map(lambda x: label_map.get(int(x), 'Safe') if pd.notna(x) else 'Safe')
        return df
    
    def add_new_data(self, new_records: List[Dict]):
        """Add new training data records"""
        try:
            new_df = pd.DataFrame(new_records)
            
            required_columns = ['Temperature', 'Humidity', 'Grain_Moisture', 'Dew_Point', 
                              'Storage_Days', 'Airflow', 'Ambient_Light', 'Pest_Presence', 
                              'Rainfall', 'Spoilage_Label']
            
            missing = [c for c in required_columns if c not in new_df.columns]
            if missing:
                raise ValueError(f"Missing required columns: {missing}")
            
            if os.path.exists(self.new_data_path):
                existing = pd.read_csv(self.new_data_path)
                combined = pd.concat([existing, new_df], ignore_index=True)
                combined.to_csv(self.new_data_path, index=False)
            else:
                new_df.to_csv(self.new_data_path, index=False)
            
            self.log_data_addition(len(new_records))
            print(f"✅ Added {len(new_records)} new records")
            return True
            
        except Exception as e:
            print(f"❌ Error adding new data: {e}")
            return False
    
    def create_combined_dataset(self):
        """Combine base dataset with any manually-added new data for training"""
        try:
            base_df = self.load_base_dataset()
            if base_df is None:
                return False
            
            # Load manual additions if they exist
            if os.path.exists(self.new_data_path):
                new_df = pd.read_csv(self.new_data_path)
                new_df = self._normalize_columns(new_df)
                print(f"✅ Found {len(new_df)} manually-added records")
                combined_df = pd.concat([base_df, new_df], ignore_index=True)
            else:
                combined_df = base_df
            
            combined_df.to_csv(self.combined_data_path, index=False)
            print(f"✅ Created combined dataset: {len(combined_df)} total records")
            return True
                
        except Exception as e:
            print(f"❌ Error creating combined dataset: {e}")
            return False
    
    def log_data_addition(self, record_count: int):
        """Log data additions for tracking"""
        try:
            entry = {
                'timestamp': datetime.now().isoformat(),
                'records_added': record_count,
                'total_new_records': self.get_new_data_count()
            }
            
            if os.path.exists(self.data_log_path):
                with open(self.data_log_path, 'r') as f:
                    log_data = json.load(f)
            else:
                log_data = {'additions': []}
            
            log_data['additions'].append(entry)
            
            with open(self.data_log_path, 'w') as f:
                json.dump(log_data, f, indent=2)
                
        except Exception as e:
            print(f"Warning: Could not log data addition: {e}")
    
    def get_new_data_count(self):
        if os.path.exists(self.new_data_path):
            return len(pd.read_csv(self.new_data_path))
        return 0
    
    def get_data_summary(self):
        """Get summary of all data"""
        base_df = self.load_base_dataset()
        new_count = self.get_new_data_count()
        base_count = len(base_df) if base_df is not None else 0
        return {
            'base_records': base_count,
            'new_records': new_count,
            'total_records': base_count + new_count,
            'last_updated': datetime.now().isoformat()
        }

# Global instance
data_manager = DataManager()
