const router = require('express').Router()
const {
  getConversations, getOrCreateConversation, getMessages, sendMessage,
} = require('../controllers/messagesController')
const { protect } = require('../middleware/auth')
const { uploadChatFile } = require('../config/cloudinary')

router.get('/conversations',                          protect, getConversations)
router.get('/conversations/with/:userId',             protect, getOrCreateConversation)
router.get('/conversations/:conversationId/messages', protect, getMessages)
router.post('/conversations/:conversationId/messages', protect, uploadChatFile.array('files', 5), sendMessage)

module.exports = router
