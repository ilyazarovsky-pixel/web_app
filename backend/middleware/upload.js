const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Создаём папку для аватаров
const uploadsDir = path.join(__dirname, '../uploads/avatars');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Настраиваем хранилище
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Генерируем уникальное имя файла: userId_timestamp.extension
    const userId = req.user?.id || 'anonymous';
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `avatar_${userId}_${timestamp}${ext}`);
  }
});

// Фильтр для изображений
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Разрешены только изображения: JPEG, PNG, GIF, WebP'), false);
  }
};

// Конфигурация multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // Максимум 5MB
  }
});

// Middleware для обработки ошибок multer
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Размер файла не должен превышать 5MB' });
    }
    return res.status(400).json({ error: `Ошибка загрузки: ${err.message}` });
  }

  if (err) {
    return res.status(400).json({ error: err.message });
  }

  next();
};

module.exports = { upload, handleUploadError };
