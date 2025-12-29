const Database = require('better-sqlite3');
const path = require('path');

// Подключаемся к базе данных
const dbPath = path.join(__dirname, '../data/database.db');
const db = new Database(dbPath);

// Создаем таблицы при запуске
const createTables = () => {
  // Создаем таблицу пользователей
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      birth_date TEXT NOT NULL,
      avatar TEXT,
      bio TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
};

// Запускаем создание таблиц
createTables();

class User {
  static async create(userData) {
    try {
      const { name, email, password, birthDate } = userData;

      // Проверяем, существует ли пользователь с таким email
      const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
      if (existingUser) {
        throw new Error('Пользователь с таким email уже существует');
      }

      // Вставляем нового пользователя
      const result = db.prepare(
        'INSERT INTO users (name, email, password, birth_date) VALUES (?, ?, ?, ?)'
      ).run(name, email, password, birthDate);

      // Возвращаем созданного пользователя
      const user = db.prepare('SELECT id, name, email, birth_date as birthDate, created_at as createdAt FROM users WHERE id = ?').get(result.lastInsertRowid);
      return user;
    } catch (error) {
      throw error;
    }
  }

  static async validatePassword(email, password) {
    try {
      // Находим пользователя по email
      const user = db.prepare('SELECT id, name, email, password, birth_date as birthDate FROM users WHERE email = ?').get(email);

      if (user && user.password === password) { // В реальном приложении используйте bcrypt для хеширования паролей
        // Возвращаем пользователя без пароля для безопасности
        const { password: _, ...userWithoutPassword } = user;
        return userWithoutPassword;
      }

      return null;
    } catch (error) {
      throw error;
    }
  }

  static async findById(id) {
    try {
      const user = db.prepare('SELECT id, name, email, birth_date as birthDate, avatar, bio, created_at as createdAt FROM users WHERE id = ?').get(id);
      return user;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = User;