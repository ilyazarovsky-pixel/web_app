const { get } = require('../utils/database');

// Middleware для проверки роли пользователя
function requireRole(...allowedRoles) {
  return async (req, res, next) => {
    try {
      const userId = req.user.id;

      // Получаем роль пользователя из БД
      const user = await get('SELECT role FROM users WHERE id = ?', [userId]);

      if (!user) {
        return res.status(404).json({ error: 'Пользователь не найден' });
      }

      // Проверяем, есть ли роль пользователя в списке разрешённых
      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({
          error: 'Доступ запрещён. Недостаточно прав.'
        });
      }

      // Добавляем роль в req.user для дальнейшего использования
      req.user.role = user.role;
      next();
    } catch (err) {
      console.error('Ошибка проверки роли:', err.message);
      res.status(500).json({ error: 'Ошибка сервера' });
    }
  };
}

// Helper middleware для проверки на админа
function isAdmin(req, res, next) {
  return requireRole('admin')(req, res, next);
}

module.exports = { requireRole, isAdmin };
