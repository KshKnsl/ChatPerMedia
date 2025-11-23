const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const Media = require('../models/Media');
const { asyncHandler, sendSuccess } = require('../utils/apiHandler');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024
  }
});

router.post('/', upload.single('file'), asyncHandler(async (req, res) => {
  const { file } = req;
  if (!file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  // Fix: Use req.user.userId instead of req.userId
  const creatorId = req.user.userId;

  const media = new Media({
    creatorId,
    // Fix: Set placeholder filePath to satisfy required validation
    filePath: 'pending',
    mediaType: file.mimetype.startsWith('video/') ? 'video' : 'image'
  });

  await media.save();

  const formData = new FormData();
  formData.append('file', file.buffer, file.originalname);
  formData.append('media_id', media._id.toString());

  const headers = formData.getHeaders();
  const response = await axios.post('http://localhost:5000/api/v1/embed_media_id', formData, {
    headers,
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
    timeout: 300000
  });

  if (response.data.status !== 'success') {
    await Media.deleteOne({ _id: media._id });
    return res.status(400).json({ error: response.data.message || 'Media ID embedding failed' });
  }

  media.filePath = response.data.filePath;
  await media.save();

  sendSuccess(res, { mediaId: media._id, url: response.data.url });
}));

router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'File too large. Maximum size is 100MB' });
    }
    return res.status(400).json({ error: error.message });
  }
  next(error);
});

module.exports = router;