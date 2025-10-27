import optuna
from xgboost import XGBClassifier
from sklearn.metrics import accuracy_score
from preprocessing import load_and_preprocess_data

def objective(trial):
    X_train, X_test, y_train, y_test = load_and_preprocess_data('smartbin_rice_storage_data_enhanced.csv')

    params = {
        'max_depth': trial.suggest_int('max_depth', 3, 10),
        'n_estimators': trial.suggest_int('n_estimators', 50, 300),
        'learning_rate': trial.suggest_float('learning_rate', 0.01, 0.3),
        'gamma': trial.suggest_float('gamma', 0, 1),
        'subsample': trial.suggest_float('subsample', 0.5, 1.0),
        'colsample_bytree': trial.suggest_float('colsample_bytree', 0.5, 1.0)
    }

    model = XGBClassifier(**params)
    model.fit(X_train, y_train)
    preds = model.predict(X_test)
    return accuracy_score(y_test, preds)

def run_optuna():
    study = optuna.create_study(direction="maximize")
    study.optimize(objective, n_trials=50)
    print("Best trial:", study.best_trial)
    return study.best_params
