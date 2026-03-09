const sqlite3 = require('sqlite3').verbose();
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
const db = new sqlite3.Database(dbPath);

// Читаем SQL-схему из файла
const schemaSQL = fs.readFileSync(schemaPath, 'utf8');

// Выполняем SQL-схему
db.exec(schemaSQL, (err) => {
  if (err) {
    console.error('Ошибка при инициализации БД:', err);
  } else {
    console.log('✅ База данных инициализирована');
  }
  // Закрываем соединение
  db.close((err) => {
    if (err) {
      console.error('Ошибка при закрытии БД:', err);
    } else {
      console.log('✅ Соединение с базой данных закрыто');
    }
  });
});
