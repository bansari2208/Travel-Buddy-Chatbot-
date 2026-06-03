import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Compass, User, Lock } from 'lucide-react';

const Login = () => {
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await api.post('/login', formData);
      login(response.data.access_token, { username: response.data.username });
      toast.success('Successfully logged in!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = () => {
    toast.success('Continuing as guest');
    navigate('/guest/chatbot');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-bgDark bg-fixed" style={{ backgroundImage: 'radial-gradient(circle at top right, #1e293b, #0f172a)' }}>
      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="glass-card w-full max-w-md p-8 relative overflow-hidden bg-slate-800/80 backdrop-blur-xl border border-white/10 shadow-2xl shadow-indigo-500/10"
      >
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl"></div>
        
        <div className="text-center mb-8 relative z-10">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Compass className="w-8 h-8 text-white" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-gradient font-outfit mb-2 tracking-tight">Welcome Back</h2>
          <p className="text-slate-400 text-sm font-medium">Sign in to Layla AI Travel Buddy</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="label-text" htmlFor="username">Username or Email</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="input-field"
              placeholder="johndoe"
              required
            />
          </div>

          <div>
            <label className="label-text" htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="input-field"
              placeholder="••••••••"
              required
            />
          </div>

          <button 
            type="submit" 
            className="btn-primary flex justify-center items-center h-11"
            disabled={loading}
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
            ) : (
              'Sign In'
            )}
          </button>
        </form>
        
        <div className="mt-6 flex items-center justify-between">
          <span className="border-b border-slate-700 w-1/5 lg:w-1/4"></span>
          <span className="text-xs text-center text-slate-500 uppercase">Or</span>
          <span className="border-b border-slate-700 w-1/5 lg:w-1/4"></span>
        </div>
        
        <div className="mt-6">
           <button onClick={handleGuest} className="btn-outline w-full flex justify-center items-center h-11 text-sm">
             Continue as Guest
           </button>
        </div>

        <p className="mt-8 text-center text-sm text-slate-400">
          Don't have an account?{' '}
          <Link to="/register" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
            Create one
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default Login;
