const mongoose = require('mongoose')

const attachmentSchema = new mongoose.Schema({
  name:    { type: String },
  url:     { type: String },
  isImage: { type: Boolean, default: false },
  publicId: { type: String },
})

const messageSchema = new mongoose.Schema({
  conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
  from:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text:         { type: String, default: '' },
  attachments:  [attachmentSchema],
  readBy:       [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true })

messageSchema.index({ conversation: 1, createdAt: 1 })

module.exports = mongoose.model('Message', messageSchema)
