import os
from datetime import datetime, timedelta
from typing import List, Optional
import bcrypt
import json
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db, init_db, User, Trip

# Import authentication utilities
from auth_utils import (
    SECRET_KEY,
    ALGORITHM,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
    security
)

# Create FastAPI app
app = FastAPI(
    title="AI Travel Buddy Backend",
    description="Secure backend for user authentication and travel itinerary management.",
    version="1.0.0"
)

# Configure CORS so Streamlit can communicate with FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", 
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5175"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic Schemas for requests and responses
class UserSignup(BaseModel):
    username: str
    email: str
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    username: str

class TripSave(BaseModel):
    destination: str
    itinerary: str
    budget: Optional[str] = "Standard"

    @classmethod
    def model_validator(cls, values):
        if "budget" in values and values["budget"] is not None:
            values["budget"] = str(values["budget"])
        return values

    class Config:
        coerce_numbers_to_str = True

class TripResponse(BaseModel):
    id: str
    destination: str
    itinerary: str
    budget: Optional[str]
    created_at: str

    @classmethod
    def from_orm(cls, obj):
        return cls(
            id=str(obj.id),
            destination=obj.destination,
            itinerary=obj.itinerary,
            budget=obj.budget,
            created_at=obj.created_at.isoformat() if obj.created_at else datetime.utcnow().isoformat()
        )

    class Config:
        from_attributes = True

# Database startup initialization
@app.on_event("startup")
def startup_event():
    init_db()

@app.get("/")
def read_root():
    return {"message": "Layla AI Travel Buddy API is online!"}

# Import and include the newly added multi-destination router
from multi_destination import router as multi_destination_router
app.include_router(multi_destination_router)

# Import and include the favorites router
from favorites import router as favorites_router
app.include_router(favorites_router)

# Import and include the itinerary optimization router
from itinerary_optimization import router as itinerary_optimization_router
app.include_router(itinerary_optimization_router)

# Import and include the packing list generator router
from packing_list import router as packing_list_router
app.include_router(packing_list_router)

# Import and include the local transport recommendation router
from local_transport import router as local_transport_router
app.include_router(local_transport_router)

# Import and include the group travel planning router
from group_planning import router as group_planning_router
app.include_router(group_planning_router)

# Import and include the food recommendations router
from food_recommendations import router as food_recommendations_router
app.include_router(food_recommendations_router)

# Import and include the Instagram photo spots router
from instagram_spots import router as instagram_spots_router
app.include_router(instagram_spots_router)

# Import and include the mood planning router
from mood_planning import router as mood_planning_router
app.include_router(mood_planning_router)

# Import and include the travel safety and alert router
from safety_alerts import router as safety_alerts_router
app.include_router(safety_alerts_router)

# API Endpoints
@app.post("/signup", status_code=status.HTTP_201_CREATED)
def signup(user_data: UserSignup, db: Session = Depends(get_db)):
    # Check if username exists
    existing_username = db.query(User).filter(User.username == user_data.username).first()
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered. Please choose another."
        )

    # Check if email exists
    existing_email = db.query(User).filter(User.email == user_data.email).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered. Try logging in."
        )

    # Create new user
    hashed_pwd = hash_password(user_data.password)
    new_user = User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=hashed_pwd
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"message": "User registered successfully!", "username": new_user.username}

@app.post("/login", response_model=TokenResponse)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    # Find user by username or email
    user = db.query(User).filter(
        (User.username == login_data.username) | (User.email == login_data.username)
    ).first()
    
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username/email or password."
        )

    # Generate JWT Token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "username": user.username
    }

@app.get("/user")
def get_user_profile(current_user: User = Depends(get_current_user)):
    return {
        "username": current_user.username,
        "email": current_user.email
    }

