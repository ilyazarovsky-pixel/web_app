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

  // Заполняем начальными данными
  seedCourses();

  // Сохраняем БД на диск
  saveDb();
}

const createTables = () => {
  // Проверяем существует ли таблица users
  const userTableExists = db.prepare('SELECT name FROM sqlite_master WHERE type=\'table\' AND name=\'users\'').step();
  db.prepare('SELECT name FROM sqlite_master WHERE type=\'table\' AND name=\'users\'').reset();

  if (!userTableExists) {
    // Создаём таблицу users с нуля
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
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        role TEXT DEFAULT 'user',
        token_version INTEGER DEFAULT 0
      )
    `);
  } else {
    // Добавляем новые колонки если их нет
    try { db.run('ALTER TABLE users ADD COLUMN role TEXT DEFAULT \'user\''); } catch {}
    try { db.run('ALTER TABLE users ADD COLUMN token_version INTEGER DEFAULT 0'); } catch {}
  }

  // Таблица categories
  db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE
    )
  `);

  // Проверяем существует ли таблица courses
  const courseTableExists = db.prepare('SELECT name FROM sqlite_master WHERE type=\'table\' AND name=\'courses\'').step();
  db.prepare('SELECT name FROM sqlite_master WHERE type=\'table\' AND name=\'courses\'').reset();

  if (!courseTableExists) {
    // Создаём таблицу courses с нуля
    db.run(`
      CREATE TABLE IF NOT EXISTS courses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        category_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories(id)
      )
    `);
  } else {
    // Добавляем category_id если её нет
    try { db.run('ALTER TABLE courses ADD COLUMN category_id INTEGER'); } catch {}
  }

  // Таблица записей на курсы
  db.run(`
    CREATE TABLE IF NOT EXISTS enrollments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      course_id INTEGER NOT NULL,
      enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      UNIQUE(user_id, course_id)
    )
  `);

  // Таблица прогресса
  db.run(`
    CREATE TABLE IF NOT EXISTS progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      course_id INTEGER NOT NULL,
      page_index INTEGER NOT NULL,
      completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, course_id, page_index)
    )
  `);

  // Таблица избранных курсов
  db.run(`
    CREATE TABLE IF NOT EXISTS favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      course_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, course_id)
    )
  `);

  // Таблица отзывов и рейтингов
  db.run(`
    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      course_id INTEGER NOT NULL,
      rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
      comment TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, course_id)
    )
  `);
};

