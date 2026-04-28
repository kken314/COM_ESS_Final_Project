// src/middlewares/upload.middleware.js
// Configures Multer to accept a single image upload, kept in memory as a Buffer.
const multer = require('multer');
const ApiError = require('../utils/ApiError');

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB — generous, since the frontend
                                        // resizes large photos before upload.

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ApiError(400, 'Only JPEG, PNG, WEBP, and HEIC images are allowed'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
});

// Export a middleware that accepts up to 3 files under the field name "images".
module.exports = upload.array('images', 3);
