const express = require('express');
const router = express.Router();
const File = require('../models/File');
const Group = require('../models/Group');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');
const upload = require('../middleware/multerConfig');

router.post('/upload', authenticate, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        if (req.body.group) {
            const group = await Group.findById(req.body.group);
            if (!group) {
                return res.status(404).json({ error: 'Group not found' });
            }
            const member = group.members.find(m => m.userId.toString() === req.userId);
            if (group.creator.toString() !== req.userId && (!member || !member.canSendMessages)) {
                return res.status(403).json({ error: 'No permission to send files in this group' });
            }
        }

        const fileDoc = new File({
            name: req.file.filename,
            originalName: req.file.originalname,
            size: req.file.size,
            mimeType: req.file.mimetype,
            path: `/uploads/${req.file.filename}`,
            sender: req.userId,
            recipient: req.body.recipient || null,
            group: req.body.group || null,
        });

        await fileDoc.save();

        const fileData = {
            name: req.file.originalName,
            url: `http://localhost:3000${fileDoc.path}`,
            size: req.file.size,
            mimeType: req.file.mimetype,
            _id: fileDoc._id
        };

        const sender = await User.findById(req.userId).lean();
        if (!sender) {
            throw new Error('Sender not found');
        }

        const messageData = {
            sender: { _id: req.userId, name: sender.name },
            file: fileData,
            recipient: req.body.recipient || null,
            group: req.body.group || null,
            tempId: req.body.tempId,
            timestamp: new Date()
        };

        // Emit Socket.IO message before sending response
        const target = req.body.recipient || req.body.group || req.userId;
        req.io.to(target).emit('chatMessage', messageData);

        // Send response only after all operations are complete
        return res.json(fileData);

    } catch (error) {
        console.error('File upload error:', error.message);
        // Only send error response if no response has been sent yet
        if (!res.headersSent) {
            return res.status(500).json({ error: 'Server error during file upload' });
        }
    }
});

router.post('/upload/profile-photo', authenticate, upload.single('photo'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Update user's image field with the new filename
        user.image = req.file.filename;
        await user.save();

        const photoUrl = `http://localhost:3000/uploads/${req.file.filename}`;
        res.json({ url: photoUrl });

    } catch (error) {
        console.error('Profile photo upload error:', error.message);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;