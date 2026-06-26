const jwt          = require('jsonwebtoken')
const User         = require('../models/User')
const Listing      = require('../models/Listing')
const Order        = require('../models/Order')
const ArtisanProfile = require('../models/ArtisanProfile')
const Verification = require('../models/Verification')
const Settings     = require('../models/Settings')

/* ── helpers ─────────────────────────────────────────────────── */

function signAdminToken() {
  return jwt.sign({ isAdmin: true }, process.env.ADMIN_JWT_SECRET, { expiresIn: '12h' })
}

function startOfMonth() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

/* ════════════════════════════════════════════════════════════════
   AUTH
════════════════════════════════════════════════════════════════ */

async function adminLogin(req, res) {
  const { email, password } = req.body
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password required' })
  }
  if (
    email    !== process.env.ADMIN_EMAIL ||
    password !== process.env.ADMIN_PASSWORD
  ) {
    return res.status(401).json({ message: 'Invalid admin credentials' })
  }
  const token = signAdminToken()
  res.json({
    token,
    admin: { name: 'KASEDA Admin', email: process.env.ADMIN_EMAIL },
  })
}

async function adminMe(req, res) {
  res.json({ admin: { name: 'KASEDA Admin', email: process.env.ADMIN_EMAIL } })
}

/* ════════════════════════════════════════════════════════════════
   STATS
════════════════════════════════════════════════════════════════ */

async function getStats(req, res, next) {
  try {
    const [
      totalUsers, buyers, sellers, artisans,
      pendingVerifications, activeListings, verifiedUsers,
      newUsersThisMonth, orders,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'buyer' }),
      User.countDocuments({ role: 'seller' }),
      User.countDocuments({ role: 'artisan' }),
      Verification.countDocuments({ status: 'pending' }),
      Listing.countDocuments({ status: 'active' }),
      User.countDocuments({ verificationStatus: 'verified' }),
      User.countDocuments({ createdAt: { $gte: startOfMonth() } }),
      Order.find({ status: 'completed' }).select('amount'),
    ])

    const totalRevenue = orders.reduce((s, o) => s + (o.amount || 0), 0)
    const totalOrders  = await Order.countDocuments()

    res.json({
      totalUsers, buyers, sellers, artisans,
      pendingVerifications, activeListings,
      totalOrders, totalRevenue,
      verifiedUsers, newUsersThisMonth,
    })
  } catch (err) { next(err) }
}

/* ════════════════════════════════════════════════════════════════
   USERS
════════════════════════════════════════════════════════════════ */

async function getUsers(req, res, next) {
  try {
    const { role, verificationStatus, search, page = 1, limit = 50 } = req.query
    const filter = {}
    if (role)               filter.role               = role
    if (verificationStatus) filter.verificationStatus = verificationStatus
    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email:    { $regex: search, $options: 'i' } },
        { lga:      { $regex: search, $options: 'i' } },
      ]
    }

    const skip  = (Number(page) - 1) * Number(limit)
    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-password -verificationDoc')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      User.countDocuments(filter),
    ])

    // Attach listing + order counts
    const userIds = users.map(u => u._id)
    const [listingCounts, orderCounts] = await Promise.all([
      Listing.aggregate([
        { $match: { seller: { $in: userIds } } },
        { $group: { _id: '$seller', count: { $sum: 1 } } },
      ]),
      Order.aggregate([
        { $match: { $or: [{ buyer: { $in: userIds } }, { seller: { $in: userIds } }] } },
        { $group: { _id: '$buyer', count: { $sum: 1 } } },
      ]),
    ])

    const lcMap = Object.fromEntries(listingCounts.map(x => [x._id.toString(), x.count]))
    const ocMap = Object.fromEntries(orderCounts.map(x => [x._id.toString(), x.count]))

    const result = users.map(u => ({
      ...u.toObject(),
      totalListings: lcMap[u._id.toString()] ?? 0,
      totalOrders:   ocMap[u._id.toString()] ?? 0,
    }))

    res.json({ users: result, total, page: Number(page), pages: Math.ceil(total / Number(limit)) })
  } catch (err) { next(err) }
}

async function getUserById(req, res, next) {
  try {
    const user = await User.findById(req.params.id).select('-password')
    if (!user) return res.status(404).json({ message: 'User not found' })

    const [totalListings, totalOrders, artisanProfile, verifications] = await Promise.all([
      Listing.countDocuments({ seller: user._id }),
      Order.countDocuments({ $or: [{ buyer: user._id }, { seller: user._id }] }),
      ArtisanProfile.findOne({ user: user._id }),
      Verification.find({ user: user._id }).sort({ createdAt: -1 }),
    ])

    res.json({
      user: { ...user.toObject(), totalListings, totalOrders },
      artisanProfile,
      verifications,
    })
  } catch (err) { next(err) }
}

