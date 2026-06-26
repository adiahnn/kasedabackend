const cloudinary = require('cloudinary').v2
const { CloudinaryStorage } = require('multer-storage-cloudinary')
const multer = require('multer')

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

function makeUploader(folder, allowedFormats = ['jpg', 'jpeg', 'png', 'webp']) {
  const storage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder: `kasedamarket/${folder}`,
      allowed_formats: allowedFormats,
      transformation: [{ quality: 'auto', fetch_format: 'auto' }],
    },
  })
  return multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } })
}

const uploadListingImages = makeUploader('listings')
const uploadAvatar        = makeUploader('avatars')
const uploadDocument      = makeUploader('documents', ['jpg', 'jpeg', 'png', 'pdf'])
const uploadChatFile      = makeUploader('chat', ['jpg', 'jpeg', 'png', 'webp', 'pdf', 'doc', 'docx', 'xls', 'xlsx'])

module.exports = { cloudinary, uploadListingImages, uploadAvatar, uploadDocument, uploadChatFile }
