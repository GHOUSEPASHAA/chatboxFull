
import React from 'react';

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-r from-blue-500 to-purple-600 flex flex-col items-center justify-center text-white">
      <header className="text-center">
        <h1 className="text-6xl font-bold mb-4">EINFRATECH</h1>
        <h2 className="text-4xl font-semibold mb-8">SYSTEMS</h2>
        <h3 className="text-5xl font-bold mb-6">CHATBOX</h3>
        <p className="text-xl mb-8">Einfratech is the most trusted and fast chat box</p>
      </header>
      <div className="flex space-x-4">
        <button className="bg-white text-blue-600 font-semibold py-2 px-6 rounded-lg shadow-lg hover:bg-gray-100 transition duration-300">
          Sign Up
        </button>
        <button className="bg-transparent border border-white text-white font-semibold py-2 px-6 rounded-lg shadow-lg hover:bg-white hover:text-blue-600 transition duration-300">
          Sign In
        </button>
      </div>
    </div>
  );
};

export default LandingPage;