const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Путь к файлу базы данных
const dbPath = path.join(__dirname, './data/database.db');
const schemaPath = path.join(__dirname, './data/schema.sql');

// Создаем папку data, если она не существует
const dataDir = path.join(__dirname, './data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log('✅ Папка data создана');
}

// Подключаемся к базе данных (создаст файл, если его нет)
const db = new Database(dbPath);

// Читаем SQL-схему из файла
const schemaSQL = fs.readFileSync(schemaPath, 'utf8');

// Выполняем SQL-схему
db.exec(schemaSQL);
console.log('✅ База данных инициализирована');

// Закрываем соединение
db.close();
console.log('✅ Соединение с базой данных закрыто');