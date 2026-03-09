/**
 * Универсальный обработчик ошибок
 * Перенесён из GameLibrary для централизованной обработки ошибок
 */

function errorHandler(err, req, res) {
  console.error('Error:', err);

  // MySQL errors
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      error: 'Duplicate entry',
      message: 'Запись с такими данными уже существует'
    });
  }

  if (err.code === 'ER_NO_REFERENCED_ROW') {
    return res.status(404).json({
      error: 'Reference error',
      message: 'Связанная запись не найдена'
    });
  }

  if (err.code === 'ER_SIGNAL_EXCEPTION') {
    return res.status(403).json({
      error: 'Operation not allowed',
      message: err.message
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Invalid token',
      message: 'Недействительный токен аутентификации'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token expired',
      message: 'Срок действия токена истёк'
    });
  }

  // Default error
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    error: err.message || 'Внутренняя ошибка сервера',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}

module.exports = errorHandler;