async function suspendUser(req, res, next) {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    ).select('-password -verificationDoc')
    if (!user) return res.status(404).json({ message: 'User not found' })
    res.json({ user: user.toObject() })
  } catch (err) { next(err) }
}

async function activateUser(req, res, next) {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: true },
      { new: true }
    ).select('-password -verificationDoc')
    if (!user) return res.status(404).json({ message: 'User not found' })
    res.json({ user: user.toObject() })
  } catch (err) { next(err) }
}

/* ════════════════════════════════════════════════════════════════
   VERIFICATIONS
════════════════════════════════════════════════════════════════ */

async function getVerifications(req, res, next) {
  try {
    const { status } = req.query
    const filter = status ? { status } : {}
    const verifications = await Verification.find(filter)
      .populate('user', '-password -verificationDoc')
      .sort({ createdAt: -1 })
    res.json({ verifications })
  } catch (err) { next(err) }
}

async function getVerificationById(req, res, next) {
  try {
    const verif = await Verification.findById(req.params.id)
      .populate('user', '-password')
    if (!verif) return res.status(404).json({ message: 'Verification not found' })

    const [totalListings, totalOrders] = await Promise.all([
      Listing.countDocuments({ seller: verif.user._id }),
      Order.countDocuments({ $or: [{ buyer: verif.user._id }, { seller: verif.user._id }] }),
    ])

    res.json({
      verification: verif,
      user: { ...verif.user.toObject(), totalListings, totalOrders },
    })
  } catch (err) { next(err) }
}

async function approveVerification(req, res, next) {
  try {
    const verif = await Verification.findById(req.params.id)
    if (!verif) return res.status(404).json({ message: 'Verification not found' })
    if (verif.status !== 'pending') {
      return res.status(400).json({ message: 'Verification already reviewed' })
    }

    verif.status     = 'approved'
    verif.reviewedAt = new Date()
    await verif.save()

    await User.findByIdAndUpdate(verif.user, { verificationStatus: 'verified' })

    res.json({ verification: verif, message: 'Verification approved' })
  } catch (err) { next(err) }
}

async function rejectVerification(req, res, next) {
  try {
    const { reason } = req.body
    if (!reason?.trim()) return res.status(400).json({ message: 'Rejection reason required' })

    const verif = await Verification.findById(req.params.id)
    if (!verif) return res.status(404).json({ message: 'Verification not found' })
    if (verif.status !== 'pending') {
      return res.status(400).json({ message: 'Verification already reviewed' })
    }

    verif.status          = 'rejected'
    verif.rejectionReason = reason.trim()
    verif.reviewedAt      = new Date()
    await verif.save()

    await User.findByIdAndUpdate(verif.user, { verificationStatus: 'rejected' })

    res.json({ verification: verif, message: 'Verification rejected' })
  } catch (err) { next(err) }
}

/* ════════════════════════════════════════════════════════════════
   LISTINGS
════════════════════════════════════════════════════════════════ */

