function errorHandler(err, req, res, next) {
  const status = err.statusCode || 500

  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message)
    return res.status(400).json({ message: 'Validation failed', errors })
  }
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0]
    return res.status(409).json({ message: `${field} already exists` })
  }
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    return res.status(400).json({ message: 'Invalid ID format' })
  }

  console.error(err)
  const message = status === 500 ? 'Internal server error' : (err.message || 'Server error')
  res.status(status).json({ message })
}

module.exports = errorHandler
