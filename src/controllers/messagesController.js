const Conversation = require('../models/Conversation')
const Message      = require('../models/Message')

async function getConversations(req, res, next) {
  try {
    const convos = await Conversation.find({ participants: req.user._id })
      .sort({ lastAt: -1 })
      .populate('participants', 'fullName avatar verificationStatus')
    res.json(convos)
  } catch (err) {
    next(err)
  }
}

async function getOrCreateConversation(req, res, next) {
  try {
    const { userId } = req.params
    if (userId === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot message yourself' })
    }
    let convo = await Conversation.findOne({
      participants: { $all: [req.user._id, userId], $size: 2 },
    })
    if (!convo) {
      convo = await Conversation.create({ participants: [req.user._id, userId] })
    }
    await convo.populate('participants', 'fullName avatar verificationStatus')
    res.json(convo)
  } catch (err) {
    next(err)
  }
}

async function getMessages(req, res, next) {
  try {
    const { conversationId } = req.params
    const { page = 1, limit = 50 } = req.query
    const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100)
    const skip = (Math.max(Number(page) || 1, 1) - 1) * safeLimit

    const convo = await Conversation.findById(conversationId)
    if (!convo?.participants.some(p => p.equals(req.user._id))) {
      return res.status(403).json({ message: 'Access denied' })
    }

    const messages = await Message.find({ conversation: conversationId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .populate('from', 'fullName avatar')

    await Message.updateMany(
      { conversation: conversationId, from: { $ne: req.user._id }, readBy: { $ne: req.user._id } },
      { $push: { readBy: req.user._id } }
    )

    res.json(messages.reverse())
  } catch (err) {
    next(err)
  }
}

async function sendMessage(req, res, next) {
  try {
    const { conversationId } = req.params
    const { text } = req.body

    const convo = await Conversation.findById(conversationId)
    if (!convo?.participants.some(p => p.equals(req.user._id))) {
      return res.status(403).json({ message: 'Access denied' })
    }

    const attachments = (req.files ?? []).map(f => ({
      name:     f.originalname,
      url:      f.path,
      isImage:  f.mimetype.startsWith('image/'),
      publicId: f.filename,
    }))

    const message = await Message.create({
      conversation: conversationId,
      from:         req.user._id,
      text:         text ?? '',
      attachments,
      readBy:       [req.user._id],
    })

    convo.lastMessage = text || (attachments.length ? 'Attachment' : '')
    convo.lastAt = new Date()
    await convo.save()

    await message.populate('from', 'fullName avatar')
    res.status(201).json(message)
  } catch (err) {
    next(err)
  }
}

module.exports = { getConversations, getOrCreateConversation, getMessages, sendMessage }
