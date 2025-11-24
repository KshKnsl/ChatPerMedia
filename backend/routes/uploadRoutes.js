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

  const creatorId = req.user.userId;

  const media = new Media({
    creatorId,
    filePath: 'pending',
    mediaType: file.mimetype.startsWith('video/') ? 'video' : 'image'
  });

  await media.save();

  const nameMatch = file.originalname && file.originalname.match(/^([a-fA-F0-9]{24})_/);
  let providedId = nameMatch ? nameMatch[1] : null;

  if (!providedId) {
    try {
      const detectForm = new FormData();
      detectForm.append('file', file.buffer, file.originalname);
      const detectHeaders = detectForm.getHeaders();
      const detectRes = await axios.post('http://127.0.0.1:5000/api/v1/extract_media_id', detectForm, {
        headers: detectHeaders,
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        timeout: 120000
      });
      if (detectRes.data && detectRes.data.status === 'success' && detectRes.data.media_id) {
        providedId = detectRes.data.media_id;
      }
    } catch (e) {
      console.warn('[UPLOAD] Extraction attempt failed or microservice not reachable:', e.message);
    }
  }
  const formData = new FormData();
  formData.append('file', file.buffer, file.originalname);
  formData.append('media_id', providedId || media._id.toString());

  const headers = formData.getHeaders();
  const response = await axios.post('http://127.0.0.1:5000/api/v1/embed_media_id', formData, {
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