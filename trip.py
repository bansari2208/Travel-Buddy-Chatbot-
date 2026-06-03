import streamlit as st
import os
from openai import OpenAI
from fpdf import FPDF
from dotenv import load_dotenv
import json
from datetime import datetime
import requests

# Load environment variables
load_dotenv()

# --- Page Configuration ---
st.set_page_config(
    page_title="Layla | Your AI Travel Buddy",
    page_icon="✈️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# --- Constants & API Config ---
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
MODEL_NAME = "llama-3.1-8b-instant"
API_BASE_URL = os.getenv("API_BASE_URL", "http://127.0.0.1:8000")

client = OpenAI(
    api_key=GROQ_API_KEY,
    base_url="https://api.groq.com/openai/v1"
)

# --- Premium Styling ---
st.markdown("""
    <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600&family=Outfit:wght@400;700&display=swap');

    :root {
        --primary: #6366f1;
        --secondary: #a855f7;
        --bg-dark: #0f172a;
        --card-bg: rgba(30, 41, 59, 0.7);
    }

    /* Hide default Streamlit elements while keeping the sidebar toggle visible */
    header[data-testid="stHeader"] {
        background: transparent !important;
    }
    div[data-testid="stHeaderActionElements"] {
        display: none !important;
    }
    footer {visibility: hidden;}
    #MainMenu {visibility: hidden;}

    /* Full-height, edge-to-edge layout */
    .stApp {
        background: radial-gradient(circle at top right, #1e293b, #0f172a) !important;
        background-attachment: fixed !important;
        color: #f8fafc;
        font-family: 'Inter', sans-serif;
        min-height: 100vh;
    }

    .main {
        background: transparent !important;
    }

    .main .block-container {
        padding-top: 2rem;
        padding-bottom: 2rem;
        padding-left: 3rem;
        padding-right: 3rem;
        max-width: 100%;
        min-height: 100vh;
    }

    /* Remove extra space at the very bottom */
    .stVerticalBlock {
        gap: 0rem;
    }

    /* Chat styling */
    .stChatMessage {
        background-color: var(--card-bg) !important;
        border-radius: 15px !important;
        border: 1px solid rgba(255, 255, 255, 0.05) !important;
        margin-bottom: 10px !important;
        backdrop-filter: blur(10px);
    }

    h1, h2, h3 {
        font-family: 'Outfit', sans-serif;
        background: linear-gradient(90deg, #818cf8, #c084fc);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
    }

    .sidebar-content {
        background: rgba(15, 23, 42, 0.5);
        padding: 20px;
        border-radius: 12px;
        border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .plan-card {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 12px;
        padding: 20px;
        margin-top: 15px;
        border-left: 4px solid var(--primary);
    }

    /* Button Styling */
    .stButton > button, .stDownloadButton > button {
        border-radius: 10px !important;
        transition: all 0.3s ease !important;
        width: 100% !important;
        padding: 0.5rem 1rem !important;
        border: 1px solid rgba(255, 255, 255, 0.1) !important;
        background: rgba(255, 255, 255, 0.05) !important;
        color: white !important;
    }

    .stButton > button:hover, .stDownloadButton > button:hover {
        border-color: var(--primary) !important;
        background: rgba(99, 102, 241, 0.1) !important;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }

    .stChatInputContainer {
        border-top: 1px solid rgba(255, 255, 255, 0.1) !important;
        padding-bottom: 10px !important;
    }
    </style>
""", unsafe_allow_html=True)

# --- Session State Initialization ---
if "messages" not in st.session_state:
    st.session_state.messages = [
        {"role": "assistant", "content": "Hi! I'm Layla, your personal travel buddy. 🌍 Where are we dreaming of going today?"}
    ]

if "trip_info" not in st.session_state:
    st.session_state.trip_info = {
        "destination": None,
        "budget": None,
        "days": None,
        "preferences": None
    }

if "itinerary" not in st.session_state:
    st.session_state.itinerary = None

if "jwt_token" not in st.session_state:
    st.session_state.jwt_token = None

if "username" not in st.session_state:
    st.session_state.username = None

if "saved_trips" not in st.session_state:
    st.session_state.saved_trips = []

if "trips_loaded" not in st.session_state:
    st.session_state.trips_loaded = False


# --- Backend API Helper Functions ---
def api_login(username, password):
    try:
        response = requests.post(f"{API_BASE_URL}/login", json={"username": username, "password": password})
        if response.status_code == 200:
            data = response.json()
            st.session_state.jwt_token = data["access_token"]
            st.session_state.username = data["username"]
            st.session_state.trips_loaded = False  # Reload saved trips
            return True, "Login successful!"
        else:
            detail = response.json().get("detail", "Invalid username or password.")
            return False, detail
    except requests.exceptions.ConnectionError:
        return False, "Unable to connect to the backend server. Please verify it is running."

def api_signup(username, email, password):
    try:
        response = requests.post(f"{API_BASE_URL}/signup", json={"username": username, "email": email, "password": password})
        if response.status_code == 201:
            return True, "Registration successful! You can now log in."
        else:
            detail = response.json().get("detail", "Registration failed.")
            return False, detail
    except requests.exceptions.ConnectionError:
        return False, "Unable to connect to the backend server. Please verify it is running."

def api_save_trip(destination, itinerary, budget):
    if not st.session_state.jwt_token:
        return False, "You must be logged in to save trips."
    try:
        headers = {"Authorization": f"Bearer {st.session_state.jwt_token}"}
        payload = {
            "destination": destination,
            "itinerary": itinerary,
            "budget": str(budget) if budget is not None else "Standard"
        }
        response = requests.post(f"{API_BASE_URL}/save-trip", json=payload, headers=headers)
        if response.status_code == 200:
            st.session_state.trips_loaded = False  # Reload list
            return True, f"Trip to {destination} saved successfully!"
        else:
            detail = response.json().get("detail", "Failed to save trip.")
            return False, detail
    except requests.exceptions.ConnectionError:
        return False, "Unable to connect to backend server."

def api_get_trips():
    if not st.session_state.jwt_token:
        return []
    try:
        headers = {"Authorization": f"Bearer {st.session_state.jwt_token}"}
        response = requests.get(f"{API_BASE_URL}/get-trips", headers=headers)
        if response.status_code == 200:
            return response.json()
        return []
    except requests.exceptions.ConnectionError:
        return []


# --- Helper Functions ---
@st.cache_data
def generate_pdf(itinerary_text, destination):
    """
    Generates a PDF from the itinerary text.
    Uses @st.cache_data to avoid re-generating the PDF on every UI interaction.
    """
    pdf = FPDF()
    pdf.add_page()
    
    # Header
    pdf.set_font("Arial", 'B', 16)
    pdf.cell(200, 10, text=f"Travel Itinerary: {destination}", ln=True, align='C')
    pdf.ln(10)
    
    # Body
    pdf.set_font("Arial", size=11)
    # Convert text to latin-1 compatibility (FPDF default)
    clean_text = itinerary_text.encode('latin-1', 'replace').decode('latin-1')
    pdf.multi_cell(0, 10, text=clean_text)
    
    # Wrap in bytes
    return bytes(pdf.output())

def parse_trip_details(chat_history):
    """Uses LLM to extract structured trip details from conversation"""
    history_str = "\n".join([f"{m['role']}: {m['content']}" for m in chat_history])
    prompt = f"""
    Based on the following conversation, extract the trip details in JSON format.
    Fields: destination, budget, days, preferences.
    If a field is unknown, set it to null.
    
    Conversation:
    {history_str}
    
    Return ONLY JSON.
    """
    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"}
        )
        return json.loads(response.choices[0].message.content)
    except:
        return st.session_state.trip_info


