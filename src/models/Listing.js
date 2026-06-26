const mongoose = require('mongoose')

const listingSchema = new mongoose.Schema({
  seller:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sellerName:   { type: String },
  sellerVerified: { type: Boolean, default: false },
  title:        { type: String, required: true, trim: true },
  description:  { type: String, required: true },
  price:        { type: Number, required: true, min: 0 },
  negotiable:   { type: Boolean, default: false },
  category:     { type: String, required: true },
  type:         { type: String, enum: ['product', 'service'], required: true },
  images:       [{ type: String }],
  location:     { type: String },
  lga:          { type: String },
  status:       { type: String, enum: ['active', 'sold', 'inactive', 'suspended'], default: 'active' },
  reportCount:  { type: Number, default: 0 },
  isFlagged:    { type: Boolean, default: false },
  views:        { type: Number, default: 0 },
  likes:        { type: Number, default: 0 },
  tags:         [{ type: String }],
}, { timestamps: true })

listingSchema.index({ category: 1, type: 1, status: 1 })
listingSchema.index({ title: 'text', description: 'text', tags: 'text' })

module.exports = mongoose.model('Listing', listingSchema)
