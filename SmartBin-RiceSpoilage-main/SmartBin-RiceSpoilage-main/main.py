"""
GrainHero AI Microservice - Spoilage Prediction API
Wraps the XGBoost smartbin_model.pkl with a REST API for the Node.js backend.

The model expects 4 features: [Temperature, Humidity, Grain_Moisture, Dew_Point]
and outputs one of 3 classes: Safe (0), Risky (1), Spoiled (2).
"""

import os
import math
import joblib
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional

# ── Load model once at startup ──────────────────────────────────────────────
MODEL_PATH = os.getenv("MODEL_PATH", "smartbin_model.pkl")

try:
    model = joblib.load(MODEL_PATH)
    MODEL_LOADED = True
    print(f"[ML] Model loaded successfully from {MODEL_PATH}")
except Exception as exc:
    model = None
    MODEL_LOADED = False
    print(f"[ML] WARNING: Could not load model from {MODEL_PATH}: {exc}")

LABEL_MAP = {0: "Safe", 1: "Risky", 2: "Spoiled"}

# ── Risk score mapping ──────────────────────────────────────────────────────
# Convert the class prediction + probabilities into a 0-100 risk score
# that the Node.js backend expects.
RISK_WEIGHTS = {"Safe": 0, "Risky": 50, "Spoiled": 100}


# ── Dew point approximation (Magnus formula) ───────────────────────────────
def approx_dew_point(temp_c: float, rh_pct: float) -> float:
    """Estimate dew point from temperature (°C) and relative humidity (%)."""
    if rh_pct <= 0:
        rh_pct = 1.0
    a, b = 17.27, 237.7
    alpha = (a * temp_c) / (b + temp_c) + math.log(rh_pct / 100.0)
    return round((b * alpha) / (a - alpha), 2)


# ── FastAPI app ─────────────────────────────────────────────────────────────
app = FastAPI(
    title="GrainHero ML Service",
    description="Grain spoilage prediction microservice powered by XGBoost",
    version="1.0.0",
)

# Allow the Node.js backend (on any origin) to call this service
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request / Response schemas ──────────────────────────────────────────────
class PredictionFeatures(BaseModel):
    """
    Features sent by the Node.js backend.
    Only temperature, humidity, and moisture_content are strictly required.
    All other fields are accepted but not used by the current model version.
    """
    grain_type: Optional[str] = "Wheat"
    temperature: Optional[float] = Field(None, description="Temperature in °C")
    humidity: Optional[float] = Field(None, description="Relative humidity %")
    moisture_content: Optional[float] = Field(None, description="Grain moisture %")
    dew_point: Optional[float] = Field(None, description="Dew point °C (auto-calculated if missing)")
    # Extra fields sent by Node – accepted but unused by v1 model
    co2: Optional[float] = None
    voc: Optional[float] = None
    days_in_storage: Optional[float] = None
    light_exposure: Optional[float] = None
    ph_level: Optional[float] = None
    protein_content: Optional[float] = None


class PredictionRequest(BaseModel):
    features: PredictionFeatures


class PredictionResponse(BaseModel):
    risk_score: float
    label: str
    confidence: float
    model_used: str
    features_used: dict


# ── Endpoints ───────────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {
        "service": "GrainHero ML Service",
        "status": "online",
        "model_loaded": MODEL_LOADED,
    }


@app.get("/health")
def health():
    return {
        "status": "healthy" if MODEL_LOADED else "degraded",
        "model_loaded": MODEL_LOADED,
        "model_path": MODEL_PATH,
        "model_type": str(type(model).__name__) if model else None,
    }


@app.post("/predict", response_model=PredictionResponse)
def predict(request: PredictionRequest):
    if not MODEL_LOADED or model is None:
        raise HTTPException(status_code=503, detail="ML model is not loaded")

    f = request.features

    # Use sensible defaults when sensor data is missing
    temp = f.temperature if f.temperature is not None else 25.0
    hum = f.humidity if f.humidity is not None else 60.0
    moist = f.moisture_content if f.moisture_content is not None else 14.0

    # Calculate dew point if not provided
    dew = f.dew_point if f.dew_point is not None else approx_dew_point(temp, hum)

    # Build the 4-feature vector the model expects
    feature_vector = np.array([[temp, hum, moist, dew]])

    try:
        prediction = int(model.predict(feature_vector)[0])
        label = LABEL_MAP.get(prediction, "Unknown")

        # Try to get probability estimates for confidence
        confidence = 0.85  # default
        try:
            probabilities = model.predict_proba(feature_vector)[0]
            confidence = round(float(max(probabilities)), 4)
            # Build a weighted risk score from probabilities
            risk_score = round(
                probabilities[0] * 0    # Safe contributes 0
                + probabilities[1] * 50  # Risky contributes 50
                + probabilities[2] * 100, # Spoiled contributes 100
                2,
            )
        except Exception:
            # Fallback: derive risk score from the label
            risk_score = float(RISK_WEIGHTS.get(label, 50))

        return PredictionResponse(
            risk_score=risk_score,
            label=label,
            confidence=confidence,
            model_used="XGBoost-SmartBin-v1",
            features_used={
                "temperature": temp,
                "humidity": hum,
                "grain_moisture": moist,
                "dew_point": dew,
            },
        )

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Prediction failed: {str(exc)}",
        )


# ── Run with uvicorn when executed directly ─────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
