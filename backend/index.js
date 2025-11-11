require('dotenv').config();

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const morgan = require('morgan');

const authRoutes = require('./routes/authRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const Message = require('./models/Message');
const Media = require('./models/Media');
const User = require('./models/ChatUser');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.use('/uploads/avatars', express.static('uploads/avatars'));

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);
  jwt.verify(token, 'secretKey', (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

app.use('/api/auth', authRoutes);
app.use('/api/upload', authenticateToken, uploadRoutes);

app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    const users = await User.find({}, 'username email avatar');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/media/:id/provenance', authenticateToken, async (req, res) => {
  try {
    const media = await Media.findById(req.params.id).populate('creatorId', 'username email');
    if (!media) {
      return res.status(404).json({ error: 'Media not found' });
    }
    
    const forensicEmbeds = await Promise.all(
      media.forensicEmbeds.map(async (embed) => {
        const recipient = await User.findById(embed.recipientId, 'username email');
        return {
          recipientId: embed.recipientId,
          recipient: recipient ? { username: recipient.username, email: recipient.email } : null,
          recipientFilePath: embed.recipientFilePath,
          createdAt: embed.createdAt
        };
      })
    );
    
    res.json({
      mediaId: media._id,
      creatorId: media.creatorId._id,
      creator: {
        username: media.creatorId.username,
        email: media.creatorId.email
      },
      masterFilePath: media.masterFilePath,
      mediaType: media.mediaType,
      sourceEmbedded: media.sourceEmbedded,
      forensicEmbeds,
      createdAt: media.createdAt,
      updatedAt: media.updatedAt
    });
  } catch (error) {
    console.error('[API] Error fetching provenance:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/media/extract', authenticateToken, async (req, res) => {
  try {
    const { file_path } = req.body;
    if (!file_path) return res.status(400).json({ error: 'file_path is required' });
    
    console.log(`[API] Requesting watermark extraction for: ${file_path}`);
    const response = await axios.post('http://localhost:5000/api/v1/watermark_extract', { file_path });
    console.log(`[API] Extraction result:`, response.data);
    res.json(response.data);
  } catch (error) {
    console.error('[API] Error extracting watermarks:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/messages/:otherUserId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const otherUserId = req.params.otherUserId;
    
    const messages = await Message.find({
      $or: [
        { senderId: userId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: userId }
      ]
    }).sort({ createdAt: 1 });
    
    console.log(`[API] Fetched ${messages.length} messages between ${userId} and ${otherUserId}`);
    res.json(messages);
  } catch (error) {
    console.error('[API] Error fetching messages:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/messages/clear', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  try {
    const result = await Message.deleteMany({
      $or: [
        { senderId: userId },
        { receiverId: userId }
      ]
    });
    console.log(`[API] Deleted ${result.deletedCount} messages for user ${userId}`);
    res.json({ message: `Deleted ${result.deletedCount} messages`, count: result.deletedCount });
  } catch (error) {
    console.error('[API] Error deleting messages:', error);
    res.status(500).json({ error: error.message });
  }
});

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/chatpermedia';
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log(`[DB] Connected to MongoDB`))
  .catch(err => console.error('[DB] Mongo connection error:', err));

const crypto = require('crypto');
const userPublicKeys = new Map();

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Authentication error'));

  jwt.verify(token, 'secretKey', (err, user) => {
    if (err) return next(new Error('Authentication error'));
    socket.userId = user.userId;
    next();
  });
});

io.on('connection', (socket) => {
  console.log(`[SOCKET] User connected: ${socket.userId} (Socket ID: ${socket.id})`);
  socket.join(socket.userId);
  console.log(`[SOCKET] User ${socket.userId} joined room: ${socket.userId}`);

  socket.on('registerPublicKey', (data) => {
    console.log(`[SOCKET] Registering public key for user: ${socket.userId}`);
    userPublicKeys.set(socket.userId, data.publicKey);
    socket.publicKey = data.publicKey;
    socket.broadcast.emit('peerPublicKey', { peerId: socket.userId, publicKey: data.publicKey });
    console.log(`[SOCKET] Broadcasted public key of ${socket.userId} to all users`);
  });

  socket.on('requestPeerPublicKey', (data) => {
    const { peerId } = data;
    console.log(`[SOCKET] User ${socket.userId} requesting public key of ${peerId}`);
    
    const peerPublicKey = userPublicKeys.get(peerId);
    if (peerPublicKey) {
      socket.emit('peerPublicKey', { peerId, publicKey: peerPublicKey });
      console.log(`[SOCKET] Sent public key of ${peerId} to ${socket.userId}`);
    } else {
      console.error(`[SOCKET] Public key not found for peer: ${peerId}`);
    }
  });

  socket.on('sendMessage', async (data) => {
    console.log(`[SOCKET] sendMessage from ${socket.userId} to ${data.receiverId}`);
    const { ciphertext, receiverId } = data;
    
    try {
      const message = new Message({ senderId: socket.userId, receiverId, ciphertext, timestamp: new Date() });
      await message.save();
      console.log(`[SOCKET] Message saved to DB: ${message._id}`);
      const receiverSockets = await io.in(receiverId).fetchSockets();
      console.log(`[SOCKET] Receiver room "${receiverId}" has ${receiverSockets.length} socket(s)`);

      io.to(receiverId).emit('receiveMessage', { 
        messageId: message._id.toString(),
        ciphertext, 
        senderId: socket.userId, 
        receiverId,
        timestamp: message.timestamp
      });
      console.log(`[SOCKET] Message emitted to receiver room: ${receiverId}`);
      socket.emit('messageSent', { messageId: message._id, receiverId, timestamp: message.timestamp });
    } catch (error) {
      console.error(`[SOCKET] Error sending message:`, error);
      socket.emit('messageError', { error: error.message });
    }
  });

  socket.on('shareMedia', async (data) => {
    console.log(`[SOCKET] shareMedia from ${socket.userId} to ${data.receiverId}, mediaId: ${data.mediaId}`);
    const { mediaId, receiverId } = data;
    
    try {
      const media = await Media.findById(mediaId);
      if (!media) {
        console.error(`[SOCKET] Media not found: ${mediaId}`);
        socket.emit('messageError', { error: 'Media not found' });
        return;
      }

      console.log(`[SOCKET] Requesting forensic watermark for media: ${mediaId}`);
      const response = await axios.post('http://localhost:5000/api/v1/watermark_forensic', {
        masterFilePath: media.masterFilePath,
        recipient_id: receiverId
      });

      const { recipientFilePath } = response.data;
      const mediaUrl = `http://localhost:5000${recipientFilePath}`;
      console.log(`[SOCKET] Forensic watermark created: ${recipientFilePath}`);

      media.forensicEmbeds.push({ recipientId: receiverId, recipientFilePath, createdAt: new Date() });
      await media.save();
      console.log(`[SOCKET] Forensic embed recorded for recipient: ${receiverId}`);

      const message = new Message({
        senderId: socket.userId,
        receiverId,
        mediaUrl,
        mediaType: media.mediaType,
        mediaId: media._id
      });
      await message.save();
      console.log(`[SOCKET] Media message saved to DB: ${message._id}`);

      io.to(receiverId).emit('receiveMedia', { 
        url: mediaUrl, 
        mediaType: media.mediaType,
        senderId: socket.userId, 
        receiverId,
        messageId: message._id,
        mediaId: media._id.toString()
      });
      console.log(`[SOCKET] Media shared with receiver: ${receiverId}`);
      socket.emit('mediaSent', { messageId: message._id, receiverId, mediaId: media._id.toString(), masterUrl: `http://localhost:5000${media.masterFilePath}` });
    } catch (error) {
      console.error(`[SOCKET] Error sharing media:`, error);
      socket.emit('messageError', { error: error.message });
    }
  });

  socket.on('disconnect', () => {
    console.log(`[SOCKET] User disconnected: ${socket.userId} (Socket ID: ${socket.id})`);
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});