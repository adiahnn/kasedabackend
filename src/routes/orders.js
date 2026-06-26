const router = require('express').Router()
const { createOrder, confirmPayment, getMyOrders, getSellerOrders } = require('../controllers/ordersController')
const { protect, requireRole } = require('../middleware/auth')

router.post('/',                   protect, requireRole('buyer'), createOrder)
router.put('/:id/confirm-payment', protect, requireRole('buyer'), confirmPayment)
router.get('/mine',                protect, requireRole('buyer'), getMyOrders)
router.get('/seller',              protect, requireRole('seller'), getSellerOrders)

module.exports = router
