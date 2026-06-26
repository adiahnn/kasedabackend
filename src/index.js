require('dotenv').config()
const express      = require('express')
const cors         = require('cors')
const morgan       = require('morgan')
const connectDB    = require('./config/db')
const errorHandler = require('./middleware/errorHandler')

const authRoutes     = require('./routes/auth')
const usersRoutes    = require('./routes/users')
const listingsRoutes = require('./routes/listings')
const artisansRoutes = require('./routes/artisans')
const messagesRoutes = require('./routes/messages')
const ordersRoutes   = require('./routes/orders')
const adminRoutes    = require('./routes/admin')

connectDB()

const app = express()

const allowedOrigins = (process.env.CLIENT_URL || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean)

app.use(cors({
  origin: allowedOrigins.length ? allowedOrigins : '*',
  credentials: true,
}))
app.use(morgan('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

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
