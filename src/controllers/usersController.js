const User         = require('../models/User')
const Verification = require('../models/Verification')
const { cloudinary } = require('../config/cloudinary')

async function updateProfile(req, res, next) {
  try {
    const allowed = ['fullName', 'phone', 'bio', 'lga', 'skills']
    allowed.forEach(k => { if (req.body[k] !== undefined) req.user[k] = req.body[k] })
    if (req.file) {
      if (req.user.avatar) {
        const old = req.user.avatar.split('/').slice(-2).join('/').replace(/\.[^.]+$/, '')
        await cloudinary.uploader.destroy(old).catch(() => {})
      }
      req.user.avatar = req.file.path
    }
    await req.user.save()
    res.json({ user: req.user.toSafeObject() })
  } catch (err) {
    next(err)
  }
}

async function submitVerification(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ message: 'Document required' })
    const { idType } = req.body
    if (!idType) return res.status(400).json({ message: 'idType is required' })

    req.user.verificationDoc    = req.file.path
    req.user.verificationStatus = 'pending'
    await req.user.save()

    await Verification.create({
      user:        req.user._id,
      idType,
      documentUrl: req.file.path,
    })

    res.json({ message: 'Verification submitted', status: 'pending' })
  } catch (err) {
    next(err)
  }
}

async function getUser(req, res, next) {
  try {
    const user = await User.findById(req.params.id).select('-password -verificationDoc')
    if (!user) return res.status(404).json({ message: 'User not found' })
    res.json(user)
  } catch (err) {
    next(err)
  }
}

module.exports = { updateProfile, submitVerification, getUser }
