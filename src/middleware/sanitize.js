function stripDollarKeys(obj) {
  if (obj === null || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(stripDollarKeys)
  const clean = {}
  for (const key of Object.keys(obj)) {
    if (key.startsWith('$')) continue
    clean[key] = stripDollarKeys(obj[key])
  }
  return clean
}

function sanitize(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = stripDollarKeys(req.body)
  }
  next()
}

module.exports = sanitize
