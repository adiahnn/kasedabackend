const mongoose = require('mongoose')

let isConnected = false

async function connectDB() {
  if (isConnected) return
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI)
    isConnected = true
    console.log(`MongoDB connected: ${conn.connection.host}`)
  } catch (err) {
    console.error('MongoDB connection error:', err.message)
    throw err
  }
}

module.exports = connectDB
