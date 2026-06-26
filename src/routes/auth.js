const router = require('express').Router()
const { register, login, getMe } = require('../controllers/authController')
const { protect } = require('../middleware/auth')
const { uploadDocument } = require('../config/cloudinary')

const registerUpload = uploadDocument.fields([
  { name: 'kasedaBizCert',  maxCount: 1 },
  { name: 'cacCert',        maxCount: 1 },
  { name: 'tinDoc',         maxCount: 1 },
  { name: 'bizExtra',       maxCount: 1 },
  { name: 'kasedaArtCert',  maxCount: 1 },
  { name: 'tradeTestCert',  maxCount: 1 },
  { name: 'guildCert',      maxCount: 1 },
  { name: 'portfolio1',     maxCount: 1 },
  { name: 'portfolio2',     maxCount: 1 },
])

router.post('/register', registerUpload, register)
router.post('/login',    login)
router.get('/me',        protect, getMe)

module.exports = router
