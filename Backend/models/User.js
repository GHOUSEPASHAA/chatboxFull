const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String, // In production, hash this (e.g., bcrypt)
    location: String,
    designation: String,
    status: { type: String, default: 'Offline' },
    publicKey: String, // For E2E encryption
    privateKey: String, // Store securely in production
    image: { type: String, default: null } // URL or path to profile image
});

module.exports = mongoose.model('User', userSchema);