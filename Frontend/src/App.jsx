import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Home from "./Home";
import SignIn from "./SignIn";
import SignUp from "./SignUp";
import Message from "./Message";
import ProfilePage from "./ProfilePage";
import Settings from "./Settings"; // Import Settings

const App = () => {
  const [authState, setAuthState] = useState({
    token: localStorage.getItem('token') || null,
    privateKey: localStorage.getItem('privateKey') || null,
    isAuthenticated: !!localStorage.getItem('token'),
    isLoading: false,
    error: null
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false); // Add state for Settings modal

  useEffect(() => {
    console.log('App mounted', {
      token: authState.token,
      privateKey: authState.privateKey ? 'Present' : 'Not present',
      isAuthenticated: authState.isAuthenticated
    });
    const token = localStorage.getItem('token');
    if (!token) {
      setAuthState(prev => ({ ...prev, isAuthenticated: false }));
    }
  }, []);

  const updateAuth = (updates) => {
    setAuthState(prev => {
      const newState = { ...prev, ...updates };
      console.log('Auth state updated:', {
        token: newState.token,
        privateKey: newState.privateKey ? 'Present' : 'Not present',
        isAuthenticated: newState.isAuthenticated
      });
      return newState;
    });
  };

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route 
          path="/" 
          element={<Home authState={authState} updateAuth={updateAuth} />} 
        />
        <Route 
          path="/signin" 
          element={<SignIn authState={authState} updateAuth={updateAuth} />} 
        />
        <Route 
          path="/signup" 
          element={<SignUp authState={authState} updateAuth={updateAuth} />} 
        />

        {/* Protected Routes */}
        <Route 
          path="/profile" 
          element={
            authState.isAuthenticated ? (
              <ProfilePage token={authState.token} />
            ) : (
              <Navigate to="/signin" replace />
            )
          } 
        />
        <Route 
          path="/chat" 
          element={
            authState.isAuthenticated ? (
              <Message token={authState.token} privateKey={authState.privateKey} />
            ) : (
              <Navigate to="/signin" replace />
            )
          } 
        />

        {/* Catch-all route */}
        <Route 
          path="*" 
          element={<Navigate to="/" replace />} 
        />
      </Routes>

      {/* Settings Modal - Rendered globally */}
      {authState.isAuthenticated && (
        <Settings 
          token={authState.token}
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          updateAuth={updateAuth} // Pass updateAuth instead of setToken
        />
      )}
    </Router>
  );
};

export default App;