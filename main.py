# ============================================================================
# SPORTS INJURY DETECTION - BACKEND SERVER
# ============================================================================

from fastapi import FastAPI, HTTPException, Depends, Query, UploadFile, File, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta
from typing import Optional, List
import jwt
import os
import random
import string
import re
import bcrypt
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func, and_

from database import init_db, async_session_factory, get_session
from database.models import User, AthleteProfile, Notification, PasswordResetToken, AnalysisResult
from services.biomechanics import analyze as analyze_biomechanics

load_dotenv()

app = FastAPI(
    title="Sports Injury Risk Detection API",
    description="API for analyzing athlete movements and predicting injuries",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:8001", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# SECURITY & CONFIG
# ============================================================================

SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")

# ============================================================================
# DATA MODELS
# ============================================================================

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str = "athlete"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: dict

class AthleteProfileRequest(BaseModel):
    sport_type: str
    position: str
    age: int
    height: float
    weight: float
    injury_history: str = ""
    training_load: str = "moderate"

class AnalysisSaveRequest(BaseModel):
    athlete_id: Optional[int] = None
    video_name: str
    movement_score: float = 0.0
    knee_angle: float | None = None
    hip_angle: float | None = None
    shoulder_angle: float | None = None
    trunk_lean: float | None = None
    balance_score: float | None = None
    joint_alignment: float | None = None
    symmetry_score: float | None = None
    analysis_summary: str = ""
    report_path: str = ""

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class GoogleAuthRequest(BaseModel):
    credential: str

class NotificationResponse(BaseModel):
    id: int
    type: str
    title: str
    message: str
    is_read: bool
    created_at: Optional[str] = None

class AdminUserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    is_active: bool
    created_at: Optional[str] = None

# ============================================================================
# HELPERS
# ============================================================================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def compute_risk_level(score: float) -> str:
    score = max(0, min(100, score))
    if score < 30:
        return "Low"
    if score < 70:
        return "Medium"
    return "High"

def risk_level_to_score(risk_level: str) -> float:
    levels = {"low": 29, "medium": 69, "high": 100}
    return levels.get(risk_level.lower(), 100)

def generate_reset_token() -> str:
    return ''.join(random.choices(string.ascii_letters + string.digits, k=32))

async def get_current_user(
    authorization: str = Header(None),
    session: AsyncSession = Depends(get_session)
) -> User:
    if not authorization:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = authorization.replace("Bearer ", "").strip()
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    result = await session.execute(select(User).where(User.email == email))
    db_user = result.scalar_one_or_none()
    if not db_user:
        raise HTTPException(status_code=401, detail="User not found")
    
    if not db_user.is_active:
        raise HTTPException(status_code=403, detail="Account is inactive")
    
    return db_user

async def get_current_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

async def create_notification(
    session: AsyncSession,
    user_email: str,
    type: str,
    title: str,
    message: str,
    target_role: str = None,
):
    notification = Notification(
        user_email=user_email,
        type=type,
        title=title,
        message=message,
        target_role=target_role,
    )
    session.add(notification)
    await session.commit()
    await session.refresh(notification)
    return notification

async def create_admin_notification(
    session: AsyncSession,
    type: str,
    title: str,
    message: str,
):
    return await create_notification(
        session,
        user_email="admin",
        type=type,
        title=title,
        message=message,
        target_role="admin",
    )

# ============================================================================
# STARTUP
# ============================================================================

@app.on_event("startup")
async def startup_event():
    await init_db()
    
    from database import async_session_factory
    async with async_session_factory() as session:
        result = await session.execute(select(User).where(User.email == "athlete@gmail.com"))
        if not result.scalar_one_or_none():
            default_user = User(
                email="athlete@gmail.com",
                hashed_password=hash_password("hashedpassword123"),
                full_name="John Athlete",
                role="athlete",
                is_active=True,
            )
            session.add(default_user)
            await session.commit()

# ============================================================================
# API ENDPOINTS
# ============================================================================

@app.get("/")
async def root():
    return {
        "message": "Welcome to Sports Injury Detection API",
        "status": "running",
        "version": "1.0.0"
    }

# ============================================================================
# AUTHENTICATION
# ============================================================================

@app.post("/api/auth/register")
async def register(user: UserRegister, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(User).where(User.email == user.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")
    
    db_user = User(
        email=user.email,
        hashed_password=hash_password(user.password),
        full_name=user.full_name,
        role="athlete",
        is_active=True,
    )
    session.add(db_user)
    await session.commit()
    await session.refresh(db_user)
    
    return {
        "message": "User registered successfully",
        "user": db_user.to_dict()
    }

@app.post("/api/auth/login")
async def login(user: UserLogin, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(User).where(User.email == user.email))
    db_user = result.scalar_one_or_none()
    
    if not db_user or not verify_password(user.password, db_user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not db_user.is_active:
        raise HTTPException(status_code=403, detail="Account is inactive")
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": db_user.email, "role": db_user.role},
        expires_delta=access_token_expires
    )

    await create_notification(
        session,
        db_user.email,
        "login",
        "User Logged In",
        f"User {db_user.full_name} logged in successfully"
    )
    await create_admin_notification(
        session,
        "user_login",
        "User Login",
        f"User {db_user.full_name} ({db_user.email}) logged in"
    )
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=db_user.to_dict()
    )

@app.post("/api/auth/google")
async def google_auth(request: GoogleAuthRequest, session: AsyncSession = Depends(get_session)):
    try:
        import requests
        token_info_url = "https://oauth2.googleapis.com/tokeninfo"
        token_info = requests.get(f"{token_info_url}?id_token={request.credential}").json()
        
        google_id = token_info.get("sub")
        email = token_info.get("email")
        full_name = token_info.get("name", email)
        
        if not google_id or not email:
            raise HTTPException(status_code=400, detail="Invalid Google credential")
        
        if token_info.get("aud") != GOOGLE_CLIENT_ID:
            raise HTTPException(status_code=400, detail="Invalid Google client ID")
        
        result = await session.execute(select(User).where(User.google_id == google_id))
        db_user = result.scalar_one_or_none()
        
        if not db_user:
            result = await session.execute(select(User).where(User.email == email))
            db_user = result.scalar_one_or_none()
            
            if db_user:
                db_user.google_id = google_id
                if not db_user.hashed_password:
                    db_user.hashed_password = hash_password(''.join(random.choices(string.ascii_letters + string.digits, k=16)))
            else:
                db_user = User(
                    email=email,
                    hashed_password=hash_password(''.join(random.choices(string.ascii_letters + string.digits, k=16))),
                    full_name=full_name,
                    role="athlete",
                    is_active=True,
                    google_id=google_id,
                )
                session.add(db_user)
        
        await session.commit()
        await session.refresh(db_user)
        
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": db_user.email, "role": db_user.role},
            expires_delta=access_token_expires
        )
        
        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            user=db_user.to_dict()
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Google authentication failed: {str(e)}")

@app.get("/api/auth/me")
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    return current_user.to_dict()

# ============================================================================
# FORGOT PASSWORD
# ============================================================================

@app.post("/api/auth/forgot-password")
async def forgot_password(request: ForgotPasswordRequest, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(User).where(User.email == request.email))
    db_user = result.scalar_one_or_none()
    
    if db_user:
        token = generate_reset_token()
        expires_at = datetime.utcnow() + timedelta(hours=1)
        
        reset_token = PasswordResetToken(
            user_email=request.email,
            token=token,
            expires_at=expires_at,
        )
        session.add(reset_token)
        await session.commit()
        
        await create_notification(
            session,
            request.email,
            "password_reset",
            "Password Reset Requested",
            f"A password reset was requested for your account. Use token: {token}"
        )
        return {"message": "If an account with that email exists, a password reset link has been sent.", "token": token}
    
    return {"message": "If an account with that email exists, a password reset link has been sent."}

@app.post("/api/auth/reset-password")
async def reset_password(request: ResetPasswordRequest, session: AsyncSession = Depends(get_session)):
    result = await session.execute(
        select(PasswordResetToken).where(
            and_(
                PasswordResetToken.token == request.token,
                PasswordResetToken.used == False,
                PasswordResetToken.expires_at > datetime.utcnow()
            )
        )
    )
    reset_token = result.scalar_one_or_none()
    
    if not reset_token:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    
    user_result = await session.execute(select(User).where(User.email == reset_token.user_email))
    db_user = user_result.scalar_one_or_none()
    
    if not db_user:
        raise HTTPException(status_code=400, detail="User not found")
    
    db_user.hashed_password = hash_password(request.new_password)
    reset_token.used = True
    await session.commit()
    
    await create_notification(
        session,
        db_user.email,
        "password_changed",
        "Password Changed",
        "Your password has been successfully changed."
    )
    
    return {"message": "Password reset successful"}

# ============================================================================
# ATHLETE PROFILE
# ============================================================================

@app.post("/api/athletes/profile")
async def create_athlete_profile(athlete: AthleteProfileRequest, current_user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(AthleteProfile).where(AthleteProfile.user_id == current_user.id))
    existing = result.scalar_one_or_none()
    
    if existing:
        existing.sport_type = athlete.sport_type
        existing.position = athlete.position
        existing.age = athlete.age
        existing.height = athlete.height
        existing.weight = athlete.weight
        existing.injury_history = athlete.injury_history
        existing.training_load = athlete.training_load
        existing.updated_at = datetime.utcnow()
    else:
        profile = AthleteProfile(
            user_id=current_user.id,
            sport_type=athlete.sport_type,
            position=athlete.position,
            age=athlete.age,
            height=athlete.height,
            weight=athlete.weight,
            injury_history=athlete.injury_history,
            training_load=athlete.training_load,
        )
        session.add(profile)
    
    await session.commit()
    
    return {
        "message": "Athlete profile saved successfully",
        "profile": {
            **athlete.model_dump(),
            "email": current_user.email,
            "full_name": current_user.full_name,
        }
    }

@app.get("/api/athletes/profile")
async def get_athlete_profile(current_user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(AthleteProfile).where(AthleteProfile.user_id == current_user.id))
    profile = result.scalar_one_or_none()
    
    if not profile:
        return {
            "email": current_user.email,
            "full_name": current_user.full_name,
        }
    
    return {
        **profile.to_dict(),
        "email": current_user.email,
        "full_name": current_user.full_name,
    }

# ============================================================================
# VIDEO UPLOAD
# ============================================================================

@app.post("/api/videos/upload")
async def upload_video(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    import uuid
    import cv2
    import mediapipe as mp

    upload_dir = "uploaded_videos"
    os.makedirs(upload_dir, exist_ok=True)

    file_extension = os.path.splitext(file.filename)[1] if file.filename else ".mp4"
    file_id = str(uuid.uuid4())[:8]
    saved_filename = f"{file_id}{file_extension}"
    file_path = os.path.join(upload_dir, saved_filename)

    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)

    movement_score = 0.0
    knee_angle = None
    hip_angle = None
    shoulder_angle = None
    trunk_lean = None
    balance_score = None
    joint_alignment = None
    symmetry_score = None
    poses_detected = 0
    frames_processed = 0

    try:
        mp_pose = mp.solutions.pose.Pose(
            static_image_mode=False,
            model_complexity=1,
            smooth_landmarks=True,
            enable_segmentation=False,
            min_detection_confidence=0.3,
            min_tracking_confidence=0.3,
        )

        cap = cv2.VideoCapture(file_path)
        frame_count = 0
        analysis_results = []

        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            frame_count += 1
            if frame_count % 5 != 0:
                continue

            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = mp_pose.process(rgb_frame)

            if results.pose_landmarks:
                poses_detected += 1
                landmarks = results.pose_landmarks.landmark
                frame_analysis = analyze_biomechanics(landmarks)
                if frame_analysis:
                    analysis_results.append(frame_analysis)

        cap.release()
        mp_pose.close()

        frames_processed = frame_count

        if analysis_results:
            all_scores = []
            all_knee = []
            all_hip = []
            all_shoulder = []
            all_trunk = []
            all_balance = []
            all_alignment = []
            all_symmetry = []

            for ar in analysis_results:
                if ar.get("overall_score") is not None:
                    all_scores.append(ar["overall_score"])
                if ar.get("knee_angle_left") is not None:
                    all_knee.append(ar["knee_angle_left"])
                if ar.get("hip_angle_left") is not None:
                    all_hip.append(ar["hip_angle_left"])
                if ar.get("shoulder_angle_left") is not None:
                    all_shoulder.append(ar["shoulder_angle_left"])
                if ar.get("trunk_lean") is not None:
                    all_trunk.append(ar["trunk_lean"])
                if ar.get("balance_score") is not None:
                    all_balance.append(ar["balance_score"])
                if ar.get("joint_alignment") is not None:
                    all_alignment.append(ar["joint_alignment"])
                if ar.get("symmetry_score") is not None:
                    all_symmetry.append(ar["symmetry_score"])

            if all_scores:
                movement_score = round(sum(all_scores) / len(all_scores), 2)
            if all_knee:
                knee_angle = round(sum(all_knee) / len(all_knee), 2)
            if all_hip:
                hip_angle = round(sum(all_hip) / len(all_hip), 2)
            if all_shoulder:
                shoulder_angle = round(sum(all_shoulder) / len(all_shoulder), 2)
            if all_trunk:
                trunk_lean = round(sum(all_trunk) / len(all_trunk), 2)
            if all_balance:
                balance_score = round(sum(all_balance) / len(all_balance), 2)
            if all_alignment:
                joint_alignment = round(sum(all_alignment) / len(all_alignment), 2)
            if all_symmetry:
                symmetry_score = round(sum(all_symmetry) / len(all_symmetry), 2)

    except Exception as e:
        print(f"Analysis error: {e}")

    risk_level = compute_risk_level(movement_score)

    video_data = {
        "video_name": file.filename or saved_filename,
        "activity_type": "unknown",
        "video_url": f"/uploaded_videos/{saved_filename}",
        "filename": file.filename or saved_filename,
        "email": current_user.email,
        "uploaded_at": str(datetime.now()),
        "status": "completed",
        "frames_processed": frames_processed,
        "poses_detected": poses_detected,
        "movement_score": movement_score,
        "risk_level": risk_level,
    }

    return {
        "message": "Video uploaded successfully",
        "filename": file.filename or saved_filename,
        "uploaded_at": str(datetime.now()),
        "frames_processed": frames_processed,
        "poses_detected": poses_detected,
        "movement_score": movement_score,
        "knee_angle": knee_angle,
        "hip_angle": hip_angle,
        "shoulder_angle": shoulder_angle,
        "trunk_lean": trunk_lean,
        "balance_score": balance_score,
        "joint_alignment": joint_alignment,
        "symmetry_score": symmetry_score,
        "risk_level": risk_level,
        "video": video_data
    }

@app.get("/api/videos/list")
async def get_videos(current_user: User = Depends(get_current_user)):
    return {
        "total": 0,
        "videos": []
    }

# ============================================================================
# ANALYSIS
# ============================================================================

@app.post("/analysis/save")
async def save_analysis(request: AnalysisSaveRequest, current_user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    risk_level = compute_risk_level(request.movement_score)

    analysis = AnalysisResult(
        athlete_id=current_user.id,
        video_name=request.video_name,
        movement_score=request.movement_score,
        knee_angle=request.knee_angle,
        hip_angle=request.hip_angle,
        shoulder_angle=request.shoulder_angle,
        trunk_lean=request.trunk_lean,
        balance_score=request.balance_score,
        joint_alignment=request.joint_alignment,
        symmetry_score=request.symmetry_score,
        risk_level=risk_level,
        analysis_summary=request.analysis_summary,
        report_path=request.report_path,
    )
    session.add(analysis)
    await session.commit()
    await session.refresh(analysis)
    
    await create_notification(
        session,
        current_user.email,
        "analysis_completed",
        "Analysis Completed",
        f"Your sports injury risk analysis for {request.video_name} is ready. Risk level: {risk_level}."
    )
    await create_admin_notification(
        session,
        "analysis_completed",
        "New Analysis Completed",
        f"User {current_user.full_name} completed analysis for {request.video_name}. Risk level: {risk_level}."
    )

    if risk_level == "High":
        await create_notification(
            session,
            current_user.email,
            "high_risk_alert",
            "High Risk Detected",
            f"Your latest movement analysis for {request.video_name} indicates an elevated risk level. Please consider consulting a qualified professional."
        )
        await create_admin_notification(
            session,
            "high_risk_alert",
            "High Risk Alert",
            f"User {current_user.full_name} has a high risk analysis for {request.video_name}. Score: {request.movement_score}"
        )
    
    return {
        "message": "Analysis saved successfully",
        "id": analysis.id,
        "data": analysis.to_dict()
    }

@app.get("/analysis/history")
async def get_analysis_history(
    search: str = None,
    risk_level: str = None,
    page: int = 1,
    per_page: int = 10,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    stmt = select(AnalysisResult).where(AnalysisResult.athlete_id == current_user.id)

    if search:
        stmt = stmt.where(AnalysisResult.video_name.ilike(f"%{search}%"))

    if risk_level:
        upper = risk_level_to_score(risk_level)
        if risk_level.lower() == "low":
            stmt = stmt.where(AnalysisResult.movement_score <= upper)
        elif risk_level.lower() == "medium":
            stmt = stmt.where(and_(AnalysisResult.movement_score > 29, AnalysisResult.movement_score <= upper))
        elif risk_level.lower() == "high":
            stmt = stmt.where(AnalysisResult.movement_score > 69)

    stmt = stmt.order_by(desc(AnalysisResult.created_at))

    result = await session.execute(stmt)
    all_analyses = result.scalars().all()
    total = len(all_analyses)

    offset = (page - 1) * per_page
    analyses = all_analyses[offset:offset + per_page]

    return {
        "total": total,
        "page": page,
        "per_page": per_page,
        "analyses": [a.to_dict() for a in analyses]
    }

@app.get("/analysis/{analysis_id}")
async def get_analysis(analysis_id: int, current_user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    analysis = await session.get(AnalysisResult, analysis_id)
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    
    if analysis.athlete_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    
    return analysis.to_dict()

@app.delete("/analysis/{analysis_id}")
async def delete_analysis(analysis_id: int, current_user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    analysis = await session.get(AnalysisResult, analysis_id)
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    
    if analysis.athlete_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    
    await session.delete(analysis)
    await session.commit()
    return {"message": "Analysis deleted successfully"}

# ============================================================================
# REPORTS
# ============================================================================

def generate_report(analysis_data: dict) -> str:
    from fpdf import FPDF
    import os

    report_dir = "reports"
    os.makedirs(report_dir, exist_ok=True)

    pdf = FPDF()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=15)

    pdf.set_font("Helvetica", "B", 18)
    pdf.cell(0, 12, "SPORTS INJURY RISK ASSESSMENT", ln=True, align="C")
    pdf.set_font("Helvetica", "", 11)
    pdf.cell(0, 8, "AI-Powered Movement Analysis", ln=True, align="C")
    pdf.ln(4)

    pdf.set_draw_color(200, 200, 200)
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(4)

    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(0, 8, "Report Information", ln=True)
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(0, 6, f"Report ID: #{analysis_data.get('id', 'N/A')}", ln=True)
    pdf.cell(0, 6, f"Analysis Date: {analysis_data.get('created_at', 'N/A')}", ln=True)
    pdf.cell(0, 6, f"Video Name: {analysis_data.get('video_name', 'N/A')}", ln=True)
    pdf.ln(4)

    risk_level = analysis_data.get('risk_level', 'Low')
    score = analysis_data.get('movement_score', 0)
    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(0, 8, "Overall Risk Assessment", ln=True)
    pdf.set_font("Helvetica", "B", 24)
    risk_color = (22, 163, 74) if risk_level == "Low" else (217, 119, 6) if risk_level == "Medium" else (220, 38, 38)
    pdf.set_text_color(*risk_color)
    pdf.cell(0, 12, f"Risk Level: {risk_level}", ln=True)
    pdf.set_text_color(0, 0, 0)
    pdf.set_font("Helvetica", "", 11)
    pdf.cell(0, 6, f"Risk Score: {score} / 100", ln=True)
    pdf.ln(4)

    pdf.set_draw_color(200, 200, 200)
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(4)

    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(0, 8, "Movement Analysis", ln=True)
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(0, 6, "Biomechanical metrics captured during video analysis", ln=True)
    pdf.ln(2)

    metrics = [
        ("Knee Angle", analysis_data.get("knee_angle")),
        ("Hip Angle", analysis_data.get("hip_angle")),
        ("Shoulder Angle", analysis_data.get("shoulder_angle")),
        ("Trunk Lean", analysis_data.get("trunk_lean")),
        ("Balance Score", analysis_data.get("balance_score")),
        ("Joint Alignment", analysis_data.get("joint_alignment")),
        ("Symmetry Score", analysis_data.get("symmetry_score")),
    ]

    for label, value in metrics:
        if value is not None:
            pdf.cell(0, 6, f"  {label}: {value}", ln=True)

    pdf.ln(4)
    pdf.set_draw_color(200, 200, 200)
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(4)

    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(0, 8, "AI Analysis Findings", ln=True)
    pdf.set_font("Helvetica", "", 10)
    summary = analysis_data.get("analysis_summary", "")
    if summary:
        pdf.multi_cell(0, 6, summary)
    else:
        pdf.cell(0, 6, "No additional findings recorded.", ln=True)

    pdf.ln(4)
    pdf.set_draw_color(200, 200, 200)
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(4)

    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(0, 8, "Recommendations", ln=True)
    pdf.set_font("Helvetica", "", 10)
    
    recs = []
    if risk_level == "Low":
        recs = [
            "Continue proper warm-up routines before activity.",
            "Maintain good technique and movement quality during training.",
            "Monitor movement patterns regularly to ensure consistency.",
        ]
    elif risk_level == "Medium":
        recs = [
            "Consider technique correction for identified movement patterns.",
            "Ensure adequate recovery between training sessions.",
            "Consultation with a qualified sports professional is recommended if concerns persist.",
        ]
    else:
        recs = [
            "Avoid relying solely on this automated assessment for injury prevention decisions.",
            "Consider evaluation by a qualified sports medicine professional before continuing high-risk activity.",
            "Focus on foundational strength and mobility work under professional guidance.",
        ]
    
    for rec in recs:
        pdf.cell(0, 6, f"  - {rec}", ln=True)

    pdf.ln(6)
    pdf.set_draw_color(200, 200, 200)
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(4)

    pdf.set_fill_color(255, 251, 235)
    pdf.set_draw_color(253, 230, 138)
    pdf.rect(10, pdf.get_y(), 190, 28, style="DF")
    pdf.set_xy(12, pdf.get_y() + 2)
    pdf.set_font("Helvetica", "B", 10)
    pdf.set_text_color(120, 53, 15)
    pdf.cell(0, 6, "Medical Disclaimer", ln=True)
    pdf.set_xy(12, pdf.get_y())
    pdf.set_font("Helvetica", "", 9)
    pdf.multi_cell(186, 5, "This AI-generated report is intended for sports injury risk screening and informational purposes only. It does not constitute a medical diagnosis or replace evaluation by a qualified healthcare professional.")
    pdf.set_text_color(0, 0, 0)

    pdf.ln(4)
    pdf.set_font("Helvetica", "", 9)
    pdf.cell(0, 6, f"Generated by Sports Injury Detection System | {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}", ln=True, align="C")

    safe_name = re.sub(r'[^a-zA-Z0-9_-]', '_', str(analysis_data.get('video_name', 'analysis')))
    filename = f"report_{safe_name}_{analysis_data.get('id', 'preview')}.pdf"
    filepath = os.path.join(report_dir, filename)
    pdf.output(filepath)

    return filepath

@app.get("/analysis/{analysis_id}/report")
async def generate_analysis_report(analysis_id: int, current_user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    analysis = await session.get(AnalysisResult, analysis_id)
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    
    if analysis.athlete_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Access denied")

    report_path = generate_report(analysis.to_dict())

    from fastapi.responses import FileResponse
    return FileResponse(
        report_path,
        media_type="application/pdf",
        filename=os.path.basename(report_path),
    )

# ============================================================================
# NOTIFICATIONS
# ============================================================================

@app.get("/api/notifications")
async def get_notifications(
    unread_only: bool = False,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    stmt = select(Notification).where(Notification.user_email == current_user.email)
    if unread_only:
        stmt = stmt.where(Notification.is_read == False)
    stmt = stmt.order_by(desc(Notification.created_at))
    
    result = await session.execute(stmt)
    notifications = result.scalars().all()
    
    unread_count_result = await session.execute(
        select(func.count()).where(
            and_(Notification.user_email == current_user.email, Notification.is_read == False)
        )
    )
    
    return {
        "notifications": [n.to_dict() for n in notifications],
        "unread_count": unread_count_result.scalar() or 0
    }

@app.get("/api/admin/notifications")
async def get_admin_notifications(
    unread_only: bool = False,
    current_admin: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_session)
):
    stmt = select(Notification).where(Notification.target_role == "admin")
    if unread_only:
        stmt = stmt.where(Notification.is_read == False)
    stmt = stmt.order_by(desc(Notification.created_at))
    
    result = await session.execute(stmt)
    notifications = result.scalars().all()
    
    unread_count_result = await session.execute(
        select(func.count()).where(
            and_(Notification.target_role == "admin", Notification.is_read == False)
        )
    )
    
    return {
        "notifications": [n.to_dict() for n in notifications],
        "unread_count": unread_count_result.scalar() or 0
    }

@app.patch("/api/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    result = await session.execute(
        select(Notification).where(
            and_(Notification.id == notification_id, Notification.user_email == current_user.email)
        )
    )
    notification = result.scalar_one_or_none()
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    notification.is_read = True
    await session.commit()
    return {"message": "Notification marked as read"}

@app.patch("/api/notifications/read-all")
async def mark_all_notifications_read(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    result = await session.execute(
        select(Notification).where(
            and_(Notification.user_email == current_user.email, Notification.is_read == False)
        )
    )
    notifications = result.scalars().all()
    for n in notifications:
        n.is_read = True
    await session.commit()
    return {"message": f"Marked {len(notifications)} notifications as read"}

# ============================================================================
# DASHBOARD ANALYTICS
# ============================================================================

@app.get("/api/dashboard/summary")
async def dashboard_summary(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    total_result = await session.execute(
        select(func.count()).where(AnalysisResult.athlete_id == current_user.id)
    )
    total_analyses = total_result.scalar() or 0

    low_result = await session.execute(
        select(func.count()).where(
            and_(AnalysisResult.athlete_id == current_user.id, AnalysisResult.risk_level == "Low")
        )
    )
    low_risk = low_result.scalar() or 0

    medium_result = await session.execute(
        select(func.count()).where(
            and_(AnalysisResult.athlete_id == current_user.id, AnalysisResult.risk_level == "Medium")
        )
    )
    medium_risk = medium_result.scalar() or 0

    high_result = await session.execute(
        select(func.count()).where(
            and_(AnalysisResult.athlete_id == current_user.id, AnalysisResult.risk_level == "High")
        )
    )
    high_risk = high_result.scalar() or 0

    avg_result = await session.execute(
        select(func.avg(AnalysisResult.movement_score)).where(AnalysisResult.athlete_id == current_user.id)
    )
    avg_score = avg_result.scalar() or 0

    recent_result = await session.execute(
        select(AnalysisResult.created_at).where(AnalysisResult.athlete_id == current_user.id)
        .order_by(desc(AnalysisResult.created_at)).limit(1)
    )
    recent_date = recent_result.scalar_one_or_none()

    return {
        "total_analyses": total_analyses,
        "low_risk": low_risk,
        "medium_risk": medium_risk,
        "high_risk": high_risk,
        "average_score": round(avg_score, 2) if avg_score else 0,
        "recent_date": recent_date.isoformat() if recent_date else None,
    }

@app.get("/api/dashboard/risk-distribution")
async def dashboard_risk_distribution(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    low_result = await session.execute(
        select(func.count()).where(
            and_(AnalysisResult.athlete_id == current_user.id, AnalysisResult.risk_level == "Low")
        )
    )
    medium_result = await session.execute(
        select(func.count()).where(
            and_(AnalysisResult.athlete_id == current_user.id, AnalysisResult.risk_level == "Medium")
        )
    )
    high_result = await session.execute(
        select(func.count()).where(
            and_(AnalysisResult.athlete_id == current_user.id, AnalysisResult.risk_level == "High")
        )
    )

    return {
        "low": low_result.scalar() or 0,
        "medium": medium_result.scalar() or 0,
        "high": high_result.scalar() or 0,
    }

@app.get("/api/dashboard/movement-metrics")
async def dashboard_movement_metrics(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    result = await session.execute(
        select(AnalysisResult).where(AnalysisResult.athlete_id == current_user.id)
        .order_by(desc(AnalysisResult.created_at)).limit(1)
    )
    latest = result.scalar_one_or_none()

    if not latest:
        return {"metrics": []}

    metrics = [
        {"name": "Overall Risk", "value": round(latest.movement_score or 0, 2), "unit": "/ 100"},
        {"name": "Balance", "value": round(latest.balance_score or 0, 2), "unit": "/ 100"},
        {"name": "Symmetry", "value": round(latest.symmetry_score or 0, 2), "unit": "/ 100"},
        {"name": "Joint Alignment", "value": round(latest.joint_alignment or 0, 2), "unit": "/ 100"},
        {"name": "Knee Angle", "value": round(latest.knee_angle or 0, 2), "unit": "°"},
        {"name": "Hip Angle", "value": round(latest.hip_angle or 0, 2), "unit": "°"},
        {"name": "Shoulder Angle", "value": round(latest.shoulder_angle or 0, 2), "unit": "°"},
        {"name": "Trunk Lean", "value": round(latest.trunk_lean or 0, 2), "unit": "°"},
    ]

    return {"metrics": metrics}

@app.get("/api/dashboard/risk-trend")
async def dashboard_risk_trend(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    result = await session.execute(
        select(AnalysisResult).where(AnalysisResult.athlete_id == current_user.id)
        .order_by(AnalysisResult.created_at.asc()).limit(20)
    )
    analyses = result.scalars().all()

    trend = []
    for a in analyses:
        trend.append({
            "date": a.created_at.isoformat() if a.created_at else None,
            "score": round(a.movement_score or 0, 2),
            "risk_level": a.risk_level,
        })

    return {"trend": trend}

# ============================================================================
# ADMIN
# ============================================================================

@app.get("/api/admin/users")
async def admin_get_users(
    current_user: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_session)
):
    result = await session.execute(select(User).order_by(desc(User.created_at)))
    users = result.scalars().all()
    return {"users": [u.to_dict() for u in users]}

@app.get("/api/admin/stats")
async def admin_get_stats(
    current_user: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_session)
):
    users_result = await session.execute(select(func.count()).select_from(User))
    total_users = users_result.scalar() or 0
    
    analyses_result = await session.execute(select(func.count()).select_from(AnalysisResult))
    total_analyses = analyses_result.scalar() or 0
    
    low_result = await session.execute(select(func.count()).where(AnalysisResult.risk_level == "Low"))
    low_risk = low_result.scalar() or 0
    
    medium_result = await session.execute(select(func.count()).where(AnalysisResult.risk_level == "Medium"))
    medium_risk = medium_result.scalar() or 0
    
    high_result = await session.execute(select(func.count()).where(AnalysisResult.risk_level == "High"))
    high_risk = high_result.scalar() or 0
    
    return {
        "total_users": total_users,
        "total_analyses": total_analyses,
        "low_risk": low_risk,
        "medium_risk": medium_risk,
        "high_risk": high_risk,
    }

@app.get("/api/admin/analyses")
async def admin_get_all_analyses(
    page: int = 1,
    per_page: int = 20,
    current_user: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_session)
):
    stmt = select(AnalysisResult).order_by(desc(AnalysisResult.created_at))
    result = await session.execute(stmt)
    all_analyses = result.scalars().all()
    total = len(all_analyses)
    
    offset = (page - 1) * per_page
    analyses = all_analyses[offset:offset + per_page]
    
    return {
        "total": total,
        "page": page,
        "per_page": per_page,
        "analyses": [a.to_dict() for a in analyses]
    }

@app.get("/api/admin/activity")
async def admin_get_activity(
    current_user: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_session)
):
    recent_users = await session.execute(select(User).order_by(desc(User.created_at)).limit(5))
    recent_analyses = await session.execute(select(AnalysisResult).order_by(desc(AnalysisResult.created_at)).limit(5))
    
    high_risk = await session.execute(
        select(AnalysisResult).where(AnalysisResult.risk_level == "High").order_by(desc(AnalysisResult.created_at)).limit(5)
    )
    
    return {
        "recent_users": [u.to_dict() for u in recent_users.scalars().all()],
        "recent_analyses": [a.to_dict() for a in recent_analyses.scalars().all()],
        "high_risk_alerts": [a.to_dict() for a in high_risk.scalars().all()],
    }

@app.get("/api/admin/analytics/risk-distribution")
async def admin_analytics_risk_distribution(
    current_user: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_session)
):
    low_result = await session.execute(select(func.count()).where(AnalysisResult.risk_level == "Low"))
    medium_result = await session.execute(select(func.count()).where(AnalysisResult.risk_level == "Medium"))
    high_result = await session.execute(select(func.count()).where(AnalysisResult.risk_level == "High"))

    return {
        "low": low_result.scalar() or 0,
        "medium": medium_result.scalar() or 0,
        "high": high_result.scalar() or 0,
    }

@app.get("/api/admin/analytics/analyses-over-time")
async def admin_analytics_analyses_over_time(
    current_user: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_session)
):
    result = await session.execute(
        select(AnalysisResult).order_by(AnalysisResult.created_at.asc()).limit(50)
    )
    analyses = result.scalars().all()

    trend = []
    for a in analyses:
        trend.append({
            "date": a.created_at.isoformat() if a.created_at else None,
            "score": round(a.movement_score or 0, 2),
            "risk_level": a.risk_level,
        })

    return {"trend": trend}

@app.get("/api/admin/analytics/movement-metrics")
async def admin_analytics_movement_metrics(
    current_user: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_session)
):
    result = await session.execute(
        select(AnalysisResult).order_by(desc(AnalysisResult.created_at)).limit(1)
    )
    latest = result.scalar_one_or_none()

    if not latest:
        return {"metrics": []}

    metrics = [
        {"name": "Overall Risk", "value": round(latest.movement_score or 0, 2), "unit": "/ 100"},
        {"name": "Balance", "value": round(latest.balance_score or 0, 2), "unit": "/ 100"},
        {"name": "Symmetry", "value": round(latest.symmetry_score or 0, 2), "unit": "/ 100"},
        {"name": "Joint Alignment", "value": round(latest.joint_alignment or 0, 2), "unit": "/ 100"},
        {"name": "Knee Angle", "value": round(latest.knee_angle or 0, 2), "unit": "°"},
        {"name": "Hip Angle", "value": round(latest.hip_angle or 0, 2), "unit": "°"},
        {"name": "Shoulder Angle", "value": round(latest.shoulder_angle or 0, 2), "unit": "°"},
        {"name": "Trunk Lean", "value": round(latest.trunk_lean or 0, 2), "unit": "°"},
    ]

    return {"metrics": metrics}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)