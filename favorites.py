from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, func
from database import Base, engine, get_db
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from auth_utils import get_current_user
from database import User
from pydantic import BaseModel
from typing import List

# Define the new Favorite model linked to Base
class Favorite(Base):
    __tablename__ = "favorites"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    destination = Column(String(100), nullable=False)
    created_at = Column(DateTime, server_default=func.now())

# Make sure the table is created if it doesn't exist
Base.metadata.create_all(bind=engine)

router = APIRouter(tags=["Favorites"])

class FavoriteAdd(BaseModel):
    destination: str

@router.post("/add-favorite")
def add_favorite(fav_data: FavoriteAdd, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Check if already favored
    existing = db.query(Favorite).filter(Favorite.user_id == current_user.id, Favorite.destination == fav_data.destination).first()
    if existing:
        return {"message": "Already added to favorites"}
    
    new_fav = Favorite(user_id=current_user.id, destination=fav_data.destination)
    db.add(new_fav)
    db.commit()
    db.refresh(new_fav)
    return {"message": "Added to favorites", "id": new_fav.id}

@router.post("/remove-favorite")
def remove_favorite(fav_data: FavoriteAdd, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    fav = db.query(Favorite).filter(Favorite.user_id == current_user.id, Favorite.destination == fav_data.destination).first()
    if not fav:
        raise HTTPException(status_code=404, detail="Favorite not found")
    
    db.delete(fav)
    db.commit()
    return {"message": "Removed from favorites"}

@router.get("/get-favorites")
def get_favorites(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    favs = db.query(Favorite).filter(Favorite.user_id == current_user.id).order_by(Favorite.created_at.desc()).all()
    return [{"id": f.id, "destination": f.destination, "created_at": str(f.created_at)} for f in favs]
