const router  = require('express').Router()
const ctrl    = require('../controllers/adminController')
const { adminProtect } = require('../middleware/adminAuth')

/* ── public ──────────────────────────────────────────────────── */
router.post('/auth/login', ctrl.adminLogin)

/* ── protected ───────────────────────────────────────────────── */
router.use(adminProtect)

router.get('/auth/me', ctrl.adminMe)

router.get('/stats', ctrl.getStats)

router.get('/users',              ctrl.getUsers)
router.get('/users/:id',          ctrl.getUserById)
router.patch('/users/:id/suspend', ctrl.suspendUser)
router.patch('/users/:id/activate', ctrl.activateUser)

router.get('/verifications',               ctrl.getVerifications)
router.get('/verifications/:id',           ctrl.getVerificationById)
router.patch('/verifications/:id/approve', ctrl.approveVerification)
router.patch('/verifications/:id/reject',  ctrl.rejectVerification)

router.get('/listings',                  ctrl.getListings)
router.patch('/listings/:id/suspend',    ctrl.suspendListing)
router.patch('/listings/:id/activate',   ctrl.activateListing)
router.delete('/listings/:id',           ctrl.deleteListing)

router.get('/artisans',                  ctrl.getArtisans)
router.patch('/artisans/:id/suspend',    ctrl.suspendArtisan)
router.patch('/artisans/:id/activate',   ctrl.activateArtisan)

router.get('/orders',                    ctrl.getOrders)
router.patch('/orders/:id/resolve',      ctrl.resolveOrder)

router.get('/settings', ctrl.getSettings)
router.put('/settings', ctrl.updateSettings)

module.exports = router
