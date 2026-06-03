import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Map, Calendar, Navigation, Bus, Clock, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api';


export default function MultiDestination() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('Delhi to Manali to Kasol for 5 days');
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState(null);

  const handleGenerate = async () => {
    if (!query) {
      toast.error('Please enter a travel request');
      return;
    }

    setLoading(true);
    try {
      // Direct call to our new backend endpoint using the api client
      const response = await api.post('/api/plan-multi-destination', { query });
      setPlan(response.data);
      toast.success('Multi-destination plan generated!');
    } catch (error) {
      console.error(error);
      toast.error('Error generating plan. Is the backend running with the new router?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-8 max-w-5xl mx-auto">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center text-slate-400 hover:text-white mb-8 transition-colors"
      >
        <ArrowLeft className="w-5 h-5 mr-2" />
        Back
      </button>

      <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 p-8 rounded-3xl shadow-2xl mb-8">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
          Multi-Destination Planner
        </h1>
        <p className="text-slate-400 mb-8">
          Intelligently route, schedule, and optimize your journey across multiple cities.
        </p>

        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <input 
            type="text" 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. Delhi to Jaipur to Agra for 6 days"
            className="flex-1 bg-slate-900/50 border border-slate-700 rounded-xl px-6 py-4 text-white focus:outline-none focus:border-indigo-500 transition-colors"
          />
          <button 
            onClick={handleGenerate}
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-xl font-semibold transition-all disabled:opacity-50 flex items-center justify-center min-w-[160px]"
          >
            {loading ? (
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              'Generate Route'
            )}
          </button>
        </div>
      </div>

      {plan && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Stats & Route */}
          <div className="space-y-8">
            <div className="bg-slate-800/50 border border-slate-700/50 p-6 rounded-3xl">
              <h3 className="text-xl font-bold mb-4 flex items-center">
                <Map className="w-5 h-5 mr-2 text-indigo-400" />
                Trip Overview
              </h3>
              <div className="space-y-4 text-slate-300">
                <div className="flex justify-between items-center pb-4 border-b border-slate-700/50">
                  <span className="flex items-center"><Calendar className="w-4 h-4 mr-2" /> Total Days</span>
                  <span className="font-bold text-white">{plan.total_days}</span>
                </div>
                <div className="flex flex-col gap-2">
                  <span className="flex items-center"><Navigation className="w-4 h-4 mr-2" /> Optimized Sequence</span>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {plan.optimized_sequence?.map((city, idx) => (
                      <span key={idx} className="bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-lg text-sm border border-indigo-500/20">
                        {city}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700/50 p-6 rounded-3xl">
              <h3 className="text-xl font-bold mb-4 flex items-center">
                <Bus className="w-5 h-5 mr-2 text-purple-400" />
                Route Mapping
              </h3>
              <div className="space-y-6 text-slate-300">
                {plan.route_mapping?.map((route, idx) => (
                  <div key={idx} className="relative pl-6 border-l-2 border-slate-700">
                    <div className="absolute w-3 h-3 bg-purple-500 rounded-full -left-[7px] top-1" />
                    <h4 className="font-semibold text-white mb-1">
                      {route.from_city} → {route.to_city}
                    </h4>
                    <p className="text-sm flex items-center mb-1 text-slate-400">
                      <Clock className="w-3 h-3 mr-1" /> {route.estimated_time}
                    </p>
                    <p className="text-sm bg-slate-900/50 p-2 rounded-lg inline-block text-purple-300 border border-purple-500/20">
                      Suggestion: {route.suggested_transport}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Itinerary */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-2xl font-bold px-2 flex items-center">
              <MapPin className="w-6 h-6 mr-2 text-indigo-400" />
              Day-by-Day Itinerary
            </h2>
            {plan.itinerary?.map((day, idx) => (
              <div key={idx} className="bg-slate-800/50 border border-slate-700/50 p-6 rounded-3xl hover:border-indigo-500/30 transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-white">Day {day.day}</h3>
                  <span className="bg-indigo-600 px-3 py-1 rounded-full text-sm font-semibold">
                    {day.city}
                  </span>
                </div>
                
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Activities</h4>
                  <ul className="space-y-2">
                    {day.activities?.map((activity, actIdx) => (
                      <li key={actIdx} className="flex items-start text-slate-300">
                        <span className="text-indigo-400 mr-2">•</span>
                        {activity}
                      </li>
                    ))}
                  </ul>
                </div>
                
                {day.accommodation_suggestion && (
                  <div className="mt-4 pt-4 border-t border-slate-700/50">
                    <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-1">Accommodation</h4>
                    <p className="text-slate-300">{day.accommodation_suggestion}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
