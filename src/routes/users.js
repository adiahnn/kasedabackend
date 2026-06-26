const router = require('express').Router()
const { updateProfile, submitVerification, getUser } = require('../controllers/usersController')
const { protect } = require('../middleware/auth')
const { uploadAvatar, uploadDocument } = require('../config/cloudinary')

router.get('/:id',                protect, getUser)
router.put('/me',                 protect, uploadAvatar.single('avatar'), updateProfile)
router.post('/me/verify',         protect, uploadDocument.single('document'), submitVerification)

module.exports = router
