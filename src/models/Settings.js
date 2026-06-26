const mongoose = require('mongoose')

const settingsSchema = new mongoose.Schema({
  platformName:      { type: String, default: 'KASEDA Market' },
  tagline:           { type: String, default: "Katsina's Official Business Marketplace" },
  supportEmail:      { type: String, default: 'support@kaseda.gov.ng' },
  transactionFeePercent: { type: Number, default: 2.5 },
  categories: {
    type: [String],
    default: ['Agriculture', 'Fashion', 'Electronics', 'Food', 'Vehicles', 'Crafts',
              'Building Materials', 'Health & Beauty', 'Services', 'Others'],
  },
  lgas: {
    type: [String],
    default: ['Bakori', 'Batagarawa', 'Batsari', 'Baure', 'Bindawa', 'Charanchi',
              'Dan Musa', 'Dandume', 'Danja', 'Dan Isa', 'Daura', 'Dutsi', 'Dutsin-Ma',
              'Faskari', 'Funtua', 'Ingawa', 'Jibia', 'Kafur', 'Kaita', 'Kankara',
              'Kankia', 'Katsina', 'Kurfi', 'Kusada', "Mai'Adua", 'Malumfashi', 'Mani',
              'Mashi', 'Musawa', 'Rimi', 'Sabuwa', 'Safana', 'Sandamu', 'Zango'],
  },
  features: {
    artisanMarketplace: { type: Boolean, default: true },
    escrowPayment:      { type: Boolean, default: true },
    inAppMessaging:     { type: Boolean, default: true },
    buyerReviews:       { type: Boolean, default: true },
    sellerAnalytics:    { type: Boolean, default: false },
    pushNotifications:  { type: Boolean, default: false },
  },
}, { timestamps: true })

module.exports = mongoose.model('Settings', settingsSchema)
