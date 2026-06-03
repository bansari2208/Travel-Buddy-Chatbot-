from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from openai import OpenAI
import os
import json

# Define the FastAPI Router
router = APIRouter(tags=["Mood-Based Trip Planning"])

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
client_groq = OpenAI(api_key=GROQ_API_KEY, base_url="https://api.groq.com/openai/v1")

class MoodTripRequest(BaseModel):
    mood_input: str  # e.g., "I feel stressed out and tired", "I want wild adventure", "I am feeling romantic"
    duration_days: int

@router.post("/api/plan-by-mood")
def plan_by_mood(request: MoodTripRequest):
    """
    Mood-Based Trip Planning Endpoint.
    Analyzes emotional input, maps it to a travel persona, suggests ideal destinations, 
    and generates a custom tailored, mood-healing itinerary.
    """
    try:
        prompt = f"""
        You are a highly empathetic travel therapist and personalized itinerary architect.
        Your goal is to map the user's current emotional state/mood into a specialized travel experience.

        User Mood Statement: "{request.mood_input}"
        Trip Duration: {request.duration_days} days

        Please analyze the input and execute the following:
        1. **Mood Mapping**: Map the mood into a definitive 'Travel Category/Persona' (e.g., 'Therapeutic/Relaxation' for stress, 'High-Adrenaline/Exploration' for adventure, 'Intimate/Scenic' for romance, 'Vibrant/Stimulating' for boredom).
        2. **Recommended Destinations**: Suggest 2 cities/destinations globally that fit this exact mood persona.
        3. **Mood-Tailored Itinerary**: Generate a day-wise itinerary for one of the recommended destinations, specifically designed to address that mood (e.g., slow pacing, spas, and nature walks for stress; fast-paced, climbing, rafting for adventure).

        You MUST output ONLY a valid JSON object matching the requested structure below:
        {{
          "detected_mood": "{request.mood_input}",
          "mapped_travel_category": "Therapeutic & Relaxation",
          "emotional_strategy": "To combat high stress levels, the trip is structured with late mornings, calming natural sights, sound-therapy/wellness elements, and minimal travel friction.",
          "recommended_destinations": [
             {{
               "destination": "Bali, Indonesia",
               "why_it_fits": "World-famous yoga retreats, peaceful beaches, lush green rice fields, and a deeply calming spiritual atmosphere."
             }},
             {{
               "destination": "Kyoto, Japan",
               "why_it_fits": "Quiet zen gardens, bamboo groves, ancient hot springs (onsen), and therapeutic matcha tea ceremonies."
             }}
          ],
          "selected_destination": "Bali, Indonesia",
          "itinerary": [
             {{
               "day": 1,
               "mood_objective": "Decompress and ground your senses",
               "activities": [
                  {{
                     "time": "10:30 AM",
                     "activity_name": "Stroll through Ubud Sacred Monkey Forest",
                     "description": "A slow, relaxing walk under a canopy of giant banyan trees, getting close to nature."
                  }},
                  {{
                     "time": "03:00 PM",
                     "activity_name": "Flower Bath & Traditional Balinese Massage",
                     "description": "A therapeutic wellness session at a premium riverside spa to physically release tension."
                  }}
               ]
             }}
          ]
        }}
        """

        response = client_groq.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": "You are a travel psychologist and itinerary designer. Return only strict, valid JSON."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.6
        )
        
        mood_trip = json.loads(response.choices[0].message.content)
        return mood_trip

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Mood Planning Engine Error: {str(e)}")
