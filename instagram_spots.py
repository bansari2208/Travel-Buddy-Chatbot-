from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from openai import OpenAI
import os
import json

# Define the FastAPI Router
router = APIRouter(tags=["Instagram Photo Spots"])

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
client_groq = OpenAI(api_key=GROQ_API_KEY, base_url="https://api.groq.com/openai/v1")

class PhotoSpotRequest(BaseModel):
    city: str

@router.post("/api/recommend-photo-spots")
def recommend_photo_spots(request: PhotoSpotRequest):
    """
    Instagram Photo Spots Recommendation Endpoint.
    Generates a curated list of scenic, highly visual locations, complete with 
    best shooting times and creative, copy-pasteable social media captions.
    """
    try:
        prompt = f"""
        You are a famous professional travel photographer, social media influencer, and content curator.
        Recommend the top 3-4 most scenic and 'Instagram-worthy' photo spots in the city of **{request.city}**.

        For each spot, please include:
        1. **Spot Name**: Landmark or exact location.
        2. **Description**: What makes it beautiful or visually unique.
        3. **Best Time for Photos**: The ideal time of day (e.g. Sunrise, Golden Hour, Night/Blue hour) to capture the best lighting and avoid tourist crowds.
        4. **Photography Advice**: Best angle, pose, or secret spot to shoot from.
        5. **Suggested Captions**: 3 short, trendy, aesthetic, or funny captions/hashtags ready to post on Instagram/Tiktok.

        You MUST output ONLY a valid JSON object matching the requested structure below:
        {{
          "city": "{request.city}",
          "spots": [
             {{
               "name": "Fushimi Inari-taisha Gates",
               "description": "Thousands of vibrant vermilion torii gates winding up a mountain path, creating a spectacular tunnel of color.",
               "best_time_to_shoot": "Sunrise (6:00 AM - 7:30 AM)",
               "photography_advice": "Walk 15-20 minutes up the path to reach areas with fewer tourists. Shoot low-angle looking up to capture the towering scale of the gates.",
               "suggested_captions": [
                  "Lost in a sea of red. ⛩️✨",
                  "Finding magic around every curve.",
                  "Kyoto, you have my heart. ❤️ #FushimiInari #KyotoTravel #JapanVibes"
               ]
             }}
          ]
        }}
        """

        response = client_groq.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": "You are a professional travel photographer and influencer. Return only strict, valid JSON."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.6
        )
        
        photo_spots = json.loads(response.choices[0].message.content)
        return photo_spots

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Photo Spots Engine Error: {str(e)}")
