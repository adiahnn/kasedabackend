const jwt          = require('jsonwebtoken')
const User         = require('../models/User')
const ArtisanProfile = require('../models/ArtisanProfile')

function signToken(id) {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' })
}

function stripHtml(str) {
  if (typeof str !== 'string') return str
  return str.replace(/<[^>]*>/g, '').trim()
}

function isValidEmail(email) {
  return typeof email === 'string' && /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email) && email.length <= 254
}

async function register(req, res, next) {
  try {
    const {
      fullName, email, phone, password, role, lga,
      bizName, bizType, bizCategory, bizYears, bizDescription, website,
      trade, expYears, skills, startingPrice, bio,
    } = req.body

    if (!['buyer', 'seller', 'artisan'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' })
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'Invalid email format' })
    }
    if (!fullName || typeof fullName !== 'string' || fullName.length > 200) {
      return res.status(400).json({ message: 'Full name is required (max 200 characters)' })
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' })
    }

    const files  = req.files || {}
    const fileUrl = (field) => files[field]?.[0]?.path

    const userData = {
      fullName: stripHtml(fullName), email: email.toLowerCase().trim(), phone, password, role, lga: stripHtml(lga),
      ...(role === 'seller' && {
        bizName: stripHtml(bizName), bizType: stripHtml(bizType), bizCategory: stripHtml(bizCategory), bizYears: stripHtml(bizYears), bizDescription: stripHtml(bizDescription), website,
        kasedaBizCertUrl: fileUrl('kasedaBizCert'),
        cacCertUrl:       fileUrl('cacCert'),
        tinDocUrl:        fileUrl('tinDoc'),
        bizExtraUrl:      fileUrl('bizExtra'),
      }),
      ...(role === 'artisan' && {
        trade: stripHtml(trade), expYears: stripHtml(expYears), bio: stripHtml(bio),
        startingPrice: startingPrice ? Number(startingPrice) : undefined,
        kasedaArtCertUrl:  fileUrl('kasedaArtCert'),
        tradeTestCertUrl:  fileUrl('tradeTestCert'),
        guildCertUrl:      fileUrl('guildCert'),
        portfolio1Url:     fileUrl('portfolio1'),
        portfolio2Url:     fileUrl('portfolio2'),
      }),
    }

    const user = await User.create(userData)

    if (role === 'artisan') {
      const parsedSkills = skills
        ? (Array.isArray(skills) ? skills : JSON.parse(skills))
        : []
      await ArtisanProfile.create({
        user:         user._id,
        lga,
        specialty:    trade,
        bio,
        skills:       parsedSkills,
        startingPrice: startingPrice ? Number(startingPrice) : undefined,
      })
    }

    const token = signToken(user._id)
    res.status(201).json({ token, user: user.toSafeObject() })
  } catch (err) {
    next(err)
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' })
    }
    const user = await User.findOne({ email: String(email) })
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }
    if (!user.isActive) {
      return res.status(403).json({ message: 'Account suspended' })
    }
    const token = signToken(user._id)
    res.json({ token, user: user.toSafeObject() })
  } catch (err) {
    next(err)
  }
}

async function getMe(req, res) {
  res.json({ user: req.user.toSafeObject() })
}

module.exports = { register, login, getMe }