# --- Sidebar UI ---
with st.sidebar:
    st.image("https://cdn-icons-png.flaticon.com/512/826/826070.png", width=80)
    st.title("Layla AI")
    st.markdown("---")
    
    # --- Authentication Section ---
    if not st.session_state.jwt_token:
        st.subheader("🔐 Account Access")
        auth_tab1, auth_tab2 = st.tabs(["🔑 Login", "📝 Register"])
        
        with auth_tab1:
            login_user = st.text_input("Username or Email", key="login_username_input")
            login_pass = st.text_input("Password", type="password", key="login_password_input")
            if st.button("Sign In", use_container_width=True, key="login_submit_btn"):
                if login_user and login_pass:
                    with st.spinner("Logging in..."):
                        success, msg = api_login(login_user, login_pass)
                        if success:
                            st.success(msg)
                            st.rerun()
                        else:
                            st.error(msg)
                else:
                    st.warning("Please fill in all fields.")
                    
        with auth_tab2:
            reg_user = st.text_input("Username", key="reg_username_input")
            reg_email = st.text_input("Email Address", key="reg_email_input")
            reg_pass = st.text_input("Password", type="password", key="reg_password_input")
            if st.button("Create Account", use_container_width=True, key="reg_submit_btn"):
                if reg_user and reg_email and reg_pass:
                    with st.spinner("Registering..."):
                        success, msg = api_signup(reg_user, reg_email, reg_pass)
                        if success:
                            st.success(msg)
                        else:
                            st.error(msg)
                else:
                    st.warning("Please fill in all fields.")
    else:
        st.subheader("👤 User Profile")
        st.markdown(f"""
            <div style='background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 12px; padding: 15px; margin-bottom: 10px;'>
                <h4 style='margin: 0; color: #818cf8;'>Welcome back, {st.session_state.username}! 👋</h4>
                <p style='margin: 5px 0 0 0; font-size: 13px; color: #cbd5e1;'>Your JWT-secured session is active.</p>
            </div>
        """, unsafe_allow_html=True)
        
        if st.button("🚪 Log Out", use_container_width=True, key="logout_submit_btn"):
            st.session_state.jwt_token = None
            st.session_state.username = None
            st.session_state.saved_trips = []
            st.session_state.trips_loaded = False
            st.success("Logged out successfully.")
            st.rerun()
            
    st.markdown("---")
    
    # --- Saved Adventures Section ---
    if st.session_state.jwt_token:
        st.subheader("📂 Saved Adventures")
        if not st.session_state.trips_loaded:
            with st.spinner("Loading plans..."):
                st.session_state.saved_trips = api_get_trips()
                st.session_state.trips_loaded = True
        
        if st.session_state.saved_trips:
            for trip in st.session_state.saved_trips:
                try:
                    dt = datetime.fromisoformat(trip["created_at"].replace("Z", "+00:00"))
                    date_str = dt.strftime("%b %d, %Y")
                except:
                    date_str = "Saved"
                
                with st.expander(f"🗺️ {trip['destination']} ({date_str})"):
                    st.write(f"**Budget:** {trip['budget'] or 'Standard'}")
                    if st.button("👁️ Load Plan", key=f"load_trip_{trip['id']}", use_container_width=True):
                        st.session_state.itinerary = trip["itinerary"]
                        st.session_state.trip_info = {
                            "destination": trip["destination"],
                            "budget": trip["budget"],
                            "days": "Saved",
                            "preferences": "Loaded from account"
                        }
                        st.session_state.messages = [
                            {"role": "assistant", "content": f"Loaded saved travel plan to **{trip['destination']}**! ✈️ Here is your itinerary:"},
                            {"role": "assistant", "content": trip["itinerary"]}
                        ]
                        st.rerun()
        else:
            st.info("No saved plans yet. Generate one and save it!")
        st.markdown("---")

    # --- Current Trip Info ---
    st.subheader("📍 Current Trip Status")
    info = st.session_state.trip_info
    
    cols = st.columns(2)
    with cols[0]:
        st.write(f"**Dest:** {info['destination'] or '❓'}")
        st.write(f"**Days:** {info['days'] or '❓'}")
    with cols[1]:
        st.write(f"**Budget:** {info['budget'] or '❓'}")
        st.write(f"**Prefs:** {'✅' if info['preferences'] else '❓'}")
    
    st.markdown("---")
    
    # --- Sidebar Actions ---
    if st.session_state.itinerary:
        st.subheader("📂 Actions")
        pdf_bytes = generate_pdf(st.session_state.itinerary, info['destination'] or "Plan")
        
        st.download_button(
            label="📄 Download PDF Itinerary",
            data=pdf_bytes,
            file_name=f"Trip_to_{info['destination'] or 'Plan'}.pdf",
            mime="application/pdf",
            use_container_width=True,
            key="sidebar_pdf_btn"
        )
        
        if st.button("🔄 Start New Plan", use_container_width=True, key="sidebar_new_btn"):
            st.session_state.messages = [{"role": "assistant", "content": "Ready for a new adventure! Where to?"}]
            st.session_state.trip_info = {"destination": None, "budget": None, "days": None, "preferences": None}
            st.session_state.itinerary = None
            st.rerun()

    st.markdown("<br><br>", unsafe_allow_html=True)
    st.info("💡 Tip: Try saying: 'Help me plan a 3-day budget trip to Kyoto focusing on temples.'")


