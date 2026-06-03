import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Map, Sparkles, Compass, ShieldAlert, Coffee, Calendar } from 'lucide-react';

const Landing = () => {
  return (
    <div className="min-h-screen bg-slate-950 bg-fixed overflow-hidden" style={{ 
      backgroundImage: 'radial-gradient(circle at 15% 50%, rgba(79, 70, 229, 0.15), transparent 25%), radial-gradient(circle at 85% 30%, rgba(168, 85, 247, 0.15), transparent 25%)' 
    }}>
      {/* Navigation */}
      <nav className="glass-card sticky top-0 z-50 rounded-none border-t-0 border-l-0 border-r-0 px-6 py-4 flex justify-between items-center bg-slate-950/80 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Compass className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-gradient font-outfit">Layla AI</h1>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/login" className="text-sm text-slate-300 hover:text-white transition-colors font-medium">Log In</Link>
          <Link to="/register" className="btn-primary text-sm py-2 px-4 shadow-none">Sign Up</Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-4 pt-20 pb-32">
        <div className="text-center max-w-4xl mx-auto mb-20">
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm font-medium mb-8"
          >
            <Sparkles className="w-4 h-4" /> Next-Generation Travel AI
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold font-outfit text-white mb-6 leading-tight tracking-tight"
          >
            Your Personal AI <br className="hidden md:block"/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">Travel Architect</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed"
          >
            Stop wasting hours planning. Tell Layla where you want to go, and instantly get personalized itineraries, hidden gems, and structured travel plans in beautiful cards.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link to="/guest/chatbot" className="btn-primary text-lg px-8 py-4 w-full sm:w-auto shadow-indigo-500/25">
              Start Planning for Free
            </Link>
            <Link to="/login" className="btn-outline text-lg px-8 py-4 w-full sm:w-auto">
              View Your Dashboard
            </Link>
          </motion.div>
        </div>

        {/* Features Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              title: "Smart Itineraries",
              desc: "Day-by-day beautifully structured plans tailored to your budget and travel style.",
              icon: Calendar,
              color: "text-blue-400",
              bg: "bg-blue-500/10"
            },
            {
              title: "Curated Experiences",
              desc: "Handpicked hotels, food recommendations, and activities wrapped in a stunning UI.",
              icon: Coffee,
              color: "text-orange-400",
              bg: "bg-orange-500/10"
            },
            {
              title: "Travel with Confidence",
              desc: "Get essential safety tips, local transportation guides, and packing checklists.",
              icon: ShieldAlert,
              color: "text-emerald-400",
              bg: "bg-emerald-500/10"
            }
          ].map((feature, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ duration: 0.5, delay: 0.4 + (i * 0.1) }}
              className="glass-card p-8 bg-slate-900/40 hover:bg-slate-800/60 transition-colors border-white/5"
            >
              <div className={`w-12 h-12 rounded-2xl ${feature.bg} flex items-center justify-center mb-6`}>
                <feature.icon className={`w-6 h-6 ${feature.color}`} />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
              <p className="text-slate-400 leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Landing;
