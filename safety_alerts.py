from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from openai import OpenAI
import os
import json

# Define the FastAPI Router
router = APIRouter(tags=["Travel Safety & Alerts"])

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
client_groq = OpenAI(api_key=GROQ_API_KEY, base_url="https://api.groq.com/openai/v1")

class SafetyRequest(BaseModel):
    destination: str

@router.post("/api/safety-alerts")
def get_safety_alerts(request: SafetyRequest):
    """
    Travel Safety & Alert System Endpoint.
    Generates a localized travel safety advisory including common tourist scams, 
    important safety tips, and active emergency contacts for the destination.
    """
    try:
        prompt = f"""
        You are an international security consultant, travel risk assessor, and global emergency response advisor.
        Provide a comprehensive safety advisory and alert bulletin for travelers visiting **{request.destination}**.

        Please gather and detail:
        1. **Overall Safety Rating**: Clear evaluation (e.g. Safe, Exercise Normal Precautions, Increased Caution, Reconsider Travel).
        2. **Emergency Contacts**: The correct local dial codes for Police, Ambulance, and Fire/Rescue, plus Tourist Police if available.
        3. **Common Local Scams**: 2-3 common tourist scams specific to {request.destination} (e.g. rigged taxi meters, friendship bracelets, fake tickets). Explain exactly how they work and how to avoid them.
        4. **Practical Safety Tips**: Localized advice (e.g. pickpocketing hotspots, safe transit habits, tap water drinkability, customs/laws).

        You MUST output ONLY a valid JSON object matching the requested structure below:
        {{
          "destination": "{request.destination}",
          "overall_safety_rating": "Exercise Increased Caution",
          "safety_rationale": "Safe in tourist areas, but pickpocketing and minor street scams are highly prevalent in crowded locations.",
          "emergency_contacts": {{
             "police": "112",
             "medical_ambulance": "118",
             "fire": "115",
             "tourist_police": "+39 06 4686"
          }},
          "common_scams": [
             {{
               "scam_name": "The Friendship Bracelet / Gift Trap",
               "how_it_works": "A friendly stranger approaches and quickly ties a braided bracelet onto your wrist, declaring it a 'free gift'. Once on, they aggressively demand payment and call over accomplices to intimidate you.",
               "how_to_avoid": "Keep your hands in your pockets or folded if approached, say a firm 'No, thank you' (or 'No, grazie'), and keep walking. Never let anyone tie anything to your body."
             }}
          ],
          "practical_safety_tips": [
             "Tap water is perfectly safe to drink from the public fountains (nasoni). Carry a reusable bottle.",
             "Secure your bags on public transit, especially Metro Line A and Bus 64 (famous pickpocket routes)."
          ]
        }}
        """

        response = client_groq.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": "You are an international travel security expert. Return only strict, valid JSON."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.4
        )
        
        safety_alerts = json.loads(response.choices[0].message.content)
        return safety_alerts

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Safety Alerts Engine Error: {str(e)}")
