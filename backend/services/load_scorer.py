"""
Cognitive Load Scorer — scores developer mental load from 1–10
and classifies into a state. Falls back to rule-based scoring
until an ML model is trained and saved.
"""
import os
import pickle
import numpy as np
from typing import Dict, Tuple

MODEL_PATH = os.path.join(os.path.dirname(__file__), "../../ml/saved_models/cogload_model.pkl")

# Try to load trained ML model; fall back to rules if not available
_model = None
if os.path.exists(MODEL_PATH):
    with open(MODEL_PATH, "rb") as f:
        _model = pickle.load(f)


def _rule_based_score(features: Dict[str, float]) -> float:
    """
    Heuristic scoring when no trained model exists yet.
    Returns a float 1–10.
    """
    wpm_norm = features["wpm_norm"]           # High = good (low load)
    error_rate = features["error_rate_norm"]   # High = bad (high load)
    backspace = features["backspace_rate_norm"]
    pause = features["pause_norm"]
    paste = features["paste_ratio"]
    fatigue = features["session_fatigue"]

    # Weighted sum — higher output = higher cognitive load
    load = (
        (1 - wpm_norm) * 0.25 +
        error_rate     * 0.20 +
        backspace      * 0.20 +
        pause          * 0.15 +
        paste          * 0.10 +
        fatigue        * 0.10
    )

    return round(max(1.0, min(10.0, load * 10)), 1)


def _detect_flow(features: Dict[str, float], score: float) -> bool:
    """
    Flow state: fast typing, very low errors, short pauses, no pasting.
    """
    return (
        score <= 3.0 and
        features["wpm_norm"] >= 0.5 and
        features["error_rate_norm"] <= 0.05 and
        features["paste_ratio"] <= 0.05 and
        features["pause_norm"] <= 0.1
    )


def _classify_state(score: float, is_flow: bool) -> str:
    if is_flow:
        return "flow"
    if score <= 3:
        return "fresh"
    if score <= 5:
        return "normal"
    if score <= 7:
        return "tired"
    return "critical"


def score_cognitive_load(features: Dict[str, float]) -> Tuple[float, str]:
    """
    Main entry point.
    Returns (score: float 1–10, state: str)
    """
    if _model is not None:
        feature_vector = np.array([[
            features["wpm_norm"],
            features["error_rate_norm"],
            features["backspace_rate_norm"],
            features["pause_norm"],
            features["paste_ratio"],
            features["session_fatigue"],
        ]])
        score = float(_model.predict(feature_vector)[0])
        score = round(max(1.0, min(10.0, score)), 1)
    else:
        score = _rule_based_score(features)

    is_flow = _detect_flow(features, score)
    state = _classify_state(score, is_flow)

    return score, state
