// ProfilePage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { FaEdit } from 'react-icons/fa';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const ProfilePage = ({ token }) => {
  const [user, setUser] = useState({
    name: '',
    photo: 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png',
    designation: '',
    location: 'Hyderabad Office',
    status: 'Online',
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isProfileVisible, setIsProfileVisible] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const safeRender = (value, fallback = "Not specified") => {
    return value || fallback;
  };

  useEffect(() => {
    if (token) {
      fetchUserProfile();
    }
  }, [token]);

  const fetchUserProfile = async () => {
    try {
      const response = await axios.get('http://localhost:3000/api/users/me', {
        headers: { Authorization: token }
      });
      setUser(prev => ({
        ...prev,
        ...response.data,
        photo: response.data.photo || prev.photo
      }));
    } catch (error) {
      console.error('Error fetching profile:', error);
      addNotification('Failed to load profile');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setUser((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const formData = new FormData();
        formData.append('photo', file);
        
        const response = await axios.post('http://localhost:3000/api/upload/profile-photo', formData, {
          headers: { 
            Authorization: token,
            'Content-Type': 'multipart/form-data'
          }
        });

        setUser((prevState) => ({
          ...prevState,
          photo: response.data.url
        }));
        addNotification('Photo updated successfully');
      } catch (error) {
        console.error('Photo upload failed:', error);
        addNotification('Failed to update photo');
      }
    }
  };

  const toggleEditMode = async () => {
    if (isEditing) {
      try {
        await axios.put('http://localhost:3000/api/users/me', user, {
          headers: { Authorization: token }
        });
        addNotification('Profile updated successfully');
      } catch (error) {
        console.error('Error saving profile:', error);
        addNotification('Failed to save profile');
      }
    }
    setIsEditing(!isEditing);
  };

  const handleSkip = () => {
    setIsProfileVisible(false);
    navigate('/chat'); // Navigate to chat when skipping
  };

  const addNotification = (message) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, text: message }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Online': return 'bg-green-500';
      case 'Working': return 'bg-yellow-500';
      case 'Away': return 'bg-orange-500';
      case 'Offline': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  if (!isProfileVisible) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-500 to-purple-500 p-4">
      <div className="w-full max-w-md bg-white p-6 rounded-2xl shadow-xl relative">
        {/* Skip Button */}
        <button
          className="absolute top-4 right-4 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 cursor-pointer"
          onClick={handleSkip}
        >
          Skip
        </button>

        {/* Profile Section */}
        <div className="text-center mb-6 relative">
          <div className="relative inline-block">
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handlePhotoChange}
              className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
              disabled={!isEditing}
            />
            <div className="relative w-24 h-24 mx-auto">
              <img
                src={user.photo}
                alt="Profile"
                className="w-24 h-24 rounded-full mx-auto border-4 border-white shadow-lg object-cover"
              />
              <div
                className={`absolute bottom-1 right-1 w-5 h-5 rounded-full border-2 border-white ${getStatusColor(user.status)}`}
              ></div>
              {isEditing && (
                <FaEdit
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-2 right-2 text-white bg-gray-700 rounded-full p-1 cursor-pointer shadow-md hover:bg-gray-800"
                  size={18}
                />
              )}
            </div>
          </div>

          {isEditing ? (
            <input
              type="text"
              name="name"
              value={user.name}
              onChange={handleChange}
              placeholder="Enter Name"
              className="mt-3 text-xl font-semibold text-gray-800 text-center w-full border-b-2 border-gray-300 focus:outline-none focus:border-indigo-500"
            />
          ) : (
            <h2 className="mt-3 text-xl font-semibold text-gray-800">
              {safeRender(user.name)}
            </h2>
          )}
          <p className="text-sm text-gray-600">{safeRender(user.status)}</p>
        </div>

        {/* Employee Details */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">EMPLOYEE DETAILS</h3>
          <div className="mt-2 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Designation</span>
              {isEditing ? (
                <input
                  type="text"
                  name="designation"
                  value={user.designation}
                  onChange={handleChange}
                  placeholder="Enter Designation"
                  className="text-sm text-gray-700 border-b-2 border-gray-300 focus:outline-none focus:border-indigo-500"
                />
              ) : (
                <span className="text-sm text-gray-700">{safeRender(user.designation)}</span>
              )}
            </div>

            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Location</span>
              {isEditing ? (
                <input
                  type="text"
                  name="location"
                  value={user.location}
                  onChange={handleChange}
                  className="text-sm text-gray-700 border-b-2 border-gray-300 focus:outline-none focus:border-indigo-500"
                />
              ) : (
                <span className="text-sm text-gray-700">{safeRender(user.location)}</span>
              )}
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Status</span>
              <select
                name="status"
                value={user.status}
                onChange={handleChange}
                className="text-sm text-gray-700 border-b-2 border-gray-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="Online">Online</option>
                <option value="Working">Working</option>
                <option value="Away">Away</option>
                <option value="Offline">Offline</option>
              </select>
            </div>
          </div>
        </div>

        {/* Edit/Save Button */}
        <div className="mt-6 flex justify-center">
          <button
            onClick={toggleEditMode}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 cursor-pointer"
          >
            {isEditing ? 'Save Changes' : 'Edit Profile'}
          </button>
        </div>

        {/* Proceed to Chat Button */}
        <div className="mt-4 flex justify-center">
          <button
            onClick={() => navigate('/chat')}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 cursor-pointer"
          >
            Proceed to Chat
          </button>
        </div>

        {/* Notifications */}
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className="fixed top-4 right-4 bg-white p-4 rounded-lg shadow-lg z-50"
          >
            <div>{notification.text}</div>
            <button
              onClick={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}
              className="mt-2 px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Close
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProfilePage;