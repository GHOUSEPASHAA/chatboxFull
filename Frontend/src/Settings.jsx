import React, { useState, useEffect, useRef } from 'react';
import { FaEdit } from 'react-icons/fa';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Settings = ({ token, isOpen, onClose, updateAuth }) => {
  // Debug props
  console.log('Settings props:', { token, isOpen, onClose, updateAuth });

  const [currentPage, setCurrentPage] = useState("initial");
  const [user, setUser] = useState({
    name: '',
    photo: 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png',
    designation: '',
    location: 'Hyderabad Office',
    status: 'Online',
    email: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [newPassword, setNewPassword] = useState('');
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const safeRender = (value, fallback = "Not specified") => value || fallback;

  useEffect(() => {
    if (token && isOpen) {
      fetchUserProfile();
    }
  }, [token, isOpen]);

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
    setUser((prevState) => ({ ...prevState, [name]: value }));
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
        setUser((prevState) => ({ ...prevState, photo: response.data.url }));
        addNotification('Photo updated successfully');
      } catch (error) {
        console.error('Photo upload failed:', error);
        addNotification('Failed to update photo');
      }
    }
  };

  const saveProfileChanges = async () => {
    try {
      const response = await axios.put('http://localhost:3000/api/users/me', user, {
        headers: { Authorization: token }
      });
      setUser(prev => ({ ...prev, ...response.data }));
      addNotification('Profile updated successfully');
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving profile:', error);
      addNotification('Failed to save profile');
    }
  };

  const handlePasswordChange = async () => {
    try {
      await axios.put('http://localhost:3000/api/users/me', {
        password: newPassword
      }, {
        headers: { Authorization: token }
      });
      addNotification('Password updated successfully');
      setNewPassword('');
      setCurrentPage('initial');
    } catch (error) {
      console.error('Error updating password:', error);
      addNotification('Failed to update password');
    }
  };

  const handleLogout = () => {
    if (typeof updateAuth === 'function') {
      updateAuth({
        token: null,
        privateKey: null,
        isAuthenticated: false
      });
    } else {
      console.error('updateAuth is not a function. Falling back to local cleanup.');
    }
    localStorage.removeItem('token');
    localStorage.removeItem('privateKey');
    navigate('/signin');
    onClose();
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

  if (!isOpen) return null;

  const renderPage = () => {
    switch (currentPage) {
      case "editProfile":
        return (
          <div className="w-full max-w-md bg-white p-6 rounded-2xl shadow-xl relative">
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
                  <div className={`absolute bottom-1 right-1 w-5 h-5 rounded-full border-2 border-white ${getStatusColor(user.status)}`}></div>
                  {isEditing && (
                    <FaEdit
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-2 right-2 text-white bg-gray-700 rounded-full p-1 cursor-pointer shadow-md hover:bg-gray-800"
                      size={18}
                    />
                  )}
                </div>
              </div>

              <input
                type="text"
                name="name"
                value={user.name}
                onChange={handleChange}
                placeholder="Enter Name"
                className="mt-3 text-xl font-semibold text-gray-800 text-center w-full border-b-2 border-gray-300 focus:outline-none focus:border-indigo-500"
                disabled={!isEditing}
              />
              <p className="text-sm text-gray-600">{safeRender(user.status)}</p>
            </div>

            <div className="space-y-4">
              <div className="mt-2 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Email</span>
                  <input
                    type="email"
                    name="email"
                    value={user.email}
                    onChange={handleChange}
                    className="text-sm text-gray-700 border-b-2 border-gray-300 focus:outline-none focus:border-indigo-500"
                    disabled={!isEditing}
                  />
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Designation</span>
                  <input
                    type="text"
                    name="designation"
                    value={user.designation}
                    onChange={handleChange}
                    placeholder="Enter Designation"
                    className="text-sm text-gray-700 border-b-2 border-gray-300 focus:outline-none focus:border-indigo-500"
                    disabled={!isEditing}
                  />
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Location</span>
                  <input
                    type="text"
                    name="location"
                    value={user.location}
                    onChange={handleChange}
                    className="text-sm text-gray-700 border-b-2 border-gray-300 focus:outline-none focus:border-indigo-500"
                    disabled={!isEditing}
                  />
                </div>
                
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <button
                onClick={() => isEditing ? saveProfileChanges() : setIsEditing(true)}
                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                {isEditing ? 'Save Changes' : 'Edit Profile'}
              </button>
              <button
                onClick={() => setCurrentPage("initial")}
                className="w-full px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
              >
                Back
              </button>
            </div>
          </div>
        );

      case "manageAccount":
        return (
          <div className="w-full max-w-md bg-white p-6 rounded-2xl shadow-xl">
            <h1 className="text-2xl font-bold mb-4">Manage Account</h1>
            <input 
              type="password" 
              placeholder="New Password" 
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded" 
            />
            <button 
              onClick={handlePasswordChange}
              className="w-full p-3 mt-4 bg-green-500 hover:bg-green-600 rounded text-white"
            >
              Change Password
            </button>
            <button
              onClick={() => setCurrentPage("initial")}
              className="w-full px-4 py-2 mt-4 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
            >
              Back
            </button>
          </div>
        );

      case "logout":
        return (
          <div className="w-full max-w-md bg-white p-6 rounded-2xl shadow-xl">
            <h1 className="text-2xl font-bold mb-4">Logout</h1>
            <p className="mb-4">Are you sure you want to logout?</p>
            <button 
              onClick={handleLogout}
              className="w-full p-3 bg-red-500 hover:bg-red-600 rounded text-white"
            >
              Confirm Logout
            </button>
            <button
              onClick={() => setCurrentPage("initial")}
              className="w-full px-4 py-2 mt-4 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
            >
              Back
            </button>
          </div>
        );

      default:
        return (
          <div className="w-full max-w-md bg-white p-6 rounded-2xl shadow-xl">
            <div className="text-center mb-6">
              <img
                src={user.photo}
                alt="Profile"
                className="w-24 h-24 rounded-full mx-auto border-4 border-white shadow-lg object-cover"
              />
              <h2 className="mt-3 text-xl font-semibold text-gray-800">
                {safeRender(user.name)}
              </h2>
              <p className="text-sm text-gray-600">{safeRender(user.status)}</p>
            </div>

            <div className="mt-6 space-y-3">
              <button
                onClick={() => setCurrentPage("editProfile")}
                className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Edit Profile
              </button>
              <button
                onClick={() => setCurrentPage("manageAccount")}
                className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Manage Account
              </button>
              <button
                onClick={() => setCurrentPage("logout")}
                className="w-full px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                Logout
              </button>
              <button
                onClick={() => {
                  onClose();
                  navigate('/chat');
                }}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Proceed to Chat
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-50 bg-opacity-10 flex items-center justify-center z-50 p-4">
      {renderPage()}
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
  );
};

export default Settings;