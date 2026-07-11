# ============================================================================
# SPORTS INJURY DETECTION - BACKEND SERVER
# ============================================================================
# This is your main server file. Think of it like a restaurant kitchen
# that receives orders (requests) and sends back food (responses)
# ============================================================================

# STEP 1: Import necessary libraries
# These are tools we need to build our server
from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware  # Allows frontend to talk to backend
from pydantic import BaseModel  # For data validation
from datetime import datetime, timedelta
import jwt
import os
from dotenv import load_dotenv

# Load environment variables (secret keys, database URLs, etc.)
load_dotenv()

# ============================================================================
# STEP 2: Initialize FastAPI Application
# ============================================================================
# Think of 'app' as your entire server
app = FastAPI(
    title="Sports Injury Risk Detection API",
    description="API for analyzing athlete movements and predicting injuries",
    version="1.0.0"
)

# ============================================================================
# STEP 3: Configure CORS (Cross-Origin Resource Sharing)
# ============================================================================
# This allows your React frontend (running on port 3000) to talk to
# this backend (running on port 8000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:8081"],  # React ports
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods (GET, POST, etc.)
    allow_headers=["*"],  # Allow all headers
)

# ============================================================================
# STEP 4: Define Data Models (Templates for data)
# ============================================================================
# These are like templates/forms. When user submits data, it must match these

# This is the template for User Registration
class UserRegister(BaseModel):
    """
    What data we expect when user registers
    Example: {"email": "athlete@gmail.com", "password": "pass123", "full_name": "John"}
    """
    email: str  # Email address
    password: str  # Password (we'll encrypt this)
    full_name: str  # Full name of user
    role: str  # Role: "athlete", "coach", "physiotherapist", or "admin"

# This is the template for User Login
class UserLogin(BaseModel):
    """
    What data we expect when user logs in
    Example: {"email": "athlete@gmail.com", "password": "pass123"}
    """
    email: str
    password: str

# This is the response we send back when user logs in successfully
class TokenResponse(BaseModel):
    """
    What we send back after successful login
    Contains: token (proof of login) and user info
    """
    access_token: str  # This proves the user is logged in
    token_type: str  # Type of token (usually "bearer")
    user: dict  # User information

# Athlete Profile data template
class AthleteProfile(BaseModel):
    """
    Athlete information like sport, position, age, etc.
    """
    sport_type: str  # "Basketball", "Football", etc.
    position: str  # Position in the sport
    age: int  # Age
    height: float  # Height in cm
    weight: float  # Weight in kg
    injury_history: str = ""  # Previous injuries (optional)
    training_load: str = "moderate"  # Training intensity

# Video Upload data template
class VideoUpload(BaseModel):
    """
    Information about uploaded video
    """
    video_name: str  # Name of the video
    activity_type: str  # What activity: "running", "jumping", etc.
    video_url: str  # Where video is stored

# ============================================================================
# STEP 5: Create Fake Database (for learning, we'll use a simple dictionary)
# ============================================================================
# In real world, this would be PostgreSQL. For now, we're using simple storage.

# Fake user database (stores registered users)
fake_users_db = {
    # Example user already in system
    "athlete@gmail.com": {
        "id": "1",
        "email": "athlete@gmail.com",
        "password": "hashedpassword123",  # In real app, passwords are encrypted
        "full_name": "John Athlete",
        "role": "athlete",
        "created_at": datetime.now()
    }
}

# Fake athlete profiles database
fake_athlete_profiles = {}

# Fake videos database
fake_videos = {}

# ============================================================================
# STEP 6: Secret Key for JWT Token (Security)
# ============================================================================
# This secret key is like a password for creating login tokens
# IMPORTANT: In real project, this comes from environment variables (hidden)
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"  # Algorithm for encoding tokens
ACCESS_TOKEN_EXPIRE_MINUTES = 30  # Token valid for 30 minutes

# ============================================================================
# STEP 7: Helper Functions (Reusable code)
# ============================================================================

