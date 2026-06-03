import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, Sparkles, User as UserIcon, Compass, Calendar, MapPin, 
  Coffee, ShieldAlert, CheckSquare, Wallet, Loader2, Star, 
  ChevronLeft, ChevronRight, Heart, Award, Navigation, Info, Globe 
} from 'lucide-react';

// Decodes, filters, and formats descriptive filenames from Wikimedia Commons to create visually accurate, real captions.
const cleanCaption = (title, index) => {
  if (!title) return `Tourist Spot #${index + 1}`;
  let name = title.replace(/^File:/i, '').trim();
  
  // Remove standard extensions
  name = name.replace(/\.[a-zA-Z0-9]+$/, '');
  
  // Replace underscores and hyphens with spaces
  name = name.replace(/[_-]/g, ' ').trim();
  
  try {
    name = decodeURIComponent(name);
  } catch(e) {}
  
  // Remove timestamp details, years, or generic camera markings to keep titles elegant
  name = name.replace(/\s*\(\d{4}\)|\s*-\s*April\s*\d{4}|\s*-\s*May\s*\d{4}|\s*-\s*June\s*\d{4}|\s*-\s*July\s*\d{4}|\s*-\s*August\s*\d{4}/gi, '');
  
  // Limit to max 4 words to fit beautifully inside caption badge
  const words = name.split(' ');
  if (words.length > 4) {
    name = words.slice(0, 4).join(' ');
  }
  
  name = name.charAt(0).toUpperCase() + name.slice(1);
  
  // Fallbacks if title is unreadable or too short
  const defaultCaptions = ["Scenic Top View", "Popular Spot", "Historic Landmark", "Local Culture", "Scenic Vista"];
  if (name.length < 3 || name.toLowerCase().includes('image') || name.toLowerCase().includes('dsc') || name.toLowerCase().includes('img')) {
    return defaultCaptions[index % defaultCaptions.length];
  }
  
  return name;
};