# --- Main Chat Interface ---
st.title("🌍 Travel Buddy Chatbot")

# Display chat history
for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])

# Show "Save Trip" box in the main screen when an itinerary is generated
if st.session_state.itinerary:
    st.markdown("---")
    st.markdown("""
        <div class="plan-card">
            <h3 style="margin-top: 0; color: #818cf8;">✨ Itinerary Generated!</h3>
            <p style="margin-bottom: 0;">Save this itinerary securely to your account profile or download it as a high-quality PDF.</p>
        </div>
    """, unsafe_allow_html=True)
    
    col1, col2 = st.columns(2)
    with col1:
        pdf_bytes = generate_pdf(st.session_state.itinerary, st.session_state.trip_info['destination'] or "Plan")
        st.download_button(
            label="📄 Download PDF Itinerary",
            data=pdf_bytes,
            file_name=f"Trip_to_{st.session_state.trip_info['destination'] or 'Plan'}.pdf",
            mime="application/pdf",
            use_container_width=True,
            key="main_pdf_btn"
        )
    with col2:
        if st.session_state.jwt_token:
            if st.button("💾 Save Trip to Profile", use_container_width=True, key="main_save_btn"):
                dest = st.session_state.trip_info['destination'] or "Adventure Plan"
                success, msg = api_save_trip(
                    dest,
                    st.session_state.itinerary,
                    str(st.session_state.trip_info['budget']) if st.session_state.trip_info['budget'] is not None else "Standard"
                )
                if success:
                    st.success(msg)
                    st.toast(msg)
                else:
                    st.error(msg)
        else:
            st.warning("🔐 Register or Login in the sidebar to save this trip to your profile!")