def create_access_token(data: dict, expires_delta: timedelta = None):
    """
    Creates a JWT token (like a digital ID card that proves user is logged in)
    
    How it works:
    1. Take user data (email, role, etc.)
    2. Add expiration time (when it expires)
    3. Encrypt it using SECRET_KEY
    4. Return the encrypted token
    """
    to_encode = data.copy()  # Make a copy of data
    
    # If expiration time not provided, use default 30 minutes
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    
    to_encode.update({"exp": expire})  # Add expiration to data
    
    # Encode (encrypt) the token using SECRET_KEY
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Checks if entered password matches stored password
    
    In real app, hashed_password is encrypted. Here it's simplified.
    """
    return plain_password == hashed_password

# ============================================================================
# STEP 8: API ENDPOINTS (Routes - places where frontend can make requests)
# ============================================================================

# ENDPOINT 1: Health Check (Is server running?)
@app.get("/")
async def root():
    """
    Simple endpoint to check if server is working
    
    How to use: Go to http://localhost:8000/
    Expected response: {"message": "Welcome to Sports Injury Detection API"}
    """
    return {
        "message": "Welcome to Sports Injury Detection API",
        "status": "running",
        "version": "1.0.0"
    }

# ENDPOINT 2: User Registration (Create new account)
@app.post("/api/auth/register")
async def register(user: UserRegister):
    """
    Creates new user account
    
    Expected input (from frontend):
    {
        "email": "athlete@gmail.com",
        "password": "pass123",
        "full_name": "John Doe",
        "role": "athlete"
    }
    
    Returns: Confirmation message
    """
    # Check if user already exists
    if user.email in fake_users_db:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )
    
    # Add new user to database
    fake_users_db[user.email] = {
        "id": str(len(fake_users_db) + 1),
        "email": user.email,
        "password": user.password,  # In real app, ENCRYPT this!
        "full_name": user.full_name,
        "role": user.role,
        "created_at": datetime.now()
    }
    
    return {
        "message": "User registered successfully",
        "user": {
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role
        }
    }

# ENDPOINT 3: User Login (Generate auth token)
@app.post("/api/auth/login")
async def login(user: UserLogin):
    """
    User login endpoint
    
    Expected input:
    {
        "email": "athlete@gmail.com",
        "password": "pass123"
    }
    
    Returns: JWT token (proof of login) + user info
    """
    # Step 1: Check if user exists in database
    if user.email not in fake_users_db:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )
    
    # Step 2: Get user from database
    db_user = fake_users_db[user.email]
    
    # Step 3: Verify password matches
    if not verify_password(user.password, db_user["password"]):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )
    
    # Step 4: Create JWT token (this proves user is logged in)
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email, "role": db_user["role"]},
        expires_delta=access_token_expires
    )
    
    # Step 5: Return token and user info
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user={
            "email": db_user["email"],
            "full_name": db_user["full_name"],
            "role": db_user["role"]
        }
    )

# ENDPOINT 4: Get Current User (Who's logged in?)
@app.get("/api/auth/me")
async def get_current_user(token: str = None):
    """
    Get information about currently logged-in user
    
    How to use: Send the JWT token in header
    Returns: Current user information
    """
    if not token:
        raise HTTPException(
            status_code=401,
            detail="Not authenticated"
        )
    
    try:
        # Decode the JWT token to get user email
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
    except:
        raise HTTPException(
            status_code=401,
            detail="Invalid token"
        )
    
    if email not in fake_users_db:
        raise HTTPException(status_code=401, detail="User not found")
    
    return fake_users_db[email]

# ENDPOINT 5: Create Athlete Profile
@app.post("/api/athletes/profile")
async def create_athlete_profile(athlete: AthleteProfile, email: str = None):
    """
    Creates or updates athlete profile
    
    Expected input:
    {
        "sport_type": "Basketball",
        "position": "Guard",
        "age": 25,
        "height": 185,
        "weight": 85,
        "injury_history": "Previous knee injury",
        "training_load": "high"
    }
    """
    if not email:
        raise HTTPException(status_code=401, detail="User not authenticated")
    
    fake_athlete_profiles[email] = {
        **athlete.dict(),
        "created_at": datetime.now(),
        "email": email
    }
    
    return {
        "message": "Athlete profile created successfully",
        "profile": fake_athlete_profiles[email]
    }

# ENDPOINT 6: Get Athlete Profile
@app.get("/api/athletes/profile")
async def get_athlete_profile(email: str = None):
    """
    Retrieves athlete profile
    """
    if not email:
        raise HTTPException(status_code=401, detail="User not authenticated")
    
    if email not in fake_athlete_profiles:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    return fake_athlete_profiles[email]

# ENDPOINT 7: Upload Video (Placeholder)
@app.post("/api/videos/upload")
async def upload_video(video: VideoUpload, email: str = None):
    """
    Handles video upload
    
    Expected input:
    {
        "video_name": "running_session_1.mp4",
        "activity_type": "running",
        "video_url": "/videos/running_session_1.mp4"
    }
    
    In real app, this would save video to storage (AWS S3, etc.)
    """
    if not email:
        raise HTTPException(status_code=401, detail="User not authenticated")
    
    video_id = str(len(fake_videos) + 1)
    fake_videos[video_id] = {
        **video.dict(),
        "email": email,
        "uploaded_at": datetime.now(),
        "status": "processing"  # Status: processing, completed, error
    }
    
    return {
        "message": "Video uploaded successfully",
        "video_id": video_id,
        "video": fake_videos[video_id]
    }

# ENDPOINT 8: Get Videos List
@app.get("/api/videos/list")
async def get_videos(email: str = None):
    """
    Get all videos uploaded by user
    """
    if not email:
        raise HTTPException(status_code=401, detail="User not authenticated")
    
    user_videos = [v for v in fake_videos.values() if v["email"] == email]
    return {
        "total": len(user_videos),
        "videos": user_videos
    }

# ============================================================================
# STEP 9: Run the server
# ============================================================================
# To run: python -m uvicorn main:app --reload
# Then go to http://localhost:8000
# API docs will be at http://localhost:8000/docs (try it out!)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
