const jwt = require('jsonwebtoken')
const User = require('../models/User')

async function protect(req, res, next) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Not authenticated' })
  }
  try {
    const token = header.split(' ')[1]
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = await User.findById(decoded.id).select('-password')
    if (!req.user) return res.status(401).json({ message: 'User not found' })
    if (!req.user.isActive) return res.status(403).json({ message: 'Account suspended' })
    next()
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' })
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ message: 'Access denied' })
    }
    next()
  }
}

module.exports = { protect, requireRole }
