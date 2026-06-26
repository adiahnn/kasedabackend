const router = require('express').Router()
const {
  getListings, getListing, createListing, updateListing, deleteListing, getMyListings,
} = require('../controllers/listingsController')
const { protect, requireRole } = require('../middleware/auth')
const { uploadListingImages } = require('../config/cloudinary')

router.get('/',       getListings)
router.get('/mine',   protect, requireRole('seller', 'artisan'), getMyListings)
router.get('/:id',    getListing)
router.post('/',      protect, requireRole('seller', 'artisan'), uploadListingImages.array('images', 8), createListing)
router.put('/:id',    protect, requireRole('seller', 'artisan'), uploadListingImages.array('images', 8), updateListing)
router.delete('/:id', protect, requireRole('seller', 'artisan'), deleteListing)

module.exports = router
