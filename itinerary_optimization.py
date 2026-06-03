from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from openai import OpenAI
import os
import json

# Define the FastAPI Router
router = APIRouter(tags=["Itinerary Optimization"])

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
client_groq = OpenAI(api_key=GROQ_API_KEY, base_url="https://api.groq.com/openai/v1")

class PlaceInput(BaseModel):
    name: str
    opening_hours: Optional[str] = "09:00 AM - 06:00 PM"
    estimated_duration: Optional[str] = "2 hours"

class DayPlanInput(BaseModel):
    day: int
    places: List[PlaceInput]

class OptimizeRequest(BaseModel):
    start_location: str  # e.g., "Central Hotel, Paris"
    day_plans: List[DayPlanInput]

@router.post("/api/optimize-itinerary")
def optimize_itinerary(request: OptimizeRequest):
    """
    Trip Optimization Engine Endpoint.
    Analyzes distances, travel times, and opening hours, then automatically reorders 
    places to prevent backtracking and maximize time efficiency.
    """
    try:
        # Construct the optimization prompt
        prompt = f"""
        You are a highly advanced GIS and Traveling Salesperson Problem (TSP) Optimization Engine.
        Your task is to optimize the following daily itineraries to prevent backtracking, minimize travel time, and respect opening hours constraints.

        Starting Location: {request.start_location}

        Input Itinerary to Optimize:
        {json.dumps([day.model_dump() for day in request.day_plans], indent=2)}

        Optimization Rules:
        1. **Geographic Clustering**: Group places that are close to each other.
        2. **Minimize Distance & Time**: Reorder the sequence of places starting from the '{request.start_location}' to minimize pairwise travel times.
        3. **Constraint Check**: Ensure each place is visited within its operating/opening hours. Take into account travel time and the 'estimated_duration' spent at previous locations.
        4. **Anti-Backtracking**: Do not go from Point A to C if B is on the way, only to return to B later. Sort sequentially.
        5. **Calculate Metrics**: Estimate the total travel time/distance in the original vs the optimized route to demonstrate the efficiency gain.

        You MUST output ONLY a valid JSON object matching the requested structure below:
        {{
          "start_location": "{request.start_location}",
          "optimization_summary": {{
            "original_estimated_distance_km": 25.5,
            "optimized_estimated_distance_km": 14.2,
            "distance_saved_km": 11.3,
            "original_transit_time_mins": 120,
            "optimized_transit_time_mins": 65,
            "time_saved_mins": 55,
            "efficiency_gain_percentage": "45%"
          }},
          "route_efficiency_logic": "Detailed, step-by-step description of why the places were reordered (e.g. 'Visiting Place B first makes sense as it is on the path to Place C and opens earlier...').",
          "optimized_day_plans": [
             {{
               "day": 1,
               "optimized_places": [
                  {{
                    "sequence": 1,
                    "name": "Eiffel Tower",
                    "arrival_time": "09:30 AM",
                    "estimated_duration": "2 hours",
                    "departure_time": "11:30 AM",
                    "transit_to_next": {{
                       "method": "Walk / Cab / Metro",
                       "estimated_travel_time": "15 mins",
                       "estimated_distance_km": 1.2
                    }}
                  }}
               ]
             }}
          ]
        }}
        """

        response = client_groq.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": "You are a professional geospatial routing and trip optimization engine. Return only strict, valid JSON."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.2  # Low temperature for highly analytical/deterministic routing logic
        )
        
        optimized_plan = json.loads(response.choices[0].message.content)
        return optimized_plan

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Optimization Engine Error: {str(e)}")
