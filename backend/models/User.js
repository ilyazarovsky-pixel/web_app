const bcrypt = require('bcryptjs');
const { run, get, initDb } = require('../utils/database');

// Инициализация БД при загрузке модуля
initDb();

class User {
  static async create(userData) {
    const { name, email, password, birthDate } = userData;

    // Проверяем, существует ли пользователь с таким email
    const existingUser = await get('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser) {
      throw new Error('Пользователь с таким email уже существует');
    }

    // Хешируем пароль перед сохранением
    const hashedPassword = await bcrypt.hash(password, 10);

    // Вставляем нового пользователя
    const result = await run(
      'INSERT INTO users (name, email, password, birth_date) VALUES (?, ?, ?, ?)',
      [name, email, hashedPassword, birthDate]
    );

    // Возвращаем созданного пользователя (без пароля)
    const user = await get('SELECT id, name, email, birth_date as birthDate, created_at as createdAt FROM users WHERE id = ?', [result.lastID]);
    return user;
  }

  static async validatePassword(email, password) {
    // Находим пользователя по email
    const user = await get('SELECT id, name, email, password, birth_date as birthDate FROM users WHERE email = ?', [email]);

    if (user && await bcrypt.compare(password, user.password)) {
      // Возвращаем пользователя без пароля для безопасности
      const { password: _password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    }

    return null;
  }

  static async findById(id) {
    const user = await get('SELECT id, name, email, birth_date as birthDate, avatar, bio, created_at as createdAt FROM users WHERE id = ?', [id]);
    return user;
  }

  static async findByIdWithPassword(id) {
    const user = await get('SELECT id, name, email, password, birth_date as birthDate, avatar, bio, created_at as createdAt FROM users WHERE id = ?', [id]);
    return user;
  }
}

module.exports = User;