async function getListings(req, res, next) {
  try {
    const { status, category, search, page = 1, limit = 50 } = req.query
    const filter = {}
    if (status)   filter.status   = status
    if (category) filter.category = category
    if (search) {
      filter.$or = [
        { title:      { $regex: search, $options: 'i' } },
        { sellerName: { $regex: search, $options: 'i' } },
        { lga:        { $regex: search, $options: 'i' } },
      ]
    }

    const skip = (Number(page) - 1) * Number(limit)
    const [listings, total] = await Promise.all([
      Listing.find(filter)
        .populate('seller', 'fullName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Listing.countDocuments(filter),
    ])

    res.json({ listings, total, page: Number(page), pages: Math.ceil(total / Number(limit)) })
  } catch (err) { next(err) }
}

async function suspendListing(req, res, next) {
  try {
    const listing = await Listing.findByIdAndUpdate(
      req.params.id,
      { status: 'suspended' },
      { new: true }
    )
    if (!listing) return res.status(404).json({ message: 'Listing not found' })
    res.json({ listing })
  } catch (err) { next(err) }
}

async function activateListing(req, res, next) {
  try {
    const listing = await Listing.findByIdAndUpdate(
      req.params.id,
      { status: 'active' },
      { new: true }
    )
    if (!listing) return res.status(404).json({ message: 'Listing not found' })
    res.json({ listing })
  } catch (err) { next(err) }
}

async function deleteListing(req, res, next) {
  try {
    const listing = await Listing.findByIdAndDelete(req.params.id)
    if (!listing) return res.status(404).json({ message: 'Listing not found' })
    res.json({ message: 'Listing deleted' })
  } catch (err) { next(err) }
}

/* ════════════════════════════════════════════════════════════════
   ARTISANS
════════════════════════════════════════════════════════════════ */

async function getArtisans(req, res, next) {
  try {
    const { search, category, page = 1, limit = 50 } = req.query
    const userFilter = { role: 'artisan' }
    if (search) {
      userFilter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { lga:      { $regex: search, $options: 'i' } },
        { trade:    { $regex: search, $options: 'i' } },
      ]
    }

    const skip = (Number(page) - 1) * Number(limit)
    const [artisanUsers, total] = await Promise.all([
      User.find(userFilter)
        .select('-password -verificationDoc')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      User.countDocuments(userFilter),
    ])

    // Attach artisan profiles
    const userIds  = artisanUsers.map(u => u._id)
    const profiles = await ArtisanProfile.find({ user: { $in: userIds } })
    const pMap     = Object.fromEntries(profiles.map(p => [p.user.toString(), p]))

    const result = artisanUsers.map(u => ({
      ...u.toObject(),
      artisanProfile: pMap[u._id.toString()] ?? null,
    }))

    res.json({ artisans: result, total, page: Number(page), pages: Math.ceil(total / Number(limit)) })
  } catch (err) { next(err) }
}

async function suspendArtisan(req, res, next) {
  try {
    const user = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'artisan' },
      { isActive: false },
      { new: true }
    ).select('-password -verificationDoc')
    if (!user) return res.status(404).json({ message: 'Artisan not found' })
    res.json({ user: user.toObject() })
  } catch (err) { next(err) }
}

async function activateArtisan(req, res, next) {
  try {
    const user = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'artisan' },
      { isActive: true },
      { new: true }
    ).select('-password -verificationDoc')
    if (!user) return res.status(404).json({ message: 'Artisan not found' })
    res.json({ user: user.toObject() })
  } catch (err) { next(err) }
}

/* ════════════════════════════════════════════════════════════════
   ORDERS
════════════════════════════════════════════════════════════════ */

async function getOrders(req, res, next) {
  try {
    const { status, page = 1, limit = 50 } = req.query
    const filter = status ? { status } : {}
    const skip   = (Number(page) - 1) * Number(limit)

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('buyer',   'fullName email')
        .populate('seller',  'fullName email')
        .populate('listing', 'title price')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Order.countDocuments(filter),
    ])

    res.json({ orders, total, page: Number(page), pages: Math.ceil(total / Number(limit)) })
  } catch (err) { next(err) }
}

async function resolveOrder(req, res, next) {
  try {
    const { resolution } = req.body
    if (!['completed', 'refunded'].includes(resolution)) {
      return res.status(400).json({ message: "resolution must be 'completed' or 'refunded'" })
    }

    const order = await Order.findOneAndUpdate(
      { _id: req.params.id, status: 'disputed' },
      { status: resolution },
      { new: true }
    ).populate('buyer seller listing')

    if (!order) return res.status(404).json({ message: 'Disputed order not found' })
    res.json({ order, message: `Order resolved as ${resolution}` })
  } catch (err) { next(err) }
}

/* ════════════════════════════════════════════════════════════════
   SETTINGS
════════════════════════════════════════════════════════════════ */

async function getSettings(req, res, next) {
  try {
    let settings = await Settings.findOne()
    if (!settings) settings = await Settings.create({})
    res.json({ settings })
  } catch (err) { next(err) }
}

async function updateSettings(req, res, next) {
  try {
    const allowed = ['platformName', 'tagline', 'supportEmail', 'transactionFeePercent', 'categories', 'lgas', 'features']
    const update  = {}
    allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k] })

    const settings = await Settings.findOneAndUpdate(
      {},
      { $set: update },
      { new: true, upsert: true }
    )
    res.json({ settings, message: 'Settings updated' })
  } catch (err) { next(err) }
}

module.exports = {
  adminLogin, adminMe,
  getStats,
  getUsers, getUserById, suspendUser, activateUser,
  getVerifications, getVerificationById, approveVerification, rejectVerification,
  getListings, suspendListing, activateListing, deleteListing,
  getArtisans, suspendArtisan, activateArtisan,
  getOrders, resolveOrder,
  getSettings, updateSettings,
}
