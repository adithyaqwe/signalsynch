import os
import joblib
import numpy as np

# Load model once at module import
_MODEL = None
_MODEL_PATHS = [
    os.path.join(os.path.dirname(__file__), "model.pkl"),
    "backend/model.pkl",
    "model.pkl"
]

for path in _MODEL_PATHS:
    if os.path.exists(path):
        try:
            _MODEL = joblib.load(path)
            print(f"[ml_service] Successfully loaded ML model from {path}")
            break
        except Exception as e:
            print(f"[ml_service] Failed loading model from {path}: {e}")

if _MODEL is None:
    print("[ml_service] WARNING: Model file not found. Place model.pkl in backend/ or run train_model.py.")

def extract_features_single(val_A, val_B, val_C):
    vals = [v for v in [val_A, val_B, val_C] if v is not None]
    
    if not vals:
        default_mean = 0.0
        val_a_clean = default_mean
        val_b_clean = default_mean
        val_c_clean = default_mean
    else:
        computed_mean = float(np.mean(vals))
        val_a_clean = float(val_A) if val_A is not None else computed_mean
        val_b_clean = float(val_B) if val_B is not None else computed_mean
        val_c_clean = float(val_C) if val_C is not None else computed_mean

    vals_clean = [val_a_clean, val_b_clean, val_c_clean]
    
    mean = float(np.mean(vals_clean))
    std_dev = float(np.std(vals_clean))
    max_dev = float(np.max(np.abs(np.array(vals_clean) - mean)))
    val_range = float(np.max(vals_clean) - np.min(vals_clean))

    import pandas as pd
    features_df = pd.DataFrame([[val_a_clean, val_b_clean, val_c_clean, mean, std_dev, max_dev, val_range]],
                               columns=["val_A", "val_B", "val_C", "mean", "std_dev", "max_deviation", "range"])
    features_dict = {
        "mean": round(mean, 2),
        "std_dev": round(std_dev, 2),
        "max_deviation": round(max_dev, 2),
        "range": round(val_range, 2)
    }
    
    return features_df, features_dict

def predict(val_A=None, val_B=None, val_C=None):
    """
    Predicts if sensor values are 'consistent' or 'conflicting'.
    Conforms to Boundary (2) of the SignalSynch Interface Contract.
    """
    global _MODEL
    
    # Reload model lazily if not loaded on import
    if _MODEL is None:
        for path in _MODEL_PATHS:
            if os.path.exists(path):
                _MODEL = joblib.load(path)
                break

    features_arr, features_dict = extract_features_single(val_A, val_B, val_C)

    if _MODEL is None:
        # Heuristic fallback if model binary is missing
        label = "conflicting" if features_dict["max_deviation"] > 3.0 else "consistent"
        confidence = 0.80
    else:
        pred = _MODEL.predict(features_arr)[0]
        probas = _MODEL.predict_proba(features_arr)[0]
        
        label = "conflicting" if pred == 1 else "consistent"
        confidence = float(np.max(probas))

    return {
        "label": label,
        "confidence": round(confidence, 2),
        "features": features_dict
    }

if __name__ == "__main__":
    # Quick sanity test
    print("Testing predict(42.7, 43.1, 41.9):", predict(42.7, 43.1, 41.9))
    print("Testing predict(42.7, 43.1, 58.2):", predict(42.7, 43.1, 58.2))