const seedCourses = () => {
  console.log('📚 Проверка начальных данных...');

  // Проверяем и добавляем категории
  const catStmt = db.prepare('SELECT COUNT(*) as count FROM categories');
  catStmt.step();
  const catResult = catStmt.getAsObject();
  catStmt.free();

  if (catResult.count === 0) {
    console.log('📚 Добавляем категории...');

    const categories = [
      { name: 'Программирование', slug: 'programming' },
      { name: 'Веб-разработка', slug: 'web' },
      { name: 'Анализ данных', slug: 'data-science' },
      { name: 'DevOps', slug: 'devops' },
      { name: 'Дизайн', slug: 'design' }
    ];

    const insertCategoryStmt = db.prepare('INSERT INTO categories (name, slug) VALUES (?, ?)');

    categories.forEach(cat => {
      insertCategoryStmt.bind([cat.name, cat.slug]);
      insertCategoryStmt.step();
      insertCategoryStmt.reset();
    });
    insertCategoryStmt.free();
    saveDb();
    console.log(`✅ Добавлено ${categories.length} категорий`);
  } else {
    console.log(`📚 Категории уже есть (${catResult.count} шт)`);
  }

  // Проверяем курсы
  const courseStmt = db.prepare('SELECT COUNT(*) as count FROM courses');
  courseStmt.step();
  const courseResult = courseStmt.getAsObject();
  courseStmt.free();

  // Получаем ID категорий синхронно
  const categoryIds = {};
  const getCatStmt = db.prepare('SELECT id, slug FROM categories');
  while (getCatStmt.step()) {
    const row = getCatStmt.getAsObject();
    categoryIds[row.slug] = row.id;
  }
  getCatStmt.free();

  // Если курсов мало (< 8), добавляем недостающие
  if (courseResult.count > 0 && courseResult.count < 8) {
    console.log(`📚 Найдено ${courseResult.count} курсов, добавляем недостающие...`);

    // Проверяем, есть ли курсы с категориями
    const coursesWithCategory = db.prepare('SELECT COUNT(*) as count FROM courses WHERE category_id IS NOT NULL');
    coursesWithCategory.step();
    const withCatResult = coursesWithCategory.getAsObject();
    coursesWithCategory.free();

    // Если все курсы без категории, обновляем их
    if (withCatResult.count === 0) {
      console.log('📚 Обновляем существующие курсы категориями...');
      const updateStmt = db.prepare('UPDATE courses SET category_id = ? WHERE id = ?');

      // Обновляем существующие курсы
      const updates = [
        { id: 1, slug: 'programming' },
        { id: 2, slug: 'web' }
      ];

      updates.forEach(update => {
        const catId = categoryIds[update.slug];
        if (catId) {
          updateStmt.bind([catId, update.id]);
          updateStmt.step();
          updateStmt.reset();
        }
      });
      updateStmt.free();
    }
  }

  if (courseResult.count >= 8) {
    console.log(`📚 Курсы уже есть (${courseResult.count} шт), пропускаем seed курсов`);
    return;
  }

  console.log('📚 Заполняем таблицу курсов...');

  // Получаем список уже существующих курсов
  const existingCoursesStmt = db.prepare('SELECT id, title FROM courses');
  const existingCourses = [];
  while (existingCoursesStmt.step()) {
    existingCourses.push(existingCoursesStmt.getAsObject());
  }
  existingCoursesStmt.free();

  const existingTitles = existingCourses.map(c => c.title);

  const courses = [
    {
      title: 'Основы программирования',
      description: 'Изучите основы: переменные, типы данных, условия и циклы. Идеально для начинающих.',
      categorySlug: 'programming'
    },
    {
      title: 'Веб-разработка',
      description: 'Освойте HTML, CSS и JavaScript. От основ до продвинутых техник.',
      categorySlug: 'web'
    },
    {
      title: 'JavaScript для начинающих',
      description: 'Полный курс по JavaScript: от основ до асинхронного программирования и работы с API.',
      categorySlug: 'web'
    },
    {
      title: 'Python для анализа данных',
      description: 'Изучите Python: библиотеки Pandas, NumPy и визуализация данных.',
      categorySlug: 'data-science'
    },
    {
      title: 'React для современных приложений',
      description: 'Создавайте динамические веб-приложения. Хуки, контекст, роутинг.',
      categorySlug: 'web'
    },
    {
      title: 'Node.js и Express',
      description: 'Бэкенд-разработка на Node.js. REST API, базы данных, аутентификация.',
      categorySlug: 'web'
    },
    {
      title: 'Git и GitHub',
      description: 'Система контроля версий. Ветвление, слияние, pull request.',
      categorySlug: 'devops'
    },
    {
      title: 'CSS и адаптивный дизайн',
      description: 'Современный CSS: Flexbox, Grid, анимации. Адаптивность для всех устройств.',
      categorySlug: 'design'
    }
  ];

  // Фильтруем только новые курсы
  const newCourses = courses.filter(c => !existingTitles.includes(c.title));

  if (newCourses.length === 0) {
    console.log('📚 Все курсы уже есть в БД');
    return;
  }

  const insertStmt = db.prepare('INSERT INTO courses (title, description, category_id) VALUES (?, ?, ?)');

  newCourses.forEach(course => {
    const categoryId = categoryIds[course.categorySlug];
    if (categoryId) {
      insertStmt.bind([course.title, course.description, categoryId]);
      insertStmt.step();
      insertStmt.reset();
    }
  });

  insertStmt.free();
  saveDb();

  console.log(`✅ Добавлено ${newCourses.length} курсов в БД`);
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

module.exports = { initDb, run, get, all, createTables, saveDb, seedCourses };
