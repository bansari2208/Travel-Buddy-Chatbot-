from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from openai import OpenAI
import os
import json

# Define the FastAPI Router
router = APIRouter(tags=["Culinary & Food Recommendations"])
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
client_groq = OpenAI(api_key=GROQ_API_KEY, base_url="https://api.groq.com/openai/v1")

class FoodRequest(BaseModel):
    city: str
    dietary_preferences: Optional[List[str]] = []  # e.g., ["Vegetarian", "Gluten-free", "Vegan", "Halal"]

@router.post("/api/recommend-food")
def recommend_food(request: FoodRequest):
    """
    Culinary & Food Recommendations Endpoint.
    Generates a structured local food guide featuring must-try regional dishes 
    and famous restaurants categorized by budget, mid-range, and premium tiers.
    """
    try:
        dietary_str = ", ".join(request.dietary_preferences) if request.dietary_preferences else "No restrictions"
        prompt = f"""
        You are an expert culinary critic, food travel blogger, and international gastronome.
        Generate a highly detailed and structured food guide for the city of **{request.city}**.

        Dietary Restrictions: {dietary_str}

        Please structure your response with:
        1. **Must-Try Local Dishes**: Suggest 3-4 famous local regional dishes. For each dish, include its traditional name, description, and why it is a staple of that city.
        2. **Famous Restaurants (Categorized)**: Provide 3 restaurants representing three distinct tiers:
           - **Budget**: Incredible local street stalls, markets, or cafes that are dirt cheap but delicious.
           - **Mid-range**: Great sit-down restaurants offering authentic flavors with excellent value.
           - **Premium**: Celebrated, fine-dining, or Michelin-starred restaurants for a high-end culinary experience.

        You MUST output ONLY a valid JSON object matching the requested structure below:
        {{
          "city": "{request.city}",
          "dietary_preferences": {json.dumps(request.dietary_preferences)},
          "must_try_dishes": [
             {{
               "name": "Ramen (Tonkotsu)",
               "description": "Rich pork bone broth noodle soup topped with chashu pork, soft-boiled egg, and green onions.",
               "origin_or_tradition": "Originally a quick meal for laborers, now refined into a complex culinary art form globally."
             }}
          ],
          "restaurants": [
             {{
               "name": "Ichiran Ramen",
               "tier": "Budget",
               "specialty": "Classic Tonkotsu Ramen with custom spice levels",
               "approx_cost_per_person": "¥980 - ¥1,500 ($7 - $11 USD)",
               "neighborhood": "Shibuya",
               "description": "Famous for its individual dining booths designed to focus entirely on the flavor of the noodles."
             }},
             {{
               "name": "Harajuku Gyukatsu Motomura",
               "tier": "Mid-range",
               "specialty": "Deep-fried breaded beef cutlets grilled on stone",
               "approx_cost_per_person": "¥2,200 - ¥3,500 ($16 - $25 USD)",
               "neighborhood": "Harajuku",
               "description": "Serves high-quality beef cutlets with a thin, crispy crust that you lightly cook yourself on personal hot stone grills."
             }},
             {{
               "name": "Narisawa",
               "tier": "Premium",
               "specialty": "Innovative Satoyama Cuisine (Innovative Gastronomy)",
               "approx_cost_per_person": "¥35,000+ ($250+ USD)",
               "neighborhood": "Minato",
               "description": "A world-renowned two-Michelin-starred restaurant showcasing sustainability and deep respect for forest and ocean ingredients."
             }}
          ]
        }}
        """

        response = client_groq.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": "You are a professional Michelin food guide. Return only strict, valid JSON."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.6
        )
        
        food_guide = json.loads(response.choices[0].message.content)
        return food_guide

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Food Recommendation Engine Error: {str(e)}")
