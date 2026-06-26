const jwt          = require('jsonwebtoken')
const User         = require('../models/User')
const ArtisanProfile = require('../models/ArtisanProfile')

function signToken(id) {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' })
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

    const files  = req.files || {}
    const fileUrl = (field) => files[field]?.[0]?.path

    const userData = {
      fullName, email, phone, password, role, lga,
      ...(role === 'seller' && {
        bizName, bizType, bizCategory, bizYears, bizDescription, website,
        kasedaBizCertUrl: fileUrl('kasedaBizCert'),
        cacCertUrl:       fileUrl('cacCert'),
        tinDocUrl:        fileUrl('tinDoc'),
        bizExtraUrl:      fileUrl('bizExtra'),
      }),
      ...(role === 'artisan' && {
        trade, expYears, bio,
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
