const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-unsafe-key';

let io = null;
// Map для хранения соответствия userId -> socketId
const userSockets = new Map();

/**
 * Инициализация WebSocket сервера
 * @param {http.Server} server - HTTP сервер
 */
function initWebSocket(server) {
  io = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGINS
        ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
        : ['http://localhost:3000', 'http://localhost:5000'],
      credentials: true
    }
  });

  // Middleware для JWT авторизации
  io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.query.token;

    if (!token) {
      return next(new Error('Токен не предоставлен'));
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Проверяем тип токена — должен быть access
      if (decoded.type !== 'access') {
        return next(new Error('Неверный тип токена'));
      }

      socket.userId = decoded.id;
      next();
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return next(new Error('Срок действия токена истёк'));
      }
      return next(new Error('Недействительный токен'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User ${socket.userId} connected`);

    // Сохраняем соответствие userId -> socketId
    userSockets.set(socket.userId, socket.id);

    // Обработка отключения
    socket.on('disconnect', () => {
      console.log(`User ${socket.userId} disconnected`);
      userSockets.delete(socket.userId);
    });

    // Обработка ошибок
    socket.on('error', (error) => {
      console.error(`WebSocket error for user ${socket.userId}:`, error.message);
    });
  });

  console.log('✅ WebSocket сервер запущен');
  return io;
}

/**
 * Отправить уведомление пользователю
 * @param {number} userId - ID пользователя
 * @param {Object} data - Данные уведомления
 */
function sendNotificationToUser(userId, data) {
  const socketId = userSockets.get(userId);
  if (socketId) {
    io.to(socketId).emit('notification', data);
    return true;
  }
  return false;
}

/**
 * Получить io экземпляр
 */
function getIo() {
  return io;
}

/**
 * Получить Map пользовательских сокетов
 */
function getUserSockets() {
  return userSockets;
}

module.exports = {
  initWebSocket,
  sendNotificationToUser,
  getIo,
  getUserSockets
};
