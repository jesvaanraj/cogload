"""
Feature Extractor — converts raw telemetry into a normalized feature vector
that the ML model uses to score cognitive load.
"""
from typing import Dict, Any


def extract_features(data: Dict[str, Any]) -> Dict[str, float]:
    """
    Input:  raw telemetry snapshot from the VSCode extension
    Output: normalized feature dict ready for the ML model
    """
    wpm = float(data.get("wpm", 0))
    error_rate = float(data.get("error_rate", 0))
    backspace_rate = float(data.get("backspace_rate", 0))
    pause_avg_ms = float(data.get("pause_avg_ms", 0))
    paste_ratio = float(data.get("paste_ratio", 0))
    session_minutes = float(data.get("session_minutes", 0))

    # Normalize to 0–1 ranges based on realistic developer limits
    features = {
        # High WPM = low load (inverse)
        "wpm_norm": min(wpm / 120.0, 1.0),

        # High error rate = high load
        "error_rate_norm": min(error_rate / 50.0, 1.0),

        # High backspace rate = high load
        "backspace_rate_norm": min(backspace_rate / 60.0, 1.0),

        # Long pauses = high load (cap at 30s)
        "pause_norm": min(pause_avg_ms / 30000.0, 1.0),

        # High paste ratio = possible fatigue (not typing original thoughts)
        "paste_ratio": paste_ratio,

        # Longer session = more accumulated fatigue
        "session_fatigue": min(session_minutes / 480.0, 1.0),  # 8hr cap

        # Raw values kept for logging
        "raw_wpm": wpm,
        "raw_session_minutes": session_minutes,
    }

    return features
