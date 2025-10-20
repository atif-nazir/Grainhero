from xgboost import XGBClassifier
import joblib
from preprocessing import load_and_preprocess_data
from hyperparameter_tuning import run_optuna

def train():
    print(" Loading data...")
    X_train, X_test, y_train, y_test = load_and_preprocess_data('smartbin_rice_storage_data_enhanced.csv')
    
    print("  Running Optuna for hyperparameter tuning...")
    best_params = run_optuna()
    print(" Best Parameters:", best_params)

    print(" Training model...")
    model = XGBClassifier(**best_params)
    model.fit(X_train, y_train)

    try:
        joblib.dump(model, 'smartbin_model.pkl')
        print(" Model saved successfully as smartbin_model.pkl")
    except Exception as e:
        print(" Error saving model:", e)

if __name__ == "__main__":
    train()
