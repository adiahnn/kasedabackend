const Order   = require('../models/Order')
const Listing = require('../models/Listing')

async function createOrder(req, res, next) {
  try {
    const { listingId, paymentMethod, deliveryAddress } = req.body
    const listing = await Listing.findById(listingId)
    if (!listing || listing.type !== 'product') {
      return res.status(400).json({ message: 'Invalid listing' })
    }
    const order = await Order.create({
      buyer: req.user._id,
      seller: listing.seller,
      listing: listing._id,
      amount: listing.price,
      paymentMethod,
      deliveryAddress,
      status: 'pending',
    })
    res.status(201).json(order)
  } catch (err) {
    next(err)
  }
}

async function confirmPayment(req, res, next) {
  try {
    const order = await Order.findById(req.params.id)
    if (!order) return res.status(404).json({ message: 'Order not found' })
    if (order.buyer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not your order' })
    }
    order.status     = 'paid'
    order.paymentRef = req.body.paymentRef ?? `PAY-${Date.now()}`
    await order.save()
    res.json(order)
  } catch (err) {
    next(err)
  }
}

async function getMyOrders(req, res, next) {
  try {
    const orders = await Order.find({ buyer: req.user._id })
      .sort({ createdAt: -1 })
      .populate('listing', 'title images price')
      .populate('seller', 'fullName avatar')
    res.json(orders)
  } catch (err) {
    next(err)
  }
}

async function getSellerOrders(req, res, next) {
  try {
    const orders = await Order.find({ seller: req.user._id })
      .sort({ createdAt: -1 })
      .populate('listing', 'title images price')
      .populate('buyer', 'fullName avatar')
    res.json(orders)
  } catch (err) {
    next(err)
  }
}

module.exports = { createOrder, confirmPayment, getMyOrders, getSellerOrders }
