require("dotenv").config();

const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
const axios = require("axios");
const jwt = require("jsonwebtoken");
const morgan = require("morgan");

const authRoutes = require("./routes/authRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const Message = require("./models/Message");
const Media = require("./models/Media");
const User = require("./models/ChatUser");

const app = express();
const server = http.createServer(app);
const corsOriginValue = '*';

const io = socketIo(server, {
  cors: {
    origin: corsOriginValue,
    methods: ["GET", "POST"],
    credentials: false,
  },
});

app.use(
  cors({
    origin: corsOriginValue,
    credentials: false,
  })
);
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(morgan("dev"));

app.use("/uploads/avatars", express.static("uploads/avatars"));

app.get("/media/*", async (req, res) => {
  try {
    const mediaPath = req.path;
    const microserviceUrl = `http://127.0.0.1:5000${mediaPath}`;
    if (req.query && req.query.download) {
      try {
        const basename = require('path').basename(mediaPath);
        const mediaDoc = await Media.findOne({ filePath: { $regex: `${basename}$` } });
        if (mediaDoc) {
          res.setHeader('Content-Disposition', `attachment; filename="${mediaDoc._id}_${basename}"`);
        }
      } catch (e) {
      }
    }
    const response = await axios.get(microserviceUrl, {
      responseType: "stream",
    });
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    const contentType = response.headers["content-type"];
    if (contentType) res.setHeader("Content-Type", contentType);
    const contentLength = response.headers["content-length"];
    if (contentLength) res.setHeader("Content-Length", contentLength);
    const acceptRanges = response.headers["accept-ranges"];
    if (acceptRanges) res.setHeader("Accept-Ranges", acceptRanges);

    response.data.pipe(res);
  } catch (error) {
    res
      .status(error.response?.status || 500)
      .json({ error: "Failed to fetch media" });
  }
});

const { asyncHandler, authenticateToken, sendSuccess } = require('./utils/apiHandler');

app.use("/api/auth", authRoutes);
app.use("/api/upload", authenticateToken, uploadRoutes);

app.get("/api/users", authenticateToken, asyncHandler(async (req, res) => {
  const users = await User.find({}, "username email avatar");
  sendSuccess(res, users);
}));

app.get("/api/media/:id/provenance", authenticateToken, asyncHandler(async (req, res) => {
  const media = await Media.findById(req.params.id).populate("creatorId", "username email");
  if (!media) {
    return res.status(404).json({ error: "Media not found" });
  }

  const distributionPath = await Promise.all(
    media.distributionPath.map(async (entry) => {
      const recipient = await User.findById(entry.recipientId, "username email");
      const sender = await User.findById(entry.fromUserId, "username email");
      return {
        recipientId: entry.recipientId,
        recipient: recipient ? { username: recipient.username, email: recipient.email } : null,
        fromUserId: entry.fromUserId,
        from: sender ? { username: sender.username, email: sender.email } : null,
        sharedAt: entry.sharedAt,
      };
    })
  );

  sendSuccess(res, {
    mediaId: media._id,
    creatorId: media.creatorId._id,
    creator: {
      username: media.creatorId.username,
      email: media.creatorId.email,
    },
    filePath: media.filePath,
    mediaType: media.mediaType,
    distributionPath,
    createdAt: media.createdAt,
    updatedAt: media.updatedAt,
  });
}));


app.get("/api/messages/:otherUserId", authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const otherUserId = req.params.otherUserId;

  const messages = await Message.find({
    $or: [
      { senderId: userId, receiverId: otherUserId },
      { senderId: otherUserId, receiverId: userId },
    ],
  }).sort({ createdAt: 1 });

  sendSuccess(res, messages);
}));

app.delete("/api/messages/clear", authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const result = await Message.deleteMany({
    $or: [{ senderId: userId }, { receiverId: userId }],
  });
  sendSuccess(res, {
    message: `Deleted ${result.deletedCount} messages`,
    count: result.deletedCount,
  });
}));

