"""
SignalSynch — ML Model Training Script
Generates synthetic multi-source telemetry data and trains a RandomForestClassifier
to detect sensor conflicts and anomalies within <10ms inference latency.
Outputs: model.pkl
"""

import os
import numpy as np
import pandas as pd
import joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score

def generate_synthetic_data(n_samples=3000, conflict_ratio=0.30, random_state=42):
    np.random.seed(random_state)
    records = []

    for _ in range(n_samples):
        # Base physical reading between 10.0 and 1500.0 (covering various sensors)
        base = np.random.uniform(20.0, 300.0)
        
        # Sources A & B with small noise
        val_a = base + np.random.normal(0, 0.4)
        val_b = base + np.random.normal(0, 0.4)
        
        is_conflict = np.random.rand() < conflict_ratio
        
        if is_conflict:
            # Source C injects large outlier spike (deviation > 3 sigma)
            spike = (1 if np.random.rand() > 0.5 else -1) * np.random.uniform(5.0, 15.0)
            val_c = base + spike
            label = 1 # conflicting
        else:
            val_c = base + np.random.normal(0, 0.4)
            label = 0 # consistent

        vals = [val_a, val_b, val_c]
        mean = float(np.mean(vals))
        std_dev = float(np.std(vals))
        max_dev = float(np.max(np.abs(np.array(vals) - mean)))
        val_range = float(np.max(vals) - np.min(vals))

        records.append({
            "val_A": val_a,
            "val_B": val_b,
            "val_C": val_c,
            "mean": mean,
            "std_dev": std_dev,
            "max_deviation": max_dev,
            "range": val_range,
            "label": label
        })

    return pd.DataFrame(records)

def train():
    print("🔄 Generating 3,000 synthetic telemetry samples...")
    df = generate_synthetic_data(n_samples=3000)
    
    features = ["val_A", "val_B", "val_C", "mean", "std_dev", "max_deviation", "range"]
    X = df[features]
    y = df["label"]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

    print("🚀 Training Random Forest Classifier...")
    model = RandomForestClassifier(n_estimators=50, max_depth=6, random_state=42)
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    print(f"✅ Model Accuracy: {acc * 100:.2f}%")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, target_names=["Consistent (0)", "Conflicting (1)"]))

    output_path = os.path.join(os.path.dirname(__file__), "model.pkl")
    joblib.dump(model, output_path)
    print(f"💾 Model binary successfully saved to: {output_path}")

if __name__ == "__main__":
    train()
