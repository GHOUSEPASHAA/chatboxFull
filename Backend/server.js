const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const { AccessToken } = require('livekit-server-sdk');
const socketHandler = require('./sockets/socketHandler');

// Import Routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const groupRoutes = require('./routes/groupRoutes');
const messageRoutes = require('./routes/messageRoutes');
const fileRoutes = require('./routes/fileRoutes');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: '*' } });

// Middleware to attach io to req
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] Request received: ${req.method} ${req.url}`);
    req.io = io;
    next();
});

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MongoDB Connection
mongoose.connect('mongodb+srv://chats:chats@cluster0.g7jsw.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => console.log('MongoDB connected successfully'))
    .catch(err => console.error('MongoDB connection error:', err.message));

// Routes
app.get('/test', (req, res) => {
    console.log('Test endpoint hit');
    res.send('Server is running');
});

app.use('/api', authRoutes);
app.use('/api', userRoutes);
app.use('/api', groupRoutes);
app.use('/api', messageRoutes);
app.use('/api', fileRoutes);

// LiveKit Token Generation
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || 'APISmCsJFRKatvB';
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || 'V3HjrSSYlPRvDPc27TIhMODfeFzqde2XflyLSBzchPVB';

app.get('/getToken', (req, res) => {
    console.log(`[${new Date().toISOString()}] /getToken endpoint hit`);
    const { roomName, userId } = req.query;

    console.log('Query parameters:', { roomName, userId });

    try {
        if (!roomName || !userId) {
            console.log('Missing required parameters: roomName or userId');
            return res.status(400).json({ error: 'roomName and userId are required' });
        }

        console.log('Generating LiveKit token with:', { LIVEKIT_API_KEY, LIVEKIT_API_SECRET });
        const token = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
            identity: userId,
        });
        token.addGrant({
            roomJoin: true,
            room: roomName,
            canPublish: true,
            canSubscribe: true,
        });

        const jwt = token.toJwt();
        console.log('Generated JWT token:', jwt);

        const response = { token: jwt };
        console.log('Sending response:', response);
        res.json(response);
    } catch (error) {
        console.error('Token generation error:', error.message);
        const errorResponse = { error: 'Failed to generate token' };
        console.log('Sending error response:', errorResponse);
        res.status(500).json(errorResponse);
    }
});

// Socket.IO Handling
socketHandler(io);

// Start Server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Test endpoint: http://localhost:${PORT}/test`);
});