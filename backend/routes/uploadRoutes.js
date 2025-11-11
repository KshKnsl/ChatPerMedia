const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const Media = require('../models/Media');

const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

router.post('/', upload.single('file'), async (req, res) => {
  try {
    const { file } = req;
    const creatorId = req.user ? req.user.userId : 'anonymous'; 
    const formData = new FormData();
    formData.append('file', file.buffer, file.originalname);
    formData.append('creator_id', creatorId);

    const response = await axios.post('http://localhost:5000/api/v1/watermark_source', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });

    if (response.data.status !== 'success') {
      return res.status(400).json({ error: response.data.message || 'Watermarking failed' });
    }

    const { masterFilePath } = response.data;

    // Save to DB
    const media = new Media({
      creatorId,
      masterFilePath,
      mediaType: file.mimetype.startsWith('video/') ? 'video' : file.mimetype.startsWith('image/') ? 'image' : 'audio'
    });
    await media.save();

    res.json({ mediaId: media._id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;