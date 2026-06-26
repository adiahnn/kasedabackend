const Listing = require('../models/Listing')
const { cloudinary } = require('../config/cloudinary')

async function getListings(req, res, next) {
  try {
    const { category, type, lga, search, page = 1, limit = 20 } = req.query
    const filter = { status: 'active' }
    if (category) filter.category = String(category)
    if (type)     filter.type = String(type)
    if (lga)      filter.lga = String(lga)
    if (search)   filter.$text = { $search: String(search) }

    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100)
    const skip  = (Math.max(Number(page) || 1, 1) - 1) * safeLimit
    const [listings, total] = await Promise.all([
      Listing.find(filter).sort({ createdAt: -1 }).skip(skip).limit(safeLimit).populate('seller', 'fullName avatar verificationStatus'),
      Listing.countDocuments(filter),
    ])
    res.json({ listings, total, page: Number(page), pages: Math.ceil(total / safeLimit) })
  } catch (err) {
    next(err)
  }
}

async function getListing(req, res, next) {
  try {
    const listing = await Listing.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    ).populate('seller', 'fullName avatar verificationStatus rating reviewCount lga')
    if (!listing) return res.status(404).json({ message: 'Listing not found' })
    res.json(listing)
  } catch (err) {
    next(err)
  }
}

function stripHtml(str) {
  if (typeof str !== 'string') return str
  return str.replace(/<[^>]*>/g, '').trim()
}

async function createListing(req, res, next) {
  try {
    const { title, description, price, negotiable, category, type, location, lga, tags } = req.body
    const images = req.files?.map(f => f.path) ?? []
    const listing = await Listing.create({
      seller: req.user._id,
      sellerName: req.user.fullName,
      sellerVerified: req.user.verificationStatus === 'verified',
      title: stripHtml(title), description: stripHtml(description),
      price: Number(price),
      negotiable: negotiable === true || negotiable === 'true',
      category: stripHtml(category), type, images, location: stripHtml(location), lga: stripHtml(lga),
      tags: Array.isArray(tags) ? tags.map(stripHtml) : (tags ? JSON.parse(tags).map(stripHtml) : []),
    })
    res.status(201).json(listing)
  } catch (err) {
    next(err)
  }
}

async function updateListing(req, res, next) {
  try {
    const listing = await Listing.findById(req.params.id)
    if (!listing) return res.status(404).json({ message: 'Listing not found' })
    if (listing.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not your listing' })
    }
    const allowed = ['title', 'description', 'price', 'negotiable', 'category', 'location', 'lga', 'tags']
    allowed.forEach(k => { if (req.body[k] !== undefined) listing[k] = req.body[k] })
    if (req.files?.length) listing.images = req.files.map(f => f.path)
    await listing.save()
    res.json(listing)
  } catch (err) {
    next(err)
  }
}

async function deleteListing(req, res, next) {
  try {
    const listing = await Listing.findById(req.params.id)
    if (!listing) return res.status(404).json({ message: 'Listing not found' })
    if (listing.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not your listing' })
    }
    for (const url of listing.images) {
      const publicId = url.split('/').slice(-2).join('/').replace(/\.[^.]+$/, '')
      await cloudinary.uploader.destroy(publicId).catch(() => {})
    }
    await listing.deleteOne()
    res.json({ message: 'Listing deleted' })
  } catch (err) {
    next(err)
  }
}

async function getMyListings(req, res, next) {
  try {
    const listings = await Listing.find({ seller: req.user._id }).sort({ createdAt: -1 })
    res.json(listings)
  } catch (err) {
    next(err)
  }
}

module.exports = { getListings, getListing, createListing, updateListing, deleteListing, getMyListings }
