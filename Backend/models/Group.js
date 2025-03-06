const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
    name: { type: String, required: true },
    creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Group admin
    members: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        canSendMessages: { type: Boolean, default: false }, // Messaging permission, default false except for creator
        canCall: { type: Boolean, default: false } // Calling permission, default false except for creator
    }],
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Group', groupSchema);