app.delete("/api/messages/:otherUserId", authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const { otherUserId } = req.params;
  const result = await Message.deleteMany({
    $or: [
      { senderId: userId, receiverId: otherUserId },
      { senderId: otherUserId, receiverId: userId }
    ]
  });
  sendSuccess(res, {
    message: `Deleted ${result.deletedCount} messages`,
    count: result.deletedCount,
  });
}));

const MONGO_URI =
  process.env.MONGO_URI || "mongodb://localhost:27017/chatpermedia";
mongoose
  .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log(`[DB] Connected to MongoDB`))
  .catch((err) => console.error("[DB] Mongo connection error:", err));

const crypto = require("crypto");
const userPublicKeys = new Map();

io.use((socket, next) => {
  const token = socket.handshake && socket.handshake.auth && socket.handshake.auth.token;
  const remote = (socket.handshake && (socket.handshake.address || socket.handshake.headers && socket.handshake.headers['x-forwarded-for'])) || socket.conn && socket.conn.remoteAddress || 'unknown';
  console.log(`[SOCKET AUTH] Connection attempt from ${remote} - token present: ${!!token}`);
  if (!token) {
    return next(new Error('Authentication error: missing token'));
  }

  const jwtSecret = process.env.JWT_SECRET || 'secretKey';
  jwt.verify(token, jwtSecret, (err, user) => {
    if (err) {
      return next(new Error('Authentication error: invalid token'));
    }
    socket.userId = user.userId;
    next();
  });
});

io.on("connection", (socket) => {
  socket.join(socket.userId);

  socket.on("registerPublicKey", (data) => {
    userPublicKeys.set(socket.userId, data.publicKey);
    socket.publicKey = data.publicKey;
    socket.broadcast.emit("peerPublicKey", {
      peerId: socket.userId,
      publicKey: data.publicKey,
    });
  });

  socket.on("requestPeerPublicKey", (data) => {
    const { peerId } = data;

    const peerPublicKey = userPublicKeys.get(peerId);
    if (peerPublicKey) {
      socket.emit("peerPublicKey", { peerId, publicKey: peerPublicKey });
    } else {
    }
  });

  socket.on("sendMessage", async (data) => {
    const { ciphertext, receiverId } = data;

    try {
      const message = new Message({
        senderId: socket.userId,
        receiverId,
        ciphertext,
        timestamp: new Date(),
      });
      await message.save();
      const receiverSockets = await io.in(receiverId).fetchSockets();

      io.to(receiverId).emit("receiveMessage", {
        messageId: message._id.toString(),
        ciphertext,
        senderId: socket.userId,
        receiverId,
        timestamp: message.timestamp,
      });
      socket.emit("messageSent", {
        messageId: message._id,
        receiverId,
        timestamp: message.timestamp,
      });
    } catch (error) {
      socket.emit("messageError", { error: error.message });
    }
  });

  socket.on("shareMedia", async (data) => {
    const { mediaId, receiverId } = data;

    try {
      const media = await Media.findById(mediaId);
      if (!media) {
        socket.emit("messageError", { error: "Media not found" });
        return;
      }

      media.distributionPath.push({
        recipientId: receiverId,
        fromUserId: socket.userId,
        sharedAt: new Date(),
      });
      await media.save();

      let mediaUrl = `/media/master/${path.basename(media.filePath)}`;

      const message = new Message({
        senderId: socket.userId,
        receiverId,
        mediaUrl,
        mediaType: media.mediaType,
        mediaId: media._id,
      });
      await message.save();

      io.to(receiverId).emit("receiveMedia", {
        url: mediaUrl,
        mediaType: media.mediaType,
        senderId: socket.userId,
        receiverId,
        messageId: message._id,
        mediaId: media._id.toString(),
      });

      socket.emit("mediaSent", {
        messageId: message._id,
        receiverId,
        mediaId: media._id.toString(),
        masterUrl: mediaUrl,
      });
    } catch (error) {
      socket.emit("messageError", { error: error.message });
    }
  });

  socket.on("disconnect", () => {
  });
});

const path = require("path");
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/dist")));
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/dist/index.html"));
  });
}

const PORT = process.env.PORT || 3001;

server.setTimeout(300000);
server.headersTimeout = 310000;
server.requestTimeout = 300000;

server.listen(PORT, () => {
});
