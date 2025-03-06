import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import axios from "axios";

export default function SignUp({ authState, updateAuth }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      updateAuth({ error: "Passwords do not match!" });
      return;
    }

    try {
      updateAuth({ isLoading: true, error: null });
      const res = await axios.post("http://localhost:3000/api/signup", {
        name: form.name,
        email: form.email,
        password: form.password,
      });
      const { token, privateKey } = res.data;

      localStorage.setItem("token", token);
      localStorage.setItem("privateKey", privateKey);
      updateAuth({
        token,
        privateKey,
        isLoading: false,
      });

      console.log("Signup successful, token:", token);
      navigate("/signin");
    } catch (error) {
      updateAuth({
        isLoading: false,
        error: error.response?.data?.message || "An error occurred during signup",
      });
      console.error("Signup error:", error.response?.data || error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center bg-gray-100 p-4 sm:p-6 md:p-8 bg-cover bg-center"
      >
      <div className="absolute top-4 left-4 sm:top-6 sm:left-6">
        <Link
          to="/"
          className="flex items-center text-gray-600 hover:text-gray-900 transition-colors duration-200"
        >
          <ArrowLeft className="w-5 h-5 mr-2" /> Back
        </Link>
      </div>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 sm:p-8 transition-all duration-300">
        <div className="flex flex-col items-center">
          <img
            src="logo2.png"
            alt="Einfratech logo"
            className="w-16 h-16 sm:w-18 sm:h-18 mb-6 transition-transform duration-300 hover:scale-110"
          />
          <h2 className="text-2xl sm:text-3xl font-bold text-blue-800 hover:text-blue-700 transition-colors duration-300 font-serif mb-6">
            Sign Up
          </h2>

          {authState.error && (
            <p className="text-red-500 text-sm text-center mb-4">{authState.error}</p>
          )}

          <form onSubmit={handleSubmit} className="w-full space-y-4">
            <div>
              <input
                type="text"
                name="name"
                placeholder="Name"
                value={form.name}
                onChange={handleChange}
                required
                disabled={authState.isLoading}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 transition-all duration-200"
              />
            </div>
            <div>
              <input
                type="email"
                name="email"
                placeholder="Email"
                value={form.email}
                onChange={handleChange}
                required
                disabled={authState.isLoading}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 transition-all duration-200"
              />
            </div>
            <div>
              <input
                type="password"
                name="password"
                placeholder="Password"
                value={form.password}
                onChange={handleChange}
                required
                disabled={authState.isLoading}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 transition-all duration-200"
              />
            </div>
            <div>
              <input
                type="password"
                name="confirmPassword"
                placeholder="Confirm Password"
                value={form.confirmPassword}
                onChange={handleChange}
                required
                disabled={authState.isLoading}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 transition-all duration-200"
              />
            </div>
            <button
              type="submit"
              disabled={authState.isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg disabled:bg-blue-400 transition-all duration-200"
            >
              {authState.isLoading ? "Signing Up..." : "Sign Up"}
            </button>
          </form>

          <p className="text-center text-gray-600 mt-4 text-sm sm:text-base">
            Already have an account?{" "}
            <Link
              to="/signin"
              className="text-blue-600 hover:underline transition-colors duration-200"
            >
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}