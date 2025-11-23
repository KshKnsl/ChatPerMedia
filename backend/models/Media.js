const mongoose = require('mongoose');

const distributionPathSchema = new mongoose.Schema({
  recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatUser', required: true },
  sharedAt: { type: Date, default: Date.now },
  fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatUser' }
}, { _id: false });

const mediaSchema = new mongoose.Schema({
  filePath: { type: String, required: true },
  mediaType: { type: String, required: true },
  creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatUser', required: true },
  distributionPath: { type: [distributionPathSchema], default: [] }
}, { timestamps: true });

module.exports = mongoose.model('Media', mediaSchema);