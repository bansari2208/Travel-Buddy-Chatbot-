from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from openai import OpenAI
import os
import json

# Define the FastAPI Router
router = APIRouter(tags=["Group Travel Planning"])

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
client_groq = OpenAI(api_key=GROQ_API_KEY, base_url="https://api.groq.com/openai/v1")

class MemberPreference(BaseModel):
    name: str
    budget_preference: str  # Budget, Mid-range, Premium
    interests: List[str]    # e.g., ["History", "Nightlife", "Nature"]
    must_visit_places: Optional[List[str]] = []

class GroupTripRequest(BaseModel):
    destination: str
    duration_days: int
    members: List[MemberPreference]

@router.post("/api/plan-group-trip")
def plan_group_trip(request: GroupTripRequest):
    """
    Group Travel Planning Endpoint.
    Combines diverse budget levels, distinct personal interests, and must-visit lists 
    from multiple members into a unified, conflict-resolved itinerary.
    """
    if not request.members:
        raise HTTPException(status_code=400, detail="Group must contain at least one member.")

    try:
        prompt = f"""
        You are an expert travel mediator, group trip planner, and conflict resolution specialist.
        Your goal is to design a harmonious, optimized, and unified travel itinerary for a group visiting **{request.destination}** for **{request.duration_days} days**.

        Group Details:
        {json.dumps([m.model_dump() for m in request.members], indent=2)}

        Mediation & Planning Strategy:
        1. **Budget Compromise**: Analyze each member's budget preference. Determine a unified compromise budget category (e.g. if budgets conflict, blend free/low-cost daytime sightseeing with a few premium dinners, or suggest cost-saving shared transports).
        2. **Conflict Resolution (Interests)**: Blend conflicting interests (e.g., if Member A loves museums and Member B loves adventure/nature, plan a morning outdoor hike followed by an afternoon museum visit).
        3. **Must-Visit Inclusion**: Ensure every member gets at least one of their 'must_visit_places' included in the itinerary.
        4. **Transparency**: In the final itinerary, explicitly annotate which member's interest or must-visit list is being satisfied by each activity (e.g., "Satisfies John's interest in Nature").

        You MUST output ONLY a valid JSON object matching the requested structure below:
        {{
          "destination": "{request.destination}",
          "duration_days": {request.duration_days},
          "compromise_analysis": {{
             "resolved_budget_strategy": "Blend of Budget and Mid-range. Shared public transit during the day, with mid-range boutique dining at night.",
             "interest_integration_summary": "Successfully integrated History (Member A), Adventure (Member B), and Gastronomy (Member C) by balancing cultural mornings with thrill-seeking afternoons."
          }},
          "group_itinerary": [
             {{
               "day": 1,
               "activities": [
                  {{
                     "time": "09:30 AM",
                     "activity_name": "Hiking up Arthur's Seat",
                     "approx_cost": "Free",
                     "satisfied_preferences": ["Nature (John)", "Adventure (Sarah)"],
                     "description": "A scenic hike providing panoramic views of the city."
                  }}
               ]
             }}
          ]
        }}
        """

        response = client_groq.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": "You are a professional travel mediator. Return only strict, valid JSON."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.6
        )
        
        group_itinerary = json.loads(response.choices[0].message.content)
        return group_itinerary

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Group Planning Engine Error: {str(e)}")
