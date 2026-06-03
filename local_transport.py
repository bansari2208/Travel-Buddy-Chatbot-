from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from openai import OpenAI
import os
import json

# Define the FastAPI Router
router = APIRouter(tags=["Local Transport Recommendations"])

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
client_groq = OpenAI(api_key=GROQ_API_KEY, base_url="https://api.groq.com/openai/v1")

class TransportRequest(BaseModel):
    city: str
    distance_km: float
    budget_tier: str  # Budget, Mid-range, Premium
    places_sequence: Optional[List[str]] = None  # e.g., ["Eiffel Tower", "Louvre Museum"]

@router.post("/api/recommend-transport")
def recommend_local_transport(request: TransportRequest):
    """
    Local Transport Recommendation Endpoint.
    Analyzes local transport networks (Metro, Bus, Cabs, Bike-rental) for a given city 
    and suggests the best option based on user budget and trip distance.
    """
    try:
        places_str = ", ".join(request.places_sequence) if request.places_sequence else "points of interest"
        prompt = f"""
        You are an expert local transport coordinator and urban transit planner.
        Recommend the absolute best local transport option for a trip in the city of **{request.city}**.

        Trip Details:
        - Distance to cover: {request.distance_km} km
        - Places in sequence: {places_str}
        - User Budget Tier: {request.budget_tier}

        Please analyze and compare all four options:
        1. **Metro / Subway / local train**
        2. **Public Bus**
        3. **Cab / Taxi / Ride-sharing (Uber, Ola, Grab, etc.)**
        4. **Rental Bikes / Electric Scooters**

        Suggest the optimal primary option based on the user's budget tier ({request.budget_tier}) and distance ({request.distance_km} km), and provide estimated costs in the local currency of the destination.

        You MUST output ONLY a valid JSON object matching the requested structure below:
        {{
          "city": "{request.city}",
          "primary_recommendation": "Metro",
          "recommendation_reason": "Because covering {request.distance_km} km on a {request.budget_tier} budget in {request.city} is fastest and cheapest via the Metro network, bypassing heavy road traffic.",
          "options": [
             {{
               "mode": "Metro",
               "name": "Paris Metro",
               "approximate_cost": "€2.15 (Single ticket)",
               "travel_time_estimate": "12 mins",
               "efficiency_rating": "Excellent",
               "pros": ["Cheapest", "Avoids traffic", "High frequency"],
               "cons": ["Crowded during rush hour", "Requires walking to station"]
             }}
          ],
          "cost_comparison_summary": "A cab would cost around €15-€20 for this distance, while renting a bike would cost €3 per hour. Public bus is cheap (€2.10) but subject to traffic delays. Metro offers the best balance of cost and speed."
        }}
        """

        response = client_groq.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": "You are a local city transit coordinator. Return only strict, valid JSON."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.5
        )
        
        recommendations = json.loads(response.choices[0].message.content)
        return recommendations

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transport Engine Error: {str(e)}")
