const mongoose = require('mongoose')

const orderSchema = new mongoose.Schema({
  buyer:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  seller:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  listing:   { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
  amount:    { type: Number, required: true },
  status:    { type: String, enum: ['pending', 'paid', 'shipped', 'completed', 'cancelled', 'refunded', 'disputed'], default: 'pending' },
  paymentMethod: { type: String, enum: ['card', 'bank_transfer'] },
  paymentRef: { type: String },
  deliveryAddress: { type: String },
}, { timestamps: true })

module.exports = mongoose.model('Order', orderSchema)
