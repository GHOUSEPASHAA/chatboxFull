import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import axios from "axios";

export default function SignIn({ authState, updateAuth }) {
  const [form, setForm] = useState({ email: "", password: "" });
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      updateAuth({ isLoading: true, error: null });
      const res = await axios.post('http://localhost:3000/api/login', {
        email: form.email,
        password: form.password
      });
      const { token, privateKey } = res.data;

      localStorage.setItem('token', token);
      localStorage.setItem('privateKey', privateKey);
      updateAuth({ 
        token, 
        privateKey, 
        isLoading: false,
        isAuthenticated: true
      });
      
      console.log('Login successful, token:', token);
      navigate("/profile");
    } catch (error) {
      updateAuth({ 
        isLoading: false,
        error: error.response?.data?.message || error.message 
      });
      console.error('Login error:', error.response?.data || error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center bg-cover bg-center p-4"
      >
      <div className="absolute top-4 left-4 sm:top-6 sm:left-6">
        <Link 
          to="/" 
          className="flex items-center text-gray-600 hover:text-gray-900 transition-colors duration-200"
        >
          <ArrowLeft className="w-5 h-5 mr-2" /> Back
        </Link>
      </div>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 sm:p-8">
        <div className="flex flex-col items-center space-y-4">
          <img
            src="logo.png"
            alt="Einfratech logo"
            className="w-16 h-16 sm:w-20 sm:h-20 transition-transform duration-300 hover:scale-110"
          />
          <div className="text-center">
            <h1 className="font-serif text-xl sm:text-2xl font-bold text-red-600 hover:text-red-700 transition duration-300">
              EINFTRATECH
            </h1>
            <h1 className="font-serif text-xl sm:text-2xl font-bold text-blue-800 hover:text-blue-700 transition duration-300">
              SYSTEMS
            </h1>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-blue-800 hover:text-blue-700 transition duration-300 mt-2">
              Sign In
            </h2>
          </div>

          {authState.error && (
            <p className="text-red-500 text-sm text-center max-w-xs">{authState.error}</p>
          )}

          <form onSubmit={handleSubmit} className="w-full space-y-5">
            <div className="space-y-4">
              <input 
                type="email" 
                name="email" 
                placeholder="Email" 
                value={form.email} 
                onChange={handleChange} 
                required 
                disabled={authState.isLoading}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:opacity-50"
              />
              <input 
                type="password" 
                name="password" 
                placeholder="Password" 
                value={form.password} 
                onChange={handleChange} 
                required 
                disabled={authState.isLoading}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:opacity-50"
              />
            </div>
            <button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={authState.isLoading}
            >
              {authState.isLoading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-gray-600 text-sm">
            Don't have an account?{" "}
            <Link 
              to="/signup" 
              className="text-blue-600 hover:underline font-medium"
            >
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}