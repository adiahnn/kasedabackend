function errorHandler(err, req, res, next) {
  const status = err.statusCode || 500
  const message = err.message || 'Server error'

  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message)
    return res.status(400).json({ message: 'Validation failed', errors })
  }
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0]
    return res.status(409).json({ message: `${field} already exists` })
  }

  console.error(err)
  res.status(status).json({ message })
}

module.exports = errorHandler
