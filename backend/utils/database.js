const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '../data/database.db');

let db = null;

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
        full_description TEXT,
        image TEXT,
        status TEXT DEFAULT 'active',
        category_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories(id)
      )
    `);
  } else {
    // Добавляем category_id если её нет
    try { db.run('ALTER TABLE courses ADD COLUMN category_id INTEGER'); } catch {}
    // Добавляем новые поля для страниц курсов
    try { db.run('ALTER TABLE courses ADD COLUMN full_description TEXT'); } catch {}
    try { db.run('ALTER TABLE courses ADD COLUMN image TEXT'); } catch {}
    try { db.run('ALTER TABLE courses ADD COLUMN status TEXT DEFAULT \'active\''); } catch {}
    // Добавляем author_id для уведомлений
    try { db.run('ALTER TABLE courses ADD COLUMN author_id INTEGER'); } catch {}
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

  // Таблица страниц курсов
  db.run(`
    CREATE TABLE IF NOT EXISTS course_pages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      content TEXT,
      page_type TEXT DEFAULT 'text',
      video_url TEXT,
      diagram_data TEXT,
      page_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
    )
  `);

  // Таблица уведомлений
  db.run(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      data TEXT,
      read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
};

// Создание индексов
const createIndexes = () => {
  // Индексы для повышения производительности
  try {
    db.run('CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_enrollments_user_id ON enrollments(user_id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_enrollments_course_id ON enrollments(course_id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_reviews_course_id ON reviews(course_id)');
  } catch (err) {
    console.error('Ошибка при создании индексов:', err);
  }
};

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

  // Включаем внешние ключи
  db.run('PRAGMA foreign_keys = ON');

  // Создаём таблицы
  createTables();

  // Создаём индексы
  createIndexes();

  // Заполняем начальными данными
  seedCourses();

  // Заполняем страницы курсов
  seedCoursePages();

  // Сохраняем БД на диск
  saveDb();

}

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

  // Заполняем страницы курсов
  seedCoursePages();
};

// Заполнение страниц курсов
const seedCoursePages = () => {
  console.log('📄 Проверка страниц курсов...');

  // Получаем ID курсов
  const courseIds = {};
  const getCourseStmt = db.prepare('SELECT id, title FROM courses');
  while (getCourseStmt.step()) {
    const row = getCourseStmt.getAsObject();
    courseIds[row.title] = row.id;
  }
  getCourseStmt.free();

  const pages = [
    // Курс: Основы программирования
    {
      courseTitle: 'Основы программирования',
      title: 'Введение в программирование',
      content: '<p>Программирование — это процесс создания компьютерных программ.</p>',
      type: 'text',
      order: 1
    },
    {
      courseTitle: 'Основы программирования',
      title: 'Переменные и типы данных',
      content: '<p>Переменная — это именованная область памяти.</p>',
      type: 'text',
      order: 2
    },
    {
      courseTitle: 'Основы программирования',
      title: 'Видео: Работа с переменными',
      content: 'Изучите на практике, как объявлять и использовать переменные.',
      type: 'video',
      order: 3
    },
    {
      courseTitle: 'Основы программирования',
      title: 'Схема: Структура программы',
      content: 'Блок-схема показывает основные этапы выполнения программы.',
      type: 'diagram',
      order: 4
    },
    // Курс: Веб-разработка
    {
      courseTitle: 'Веб-разработка',
      title: 'Введение в веб-разработку',
      content: '<p>Веб-разработка делится на две основные части: Frontend и Backend.</p>',
      type: 'text',
      order: 1
    },
    {
      courseTitle: 'Веб-разработка',
      title: 'Основы HTML',
      content: '<p>HTML — это язык разметки веб-страниц.</p>',
      type: 'text',
      order: 2
    },
    {
      courseTitle: 'Веб-разработка',
      title: 'Видео: Создание первой страницы',
      content: 'На этом видео мы создадим простую HTML-страницу.',
      type: 'video',
      order: 3
    },
    {
      courseTitle: 'Веб-разработка',
      title: 'Схема: Архитектура веб-приложения',
      content: 'Схема показывает взаимодействие между браузером и сервером.',
      type: 'diagram',
      order: 4
    },
    // Курс: JavaScript для начинающих
    {
      courseTitle: 'JavaScript для начинающих',
      title: 'Введение в JavaScript',
      content: '<p>JavaScript делает веб-страницы интерактивными.</p>',
      type: 'text',
      order: 1
    },
    {
      courseTitle: 'JavaScript для начинающих',
      title: 'Видео: Переменные и функции',
      content: 'Основы работы с переменными и функциями.',
      type: 'video',
      order: 2
    },
    {
      courseTitle: 'JavaScript для начинающих',
      title: 'Схема: JavaScript в браузере',
      content: 'Как JavaScript взаимодействует с DOM.',
      type: 'diagram',
      order: 3
    },
    // Курс: Python для анализа данных
    {
      courseTitle: 'Python для анализа данных',
      title: 'Введение в Python',
      content: '<p>Python — мощный язык программирования для анализа данных.</p>',
      type: 'text',
      order: 1
    },
    {
      courseTitle: 'Python для анализа данных',
      title: 'Библиотека Pandas',
      content: '<p>Pandas — библиотека для работы с данными.</p>',
      type: 'text',
      order: 2
    },
    {
      courseTitle: 'Python для анализа данных',
      title: 'Видео: Визуализация данных',
      content: 'Основы визуализации данных.',
      type: 'video',
      order: 3
    },
    // Курс: React для современных приложений
    {
      courseTitle: 'React для современных приложений',
      title: 'Введение в React',
      content: '<p>React — библиотека для создания пользовательских интерфейсов.</p>',
      type: 'text',
      order: 1
    },
    {
      courseTitle: 'React для современных приложений',
      title: 'Компоненты и хуки',
      content: '<p>Хуки — функции для использования состояния React.</p>',
      type: 'text',
      order: 2
    },
    {
      courseTitle: 'React для современных приложений',
      title: 'Схема: Архитектура React',
      content: 'Как работает React.',
      type: 'diagram',
      order: 3
    },
    // Курс: Node.js и Express
    {
      courseTitle: 'Node.js и Express',
      title: 'Введение в Node.js',
      content: '<p>Node.js — среда выполнения JavaScript на сервере.</p>',
      type: 'text',
      order: 1
    },
    {
      courseTitle: 'Node.js и Express',
      title: 'Создание REST API',
      content: '<p>Express — фреймворк для создания веб-приложений.</p>',
      type: 'text',
      order: 2
    },
    {
      courseTitle: 'Node.js и Express',
      title: 'Видео: Работа с базой данных',
      content: 'Подключение базы данных к Node.js.',
      type: 'video',
      order: 3
    },
    // Курс: Git и GitHub
    {
      courseTitle: 'Git и GitHub',
      title: 'Введение в Git',
      content: '<p>Git — система контроля версий.</p>',
      type: 'text',
      order: 1
    },
    {
      courseTitle: 'Git и GitHub',
      title: 'Ветвление и слияние',
      content: '<p>Ветвление позволяет разрабатывать функции независимо.</p>',
      type: 'text',
      order: 2
    },
    {
      courseTitle: 'Git и GitHub',
      title: 'Схема: Git Flow',
      content: 'Модель ветвления Git Flow.',
      type: 'diagram',
      order: 3
    },
    // Курс: CSS и адаптивный дизайн
    {
      courseTitle: 'CSS и адаптивный дизайн',
      title: 'Введение в CSS',
      content: '<p>CSS — язык стилей для веб-страниц.</p>',
      type: 'text',
      order: 1
    },
    {
      courseTitle: 'CSS и адаптивный дизайн',
      title: 'Flexbox и Grid',
      content: '<p>Современные методы вёрстки.</p>',
      type: 'text',
      order: 2
    },
    {
      courseTitle: 'CSS и адаптивный дизайн',
      title: 'Видео: Адаптивность',
      content: 'Создание адаптивных макетов.',
      type: 'video',
      order: 3
    }
  ];

  // Подготавливаем statement для вставки и проверки
  const insertPageStmt = db.prepare(`
    INSERT OR IGNORE INTO course_pages (course_id, title, content, page_type, page_order)
    VALUES (?, ?, ?, ?, ?)
  `);
  const checkPageStmt = db.prepare('SELECT id FROM course_pages WHERE course_id = ? AND title = ?');

  let addedPages = 0;
  pages.forEach(page => {
    const courseId = courseIds[page.courseTitle];
    if (courseId) {
      // Проверяем, есть ли уже такая страница для этого курса
      checkPageStmt.bind([courseId, page.title]);
      const existingPage = checkPageStmt.step();
      checkPageStmt.reset();

      if (!existingPage) {
        insertPageStmt.bind([courseId, page.title, page.content, page.type, page.order]);
        insertPageStmt.step();
        insertPageStmt.reset();
        addedPages++;
      }
    }
  });

  insertPageStmt.free();
  checkPageStmt.free();
  saveDb();

  console.log(`✅ Добавлено ${addedPages} страниц курсов`);
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
  // Для INSERT получаем последний вставленный ID
  let lastID = null;
  if (sql.trim().toUpperCase().startsWith('INSERT')) {
    const rowIdStmt = db.prepare('SELECT last_insert_rowid() as id');
    if (rowIdStmt.step()) {
      lastID = rowIdStmt.getAsObject().id;
    }
    rowIdStmt.free();
  } else {
    lastID = db.getRowsModified();
  }
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

// Экспортируем функции
module.exports = { initDb, run, get, all, createTables, saveDb, seedCourses, seedCoursePages };

// Запуск приложения
if (require.main === module) {
  initDb()
    .then(() => {
      console.log('✅ База данных инициализирована');
    })
    .catch(err => {
      console.error('❌ Ошибка инициализации базы данных:', err);
      process.exit(1);
    });
}