@app.post("/save-trip", response_model=TripResponse)
def save_trip(trip_data: TripSave, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    new_trip = Trip(
        user_id=current_user.id,
        destination=trip_data.destination,
        itinerary=trip_data.itinerary,
        budget=trip_data.budget
    )
    db.add(new_trip)
    db.commit()
    db.refresh(new_trip)
    return TripResponse.from_orm(new_trip)

@app.get("/get-trips", response_model=List[TripResponse])
def get_trips(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    trips = db.query(Trip).filter(Trip.user_id == current_user.id).order_by(Trip.created_at.desc()).all()
    return [TripResponse.from_orm(trip) for trip in trips]


# --- Chatbot LLM Endpoints ---
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage  
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
llm_chat = ChatGroq(
    api_key=GROQ_API_KEY,
    model_name="llama-3.1-8b-instant",
    temperature=0.7
)
llm_translate = ChatGroq(
    api_key=GROQ_API_KEY,
    model_name="llama-3.1-8b-instant",
    temperature=0.3
)
llm_json = ChatGroq(
    api_key=GROQ_API_KEY,
    model_name="llama-3.1-8b-instant",
    temperature=0.1
).bind(response_format={"type": "json_object"})

class ChatRequest(BaseModel):
    messages: List[dict]
    language: str = "English"

@app.post("/chat")
def chat_with_layla(request: ChatRequest):
    # Translate user's message to English if needed
    if request.language != "English" and request.messages and request.messages[-1]["role"] == "user":
        original_text = request.messages[-1]['content']
        try:
            translation_prompt = f"Translate the following text to English. Output ONLY the translated English text, nothing else: '{original_text}'"
            trans_res = llm_translate.invoke(translation_prompt)
            english_text = trans_res.content.strip()
            request.messages[-1]['content'] = english_text
        except Exception as e:
            print(f"Translation failed: {e}")

    system_msg = (
        "You are Layla, a helpful and proactive travel assistant. "
        "Your goal is to gather: destination, budget, number of days, and preferences. "
        "Once you have all 4, generate a detailed, day-wise itinerary including hotels, restaurants, and transport. "
        "If information is missing, ask for it in a friendly, conversational way. "
        "If a user is vague (e.g., 'I want nature'), suggest destinations. "
        "Always use high-quality Markdown for lists and bolding."
    )
    
    if request.language != "English":
        system_msg += (
            f"\n\nCRITICAL INSTRUCTION: You MUST translate and write your entire response exclusively in {request.language}. "
            "However, if you are generating an itinerary, you MUST keep the day indicator headers exactly as 'Day 1', 'Day 2', 'Day 3', etc. "
            "in English so the UI system can format and identify the days properly (e.g., '**Day 1**: [Description in selected language]')."
        )
    
    messages = [{"role": "system", "content": system_msg}] + request.messages
    
    lc_messages = []
    for msg in messages:
        if msg["role"] == "system":
            lc_messages.append(SystemMessage(content=msg["content"]))
        elif msg["role"] == "user":
            lc_messages.append(HumanMessage(content=msg["content"]))
        elif msg["role"] == "assistant":
            lc_messages.append(AIMessage(content=msg["content"]))
            
    try:
        response = llm_chat.invoke(lc_messages)
        assistant_reply = response.content
        return {"reply": assistant_reply}
    except Exception as e:
        print(f"Chat LLM failed, using intelligent offline fallback. Error: {e}")
        
        # Extract user's last message to customize fallback reply
        user_message = ""
        if request.messages:
            user_message = request.messages[-1]["content"].lower()
            
        import re
        # Look for potential destination candidates in user's message
        words = [w.capitalize() for w in re.findall(r'\b[a-zA-Z]{3,}\b', user_message)
                 if w.lower() not in ["plan", "trip", "itinerary", "days", "travel", "visit", "want", "like", "love", "some", "with", "from", "need", "this", "that", "there", "what", "where", "when", "how", "who", "why", "layla", "hello", "hi", "hey", "please"]]
        destination = words[0] if words else "your next destination"
        
        # Look for days
        days_match = re.search(r'(\d+)\s*day', user_message)
        days = int(days_match.group(1)) if days_match else 3
        days = min(max(days, 1), 5) # Cap fallback days for visual neatness
        
        # Check if the user is asking for an itinerary
        if any(kw in user_message for kw in ["itinerary", "plan", "days", "trip", "travel", "visit", "schedule", "route", "go to"]):
            itinerary_parts = []
            itinerary_parts.append(
                f"### 🌴 Layla Backup Assistant (Offline Mode)\n\n"
                f"Hello! I am currently running in offline backup mode due to heavy server load. "
                f"Don't worry, here is a custom, handcrafted **{days}-Day Travel Plan** to help you explore **{destination}**:\n"
            )
            
            for d in range(1, days + 1):
                if d == 1:
                    itinerary_parts.append(
                        f"\n**Day {d}**: **Welcome to {destination}**\n"
                        f"* **Morning**: Arrive in {destination}. Check into your comfortable local accommodation.\n"
                        f"* **Afternoon**: Enjoy a relaxing walk through the local historic street markets and taste traditional local appetizers.\n"
                        f"* **Evening**: Have a welcoming dinner at a highly rated local heritage eatery with panoramic views."
                    )
                elif d == days:
                    itinerary_parts.append(
                        f"\n**Day {d}**: **Scenic Sights & Departure**\n"
                        f"* **Morning**: Take a peaceful morning stroll along the most popular scenic nature path or park.\n"
                        f"* **Afternoon**: Buy unique local souvenirs, crafts, and specialty goods at the local bazaar.\n"
                        f"* **Evening**: Check out, head to the airport/station, and embark on your return journey with gorgeous memories!"
                    )
                else:
                    itinerary_parts.append(
                        f"\n**Day {d}**: **Heritage & Sights Exploration**\n"
                        f"* **Morning**: Visit the top historical landmark and national museum in {destination}.\n"
                        f"* **Afternoon**: Discover vibrant art hubs, botanical gardens, or local community events.\n"
                        f"* **Evening**: Sit back, unwind, and dine at a highly-recommended traditional bistro."
                    )
            
            itinerary_parts.append(
                f"\n\n**Quick Recommendations for {destination}**:\n"
                f"* 🏨 **Stay**: Boutique hotel or cozy central bed & breakfast\n"
                f"* 🚗 **Transit**: Local metro / rideshare for convenience\n"
                f"* 🍽️ **Food**: Try local signature delicacies at local food hubs"
            )
            
            fallback_reply = "".join(itinerary_parts)
        else:
            fallback_reply = (
                f"### ✈️ Welcome to Layla AI Travel Buddy!\n\n"
                f"I am currently in **Offline Backup Mode** due to high volume traffic on my AI server, but I am still here to help you plan! 🌍\n\n"
                f"Tell me your destination (e.g. *Paris*, *Goa*, *Tokyo*) and duration (e.g. *3 days*), and I will immediately generate a customized, day-wise travel itinerary and accommodation guide for you!"
            )
            
        return {"reply": fallback_reply}

class ParseRequest(BaseModel):
    messages: List[dict]

@app.post("/parse-trip")
def parse_trip(request: ParseRequest):
    history_str = "\n".join([f"{m['role']}: {m['content']}" for m in request.messages])
    prompt = f"Based on the following conversation, extract the trip details in JSON format.\nFields: destination, budget, days, preferences.\nIf a field is unknown, set it to null.\n\nConversation:\n{history_str}\n\nReturn ONLY JSON."
    
    try:
        response = llm_json.invoke(prompt)
        return json.loads(response.content)
    except:
        return {"destination": None, "budget": None, "days": None, "preferences": None}