// Asynchronous client-side fetcher utilizing the public Wikimedia Commons Action API to fetch real, visually accurate photos.
const fetchRealPlaceImages = async (placeName) => {
  if (!placeName) return [];
  
  const userAgent = 'TravelBuddyApp/1.0 (contact@example.com)';
  
  const performQuery = async (queryStr) => {
    try {
      const query = encodeURIComponent(queryStr);
      const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${query}&gsrnamespace=6&prop=imageinfo&iiprop=url&iiurlwidth=800&format=json&origin=*`;
      const response = await fetch(url, {
        headers: { 'Api-User-Agent': userAgent }
      });
      const data = await response.json();
      
      if (!data.query || !data.query.pages) return [];
      
      const pages = data.query.pages;
      const imagesList = [];
      
      for (const id in pages) {
        const page = pages[id];
        const title = page.title;
        const imageInfo = page.imageinfo && page.imageinfo[0];
        const imgUrl = imageInfo ? (imageInfo.thumburl || imageInfo.url) : null;
        
        // Exclude vector shapes, documents, or icons to guarantee photograph relevance
        if (imgUrl && !imgUrl.endsWith('.svg') && !imgUrl.endsWith('.png') && !imgUrl.endsWith('.pdf')) {
          imagesList.push({
            url: imgUrl,
            title: title
          });
        }
      }
      return imagesList;
    } catch (err) {
      console.error("Wikimedia query failed: ", err);
      return [];
    }
  };

  // 1. Primary Attempt (Specific location query)
  let results = await performQuery(placeName);
  
  // 2. First Fallback Refinement: "{place name} landmark"
  if (results.length < 3) {
    results = await performQuery(`${placeName} landmark`);
  }
  
  // 3. Second Fallback Refinement: "{place name} tourist attraction"
  if (results.length < 3) {
    results = await performQuery(`${placeName} tourist attraction`);
  }

  // Max out at 4 files to map onto a clean 2x2 grid layout
  const sliced = results.slice(0, 4);
  
  return sliced.map((item, index) => ({
    url: item.url,
    caption: cleanCaption(item.title, index)
  }));
};

// Fallback images strictly in case public APIs are completely offline, maintaining dynamic location keyword mappings
const FALLBACK_GUEST_IMAGES = (placeName) => [
  {
    url: `https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80&sig=1&q=${encodeURIComponent(placeName)}`,
    caption: "Popular Spot"
  },
  {
    url: `https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=800&q=80&sig=2&q=${encodeURIComponent(placeName)}`,
    caption: "Top View"
  },
  {
    url: `https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=800&q=80&sig=3&q=${encodeURIComponent(placeName)}`,
    caption: "Historic Landmark"
  },
  {
    url: `https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=800&q=80&sig=4&q=${encodeURIComponent(placeName)}`,
    caption: "Scenic Landscape"
  }
];

const parseToCards = (text) => {
  if (!text) return null;

  // If no bolding or headers, return standard formatted text
  if (!text.includes('**') && !text.includes('#') && !text.includes('*') && !text.includes('-')) {
    return <div dangerouslySetInnerHTML={{ __html: text.replace(/\n/g, '<br/>') }} />;
  }

  const lines = text.split('\n');
  const elements = [];
  let currentCard = null;

  const replaceMarkdownInline = (str) => {
    if (!str) return '';
    return str
      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-bold">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="text-slate-300 italic">$1</em>')
      .replace(/`([^`]+)`/g, '<code class="bg-white/10 px-1.5 py-0.5 rounded text-indigo-300 text-xs font-mono">$1</code>');
  };

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (trimmed === '') return;

    // Check if it's a card header.
    const headerMatch = trimmed.match(/^(?:###|##|#|\*\*)\s*(Day\s*\d+|Budget|Food|Restaurant|Stay|Hotel|Accommodation|Pack|Safety|Tip|Transit|Transport|Itinerary|Perfect Itinerary|Day-wise|Day-by-day\b.*?)(?::|\*\*|$)/i);
    const boldHeaderMatch = trimmed.match(/^\*\*(.*?)\*\*:?$/);

    if (headerMatch || (boldHeaderMatch && trimmed.length < 60)) {
      if (currentCard) {
        elements.push(currentCard);
      }
      
      const title = (headerMatch ? headerMatch[1] : boldHeaderMatch[1]).trim();
      let Icon = Sparkles;
      let colorClass = "text-indigo-400";
      let bgClass = "bg-indigo-500/10 border-indigo-500/20";
      
      if (title.toLowerCase().includes('day')) { Icon = Calendar; colorClass = "text-blue-400"; bgClass = "bg-blue-500/10 border-blue-500/20"; }
      else if (title.toLowerCase().includes('food') || title.toLowerCase().includes('restaurant') || title.toLowerCase().includes('dine')) { Icon = Coffee; colorClass = "text-orange-400"; bgClass = "bg-orange-500/10 border-orange-500/20"; }
      else if (title.toLowerCase().includes('pack')) { Icon = CheckSquare; colorClass = "text-emerald-400"; bgClass = "bg-emerald-500/10 border-emerald-500/20"; }
      else if (title.toLowerCase().includes('budget') || title.toLowerCase().includes('cost')) { Icon = Wallet; colorClass = "text-green-400"; bgClass = "bg-green-500/10 border-green-500/20"; }
      else if (title.toLowerCase().includes('safet') || title.toLowerCase().includes('tip') || title.toLowerCase().includes('alert')) { Icon = ShieldAlert; colorClass = "text-rose-400"; bgClass = "bg-rose-500/10 border-rose-500/20"; }
      else if (title.toLowerCase().includes('hotel') || title.toLowerCase().includes('stay') || title.toLowerCase().includes('accommodation')) { Icon = MapPin; colorClass = "text-purple-400"; bgClass = "bg-purple-500/10 border-purple-500/20"; }

      currentCard = {
        type: 'card',
        title,
        Icon,
        colorClass,
        bgClass,
        content: []
      };
    } else {
      const hashHeadingMatch = trimmed.match(/^(#{1,6})\s*(.*)$/);
      if (hashHeadingMatch) {
        const level = hashHeadingMatch[1].length;
        const headingText = hashHeadingMatch[2].trim();
        const formattedText = replaceMarkdownInline(headingText);
        
        const headingEl = {
          type: 'heading',
          level,
          content: formattedText
        };
        
        if (currentCard) {
          currentCard.content.push(headingEl);
        } else {
          elements.push(headingEl);
        }
      }
      else if (trimmed.startsWith('-') || trimmed.startsWith('*') || trimmed.match(/^\d+\.\s/)) {
        const listText = trimmed.replace(/^([-*]|\d+\.)\s*/, '').trim();
        const formattedText = replaceMarkdownInline(listText);
        const listItemEl = {
          type: 'list-item',
          content: formattedText
        };
        
        if (currentCard) {
          currentCard.content.push(listItemEl);
        } else {
          elements.push(listItemEl);
        }
      } 
      else {
        const formattedText = replaceMarkdownInline(trimmed);
        const pEl = {
          type: 'paragraph',
          content: formattedText
        };
        
        if (currentCard) {
          currentCard.content.push(pEl);
        } else {
          elements.push(pEl);
        }
      }
    }
  });

  if (currentCard) {
    elements.push(currentCard);
  }

  return (
    <div className="space-y-4">
      {elements.map((el, i) => {
        if (el.type === 'paragraph') {
          return <p key={i} className="mb-3 text-slate-300 leading-relaxed font-normal" dangerouslySetInnerHTML={{ __html: el.content }} />;
        }
        
        if (el.type === 'heading') {
          const Tag = `h${Math.min(el.level + 1, 6)}`;
          const classes = 
            el.level === 1 ? "text-2xl font-bold text-white mt-4 mb-2 font-outfit" :
            el.level === 2 ? "text-xl font-bold text-indigo-300 mt-4 mb-2 font-outfit" :
            el.level === 3 ? "text-lg font-semibold text-slate-200 mt-3 mb-1.5 font-outfit" :
            "text-base font-semibold text-indigo-400 mt-2.5 mb-1";
          return <Tag key={i} className={classes} dangerouslySetInnerHTML={{ __html: el.content }} />;
        }
        
        if (el.type === 'list-item') {
          return (
            <div key={i} className="flex items-start gap-2 text-sm text-slate-300 my-1 pl-2">
              <span className="text-indigo-400 mt-1 shrink-0">•</span>
              <span dangerouslySetInnerHTML={{ __html: el.content }} />
            </div>
          );
        }
        
        return (
          <div key={i} className={`mt-4 rounded-2xl border border-white/5 shadow-2xl overflow-hidden backdrop-blur-md transition-all duration-300 hover:border-white/10 ${el.bgClass}`}>
            <div className="px-5 py-3.5 border-b border-white/5 flex items-center gap-3 bg-black/25">
              <el.Icon className={`w-5.5 h-5.5 ${el.colorClass}`} />
              <h4 className={`font-bold text-base font-outfit tracking-wide ${el.colorClass}`}>{el.title}</h4>
            </div>
            <div className="p-5 bg-black/15 space-y-3">
              {el.content.map((item, j) => {
                if (item.type === 'paragraph') {
                  return <p key={j} className="text-sm text-slate-300 leading-relaxed m-0" dangerouslySetInnerHTML={{ __html: item.content }} />;
                }
                if (item.type === 'heading') {
                  const Tag = `h${Math.min(item.level + 1, 6)}`;
                  const classes = 
                    item.level === 2 ? "text-base font-bold text-indigo-300 mt-3 mb-1" :
                    item.level === 3 ? "text-sm font-semibold text-white mt-2 mb-1" :
                    "text-xs font-semibold text-indigo-400 mt-2";
                  return <Tag key={j} className={classes} dangerouslySetInnerHTML={{ __html: item.content }} />;
                }
                return (
                  <div key={j} className="text-sm text-slate-200 flex items-start gap-2.5 pl-1 py-0.5">
                    <span className="text-indigo-400 mt-1 shrink-0">•</span>
                    <span dangerouslySetInnerHTML={{ __html: item.content }} />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const Chatbot = ({ isGuest = false }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const messagesEndRef = useRef(null);

  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hi! I'm Layla, your personal travel buddy. 🌍 Where are we dreaming of going today?" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [tripInfo, setTripInfo] = useState({ destination: null, budget: null, days: null, preferences: null });
  const [itinerary, setItinerary] = useState(null);
  const [language, setLanguage] = useState("English");
  const languages = ["English", "Hindi", "Gujarati", "Spanish", "French", "German", "Japanese"];

  // Visual card state variables
  const [activePlace, setActivePlace] = useState(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [favorites, setFavorites] = useState([]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  useEffect(() => {
    const fetchFavorites = async () => {
      if (user && !isGuest) {
        try {
          const res = await api.get('/get-favorites');
          setFavorites(res.data.map(f => f.destination));
        } catch (err) {
          console.error(err);
        }
      }
    };
    fetchFavorites();
  }, [user, isGuest]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const loadId = params.get('load');
    
    if (loadId && user) {
      const loadTrip = async () => {
        try {
          const response = await api.get('/get-trips');
          const trip = response.data.find(t => t.id === loadId);
          if (trip) {
            setItinerary(trip.itinerary);
            setTripInfo({
              destination: trip.destination,
              budget: trip.budget,
              days: "Saved Plan",
              preferences: "Loaded from account"
            });
            setMessages([
              { role: 'assistant', content: `Here is your saved itinerary for **${trip.destination}**! ✈️` },
              { role: 'assistant', content: trip.itinerary }
            ]);
            
            // Proactively load scenic visual card details
            const images = await fetchRealPlaceImages(trip.destination);
            setActivePlace({
              place_name: trip.destination,
              description: `A customized adventure planned to explore the beautiful sites and heritage locations around ${trip.destination}.`,
              attractions: ["Local Sightseeing", "Historic Landmarks", "Culinary Hotspots", "Nature Trails"],
              best_time: "Spring or Autumn for pleasant temperature and outdoor travel.",
              tips: ["Use local transit for quick travel", "Pack seasonal clothing", "Support authentic local businesses"],
              rating: "4.9",
              images: images.length > 0 ? images : FALLBACK_GUEST_IMAGES(trip.destination),
              suggested_duration: "5-7 Days",
              currency: "Local Currency",
              local_language: "Local Language",
              timezone: "Local Time Zone",
              famous_foods: ["Signature Local Dishes"],
              top_activities: ["Local Sights Exploration", "Historical Walking Tours"],
              budget_estimate: trip.budget || "Moderate",
              family_friendly_score: 9,
              solo_travel_score: 9,
              adventure_score: 8
            });
            setActiveImageIndex(0);
          }
        } catch (error) {
          toast.error("Failed to load trip.");
        }
      };
      loadTrip();
    }
  }, [location, user]);

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    await triggerChatRequest(newMessages);
  };

  // Dedicated dynamic refinement customizer
  const handleRegenerate = async (refinementPrompt) => {
    const userMessage = { role: 'user', content: refinementPrompt };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setLoading(true);

    toast.loading("Customizing and refining your travel plan...", { duration: 3000 });
    await triggerChatRequest(newMessages);
  };

  // Generalized conversational engine connecting with System Prompt Suffixes
  const triggerChatRequest = async (currentMessages) => {
    const systemPromptSuffix = `
    
    [CRITICAL FORMATTING INSTRUCTION]
    If the user is asking about, planning, or searching for a specific holiday destination/place, you MUST add a structured JSON block at the very end of your response inside a standard markdown code block:
    \`\`\`json
    {
      "place_name": "Exact Name of the City or Country",
      "description": "An engaging, high-quality description of the destination (2-3 sentences).",
      "attractions": ["Attraction 1", "Attraction 2", "Attraction 3", "Attraction 4"],
      "best_time": "The best season or months to visit with a brief explanation.",
      "tips": ["Tip 1 (packing guidelines)", "Tip 2 (customs/transit tips)", "Tip 3 (safety/budget tip)"],
      "rating": "4.8",
      "suggested_duration": "Suggested duration (e.g. 5-7 Days or 3-4 Days)",
      "currency": "Currency name and symbol (e.g. USD ($) or Euro (€))",
      "local_language": "Primary local language",
      "timezone": "Time zone code (e.g. UTC+1 or UTC-5)",
      "famous_foods": ["Famous Food 1", "Famous Food 2", "Famous Food 3"],
      "top_activities": ["Must-do Activity 1", "Must-do Activity 2", "Must-do Activity 3"],
      "budget_estimate": "Estimated Daily Budget Range (e.g. $100-$150/day or Moderate)",
      "family_friendly_score": 8,
      "solo_travel_score": 9,
      "adventure_score": 7,
      "why_this_plan": "A personalized 2-sentence explanation of why this customized itinerary is perfect for the traveler based on their budget and activities.",
      "budget_breakdown": {
        "total_est": "$800 - $1200",
        "daily_avg": "$150/day",
        "category": "Mid-Range",
        "cost_saving_tips": [
          "Use public transit instead of private taxis.",
          "Eat at local food markets rather than tourist-heavy restaurants.",
          "Book attraction tickets online in advance to avoid surcharges."
        ]
      },
      "itinerary_timeline": [
        {
          "day_number": 1,
          "theme": "Arrival & City Exploration",
          "morning": "Arrival, check-in, and light walking around historical squares. (Transit: Walk, Cost: Free)",
          "afternoon": "Guided historical walking tour of central spots. (Transit: Public Bus, Cost: $10)",
          "evening": "Stroll down the scenic pedestrian avenues during sunset. (Transit: Walk, Cost: Free)",
          "night": "Dinner at a local bistro enjoying traditional foods. (Transit: Walk, Cost: $25)",
          "food_recommendation": "Local street snacks or fresh pastries."
        }
      ]
    }
    \`\`\`
    Make sure the JSON block contains ONLY valid JSON and matches the exact structure. Do not place any extra texts inside the \`\`\`json block.
    `;

    try {
      const payloadMessages = currentMessages.map((msg, i) => {
        if (i === currentMessages.length - 1) {
          return { role: msg.role, content: msg.content + systemPromptSuffix };
        }
        return msg;
      });

      const chatRes = await api.post('/chat', { messages: payloadMessages, language });
      const assistantReply = chatRes.data.reply;
      
      const jsonRegex = /```json\s*([\s\S]*?)\s*```/;
      const match = assistantReply.match(jsonRegex);
      
      let placeData = null;
      let cleanedReply = assistantReply;

      if (match) {
        try {
          placeData = JSON.parse(match[1]);
          cleanedReply = assistantReply.replace(jsonRegex, '').trim();
        } catch (e) {
          console.error("JSON parsing error: ", e);
        }
      }

      const updatedMessages = [...currentMessages, { role: 'assistant', content: cleanedReply }];
      setMessages(updatedMessages);

      if (/day\s*\d+|itinerary|schedule|plan/i.test(cleanedReply)) {
        setItinerary(cleanedReply);
      }

      if (placeData && placeData.place_name) {
        const images = await fetchRealPlaceImages(placeData.place_name);
        setActivePlace({
          ...placeData,
          images: images.length > 0 ? images : FALLBACK_GUEST_IMAGES(placeData.place_name)
        });
        setActiveImageIndex(0);
        toast.success(`Loaded active visual cards for ${placeData.place_name}! 📸`);
      }

      const parseRes = await api.post('/parse-trip', { messages: updatedMessages });
      const extracted = parseRes.data;
      setTripInfo(prev => ({
        destination: extracted.destination || prev.destination,
        budget: extracted.budget || prev.budget,
        days: extracted.days || prev.days,
        preferences: extracted.preferences || prev.preferences
      }));

    } catch (error) {
      toast.error('Error communicating with Layla.');
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async (destination) => {
    if (isGuest || !user) {
      toast.error('Please log in to save favorites.');
      return;
    }
    
    try {
      const isFav = favorites.includes(destination);
      if (isFav) {
        await api.post('/remove-favorite', { destination });
        setFavorites(favorites.filter(f => f !== destination));
        toast.success(`Removed ${destination} from favorites`);
      } else {
        await api.post('/add-favorite', { destination });
        setFavorites([...favorites, destination]);
        toast.success(`Added ${destination} to favorites`);
      }
    } catch (error) {
      toast.error('Failed to update favorite status');
    }
  };

  const handleSaveTrip = async () => {
    if (isGuest || !user) {
      toast.error('Please log in to save trips to your profile.');
      navigate('/login');
      return;
    }

    try {
      await api.post('/save-trip', {
        destination: tripInfo.destination || 'Adventure Plan',
        itinerary: itinerary,
        budget: tripInfo.budget || 'Standard'
      });
      toast.success('Trip saved to your profile!');
    } catch (error) {
      toast.error('Failed to save trip.');
    }
  };

  const handleNewPlan = () => {
    setMessages([{ role: 'assistant', content: "Ready for a new adventure! Where to?" }]);
    setTripInfo({ destination: null, budget: null, days: null, preferences: null });
    setItinerary(null);
    setActivePlace(null);
  };

  // Dynamic Whatsapp/Email Copy and Share System
  const handleSharePlan = () => {
    if (!activePlace) {
      toast.error("No active travel plan to share!");
      return;
    }

    let itineraryBlock = "";
    if (itinerary) {
      const cleanItinerary = itinerary.replace(/\*\*|###|##|#/g, '').trim();
      itineraryBlock = `\n📅 DAY-WISE ITINERARY:\n${cleanItinerary}\n`;
    }

    const formattedText = `✈️ LAYLA AI TRAVEL PLANNER ✈️
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 PLACE NAME: ${activePlace.place_name}
⏳ SUGGESTED DURATION: ${activePlace.suggested_duration || '5-7 Days'}
💵 CURRENCY USED: ${activePlace.currency || 'Local'}
🗣️ LOCAL LANGUAGE: ${activePlace.local_language || 'Local'}
🌐 TIME ZONE: ${activePlace.timezone || 'Local UTC'}

📖 ABOUT:
${activePlace.description}
${itineraryBlock}
🏛️ KEY ATTRACTIONS:
${activePlace.attractions ? activePlace.attractions.map((attr, idx) => `  ${idx + 1}. ${attr}`).join('\n') : '  • Local Attractions'}

🍽️ FAMOUS FOODS:
${activePlace.famous_foods ? activePlace.famous_foods.map(food => `  • ${food}`).join('\n') : '  • Signature local dishes'}

🌦️ BEST TIME TO VISIT:
${activePlace.best_time}

💡 TRAVEL TIPS:
${activePlace.tips ? activePlace.tips.map(tip => `  • ${tip}`).join('\n') : '  • Travel light and explore local transit options.'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🗺️ Planned using Layla AI Travel Buddy chatbot!
`;

    navigator.clipboard.writeText(formattedText);
    toast.success("Travel plan copied to clipboard! Link generated 📤");
  };

  // Booklet-Style Dynamic Print-to-PDF Engine
  const handleDownloadPDF = () => {
    if (!activePlace) {
      toast.error("No active travel plan to export!");
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error("Popup blocked! Please allow popups to download your travel guide PDF.");
      return;
    }

    const heroImage = activePlace.images && activePlace.images.length > 0 
      ? activePlace.images[activeImageIndex].url 
      : 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80';

    const attractionsHtml = activePlace.attractions 
      ? activePlace.attractions.map(attr => `<li style="margin-bottom: 8px; color: #334155;"><strong>${attr}</strong></li>`).join('')
      : '<li>Local Sightseeing Attractions</li>';

    const tipsHtml = activePlace.tips 
      ? activePlace.tips.map(tip => `<li style="margin-bottom: 8px; color: #475569;">${tip}</li>`).join('')
      : '<li>Respect local traditions and pack appropriate seasonal clothes.</li>';

    const foodsHtml = activePlace.famous_foods
      ? activePlace.famous_foods.map(food => `<span style="background-color: #ffedd5; border: 1px solid #fed7aa; padding: 4px 10px; border-radius: 20px; font-size: 12px; color: #ea580c; font-weight: bold; margin-right: 8px; margin-bottom: 8px; display: inline-block;">🍽️ ${food}</span>`).join('')
      : '<span style="color: #64748b;">Signature local cuisines</span>';

    const activitiesHtml = activePlace.top_activities
      ? activePlace.top_activities.map(act => `<span style="background-color: #e0e7ff; border: 1px solid #c7d2fe; padding: 4px 10px; border-radius: 20px; font-size: 12px; color: #4f46e5; font-weight: bold; margin-right: 8px; margin-bottom: 8px; display: inline-block;">⚡ ${act}</span>`).join('')
      : '<span style="color: #64748b;">Must-do adventures</span>';

    // Format schedule
    let itineraryHtml = '';
    if (itinerary) {
      const formatted = itinerary
        .replace(/\n/g, '<br/>')
        .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #1e1b4b;">$1</strong>')
        .replace(/###\s*(.*?)(<br\/>|$)/g, '<h3 style="color: #4f46e5; margin-top: 16px; margin-bottom: 8px; font-family: \'Outfit\', sans-serif;">$1</h3>')
        .replace(/##\s*(.*?)(<br\/>|$)/g, '<h2 style="color: #4f46e5; margin-top: 24px; margin-bottom: 12px; font-family: \'Outfit\', sans-serif;">$1</h2>');
      
      itineraryHtml = `
        <div style="margin-top: 30px; border-top: 2px solid #e2e8f0; padding-top: 20px;">
          <h2 style="color: #1e1b4b; font-family: 'Outfit', sans-serif; font-size: 20px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">📅 Detailed Day-Wise Itinerary</h2>
          <div style="line-height: 1.7; font-size: 14px; color: #475569; padding-left: 5px;">${formatted}</div>
        </div>
      `;
    }

    const htmlContent = `
      <html>
        <head>
          <title>Travel Guide Booklet - ${activePlace.place_name}</title>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@700;800;900&display=swap" rel="stylesheet">
          <style>
            body {
              font-family: 'Inter', sans-serif;
              color: #1e293b;
              margin: 0;
              padding: 40px;
              background-color: #ffffff;
              -webkit-print-color-adjust: exact;
            }
            .guide-container {
              max-width: 800px;
              margin: 0 auto;
            }
            .header-banner {
              position: relative;
              height: 280px;
              border-radius: 20px;
              overflow: hidden;
              margin-bottom: 30px;
              box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
            }
            .header-banner img {
              width: 100%;
              height: 100%;
              object-fit: cover;
            }
            .header-overlay {
              position: absolute;
              bottom: 0;
              left: 0;
              right: 0;
              background: linear-gradient(transparent, rgba(15, 23, 42, 0.95));
              padding: 28px;
              color: #ffffff;
            }
            .header-overlay h1 {
              font-family: 'Outfit', sans-serif;
              font-size: 36px;
              margin: 0;
              font-weight: 900;
              letter-spacing: -0.5px;
            }
            .rating-badge {
              background-color: #f59e0b;
              color: #ffffff;
              padding: 5px 12px;
              border-radius: 8px;
              font-weight: bold;
              font-size: 13px;
              display: inline-block;
              margin-top: 8px;
              box-shadow: 0 4px 6px -1px rgba(245, 158, 11, 0.3);
            }
            .meta-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 15px;
              margin-bottom: 30px;
            }
            .meta-card {
              background-color: #f8fafc;
              border: 1px solid #e2e8f0;
              padding: 14px;
              border-radius: 12px;
              text-align: center;
              box-shadow: 0 1px 3px rgba(0,0,0,0.02);
            }
            .meta-card span {
              display: block;
              font-size: 9px;
              text-transform: uppercase;
              color: #64748b;
              font-weight: 800;
              letter-spacing: 0.8px;
            }
            .meta-card strong {
              display: block;
              font-size: 14px;
              color: #0f172a;
              margin-top: 6px;
              font-weight: 700;
            }
            .section-card {
              background-color: #f8fafc;
              border-left: 4px solid #4f46e5;
              padding: 22px;
              border-radius: 0 16px 16px 0;
              margin-bottom: 25px;
              box-shadow: 0 1px 3px rgba(0,0,0,0.02);
            }
            .section-title {
              font-family: 'Outfit', sans-serif;
              font-size: 15px;
              text-transform: uppercase;
              color: #4f46e5;
              margin-top: 0;
              margin-bottom: 12px;
              letter-spacing: 0.8px;
              font-weight: 800;
            }
            .section-desc {
              font-size: 14.5px;
              line-height: 1.7;
              color: #334155;
              margin: 0;
            }
            .columns-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin-bottom: 25px;
            }
            ul {
              padding-left: 20px;
              margin: 0;
            }
            @media print {
              body {
                padding: 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="guide-container">
            <!-- 1. Header Banner -->
            <div class="header-banner">
              <img src="${heroImage}" alt="${activePlace.place_name}">
              <div class="header-overlay">
                <h1>Trip to ${activePlace.place_name}</h1>
                <div class="rating-badge">★ ${activePlace.rating || '4.8'} Tourist Rating</div>
              </div>
            </div>

            <!-- 2. Meta Insights Grid -->
            <div class="meta-grid">
              <div class="meta-card">
                <span>Duration</span>
                <strong>${activePlace.suggested_duration || '5-7 Days'}</strong>
              </div>
              <div class="meta-card">
                <span>Currency</span>
                <strong>${activePlace.currency || 'Local'}</strong>
              </div>
              <div class="meta-card">
                <span>Language</span>
                <strong>${activePlace.local_language || 'Local'}</strong>
              </div>
              <div class="meta-card">
                <span>Est. Budget</span>
                <strong>${activePlace.budget_estimate || 'Moderate'}</strong>
              </div>
            </div>

            <!-- 3. About the Destination -->
            <div class="section-card">
              <h2 class="section-title">About the Destination</h2>
              <p class="section-desc">${activePlace.description}</p>
            </div>

            <!-- 4. Columns for Sights & Tips -->
            <div class="columns-grid">
              <div class="section-card" style="border-left-color: #3b82f6; margin-bottom: 0;">
                <h2 class="section-title" style="color: #3b82f6;">Top Sights & Attractions</h2>
                <ul style="font-size: 13px; line-height: 1.6;">
                  ${attractionsHtml}
                </ul>
              </div>
              <div class="section-card" style="border-left-color: #8b5cf6; margin-bottom: 0;">
                <h2 class="section-title" style="color: #8b5cf6;">Expert Travel Tips</h2>
                <ul style="font-size: 13px; line-height: 1.6; color: #475569;">
                  ${tipsHtml}
                </ul>
              </div>
            </div>

            <!-- 5. Culinary & Experiences -->
            <div class="section-card" style="border-left-color: #f97316; margin-top: 25px;">
              <h2 class="section-title" style="color: #f97316;">Culinary & Top Experiences</h2>
              <div style="margin-bottom: 15px;">
                <strong style="font-size: 12px; color: #64748b; text-transform: uppercase; display: block; margin-bottom: 8px;">Famous Cuisines to Try:</strong>
                ${foodsHtml}
              </div>
              <div>
                <strong style="font-size: 12px; color: #64748b; text-transform: uppercase; display: block; margin-bottom: 8px;">Must-Do Adventures:</strong>
                ${activitiesHtml}
              </div>
            </div>

            <!-- 6. Detailed Day-wise Schedule -->
            ${itineraryHtml}

            <!-- Footer Booklet Info -->
            <div style="text-align: center; margin-top: 50px; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px;">
              Generated using Layla AI Travel Buddy booklet planner • PDF Exported Successfully.
            </div>
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.close();
              }, 600);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    toast.success("Travel plan booklet PDF downloaded! 📄");
  };

  // Structured default timeline triggers in case raw plans do not contain details
  const timeline = activePlace?.itinerary_timeline || [
    {
      day_number: 1,
      theme: "Classic Highlights Exploration",
      morning: "Start with an immersive historical walking tour around the central district. (Transit: Walk, Cost: $10)",
      afternoon: "Explore the national history museum or art galleries. (Transit: Metro, Cost: $15)",
      evening: "Enjoy a scenic sunset walk or a photography trail by the coastline. (Transit: Walk, Cost: Free)",
      night: "Indulge in a signature traditional dining experience at a local bistro. (Transit: Walk, Cost: $30)",
      food_recommendation: "Try signature regional pastries and traditional main courses."
    }
  ];

  const budget = activePlace?.budget_breakdown || {
    total_est: "$700 - $1100",
    daily_avg: "$130/day",
    category: "Mid-Range",
    cost_saving_tips: [
      "Purchase a local multi-sight sightseeing transit pass.",
      "Seek out street food markets and small local eateries.",
      "Utilize highly developed subway and bus transit options."
    ]
  };

  return (
    <div className="min-h-screen flex bg-slate-950 bg-fixed" style={{ 
      backgroundImage: 'radial-gradient(circle at 15% 50%, rgba(79, 70, 229, 0.15), transparent 25%), radial-gradient(circle at 85% 30%, rgba(168, 85, 247, 0.15), transparent 25%)' 
    }}>
      {/* Sidebar */}
      <aside className="w-80 glass-card rounded-none border-t-0 border-l-0 border-b-0 hidden md:flex flex-col z-20 shrink-0">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Compass className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gradient font-outfit tracking-tight">Layla AI</h1>
          </div>
        </div>
        
        <div className="p-6 flex-1 overflow-y-auto">
          {user && !isGuest ? (
            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 mb-6 shadow-inner">
              <h4 className="font-semibold text-indigo-400 m-0">Welcome back, {user.username}!</h4>
              
              <div className="mt-4 flex gap-2">
                <button onClick={() => navigate('/dashboard')} className="btn-primary flex-1 text-xs py-2 px-3 shadow-none">
                  Dashboard
                </button>
                <button onClick={logout} className="btn-outline flex-1 text-xs py-2 px-3">
                  Logout
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 mb-6 text-center">
              <h4 className="font-semibold text-slate-200">Guest Session</h4>
              <p className="text-xs text-slate-400 mt-1 mb-4">Log in to save your trips</p>
              <button onClick={() => navigate('/login')} className="btn-primary text-sm w-full py-2">
                Login / Register
              </button>
            </div>
          )}

          <div className="mb-6">
            <h3 className="text-sm font-semibold mb-4 text-slate-400 uppercase tracking-wider">Trip Details</h3>
            <div className="space-y-3">
              <div className="glass-card px-3 py-2 border-white/5 flex items-center gap-3 bg-slate-900/50">
                <MapPin className="w-4 h-4 text-indigo-400" />
                <div className="flex-1 overflow-hidden">
                  <span className="block text-slate-500 text-[10px] uppercase">Destination</span>
                  <span className="font-medium text-slate-200 text-sm truncate block">{tripInfo.destination || 'Thinking...'}</span>
                </div>
              </div>
              <div className="glass-card px-3 py-2 border-white/5 flex items-center gap-3 bg-slate-900/50">
                <Calendar className="w-4 h-4 text-blue-400" />
                <div>
                  <span className="block text-slate-500 text-[10px] uppercase">Duration</span>
                  <span className="font-medium text-slate-200 text-sm">{tripInfo.days || 'Thinking...'}</span>
                </div>
              </div>
              <div className="glass-card px-3 py-2 border-white/5 flex items-center gap-3 bg-slate-900/50">
                <Wallet className="w-4 h-4 text-emerald-400" />
                <div>
                  <span className="block text-slate-500 text-[10px] uppercase">Budget</span>
                  <span className="font-medium text-slate-200 text-sm">{tripInfo.budget || 'Thinking...'}</span>
                </div>
              </div>
            </div>
          </div>
          {itinerary && (
            <div>
              <h3 className="text-sm font-semibold mb-4 text-slate-400 uppercase tracking-wider">Actions</h3>
              <div className="space-y-3">
                <button onClick={handleSaveTrip} className="btn-primary w-full flex items-center justify-center gap-2">
                  Save to Dashboard
                </button>
                <button onClick={handleNewPlan} className="btn-outline w-full flex items-center justify-center gap-2">
                  Start New Plan
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Container splits dynamically when visual Place Card is active */}
      <main className="flex-1 flex flex-col md:flex-row h-screen relative overflow-hidden">
        
        {/* LEFT COLUMN: Conversational Chat */}
        <div className={`flex-1 flex flex-col h-full relative border-r border-white/5 transition-all duration-300 ${
          activePlace ? 'md:w-7/12 lg:w-8/12' : 'w-full'
        }`}>
          {/* Mobile Header */}
          <header className="md:hidden glass-card rounded-none p-4 flex justify-between items-center border-b border-white/10 z-10 sticky top-0 bg-slate-950/80 backdrop-blur">
            <div className="flex items-center gap-2">
              <Compass className="w-6 h-6 text-indigo-400" />
              <span className="font-bold">Layla AI</span>
            </div>
            <button onClick={() => navigate(user && !isGuest ? '/dashboard' : '/login')} className="text-indigo-400 text-sm font-medium">
              {user && !isGuest ? 'Dashboard' : 'Login'}
            </button>
          </header>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 pb-36">
            <div className="flex flex-col items-center mb-8 mt-4">
              <h2 className="text-2xl md:text-3xl font-bold font-outfit mb-4 text-white">Travel Buddy AI</h2>
              <div className="glass-card px-4 py-1.5 rounded-full flex items-center gap-3 bg-slate-900/50">
                <span className="text-slate-400 text-xs uppercase font-semibold">Language</span>
                <select 
                  value={language} 
                  onChange={(e) => setLanguage(e.target.value)}
                  className="bg-transparent text-indigo-400 font-semibold focus:outline-none cursor-pointer text-sm"
                >
                  {languages.map((lang) => (
                    <option key={lang} value={lang} className="bg-slate-800 text-white">
                      {lang}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <AnimatePresence>
              {messages.map((msg, index) => (
                <motion.div 
                  key={index} 
                  initial={{ opacity: 0, y: 20, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} w-full`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center mr-3 mt-1 shrink-0 shadow-lg shadow-indigo-500/20">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                  )}
                  
                  <div className={`max-w-[90%] md:max-w-[80%] lg:max-w-[70%] p-5 text-[15px] leading-relaxed shadow-xl ${
                    msg.role === 'user' 
                      ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white shadow-indigo-600/20 rounded-3xl rounded-tr-sm' 
                      : 'bg-slate-900/80 backdrop-blur-xl border border-white/10 text-slate-200 rounded-3xl rounded-tl-sm'
                  }`}>
                    {msg.role === 'assistant' ? (
                      parseToCards(msg.content)
                    ) : (
                      <p className="m-0 font-medium">{msg.content}</p>
                    )}
                  </div>

                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center ml-3 mt-1 shrink-0 border border-slate-700">
                      <UserIcon className="w-4 h-4 text-slate-300" />
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
            
            {loading && (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex justify-start"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center mr-3 mt-1 shrink-0 shadow-lg shadow-indigo-500/20">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div className="glass-card px-5 py-4 rounded-3xl rounded-tl-sm flex gap-2 items-center h-[52px] bg-slate-900/80">
                  <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
                  <span className="text-slate-400 text-sm font-medium">Layla is thinking...</span>
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Form */}
          <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent pt-12 z-20">
            
            <form onSubmit={handleSend} className="relative max-w-4xl mx-auto group">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-2xl blur-xl opacity-50 group-hover:opacity-100 transition-opacity duration-500"></div>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask for an itinerary, food spots, or budget..."
                className="relative w-full bg-slate-900/90 border border-slate-700/80 rounded-2xl py-4 pl-6 pr-14 text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500/80 focus:ring-2 focus:ring-indigo-500/20 shadow-2xl transition-all font-medium"
                disabled={loading}
              />
              <button 
                type="submit" 
                disabled={loading || !input.trim()}
                className="absolute right-2 top-2 bottom-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-xl w-12 h-12 flex items-center justify-center transition-all disabled:cursor-not-allowed group/btn"
              >
                <Send className="w-5 h-5 ml-0.5 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
              </button>
            </form>
          </div>
        </div>

        {/* RIGHT COLUMN: Interactive Destination Card Board */}
        <AnimatePresence>
          {activePlace && (
            <motion.div
              initial={{ opacity: 0, x: 200 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 200 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="w-full md:w-5/12 lg:w-4/12 h-full overflow-y-auto bg-slate-950/60 p-6 space-y-6 z-10 border-l border-white/5 relative"
            >
              {/* Close Button to hide visual card */}
              <button 
                onClick={() => setActivePlace(null)}
                className="absolute top-4 right-4 z-30 p-2 rounded-full bg-slate-900/80 border border-white/10 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                title="Close Visual Guide"
              >
                &times;
              </button>

              {/* 1. Real Place Image Gallery Grid */}
              <div className="space-y-3 mt-4">
                <div className="flex items-center justify-between pl-1">
                  <span className="text-[9px] uppercase font-black tracking-widest text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/30 backdrop-blur">
                    Real Place Gallery
                  </span>
                  <div className="bg-amber-500/20 backdrop-blur border border-amber-500/40 px-2.5 py-0.5 rounded-lg flex items-center gap-1 shadow">
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    <span className="font-bold text-xs text-amber-200">{activePlace.rating || '4.8'}</span>
                  </div>
                </div>

                {/* Hero Image */}
                {activePlace.images && activePlace.images.length > 0 && (
                  <div className="relative h-[210px] w-full rounded-2xl overflow-hidden shadow-2xl border border-white/5 group/hero">
                    <img
                      src={activePlace.images[activeImageIndex].url}
                      alt={activePlace.images[activeImageIndex].caption}
                      className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-black/30"></div>
                    
                    {/* Favorite Heart Trigger */}
                    <button
                      onClick={() => toggleFavorite(activePlace.place_name)}
                      className="absolute top-3 right-3 p-2 rounded-full bg-black/40 hover:bg-pink-500/20 backdrop-blur border border-white/10 text-white transition-all shadow-lg"
                    >
                      <Heart className={`w-4.5 h-4.5 transition-transform hover:scale-110 ${
                        favorites.includes(activePlace.place_name) ? 'fill-pink-500 text-pink-500' : 'text-slate-200'
                      }`} />
                    </button>

                    {/* Caption Overlay */}
                    <div className="absolute bottom-3.5 left-4 right-4">
                      <span className="text-[8px] uppercase tracking-wider text-indigo-300 font-black bg-black/50 px-2 py-0.5 rounded border border-white/5">Featured View</span>
                      <p className="text-white text-sm font-bold mt-1.5 drop-shadow truncate">
                        {activePlace.images[activeImageIndex].caption}
                      </p>
                    </div>
                  </div>
                )}

                {/* Supporting Thumbnails */}
                {activePlace.images && activePlace.images.length > 1 && (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    {activePlace.images.map((img, idx) => (
                      <div
                        key={idx}
                        onClick={() => setActiveImageIndex(idx)}
                        className={`relative h-[85px] rounded-xl overflow-hidden cursor-pointer border transition-all ${
                          idx === activeImageIndex 
                            ? 'border-indigo-500 ring-2 ring-indigo-500/20 scale-[0.98]' 
                            : 'border-white/5 hover:border-white/20'
                        }`}
                      >
                        <img
                          src={img.url}
                          alt={img.caption}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80"></div>
                        <div className="absolute bottom-1.5 left-2 right-2">
                          <p className="text-[10px] text-slate-100 font-bold truncate leading-tight drop-shadow">
                            {img.caption}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Destination Header Title & PDF / Share Buttons */}
              <div className="pl-1 py-1 space-y-3">
                <div>
                  <span className="text-[9px] uppercase font-black tracking-widest text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-full border border-blue-500/30">Destination</span>
                  <h2 className="text-2xl font-black font-outfit mt-2 text-white tracking-tight">
                    {activePlace.place_name}
                  </h2>
                </div>

                {/* Export & Collaboration Controls */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleSharePlan}
                    className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-900 border border-white/5 hover:border-indigo-500/30 hover:bg-indigo-500/10 text-slate-200 font-bold text-xs shadow-md transition-all group"
                    title="Share Travel Plan"
                  >
                    <span className="text-xs group-hover:scale-110 transition-transform">📤</span> Share Plan
                  </button>
                  <button
                    onClick={handleDownloadPDF}
                    className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-900 border border-white/5 hover:border-purple-500/30 hover:bg-purple-500/10 text-slate-200 font-bold text-xs shadow-md transition-all group"
                    title="Download Booklet PDF"
                  >
                    <span className="text-xs group-hover:scale-110 transition-transform">📄</span> Download PDF
                  </button>
                </div>
              </div>

              {/* AI Explanation Card ("Why this Itinerary?") */}
              <div className="glass-card p-5 bg-indigo-950/20 border-indigo-500/10 space-y-3 hover:border-indigo-500/25 transition-all">
                <div className="flex items-center gap-2 text-indigo-400 font-bold font-outfit uppercase text-[10px] tracking-wider">
                  <Sparkles className="w-4 h-4 text-indigo-400" /> Why this Itinerary?
                </div>
                <p className="text-slate-300 leading-relaxed font-normal text-xs lg:text-sm italic">
                  "{activePlace.why_this_plan || `We customized this plan based on your requested parameters, optimizing the physical distance to avoid excessive travel overhead.`}"
                </p>
              </div>

              {/* Extra Smart Insights Micro-Card Grid */}
              <div className="grid grid-cols-2 gap-3 pl-1">
                <div className="glass-card p-3 bg-slate-900/50 border-white/5 flex flex-col justify-center">
                  <span className="text-[8px] uppercase font-black tracking-wider text-slate-400">⏳ Suggested Duration</span>
                  <span className="font-bold text-slate-200 text-xs mt-0.5">{activePlace.suggested_duration || '5-7 Days'}</span>
                </div>
                <div className="glass-card p-3 bg-slate-900/50 border-white/5 flex flex-col justify-center">
                  <span className="text-[8px] uppercase font-black tracking-wider text-slate-400">💵 Currency Used</span>
                  <span className="font-bold text-slate-200 text-xs mt-0.5">{activePlace.currency || 'Local Currency'}</span>
                </div>
                <div className="glass-card p-3 bg-slate-900/50 border-white/5 flex flex-col justify-center">
                  <span className="text-[8px] uppercase font-black tracking-wider text-slate-400">🗣️ Local Language</span>
                  <span className="font-bold text-slate-200 text-xs mt-0.5">{activePlace.local_language || 'Local Language'}</span>
                </div>
                <div className="glass-card p-3 bg-slate-900/50 border-white/5 flex flex-col justify-center">
                  <span className="text-[8px] uppercase font-black tracking-wider text-slate-400">🌐 Time Zone</span>
                  <span className="font-bold text-slate-200 text-xs mt-0.5">{activePlace.timezone || 'Local UTC'}</span>
                </div>
              </div>

              {/* Extra Smart Suitability Sliders Dashboard */}
              <div className="glass-card p-5 bg-slate-900/40 border-white/5 space-y-4 hover:border-indigo-500/15 transition-all">
                <div className="flex items-center gap-2 text-indigo-400 font-bold font-outfit uppercase text-[10px] tracking-wider">
                  <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" /> Travel Suitability Match
                </div>
                <div className="space-y-3.5">
                  {/* Solo Travel Score */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-300 font-bold">Solo-Travel Match</span>
                      <span className="text-indigo-300 font-black">{activePlace.solo_travel_score || 8}/10</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-955 rounded-full overflow-hidden border border-white/5">
                      <div 
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-1000" 
                        style={{ width: `${(activePlace.solo_travel_score || 8) * 10}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  {/* Family Friendly Score */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-300 font-bold">Family-Friendly Score</span>
                      <span className="text-emerald-300 font-black">{activePlace.family_friendly_score || 8}/10</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-955 rounded-full overflow-hidden border border-white/5">
                      <div 
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-1000" 
                        style={{ width: `${(activePlace.family_friendly_score || 8) * 10}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Adventure Score */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-300 font-bold">Adventure & Action</span>
                      <span className="text-rose-300 font-black">{activePlace.adventure_score || 7}/10</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-955 rounded-full overflow-hidden border border-white/5">
                      <div 
                        className="h-full bg-gradient-to-r from-rose-500 to-pink-500 rounded-full transition-all duration-1000" 
                        style={{ width: `${(activePlace.adventure_score || 7) * 10}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dynamic Budget intelligence Card */}
              <div className="glass-card p-5 bg-slate-900/40 border-white/5 space-y-4 hover:border-emerald-500/15 transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold font-outfit uppercase text-[10px] tracking-wider">
                    <Wallet className="w-4 h-4 text-emerald-400 animate-pulse" /> Budget Intelligence
                  </div>
                  <span className="bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-0.5 rounded text-emerald-300 font-black text-[10px]">
                    {budget.category || 'Mid-Range'}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 pb-2 border-b border-white/5">
                  <div>
                    <span className="text-[9px] uppercase font-black text-slate-400 block tracking-wider">Total Est. Cost</span>
                    <span className="text-base font-black text-slate-100">{budget.total_est || '$700 - $1100'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-black text-slate-400 block tracking-wider">Avg. Cost / Day</span>
                    <span className="text-base font-black text-slate-100">{budget.daily_avg || '$130/day'}</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <span className="text-[9px] uppercase font-black text-slate-400 block tracking-wider">💡 Cost-Saving Tips:</span>
                  <div className="space-y-1.5">
                    {(budget.cost_saving_tips || [
                      "Purchase a local multi-sight sightseeing transit pass.",
                      "Seek out street food markets and small local eateries.",
                      "Utilize highly developed subway and bus transit options."
                    ]).map((tip, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                        <span className="text-emerald-400 shrink-0 font-bold">•</span>
                        <span>{tip}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Dynamic Timeline Itinerary (Morning, Afternoon, Evening, Night) */}
              <div className="space-y-4 pl-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-blue-400 font-bold font-outfit uppercase text-[10px] tracking-wider">
                    <Calendar className="w-4 h-4 text-blue-400" /> Timeline Itinerary
                  </div>
                  <span className="text-[9px] uppercase font-bold text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-white/5">
                    Structured Day Plan
                  </span>
                </div>
                
                <div className="space-y-6">
                  {timeline.map((day, idx) => (
                    <div key={idx} className="relative pl-6 border-l-2 border-indigo-500/20 last:border-l-0 pb-1">
                      {/* Timeline Dot Indicator */}
                      <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                        <span className="text-[8px] font-black text-white">{day.day_number || (idx + 1)}</span>
                      </div>
                      
                      <div className="glass-card p-4 bg-slate-900/40 border-white/5 space-y-3 hover:border-indigo-500/10 transition-all">
                        <h4 className="font-bold text-slate-100 text-sm font-outfit tracking-wide flex items-center gap-2">
                          Day {day.day_number || (idx + 1)}: <span className="text-indigo-400 font-semibold">{day.theme || 'Exploration'}</span>
                        </h4>
                        
                        <div className="space-y-3 text-xs text-slate-300">
                          {/* Morning */}
                          <div className="flex gap-2.5 items-start">
                            <span className="bg-amber-500/15 border border-amber-500/20 text-amber-300 text-[8px] uppercase font-black px-1.5 py-0.5 rounded shrink-0 w-16 text-center mt-0.5">🌅 Morning</span>
                            <span className="leading-relaxed">{day.morning}</span>
                          </div>

                          {/* Afternoon */}
                          <div className="flex gap-2.5 items-start">
                            <span className="bg-blue-500/15 border border-blue-500/20 text-blue-300 text-[8px] uppercase font-black px-1.5 py-0.5 rounded shrink-0 w-16 text-center mt-0.5">☀️ Afternoon</span>
                            <span className="leading-relaxed">{day.afternoon}</span>
                          </div>

                          {/* Evening */}
                          <div className="flex gap-2.5 items-start">
                            <span className="bg-orange-500/15 border border-orange-500/20 text-orange-300 text-[8px] uppercase font-black px-1.5 py-0.5 rounded shrink-0 w-16 text-center mt-0.5">🌇 Evening</span>
                            <span className="leading-relaxed">{day.evening}</span>
                          </div>

                          {/* Night */}
                          <div className="flex gap-2.5 items-start">
                            <span className="bg-indigo-500/15 border border-indigo-500/20 text-indigo-300 text-[8px] uppercase font-black px-1.5 py-0.5 rounded shrink-0 w-16 text-center mt-0.5">🌙 Night</span>
                            <span className="leading-relaxed">{day.night}</span>
                          </div>
                          
                          {/* Culinary Suggestion */}
                          {day.food_recommendation && (
                            <div className="pt-2 border-t border-white/5 flex gap-2 items-center text-[11px] text-slate-400 italic">
                              <span>🍽️ Food:</span>
                              <span className="text-slate-300 font-medium">{day.food_recommendation}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2. Engaging Place Description */}
              <div className="glass-card p-5 bg-slate-900/40 border-white/5 space-y-3 hover:border-indigo-500/15 transition-all">
                <div className="flex items-center gap-2 text-indigo-400 font-bold font-outfit uppercase text-[10px] tracking-wider">
                  <Award className="w-4 h-4" /> About the Place
                </div>
                <p className="text-slate-300 leading-relaxed font-normal text-xs lg:text-sm">
                  {activePlace.description}
                </p>
              </div>

              {/* 3. Top Attractions Cards List */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-blue-400 font-bold font-outfit uppercase text-[10px] tracking-wider pl-1">
                  <Navigation className="w-4 h-4" /> Top Attractions
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {activePlace.attractions && activePlace.attractions.map((attr, idx) => (
                    <div
                      key={idx}
                      className="glass-card p-3 bg-slate-900/50 border-white/5 hover:border-blue-500/15 transition-all flex items-center gap-2.5"
                    >
                      <div className="w-6 h-6 rounded bg-blue-500/10 flex items-center justify-center text-blue-400 shrink-0 font-bold text-xs">
                        {idx + 1}
                      </div>
                      <span className="font-semibold text-slate-200 text-xs truncate" title={attr}>{attr}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Extra Smart Local Culinary & Experiences Card */}
              <div className="glass-card p-5 bg-slate-900/40 border-white/5 space-y-4 hover:border-orange-500/15 transition-all">
                <div className="flex items-center gap-2 text-orange-400 font-bold font-outfit uppercase text-[10px] tracking-wider">
                  <Coffee className="w-4 h-4 text-orange-400" /> Culinary & Top Experiences
                </div>
                
                <div className="space-y-3.5">
                  {/* Famous Foods */}
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-black block mb-2 tracking-wider">Famous Foods to Try</span>
                    <div className="flex flex-wrap gap-2">
                      {(activePlace.famous_foods || ["Local Specialities", "Street Food"]).map((food, idx) => (
                        <span key={idx} className="bg-orange-500/10 border border-orange-500/25 px-2.5 py-1 rounded-full text-orange-300 font-bold text-xs flex items-center gap-1">
                          🍴 {food}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  {/* Top Activities */}
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-black block mb-2 tracking-wider">Top Activities</span>
                    <div className="flex flex-wrap gap-2">
                      {(activePlace.top_activities || ["Sightseeing", "Guided Tours"]).map((act, idx) => (
                        <span key={idx} className="bg-indigo-500/10 border border-indigo-500/25 px-2.5 py-1 rounded-full text-indigo-300 font-bold text-xs flex items-center gap-1">
                          🧗 {act}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Budget Estimate Indicator */}
                  <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                    <span className="text-[9px] text-slate-400 uppercase font-black tracking-wider">Travel Budget Estimate</span>
                    <span className="bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-0.5 rounded text-emerald-300 font-black text-xs">
                      {activePlace.budget_estimate || 'Moderate'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 4. Interactive Google Map Location embedded beautifully */}
              <div className="glass-card p-5 bg-slate-900/40 border-white/5 space-y-3 hover:border-indigo-500/15 transition-all">
                <div className="flex items-center gap-2 text-indigo-400 font-bold font-outfit uppercase text-[10px] tracking-wider">
                  <Globe className="w-4 h-4 text-indigo-400" /> Interactive Location Map
                </div>
                <div className="w-full h-[180px] rounded-xl overflow-hidden border border-white/10 shadow-lg bg-slate-950 relative">
                  <iframe
                    title="Live Location Map"
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    src={`https://maps.google.com/maps?q=${encodeURIComponent(activePlace.place_name)}&t=&z=13&ie=UTF8&iwloc=&output=embed`}
                    allowFullScreen
                    loading="lazy"
                    className="grayscale opacity-80 hover:grayscale-0 hover:opacity-100 transition-all duration-500"
                  ></iframe>
                </div>
              </div>

              {/* 5. Best Time to Visit Weather Card */}
              <div className="glass-card p-5 bg-slate-900/40 border-white/5 space-y-3 hover:border-emerald-500/15 transition-all">
                <div className="flex items-center gap-2 text-emerald-400 font-bold font-outfit uppercase text-[10px] tracking-wider">
                  <Calendar className="w-4 h-4" /> Best Time to Visit
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-center">
                  <p className="text-emerald-300 font-semibold text-xs leading-snug">
                    {activePlace.best_time}
                  </p>
                </div>
              </div>

              {/* 6. Travel Tips Panel */}
              <div className="glass-card p-5 bg-slate-900/40 border-white/5 space-y-3 hover:border-purple-500/15 transition-all">
                <div className="flex items-center gap-2 text-purple-400 font-bold font-outfit uppercase text-[10px] tracking-wider">
                  <Info className="w-4 h-4" /> Travel Tips
                </div>
                <div className="space-y-2.5">
                  {activePlace.tips && activePlace.tips.map((tip, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                      <CheckSquare className="w-3.5 h-3.5 text-purple-400 mt-0.5 shrink-0" />
                      <span>{tip}</span>
                    </div>
                  ))}
                </div>
              </div>

            </motion.div>
          )}
        </AnimatePresence>

      </main>
    </div>
  );
};

export default Chatbot;
