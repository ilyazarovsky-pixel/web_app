const jwt = require('jsonwebtoken');

// Генерация токена
function generateToken(userId) {
  const secret = process.env.JWT_SECRET || 'dev-secret-key';
  const payload = { id: userId };
  const options = { expiresIn: '24h' }; // Токен действителен 24 часа

  return jwt.sign(payload, secret, options);
}

// Middleware для аутентификации токена
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Токен отсутствует'
    });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: 'Токен недействителен'
      });
    }
    req.user = user;
    next();
  });
}

module.exports = {
  authenticateToken,
  generateToken
};