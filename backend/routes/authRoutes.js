const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const User = require('../models/ChatUser');
const { asyncHandler, sendSuccess, validateRequired } = require('../utils/apiHandler');

const router = express.Router();

const avatarUpload = multer({ 
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join(__dirname, '../uploads/avatars');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}-${Math.random().toString(36).substring(7)}${path.extname(file.originalname)}`);
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const valid = /jpeg|jpg|png|gif|webp/.test(path.extname(file.originalname).toLowerCase());
    valid ? cb(null, true) : cb(new Error('Only image files allowed'));
  }
});

router.post('/register', avatarUpload.single('avatar'), asyncHandler(async (req, res) => {
  const { username, password, email } = req.body;
  validateRequired(['username', 'password', 'email'], req.body);

  const user = new User({ 
    username, 
    email,
    password: await bcrypt.hash(password, 10),
    avatar: req.file ? `/uploads/avatars/${req.file.filename}` : null
  });
  
  await user.save();
  sendSuccess(res, { message: 'User registered', userId: user._id }, null, 201);
}));

router.post('/login', asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  const token = jwt.sign({ userId: user._id }, 'secretKey', { expiresIn: '12h' });
  sendSuccess(res, { token, userId: user._id });
}));

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Missing Authorization header' });
  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Missing token' });
  jwt.verify(token, 'secretKey', (err, decoded) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.userId = decoded.userId;
    next();
  });
};

router.get('/me', authenticate, asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId, 'username email avatar');
  if (!user) return res.status(404).json({ error: 'User not found' });
  sendSuccess(res, user);
}));

router.delete('/account', authenticate, asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (user.avatar) {
    const filePath = path.join(__dirname, `../${user.avatar}`);
    fs.unlink(filePath, () => {});
  }

  await User.deleteOne({ _id: req.userId });
  sendSuccess(res, { message: 'Account deleted' });
}));

router.get('/users', async (req, res) => {
  try {
    const users = await User.find({}, 'username _id email avatar');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;