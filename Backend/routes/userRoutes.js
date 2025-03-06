const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');

router.get('/users', authenticate, async (req, res) => {
    try {
        const users = await User.find({}, 'name _id status image').lean();
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error.message);
        res.status(500).json({ error: 'Server error' });
    }
});

router.get('/users/me', authenticate, async (req, res) => {
    try {
        console.log('Authenticated user ID:', req.userId);
        if (!req.userId) {
            console.log('No user ID in request');
            return res.status(401).json({ error: 'User not authenticated' });
        }

        const user = await User.findById(req.userId, 'name email image designation location status').lean();
        if (!user) {
            console.log('User not found in database');
            return res.status(404).json({ error: 'User not found' });
        }

        const response = {
            _id: user._id,
            name: user.name,
            email: user.email,
            // router.get('/users/me')
            photo: user.image ? `http://localhost:3000/uploads/${user.image}` : null,
            designation: user.designation,
            location: user.location,
            status: user.status
        };

        console.log('User profile response:', response);
        res.json(response);
    } catch (error) {
        console.error('Error fetching current user profile:', error.message, error.stack);
        res.status(500).json({ error: 'Server error' });
    }
});

router.get('/users/:userId', authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.params.userId, 'name email location designation status image').lean();
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (error) {
        console.error('Error fetching user profile:', error.message);
        res.status(500).json({ error: 'Server error' });
    }
});

// New PUT route to update user profile
router.put('/users/me', authenticate, async (req, res) => {
    try {
        console.log('Authenticated user ID:', req.userId);
        if (!req.userId) {
            console.log('No user ID in request');
            return res.status(401).json({ error: 'User not authenticated' });
        }

        const updates = {
            name: req.body.name,
            email: req.body.email,
            designation: req.body.designation,
            location: req.body.location,
            status: req.body.status,
            password: req.body.password // Directly updating password
        };

        // Filter out undefined values to avoid overwriting with null
        const updateFields = Object.fromEntries(
            Object.entries(updates).filter(([_, value]) => value !== undefined)
        );

        const user = await User.findByIdAndUpdate(
            req.userId,
            updateFields,
            { new: true, runValidators: true } // Return updated doc, validate fields
        );

        if (!user) {
            console.log('User not found in database');
            return res.status(404).json({ error: 'User not found' });
        }

        const response = {
            _id: user._id,
            name: user.name,
            email: user.email,
            photo: user.image ? `http://localhost:3000/uploads/${user.image}` : null,
            designation: user.designation,
            location: user.location,
            status: user.status
        };

        console.log('Updated user profile:', response);
        res.json(response);
    } catch (error) {
        console.error('Error updating user profile:', error.message, error.stack);
        res.status(500).json({ error: 'Server error' });
    }
});


module.exports = router;