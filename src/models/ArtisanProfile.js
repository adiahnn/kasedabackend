const mongoose = require('mongoose')

const reviewSchema = new mongoose.Schema({
  reviewer:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name:      { type: String },
  rating:    { type: Number, min: 1, max: 5 },
  comment:   { type: String },
}, { timestamps: true })

const artisanProfileSchema = new mongoose.Schema({
  user:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  specialty:    { type: String },
  skills:       [{ type: String }],
  bio:          { type: String },
  available:    { type: Boolean, default: true },
  location:     { type: String },
  lga:          { type: String },
  rating:       { type: Number, default: 0 },
  reviewCount:  { type: Number, default: 0 },
  reviews:      [reviewSchema],
  portfolio:    [{ type: String }],
  startingPrice: { type: Number },
}, { timestamps: true })

module.exports = mongoose.model('ArtisanProfile', artisanProfileSchema)
