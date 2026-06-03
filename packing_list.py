from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from openai import OpenAI
import os
import json

# Define the FastAPI Router
router = APIRouter(tags=["Packing List Generator"])

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
client_groq = OpenAI(api_key=GROQ_API_KEY, base_url="https://api.groq.com/openai/v1")

class PackingListRequest(BaseModel):
    destination: str
    season: str  # Summer, Winter, Rain/Monsoon, Autumn, Spring
    duration_days: int
    activity_type: Optional[str] = "General Sightseeing"  # Business, Adventure/Hiking, Beach, General

@router.post("/api/generate-packing-list")
def generate_packing_list(request: PackingListRequest):
    """
    Smart Packing List Generator Endpoint.
    Creates a customized travel packing checklist adjusted for destination climate, 
    season, trip duration, and planned activities.
    """
    try:
        prompt = f"""
        You are a seasoned globetrotter and expert travel advisor.
        Generate a highly structured and customized travel packing checklist for the following trip:

        Destination: {request.destination}
        Season/Weather: {request.season}
        Trip Duration: {request.duration_days} days
        Activity Type: {request.activity_type}

        Please categorize the packing list strictly into:
        1. **Clothes** (with recommended quantities calculated intelligently based on {request.duration_days} days and the {request.season} season).
        2. **Essentials** (Toiletries, electronics, and daily-use items).
        3. **Travel Documents** (Passport, ID, visa requirements if applicable, tickets, etc.).
        4. **Seasonal Recommendations** (Specific climate-appropriate advice).

        You MUST output ONLY a valid JSON object matching the requested structure below:
        {{
          "destination": "{request.destination}",
          "season": "{request.season}",
          "duration_days": {request.duration_days},
          "clothes": [
             {{
               "item": "Warm woolen sweater",
               "quantity": 2,
               "priority": "High/Medium/Low",
               "note": "Required for evenings"
             }}
          ],
          "essentials": [
             {{
               "item": "Universal travel adapter",
               "priority": "High",
               "note": "For charging electronics"
             }}
          ],
          "documents": [
             {{
               "item": "Passport",
               "priority": "Critical",
               "note": "Must have at least 6 months validity"
             }}
          ],
          "seasonal_recommendations": [
             "Layering is key; expect temperatures down to 5°C in the evenings."
          ]
        }}
        """

        response = client_groq.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": "You are a professional travel checklist advisor. Return only strict, valid JSON."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.5
        )
        
        packing_list = json.loads(response.choices[0].message.content)
        return packing_list

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Packing List Engine Error: {str(e)}")
