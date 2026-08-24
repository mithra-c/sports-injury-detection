import math
import numpy as np


def get_landmark(landmarks, idx):
    if idx >= len(landmarks):
        return None
    lm = landmarks[idx]
    return {"x": lm.x, "y": lm.y, "z": lm.z, "visibility": lm.visibility}


def vector_from_points(p1, p2):
    return np.array([p2["x"] - p1["x"], p2["y"] - p1["y"], p2["z"] - p1["z"]])


def angle_between_vectors(v1, v2):
    v1_norm = np.linalg.norm(v1)
    v2_norm = np.linalg.norm(v2)
    if v1_norm == 0 or v2_norm == 0:
        return 0.0
    dot = np.dot(v1, v2)
    cos_angle = np.clip(dot / (v1_norm * v2_norm), -1.0, 1.0)
    return math.degrees(math.acos(cos_angle))


def calculate_angle(landmarks, idx_a, idx_b, idx_c):
    p_a = get_landmark(landmarks, idx_a)
    p_b = get_landmark(landmarks, idx_b)
    p_c = get_landmark(landmarks, idx_c)
    if p_a is None or p_b is None or p_c is None:
        return None
    v_ba = vector_from_points(p_b, p_a)
    v_bc = vector_from_points(p_b, p_c)
    return angle_between_vectors(v_ba, v_bc)


def calculate_knee_angle(landmarks, side="left"):
    if side == "left":
        return calculate_angle(landmarks, 11, 13, 15)
    return calculate_angle(landmarks, 12, 14, 16)


def calculate_hip_angle(landmarks, side="left"):
    if side == "left":
        return calculate_angle(landmarks, 23, 11, 5)
    return calculate_angle(landmarks, 24, 12, 6)


def calculate_elbow_angle(landmarks, side="left"):
    if side == "left":
        return calculate_angle(landmarks, 5, 7, 9)
    return calculate_angle(landmarks, 6, 8, 10)


def calculate_shoulder_angle(landmarks, side="left"):
    if side == "left":
        return calculate_angle(landmarks, 11, 5, 7)
    return calculate_angle(landmarks, 12, 6, 8)


def calculate_trunk_lean(landmarks):
    left_hip = get_landmark(landmarks, 11)
    right_hip = get_landmark(landmarks, 12)
    nose = get_landmark(landmarks, 0)
    if left_hip is None or right_hip is None or nose is None:
        return None
    mid_hip = {
        "x": (left_hip["x"] + right_hip["x"]) / 2,
        "y": (left_hip["y"] + right_hip["y"]) / 2,
        "z": (left_hip["z"] + right_hip["z"]) / 2,
    }
    shoulder_mid_x = (get_landmark(landmarks, 5)["x"] + get_landmark(landmarks, 6)["x"]) / 2
    shoulder_mid_y = (get_landmark(landmarks, 5)["y"] + get_landmark(landmarks, 6)["y"]) / 2
    shoulder_mid_z = (get_landmark(landmarks, 5)["z"] + get_landmark(landmarks, 6)["z"]) / 2
    shoulder_mid = {"x": shoulder_mid_x, "y": shoulder_mid_y, "z": shoulder_mid_z}
    v_hip_to_nose = vector_from_points(mid_hip, nose)
    v_hip_to_shoulder = vector_from_points(mid_hip, shoulder_mid)
    lean_angle = angle_between_vectors(v_hip_to_nose, v_hip_to_shoulder)
    return lean_angle


def calculate_balance_score(landmarks):
    left_ankle = get_landmark(landmarks, 15)
    right_ankle = get_landmark(landmarks, 16)
    left_hip = get_landmark(landmarks, 11)
    right_hip = get_landmark(landmarks, 12)
    if left_ankle is None or right_ankle is None:
        return None
    ankle_distance = math.sqrt(
        (left_ankle["x"] - right_ankle["x"]) ** 2
        + (left_ankle["y"] - right_ankle["y"]) ** 2
    )
    hip_distance = math.sqrt(
        (left_hip["x"] - right_hip["x"]) ** 2
        + (left_hip["y"] - right_hip["y"]) ** 2
    ) if left_hip is not None and right_hip is not None else 0.1
    ratio = ankle_distance / max(hip_distance, 0.01)
    balance_score = max(0, min(100, (1.0 - ratio) * 100))
    return round(balance_score, 2)


def calculate_movement_symmetry(landmarks):
    left_knee = calculate_knee_angle(landmarks, "left")
    right_knee = calculate_knee_angle(landmarks, "right")
    left_hip = calculate_hip_angle(landmarks, "left")
    right_hip = calculate_hip_angle(landmarks, "right")
    left_elbow = calculate_elbow_angle(landmarks, "left")
    right_elbow = calculate_elbow_angle(landmarks, "right")
    angles = []
    for pair in [(left_knee, right_knee), (left_hip, right_hip), (left_elbow, right_elbow)]:
        if pair[0] is not None and pair[1] is not None:
            angles.append(abs(pair[0] - pair[1]))
    if not angles:
        return None
    avg_diff = sum(angles) / len(angles)
    symmetry_score = max(0, min(100, 100 - avg_diff * 2))
    return round(symmetry_score, 2)


