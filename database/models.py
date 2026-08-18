from sqlalchemy import Column, Integer, String, Float, Text, DateTime, Boolean
from sqlalchemy.orm import declarative_base
from datetime import datetime

Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=True)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="athlete")
    is_active = Column(Boolean, default=True)
    google_id = Column(String(255), nullable=True, unique=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "email": self.email,
            "full_name": self.full_name,
            "role": self.role,
            "is_active": self.is_active,
            "google_id": self.google_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class AthleteProfile(Base):
    __tablename__ = "athlete_profiles"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, nullable=False, unique=True, index=True)
    sport_type = Column(String(100), nullable=False)
    position = Column(String(100), nullable=False)
    age = Column(Integer, nullable=False)
    height = Column(Float, nullable=False)
    weight = Column(Float, nullable=False)
    injury_history = Column(Text, nullable=True)
    training_load = Column(String(50), default="moderate")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "sport_type": self.sport_type,
            "position": self.position,
            "age": self.age,
            "height": self.height,
            "weight": self.weight,
            "injury_history": self.injury_history,
            "training_load": self.training_load,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_email = Column(String(255), nullable=False, index=True)
    type = Column(String(50), nullable=False, default="info")
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    target_role = Column(String(50), nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "user_email": self.user_email,
            "type": self.type,
            "title": self.title,
            "message": self.message,
            "is_read": self.is_read,
            "target_role": self.target_role,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_email = Column(String(255), nullable=False, index=True)
    token = Column(String(255), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)
    used = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "user_email": self.user_email,
            "token": self.token,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "used": self.used,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    id = Column(Integer, primary_key=True, autoincrement=True)
    athlete_id = Column(Integer, nullable=False)
    video_name = Column(String(255), nullable=False)
    movement_score = Column(Float, default=0.0)
    knee_angle = Column(Float)
    hip_angle = Column(Float)
    shoulder_angle = Column(Float)
    trunk_lean = Column(Float)
    balance_score = Column(Float)
    joint_alignment = Column(Float)
    symmetry_score = Column(Float)
    risk_level = Column(String(20), default="Low")
    analysis_summary = Column(Text)
    report_path = Column(String(500))
    created_at = Column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "athlete_id": self.athlete_id,
            "video_name": self.video_name,
            "movement_score": self.movement_score,
            "knee_angle": self.knee_angle,
            "hip_angle": self.hip_angle,
            "shoulder_angle": self.shoulder_angle,
            "trunk_lean": self.trunk_lean,
            "balance_score": self.balance_score,
            "joint_alignment": self.joint_alignment,
            "symmetry_score": self.symmetry_score,
            "risk_level": self.risk_level,
            "analysis_summary": self.analysis_summary,
            "report_path": self.report_path,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }