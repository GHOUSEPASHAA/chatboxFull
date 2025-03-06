import React, { useState, useEffect, useRef } from 'react';
import { FaEdit, FaPencilAlt } from 'react-icons/fa';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const ProfilePage = ({ token }) => {
  const [user, setUser] = useState({
    name: 'John Doe',
    photo: 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png',
    designation: 'Software Engineer',
    email: 'johndoe@example.com',
    location: 'Hyderabad Office',
    status: navigator.onLine ? 'Online' : 'Offline',
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isProfileVisible, setIsProfileVisible] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const safeRender = (value, fallback = 'Not specified') => value || fallback;

  useEffect(() => {
    if (token) {
      fetchUserProfile();
    }

    const updateStatus = () => {
      setUser((prevState) => ({
        ...prevState,
        status: navigator.onLine ? 'Online' : 'Offline',
      }));
    };

    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);

    return () => {
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
    };
  }, [token]);

  const fetchUserProfile = async () => {
    try {
      const response = await axios.get('http://localhost:3000/api/users/me', {
        headers: { Authorization: token },
      });
      setUser((prev) => ({
        ...prev,
        ...response.data,
        photo: response.data.photo || prev.photo,
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

        const response = await axios.post(
          'http://localhost:3000/api/upload/profile-photo',
          formData,
          {
            headers: {
              Authorization: token,
              'Content-Type': 'multipart/form-data',
            },
          }
        );

        setUser((prevState) => ({
          ...prevState,
          photo: response.data.url || URL.createObjectURL(file),
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
          headers: { Authorization: token },
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
    navigate('/chat');
  };

  const handleProceedToChat = () => {
    navigate('/chat');
  };

  const addNotification = (message) => {
    const id = Date.now();
    setNotifications((prev) => [...prev, { id, text: message }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 5000);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Online':
        return 'bg-green-500';
      case 'Offline':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (!isProfileVisible) return null;

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-gray-100 p-4"
      style={{ fontFamily: "'Times New Roman', serif" }}
    >
      <div className="w-full max-w-sm bg-white p-6 rounded-2xl shadow-xl relative">
        

        <div className="text-center mb-6 relative">
          <div className="relative w-24 h-24 mx-auto">
            <img
              src={user.photo}
              alt="Profile"
              className="w-24 h-24 rounded-full mx-auto shadow-lg object-cover"
            />
            <div
              className={`absolute bottom-0 left-0 w-4 h-4 rounded-full border-2 border-white shadow-md ${getStatusColor(
                user.status
              )}`}
            ></div>
            {isEditing && (
              <label className="absolute bottom-0 right-0 bg-gray-800 text-white p-1 rounded-full cursor-pointer">
                <FaPencilAlt size={14} />
                <input
                  type="file"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handlePhotoChange}
                  accept="image/*"
                />
              </label>
            )}
          </div>

          {isEditing ? (
            <input
              type="text"
              name="name"
              value={user.name}
              onChange={handleChange}
              placeholder="Enter Name"
              className="mt-3 text-lg font-semibold text-gray-800 text-center w-full border-b-2 border-gray-300 focus:outline-none focus:border-blue-500"
            />
          ) : (
            <h2 className="mt-3 text-lg font-semibold text-gray-800">
              {safeRender(user.name)}
            </h2>
          )}
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">EMPLOYEE DETAILS</h3>
          <div className="grid grid-cols-2 gap-y-2">
            <span className="text-sm text-gray-500">Designation</span>
            {isEditing ? (
              <input
                type="text"
                name="designation"
                value={user.designation}
                onChange={handleChange}
                className="text-sm text-gray-700 border-b-2 border-gray-300 focus:outline-none focus:border-blue-500"
              />
            ) : (
              <span className="text-sm text-gray-700">{safeRender(user.designation)}</span>
            )}

            <span className="text-sm text-gray-500">Email</span>
            {isEditing ? (
              <input
                type="email"
                name="email"
                value={user.email}
                onChange={handleChange}
                className="text-sm text-gray-700 border-b-2 border-gray-300 focus:outline-none focus:border-blue-500"
              />
            ) : (
              <span className="text-sm text-gray-700">{safeRender(user.email)}</span>
            )}

            <span className="text-sm text-gray-500">Location</span>
            {isEditing ? (
              <input
                type="text"
                name="location"
                value={user.location}
                onChange={handleChange}
                className="text-sm text-gray-700 border-b-2 border-gray-300 focus:outline-none focus:border-blue-500"
              />
            ) : (
              <span className="text-sm text-gray-700">{safeRender(user.location)}</span>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-col items-center space-y-2">
          <button
            onClick={toggleEditMode}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 cursor-pointer"
          >
            {isEditing ? 'Save Changes' : 'Edit Profile'}
          </button>
          <button
            onClick={handleProceedToChat}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer"
          >
            Proceed to Chat
          </button>
        </div>

        {notifications.map((notification) => (
          <div
            key={notification.id}
            className="fixed top-4 right-4 bg-white p-4 rounded-lg shadow-lg z-50"
          >
            <div>{notification.text}</div>
            <button
              onClick={() =>
                setNotifications((prev) => prev.filter((n) => n.id !== notification.id))
              }
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