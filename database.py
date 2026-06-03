import os
from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, ForeignKey, func
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from dotenv import load_dotenv

load_dotenv()

# Default to SQLite local database, but allow overriding via environment variable (e.g. for PostgreSQL)
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./travel_buddy.db")

# For SQLite, we need to add a special connect argument to prevent threading issues
connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    # Relationship to trips
    trips = relationship("Trip", back_populates="owner", cascade="all, delete-orphan")

class Trip(Base):
    __tablename__ = "trips"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    destination = Column(String(100), nullable=False)
    itinerary = Column(Text, nullable=False)
    budget = Column(String(100), nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    # Relationship to user
    owner = relationship("User", back_populates="trips")

def init_db():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
