const mongoose = require('mongoose')
const bcrypt   = require('bcryptjs')

const userSchema = new mongoose.Schema({
  fullName:           { type: String, required: true, trim: true },
  email:              { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone:              { type: String, trim: true },
  password:           { type: String, required: true, minlength: 6 },
  role:               { type: String, enum: ['buyer', 'seller', 'artisan'], required: true },
  lga:                { type: String },
  avatar:             { type: String },
  bio:                { type: String },
  skills:             [{ type: String }],
  verificationStatus: { type: String, enum: ['unverified', 'pending', 'verified', 'rejected'], default: 'unverified' },
  verificationDoc:    { type: String },
  rating:             { type: Number, default: 0 },
  reviewCount:        { type: Number, default: 0 },
  isActive:           { type: Boolean, default: true },

  // Seller profile fields (sent on registration)
  bizName:            { type: String },
  bizType:            { type: String },
  bizCategory:        { type: String },
  bizYears:           { type: String },
  bizDescription:     { type: String },
  website:            { type: String },

  // Artisan profile extras
  trade:              { type: String },
  expYears:           { type: String },
  startingPrice:      { type: Number },
  bio:                { type: String },

  // Seller document URLs
  kasedaBizCertUrl:   { type: String },
  cacCertUrl:         { type: String },
  tinDocUrl:          { type: String },
  bizExtraUrl:        { type: String },

  // Artisan document URLs
  kasedaArtCertUrl:   { type: String },
  tradeTestCertUrl:   { type: String },
  guildCertUrl:       { type: String },
  portfolio1Url:      { type: String },
  portfolio2Url:      { type: String },
}, { timestamps: true })

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return
  this.password = await bcrypt.hash(this.password, 12)
})

userSchema.methods.matchPassword = function (plain) {
  return bcrypt.compare(plain, this.password)
}

userSchema.methods.toSafeObject = function () {
  const obj = this.toObject()
  delete obj.password
  delete obj.verificationDoc
  return obj
}

module.exports = mongoose.model('User', userSchema)
