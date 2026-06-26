const mongoose = require('mongoose')

const verificationSchema = new mongoose.Schema({
  user:            { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  idType:          { type: String, required: true },
  documentUrl:     { type: String, required: true },
  status:          { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  rejectionReason: { type: String },
  reviewedAt:      { type: Date },
}, { timestamps: true })

module.exports = mongoose.model('Verification', verificationSchema)
