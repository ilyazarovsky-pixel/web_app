const bcrypt = require('bcryptjs');
const { run, get } = require('../utils/database');

// Не вызываем initDb() здесь — это делается в server.js или тестах

class User {
  static async create(userData) {
    const { name, email, password, birthDate } = userData;

    // Проверяем, существует ли пользователь с таким email
    const existingUserByEmail = await get('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUserByEmail) {
      throw new Error('Пользователь с таким email уже существует');
    }

    // Проверяем, существует ли пользователь с таким именем
    const existingUserByName = await get('SELECT id FROM users WHERE name = ?', [name]);
    if (existingUserByName) {
      throw new Error('Пользователь с таким именем уже существует');
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
      // eslint-disable-next-line no-unused-vars
      const { password: _, ...userWithoutPassword } = user;
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
