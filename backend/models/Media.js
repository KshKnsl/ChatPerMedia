const mongoose = require('mongoose');

const forensicEmbedSchema = new mongoose.Schema({
  recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatUser', required: true },
  recipientFilePath: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
}, { _id: false });

const mediaSchema = new mongoose.Schema({
  masterFilePath: { type: String, required: true },
  mediaType: { type: String, required: true }, // 'video', 'image', 'audio'
  creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatUser', required: true },
  sourceEmbedded: { type: Boolean, default: true },
  forensicEmbeds: { type: [forensicEmbedSchema], default: [] }
}, { timestamps: true });

module.exports = mongoose.model('Media', mediaSchema);