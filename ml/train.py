"""
CogLoad ML Training Pipeline
-----------------------------
Run this after collecting at least 50+ labeled sessions.

Usage:
    python train.py --data data/labeled_sessions.csv

The script:
1. Loads labeled CSV (features + manual load score 1–10)
2. Trains XGBoost regressor
3. Evaluates with cross-validation
4. Saves model to saved_models/cogload_model.pkl
"""
import argparse
import os
import pickle
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.model_selection import cross_val_score, train_test_split
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline

FEATURE_COLS = [
    "wpm_norm",
    "error_rate_norm",
    "backspace_rate_norm",
    "pause_norm",
    "paste_ratio",
    "session_fatigue",
]
TARGET_COL = "load_score"
MODEL_OUT = os.path.join(os.path.dirname(__file__), "saved_models", "cogload_model.pkl")


def load_data(path: str) -> pd.DataFrame:
    df = pd.read_csv(path)
    missing = [c for c in FEATURE_COLS + [TARGET_COL] if c not in df.columns]
    if missing:
        raise ValueError(f"Missing columns in CSV: {missing}")
    return df.dropna(subset=FEATURE_COLS + [TARGET_COL])


def build_pipeline() -> Pipeline:
    return Pipeline([
        ("scaler", StandardScaler()),
        ("model", GradientBoostingRegressor(
            n_estimators=200,
            max_depth=4,
            learning_rate=0.05,
            subsample=0.8,
            random_state=42,
        )),
    ])


def train(data_path: str) -> None:
    print(f"📂 Loading data from {data_path}")
    df = load_data(data_path)
    print(f"   {len(df)} labeled samples found")

    X = df[FEATURE_COLS].values
    y = df[TARGET_COL].values

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    pipeline = build_pipeline()

    # Cross-validation
    cv_scores = cross_val_score(pipeline, X_train, y_train, cv=5, scoring="r2")
    print(f"\n📊 Cross-validation R² scores: {cv_scores.round(3)}")
    print(f"   Mean: {cv_scores.mean():.3f}  Std: {cv_scores.std():.3f}")

    # Final fit
    pipeline.fit(X_train, y_train)
    y_pred = pipeline.predict(X_test)

    mae = mean_absolute_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)
    print(f"\n✅ Test set — MAE: {mae:.2f}  R²: {r2:.3f}")

    # Feature importance
    model = pipeline.named_steps["model"]
    importances = model.feature_importances_
    print("\n📈 Feature Importances:")
    for col, imp in sorted(zip(FEATURE_COLS, importances), key=lambda x: -x[1]):
        bar = "█" * int(imp * 30)
        print(f"   {col:<25} {bar} {imp:.3f}")

    # Save
    os.makedirs(os.path.dirname(MODEL_OUT), exist_ok=True)
    with open(MODEL_OUT, "wb") as f:
        pickle.dump(pipeline, f)
    print(f"\n💾 Model saved to {MODEL_OUT}")


def generate_sample_data(out_path: str, n: int = 200) -> None:
    """
    Generate synthetic labeled data for initial testing.
    Replace with real self-labeled session data for production.
    """
    np.random.seed(42)
    rows = []
    for _ in range(n):
        wpm_norm = np.random.beta(3, 2)
        error_rate_norm = np.random.beta(2, 5)
        backspace_rate_norm = np.random.beta(2, 4)
        pause_norm = np.random.beta(2, 4)
        paste_ratio = np.random.beta(1, 4)
        session_fatigue = np.random.uniform(0, 1)

        load = (
            (1 - wpm_norm) * 0.25 +
            error_rate_norm * 0.20 +
            backspace_rate_norm * 0.20 +
            pause_norm * 0.15 +
            paste_ratio * 0.10 +
            session_fatigue * 0.10
        ) * 10 + np.random.normal(0, 0.3)

        load = round(max(1.0, min(10.0, load)), 1)
        rows.append([wpm_norm, error_rate_norm, backspace_rate_norm,
                     pause_norm, paste_ratio, session_fatigue, load])

    df = pd.DataFrame(rows, columns=FEATURE_COLS + [TARGET_COL])
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    df.to_csv(out_path, index=False)
    print(f"✅ Sample data saved to {out_path} ({n} rows)")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="CogLoad ML Training")
    parser.add_argument("--data", default="data/labeled_sessions.csv")
    parser.add_argument("--generate-sample", action="store_true",
                        help="Generate synthetic training data first")
    args = parser.parse_args()

    if args.generate_sample:
        generate_sample_data(args.data)

    train(args.data)
