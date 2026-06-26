require('dotenv').config()
const express        = require('express')
const cors           = require('cors')
const morgan         = require('morgan')
const helmet         = require('helmet')
const rateLimit      = require('express-rate-limit')
const sanitize       = require('./middleware/sanitize')
const connectDB      = require('./config/db')
const errorHandler   = require('./middleware/errorHandler')

const authRoutes     = require('./routes/auth')
const usersRoutes    = require('./routes/users')
const listingsRoutes = require('./routes/listings')
const artisansRoutes = require('./routes/artisans')
const messagesRoutes = require('./routes/messages')
const ordersRoutes   = require('./routes/orders')
const adminRoutes    = require('./routes/admin')

connectDB()

const app = express()

app.use(helmet())

const allowedOrigins = (process.env.CLIENT_URL || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean)

app.use(cors({
  origin: allowedOrigins.length ? allowedOrigins : '*',
  credentials: true,
}))
app.use(morgan('dev'))
app.use(express.json({ limit: '500kb' }))
app.use(express.urlencoded({ extended: true, limit: '500kb' }))
app.use(sanitize)

const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 100,
  message: { message: 'Too many requests, please try again shortly' },
})
app.use('/api/auth/login', authLimiter)
app.use('/api/admin/auth/login', authLimiter)

app.get('/',       (_, res) => res.json({ status: 'ok', service: 'KASEDA Market API', version: '1.0.0' }))
app.get('/health', (_, res) => res.json({ status: 'ok', service: 'KASEDA Market API', version: '1.0.0' }))

app.use('/api/auth',     authRoutes)
app.use('/api/users',    usersRoutes)
app.use('/api/listings', listingsRoutes)
app.use('/api/artisans', artisansRoutes)
app.use('/api/messages', messagesRoutes)
app.use('/api/orders',   ordersRoutes)
app.use('/api/admin',    adminRoutes)

app.use(errorHandler)

if (require.main === module) {
  const PORT = process.env.PORT || 5000
  app.listen(PORT, () => console.log(`KASEDA Market API running on port ${PORT}`))
}

module.exports = app
