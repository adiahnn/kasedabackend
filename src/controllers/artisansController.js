const ArtisanProfile = require('../models/ArtisanProfile')
const User           = require('../models/User')

async function getArtisans(req, res, next) {
  try {
    const { lga, skill, page = 1, limit = 20 } = req.query
    const filter = {}
    if (lga)   filter.lga   = String(lga)
    if (skill) filter.skills = { $in: [String(skill)] }

    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100)
    const skip = (Math.max(Number(page) || 1, 1) - 1) * safeLimit
    const [artisans, total] = await Promise.all([
      ArtisanProfile.find(filter)
        .sort({ rating: -1 })
        .skip(skip)
        .limit(safeLimit)
        .populate('user', 'fullName avatar verificationStatus'),
      ArtisanProfile.countDocuments(filter),
    ])
    res.json({ artisans, total, page: Number(page), pages: Math.ceil(total / safeLimit) })
  } catch (err) {
    next(err)
  }
}

async function getArtisan(req, res, next) {
  try {
    const profile = await ArtisanProfile.findOne({ user: req.params.userId })
      .populate('user', 'fullName avatar verificationStatus lga')
    if (!profile) return res.status(404).json({ message: 'Artisan not found' })
    res.json(profile)
  } catch (err) {
    next(err)
  }
}

async function updateArtisanProfile(req, res, next) {
  try {
    const allowed = ['specialty', 'skills', 'bio', 'available', 'location', 'lga', 'startingPrice']
    const profile = await ArtisanProfile.findOne({ user: req.user._id })
    if (!profile) return res.status(404).json({ message: 'Artisan profile not found' })
    allowed.forEach(k => { if (req.body[k] !== undefined) profile[k] = req.body[k] })
    if (req.files?.length) profile.portfolio = [...profile.portfolio, ...req.files.map(f => f.path)]
    await profile.save()
    res.json(profile)
  } catch (err) {
    next(err)
  }
}

async function addReview(req, res, next) {
  try {
    const { rating, comment } = req.body
    if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be a number between 1 and 5' })
    }
    const profile = await ArtisanProfile.findOne({ user: req.params.userId })
    if (!profile) return res.status(404).json({ message: 'Artisan not found' })
    if (profile.reviews.some(r => r.reviewer.equals(req.user._id))) {
      return res.status(400).json({ message: 'You have already reviewed this artisan' })
    }
    profile.reviews.push({ reviewer: req.user._id, name: req.user.fullName, rating, comment })
    const avg = profile.reviews.reduce((s, r) => s + r.rating, 0) / profile.reviews.length
    profile.rating      = Math.round(avg * 10) / 10
    profile.reviewCount = profile.reviews.length
    await profile.save()
    res.json({ rating: profile.rating, reviewCount: profile.reviewCount })
  } catch (err) {
    next(err)
  }
}

module.exports = { getArtisans, getArtisan, updateArtisanProfile, addReview }
