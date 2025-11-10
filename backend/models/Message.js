const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  senderId: { type: String, required: true },
  receiverId: { type: String, required: true },
  ciphertext: { type: String, required: false },
  mediaUrl: { type: String, required: false },
  mediaType: { type: String, required: false },
  mediaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Media', required: false },
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);