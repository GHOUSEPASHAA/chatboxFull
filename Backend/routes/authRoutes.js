const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { generateKeys } = require('../utils/encryption');
const { JWT_SECRET } = require('../middleware/auth');
const jwt = require('jsonwebtoken');
const upload = require('../middleware/multerConfig');

router.post('/signup', upload.single('image'), async (req, res) => {
    const { name, email, password, location, designation } = req.body;
    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ error: 'Email already in use' });

        const { publicKey, privateKey } = generateKeys();
        const userData = {
            name,
            email,
            password, // TODO: Hash this in production!
            location,
            designation,
            publicKey,
            privateKey,
            status: 'Online'
        };

        if (req.file) userData.image = `/uploads/${req.file.filename}`;

        const user = new User(userData);
        await user.save();
        const token = jwt.sign({ id: user._id }, JWT_SECRET);
        res.status(201).json({ token, privateKey });
    } catch (err) {
        console.error('Signup error:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email, password }).lean();
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });
        user.status = 'Online';
        await User.updateOne({ _id: user._id }, { status: 'Online' });
        const token = jwt.sign({ id: user._id }, JWT_SECRET);
        res.json({ token, privateKey: user.privateKey });
    } catch (err) {
        console.error('Login error:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;