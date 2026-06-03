import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Map, Calendar, Wallet, Heart, ArrowRight, MapPin, Search, Compass, LogOut, Sparkles } from 'lucide-react';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [trips, setTrips] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const [tripsRes, favsRes] = await Promise.all([
        api.get('/get-trips'),
        api.get('/get-favorites')
      ]);
      setTrips(tripsRes.data);
      setFavorites(favsRes.data);
    } catch (error) {
      toast.error('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const toggleFavorite = async (destination) => {
    try {
      const isFav = favorites.some(f => f.destination === destination);
      if (isFav) {
        await api.post('/remove-favorite', { destination });
        toast.success(`Removed ${destination} from favorites`);
      } else {
        await api.post('/add-favorite', { destination });
        toast.success(`Added ${destination} to favorites`);
      }
      fetchDashboardData(); // Refresh list
    } catch (error) {
      toast.error('Failed to update favorite status');
    }
  };

  return (
    <div className="min-h-screen bg-bgDark bg-fixed" style={{ backgroundImage: 'radial-gradient(circle at top right, #1e293b, #0f172a)' }}>
      <nav className="glass-card sticky top-0 z-50 rounded-none border-t-0 border-l-0 border-r-0 px-6 py-4 flex justify-between items-center bg-bgDark/80 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Compass className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-gradient font-outfit">Layla AI</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 mr-4 bg-indigo-500/10 px-4 py-2 rounded-lg border border-indigo-500/20">
            <span className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center font-bold text-white shadow-lg">
              {user?.username?.charAt(0).toUpperCase()}
            </span>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-white leading-tight">{user?.username}</span>
              {user?.email && <span className="text-xs text-slate-400 leading-tight">{user.email}</span>}
            </div>
          </div>
          <button onClick={logout} className="flex items-center gap-2 text-sm text-slate-300 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-3 py-2 rounded-lg">
            <LogOut className="w-4 h-4" />
            <span className="hidden md:inline">Log Out</span>
          </button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-10">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <h2 className="text-3xl font-bold font-outfit text-white">Your Dashboard</h2>
          <div className="flex gap-4">
            <Link to="/multi-destination" className="btn-outline w-auto px-6 flex items-center gap-2 border-purple-500 text-purple-300 hover:bg-purple-500/20 hover:text-white bg-bgDark/50 backdrop-blur-md">
              <Map className="w-5 h-5" /> Multi-City Route
            </Link>
            <Link to="/chatbot" className="btn-primary w-auto px-6 shadow-indigo-500/30 shadow-lg flex items-center gap-2 relative overflow-hidden group">
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out"></div>
              <Sparkles className="w-5 h-5 relative z-10" /> <span className="relative z-10">Create New Trip</span>
            </Link>
          </div>
        </motion.div>

        <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="mb-12">
          <h3 className="text-xl font-semibold mb-6 flex items-center gap-2 text-slate-200">
            <Heart className="w-5 h-5 text-pink-500 fill-pink-500" /> Favorite Destinations
          </h3>
          {loading ? null : favorites.length === 0 ? (
            <div className="glass-card p-6 text-center text-slate-400 border border-white/5">
              You have no favorite destinations yet. Click the ❤️ on any of your saved trips!
            </div>
          ) : (
            <div className="flex flex-wrap gap-4">
              {favorites.map((fav) => (
                <motion.div whileHover={{ scale: 1.05 }} key={fav.id} className="glass-card px-4 py-3 flex items-center gap-3 hover:border-pink-500/50 transition-colors shadow-lg cursor-default bg-slate-800/50">
                  <MapPin className="w-4 h-4 text-pink-400" />
                  <span className="font-medium text-white">{fav.destination}</span>
                  <button 
                    onClick={() => toggleFavorite(fav.destination)}
                    className="text-pink-500 hover:text-pink-400 transition-colors ml-2 hover:scale-110 focus:outline-none"
                    title="Remove from favorites"
                  >
                    <Heart className="w-4 h-4 fill-pink-500" />
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </motion.section>

        <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          <h3 className="text-xl font-semibold mb-6 flex items-center gap-2 text-slate-200">
            <Compass className="w-5 h-5 text-indigo-400" /> Saved Adventures
          </h3>
          
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
          ) : trips.length === 0 ? (
            <div className="glass-card text-center py-16 px-4 border border-white/5 bg-slate-800/30">
              <Compass className="w-16 h-16 text-indigo-500/50 mx-auto mb-4" />
              <h4 className="text-xl font-medium text-white mb-2">No trips saved yet</h4>
              <p className="text-slate-400 mb-6 max-w-md mx-auto">
                You haven't planned any adventures with Layla yet. Start chatting to create your first dream itinerary!
              </p>
              <Link to="/chatbot" className="btn-outline w-auto px-6 inline-block">
                Start Planning
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {trips.map((trip, index) => (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  key={trip.id || trip._id} 
                  className="glass-card p-6 group hover:border-indigo-500/50 transition-all duration-300 relative overflow-hidden bg-slate-800/60 backdrop-blur-md"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-indigo-500/20 to-transparent rounded-bl-full -mr-4 -mt-4 z-0 group-hover:scale-110 transition-transform duration-500"></div>
                  
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-4">
                      <h4 className="text-xl font-bold text-white flex items-start gap-2 leading-tight">
                        <MapPin className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" /> {trip.destination}
                      </h4>
                      <button 
                        onClick={() => toggleFavorite(trip.destination)}
                        className="text-xl transition-transform hover:scale-110 focus:outline-none p-1"
                        title={favorites.some(f => f.destination === trip.destination) ? "Remove from favorites" : "Add to favorites"}
                      >
                        {favorites.some(f => f.destination === trip.destination) ? (
                          <Heart className="w-5 h-5 text-pink-500 fill-pink-500" />
                        ) : (
                          <Heart className="w-5 h-5 text-slate-400 hover:text-pink-400" />
                        )}
                      </button>
                    </div>
                    
                    <div className="flex flex-col gap-3 mb-6 text-sm">
                      <div className="flex items-center gap-3 text-slate-300 bg-slate-900/50 px-3 py-2 rounded-lg border border-white/5">
                        <Wallet className="w-4 h-4 text-emerald-400" />
                        <span className="font-medium text-slate-200">{trip.budget || 'Standard'}</span>
                      </div>
                      <div className="flex items-center gap-3 text-slate-300 bg-slate-900/50 px-3 py-2 rounded-lg border border-white/5">
                        <Calendar className="w-4 h-4 text-blue-400" />
                        <span className="text-slate-300">
                          {new Date(trip.created_at).toLocaleDateString(undefined, {
                            year: 'numeric', month: 'short', day: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>
                    
                    <Link 
                      to={`/chatbot?load=${trip.id || trip._id}`} 
                      className="mt-2 flex items-center justify-center gap-2 w-full bg-white/5 hover:bg-indigo-500/20 border border-white/10 hover:border-indigo-500 text-sm font-medium py-2.5 rounded-lg transition-colors group/btn"
                    >
                      <Search className="w-4 h-4 text-indigo-300 group-hover/btn:text-indigo-400" /> View Itinerary
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.section>
      </main>
    </div>
  );
};

export default Dashboard;