def calculate_landing_mechanics(landmarks):
    left_knee = calculate_knee_angle(landmarks, "left")
    right_knee = calculate_knee_angle(landmarks, "right")
    left_ankle = get_landmark(landmarks, 15)
    right_ankle = get_landmark(landmarks, 16)
    left_hip = get_landmark(landmarks, 11)
    right_hip = get_landmark(landmarks, 12)
    if left_knee is None or right_knee is None:
        return None
    knee_vals = [left_knee, right_knee]
    avg_knee = sum(knee_vals) / len(knee_vals)
    landing_score = 100
    if avg_knee < 90:
        landing_score -= (90 - avg_knee) * 1.5
    if left_ankle is not None and right_ankle is not None and left_hip is not None and right_hip is not None:
        left_overhang = abs(left_ankle["x"] - left_hip["x"])
        right_overhang = abs(right_ankle["x"] - right_hip["x"])
        if left_overhang > 0.15 or right_overhang > 0.15:
            landing_score -= 20
    landing_score = max(0, min(100, landing_score))
    return round(landing_score, 2)


def calculate_joint_alignment(landmarks):
    left_shoulder = get_landmark(landmarks, 5)
    right_shoulder = get_landmark(landmarks, 6)
    left_hip = get_landmark(landmarks, 11)
    right_hip = get_landmark(landmarks, 12)
    left_knee = get_landmark(landmarks, 13)
    right_knee = get_landmark(landmarks, 14)
    if left_shoulder is None or right_shoulder is None or left_hip is None or right_hip is None:
        return None
    shoulder_mid = {
        "x": (left_shoulder["x"] + right_shoulder["x"]) / 2,
        "y": (left_shoulder["y"] + right_shoulder["y"]) / 2,
    }
    hip_mid = {
        "x": (left_hip["x"] + right_hip["x"]) / 2,
        "y": (left_hip["y"] + right_hip["y"]) / 2,
    }
    alignment_score = 100
    if left_knee is not None and right_knee is not None:
        knee_mid = {
            "x": (left_knee["x"] + right_knee["x"]) / 2,
            "y": (left_knee["y"] + right_knee["y"]) / 2,
        }
        v_upper = vector_from_points(shoulder_mid, hip_mid)
        v_lower = vector_from_points(hip_mid, knee_mid)
        alignment_angle = angle_between_vectors(v_upper, v_lower)
        alignment_score -= alignment_angle * 1.5
    alignment_score = max(0, min(100, alignment_score))
    return round(alignment_score, 2)


def calculate_range_of_motion(landmarks):
    left_shoulder = calculate_shoulder_angle(landmarks, "left")
    right_shoulder = calculate_shoulder_angle(landmarks, "right")
    left_elbow = calculate_elbow_angle(landmarks, "left")
    right_elbow = calculate_elbow_angle(landmarks, "right")
    left_hip = calculate_hip_angle(landmarks, "left")
    right_hip = calculate_hip_angle(landmarks, "right")
    left_knee = calculate_knee_angle(landmarks, "left")
    right_knee = calculate_knee_angle(landmarks, "right")
    angles = [
        left_shoulder, right_shoulder,
        left_elbow, right_elbow,
        left_hip, right_hip,
        left_knee, right_knee,
    ]
    valid_angles = [a for a in angles if a is not None]
    if not valid_angles:
        return None
    min_angle = min(valid_angles)
    max_angle = max(valid_angles)
    rom = max_angle - min_angle
    rom_score = max(0, min(100, rom))
    return {
        "rom_value": round(rom, 2),
        "rom_score": round(rom_score, 2),
        "min_angle": round(min_angle, 2),
        "max_angle": round(max_angle, 2),
    }


def analyze(landmarks):
    if not landmarks or len(landmarks) < 17:
        return None
    result = {
        "knee_angle_left": round(calculate_knee_angle(landmarks, "left"), 2) if calculate_knee_angle(landmarks, "left") is not None else None,
        "knee_angle_right": round(calculate_knee_angle(landmarks, "right"), 2) if calculate_knee_angle(landmarks, "right") is not None else None,
        "hip_angle_left": round(calculate_hip_angle(landmarks, "left"), 2) if calculate_hip_angle(landmarks, "left") is not None else None,
        "hip_angle_right": round(calculate_hip_angle(landmarks, "right"), 2) if calculate_hip_angle(landmarks, "right") is not None else None,
        "elbow_angle_left": round(calculate_elbow_angle(landmarks, "left"), 2) if calculate_elbow_angle(landmarks, "left") is not None else None,
        "elbow_angle_right": round(calculate_elbow_angle(landmarks, "right"), 2) if calculate_elbow_angle(landmarks, "right") is not None else None,
        "shoulder_angle_left": round(calculate_shoulder_angle(landmarks, "left"), 2) if calculate_shoulder_angle(landmarks, "left") is not None else None,
        "shoulder_angle_right": round(calculate_shoulder_angle(landmarks, "right"), 2) if calculate_shoulder_angle(landmarks, "right") is not None else None,
        "trunk_lean": round(calculate_trunk_lean(landmarks), 2) if calculate_trunk_lean(landmarks) is not None else None,
        "balance_score": calculate_balance_score(landmarks),
        "symmetry_score": calculate_movement_symmetry(landmarks),
        "landing_mechanics": calculate_landing_mechanics(landmarks),
        "joint_alignment": calculate_joint_alignment(landmarks),
        "range_of_motion": calculate_range_of_motion(landmarks),
    }
    result["overall_score"] = _compute_overall_score(result)
    result["risk_level"] = _compute_risk_level(result["overall_score"])
    return result


def _compute_overall_score(result):
    scores = []
    if result["balance_score"] is not None:
        scores.append(result["balance_score"])
    if result["symmetry_score"] is not None:
        scores.append(result["symmetry_score"])
    if result["landing_mechanics"] is not None:
        scores.append(result["landing_mechanics"])
    if result["joint_alignment"] is not None:
        scores.append(result["joint_alignment"])
    if not scores:
        return 0.0
    return round(sum(scores) / len(scores), 2)


def _compute_risk_level(score):
    score = max(0, min(100, score))
    if score < 30:
        return "Low"
    if score < 70:
        return "Medium"
    return "High"