const jwt = require('jsonwebtoken')

function adminProtect(req, res, next) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Admin authentication required' })
  }
  try {
    const token = header.split(' ')[1]
    const decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET)
    if (!decoded.isAdmin) {
      return res.status(403).json({ message: 'Admin access only' })
    }
    req.admin = decoded
    next()
  } catch {
    res.status(401).json({ message: 'Invalid or expired admin token' })
  }
}

module.exports = { adminProtect }
