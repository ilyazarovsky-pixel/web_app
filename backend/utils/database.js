const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '../data/database.db');

let db = null;

// Инициализация базы данных
async function initDb() {
  const SQL = await initSqlJs();
  
  // Загружаем существующую БД или создаём новую
  try {
    if (fs.existsSync(dbPath)) {
      const fileBuffer = fs.readFileSync(dbPath);
      db = new SQL.Database(fileBuffer);
    } else {
      db = new SQL.Database();
    }
  } catch (err) {
    console.error('Ошибка загрузки БД:', err);
    db = new SQL.Database();
  }
  
  // Создаём таблицы
  createTables();
  
  // Сохраняем БД на диск
  saveDb();
}

const createTables = () => {
  db.run(`
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
  
  db.run(`
    CREATE TABLE IF NOT EXISTS courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
};

const saveDb = () => {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
};

// Выполнить запрос без возврата результатов
function run(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  stmt.step();
  const lastID = db.getRowsModified();
  stmt.free();
  saveDb();
  return Promise.resolve({ lastID, changes: lastID });
}

// Получить одну строку
function get(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  let row = null;
  if (stmt.step()) {
    row = stmt.getAsObject();
  }
  stmt.free();
  return Promise.resolve(row);
}

// Получить все строки
function all(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return Promise.resolve(results);
}

module.exports = { initDb, run, get, all, createTables, saveDb };
