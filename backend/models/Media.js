const mongoose = require('mongoose');

const distributionPathSchema = new mongoose.Schema({
  recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatUser', required: true },
  sharedAt: { type: Date, default: Date.now },
  fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatUser' } // Who shared it to this recipient
}, { _id: false });

const mediaSchema = new mongoose.Schema({
  filePath: { type: String, required: true }, // Path to file with embedded media ID
  mediaType: { type: String, required: true }, // 'video', 'image'
  creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatUser', required: true },
  distributionPath: { type: [distributionPathSchema], default: [] }
}, { timestamps: true });

module.exports = mongoose.model('Media', mediaSchema);