# Chat Input
if prompt := st.chat_input("Tell me about your dream trip..."):
    # Add user message to history
    st.session_state.messages.append({"role": "user", "content": prompt})
    st.rerun()

# Processing user input (when last message is user)
if st.session_state.messages[-1]["role"] == "user":
    user_prompt = st.session_state.messages[-1]["content"]
    
    with st.chat_message("assistant"):
        with st.spinner("Layla is thinking..."):
            # Update trip info from conversation
            st.session_state.trip_info = parse_trip_details(st.session_state.messages)
            
            # Prepare contextual response
            info = st.session_state.trip_info
            
            # Logic: If all core info is present, generate itinerary. Otherwise, ask questions.
            system_msg = (
                "You are Layla, a helpful and proactive travel assistant. "
                "Your goal is to gather: destination, budget, number of days, and preferences. "
                "Once you have all 4, generate a detailed, day-wise itinerary including hotels, restaurants, and transport. "
                "If information is missing, ask for it in a friendly, conversational way. "
                "If a user is vague (e.g., 'I want nature'), suggest destinations. "
                "Always use high-quality Markdown for lists and bolding."
            )
            
            messages = [{"role": "system", "content": system_msg}] + st.session_state.messages
            
            try:
                response = client.chat.completions.create(
                    model=MODEL_NAME,
                    messages=messages,
                    temperature=0.7
                )
                
                assistant_response = response.choices[0].message.content
                st.markdown(assistant_response)
                
                # If the response looks like an itinerary (heuristic), store it
                if "Day 1" in assistant_response or "Itinerary" in assistant_response:
                    st.session_state.itinerary = assistant_response
                
                st.session_state.messages.append({"role": "assistant", "content": assistant_response})
                st.rerun()
            except Exception as e:
                st.error(f"Error calling Groq API: {e}")
