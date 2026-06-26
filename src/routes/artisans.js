const router = require('express').Router()
const { getArtisans, getArtisan, updateArtisanProfile, addReview } = require('../controllers/artisansController')
const { protect, requireRole } = require('../middleware/auth')
const { uploadListingImages } = require('../config/cloudinary')

router.get('/',                   getArtisans)
router.get('/:userId',            getArtisan)
router.put('/me',                 protect, requireRole('artisan'), uploadListingImages.array('portfolio', 6), updateArtisanProfile)
router.post('/:userId/reviews',   protect, requireRole('buyer'), addReview)

module.exports = router
