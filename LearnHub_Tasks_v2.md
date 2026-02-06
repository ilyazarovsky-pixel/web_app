# LearnHub — Задачи v2 (20 задач)

**Проект:** https://github.com/ilyazarovsky-pixel/web_app  
**Предыдущий раунд:** 15/15 задач выполнено ✅  
**Этот раунд:** исправление найденных проблем + новая функциональность

---

## 🔴 Блок 1. Критические исправления

### Задача 1. Утечка секретов — удали backend/.env из Git

Сейчас файл `backend/.env` отслеживается в репозитории. Это значит что твой JWT_SECRET виден всем. Любой кто откроет репозиторий может украсть этот ключ и подделывать токены авторизации.

**Что сделать:**

```bash
# 1. Удали файл из отслеживания Git (но не с диска)
git rm --cached backend/.env

# 2. Исправь .gitignore — добавь универсальный паттерн
# Открой .gitignore и замени строку ".env" на:
**/.env

# 3. Закоммить
git commit -m "fix: remove backend/.env from tracking, update .gitignore"

# 4. ОБЯЗАТЕЛЬНО: сгенерируй новый JWT_SECRET
# Старый считается скомпрометированным!
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# Скопируй результат в backend/.env как новый JWT_SECRET
```

**Почему `**/.env` а не просто `.env`:**
Паттерн `**/.env` игнорирует файлы `.env` в любой вложенной папке, а не только в корне.

**Проверка:** команда `git ls-files backend/.env` должна вернуть пустой результат.

---

### Задача 2. Удали неиспользуемый файл validators.js

В проекте два файла с валидацией: `backend/validators.js` и `backend/utils/validation.js`. Реально используется только второй. Мёртвый код — это путаница для других разработчиков.

**Что сделать:**

```bash
# 1. Убедись что validators.js нигде не импортируется
# Поищи в проекте:
grep -r "validators" backend/ --include="*.js"

# Если результат пустой (или только сам файл) — удаляй:
git rm backend/validators.js
git commit -m "cleanup: remove unused validators.js, validation in utils/validation.js"
```

**Проверка:** проект запускается без ошибок после удаления.

---

### Задача 3. Исправь commit messages

Твои коммиты сейчас выглядят так:
```
47ead36e compleated tasks - update GitHub Actions...
8febc4ca commit
68468522 compleated tasks - fix security issue...
```

Проблемы: орфография ("compleated" → "completed"), неинформативное "commit", нет единого стиля.

**Правила для будущих коммитов:**

```
Формат: <тип>: <краткое описание>

Типы:
  feat:     новая функциональность
  fix:      исправление бага
  docs:     изменение документации
  style:    форматирование, пробелы, точки с запятой
  refactor: рефакторинг без изменения поведения
  test:     добавление или изменение тестов
  chore:    обновление зависимостей, настройка CI

Примеры:
  feat: add user profile page
  fix: prevent crash on empty email input
  docs: update API.md with pagination params
  test: add integration tests for /login endpoint
```

**Что сделать прямо сейчас:** Начни следовать этому формату со следующего коммита. Прошлые коммиты переписывать не нужно.

**Проверка:** каждый новый коммит начинается с типа и двоеточия.

---

## ⚠️ Блок 2. Доработка существующего

### Задача 4. Расширь валидацию email

Сейчас валидация email ограничена whitelist-доменами — корпоративные адреса не пройдут. Нужно использовать регулярное выражение вместо списка доменов.

**В файле backend/utils/validation.js замени проверку email:**

```javascript
function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  
  // Проверяем формат email регулярным выражением
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  
  // Проверяем длину (RFC 5321: максимум 254 символа)
  if (email.length > 254) return false;
  
  return emailRegex.test(email);
}
```

**Проверка:** email вида `user@company-name.ru` и `test@university.edu.com` должны проходить валидацию.

---

### Задача 5. Расширь тесты — покрой /register и /login

Сейчас 4 теста только на /health и 404. Это очень мало. Добавь тесты на ключевые эндпоинты.

**Добавь в backend/server.test.js:**

```javascript
describe('POST /register', () => {

  test('Регистрация с корректными данными — 201', async () => {
    const response = await request(app)
      .post('/register')
      .send({
        email: `test_${Date.now()}@example.com`,  // уникальный email
        password: 'password123',
        name: 'Test User'
      });
    expect(response.status).toBe(201);
  });

  test('Регистрация без email — 400', async () => {
    const response = await request(app)
      .post('/register')
      .send({
        password: 'password123',
        name: 'Test User'
      });
    expect(response.status).toBe(400);
  });

  test('Регистрация с коротким паролем — 400', async () => {
    const response = await request(app)
      .post('/register')
      .send({
        email: `short_${Date.now()}@example.com`,
        password: '123',
        name: 'Test User'
      });
    expect(response.status).toBe(400);
  });

});

describe('POST /login', () => {

  test('Вход с неверным паролем — 401', async () => {
    const response = await request(app)
      .post('/login')
      .send({
        email: 'nonexistent@example.com',
        password: 'wrongpassword'
      });
    expect(response.status).toBe(401);
  });

  test('Вход без пароля — 400', async () => {
    const response = await request(app)
      .post('/login')
      .send({
        email: 'test@example.com'
      });
    expect([400, 401]).toContain(response.status);
  });

});
```

**Проверка:** `npm test` проходит, количество тестов — минимум 8.

---

### Задача 6. Добавь healthcheck в docker-compose.yml

Health check в server.js есть, но Docker о нём не знает. Добавь проверку в docker-compose, чтобы Docker автоматически перезапускал контейнер если сервер завис.

**В docker-compose.yml добавь в секцию сервиса:**

```yaml
services:
  app:
    # ... существующие настройки
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 15s
```

> Используем `wget` вместо `curl`, потому что в alpine-образе curl может отсутствовать, а wget есть по умолчанию.

**Проверка:** после `docker-compose up --build` выполни `docker ps` — в колонке STATUS увидишь `(healthy)`.

---

### Задача 7. Добавь rate limiting

Сейчас любой может отправлять тысячи запросов в секунду к твоему API. Это позволяет делать brute-force атаки на пароли и перегружать сервер.

**Установи:**
```bash
npm install express-rate-limit
```

**В server.js добавь:**

```javascript
const rateLimit = require('express-rate-limit');

// Общий лимит: 100 запросов за 15 минут с одного IP
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 минут
  max: 100,
  message: { error: 'Слишком много запросов. Попробуйте позже.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Строгий лимит для авторизации: 5 попыток за 15 минут
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Слишком много попыток входа. Подождите 15 минут.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Применяем общий лимит ко всем маршрутам
app.use(generalLimiter);

// Применяем строгий лимит только к авторизации
app.use('/login', authLimiter);
app.use('/register', authLimiter);
```

**Проверка:** после 5 быстрых запросов на /login получишь ответ 429 Too Many Requests.

---

### Задача 8. Добавь helmet для HTTP-заголовков безопасности

Браузеры поддерживают специальные заголовки, которые защищают от XSS-атак, clickjacking и других угроз. Библиотека helmet устанавливает их автоматически.

**Установи:**
```bash
npm install helmet
```

**В server.js добавь (в самое начало, до других middleware):**

```javascript
const helmet = require('helmet');

// Устанавливает безопасные HTTP-заголовки:
// X-Content-Type-Options, X-Frame-Options, CSP и другие
app.use(helmet());
```

**Проверка:** открой DevTools → Network → выбери любой запрос → в Response Headers увидишь:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `Content-Security-Policy: ...`

---

### Задача 9. Добавь graceful shutdown

Сейчас при остановке сервера (Ctrl+C или Docker stop) активные запросы обрываются. Graceful shutdown дожидается завершения текущих запросов и корректно закрывает соединения с базой данных.

**В конце server.js (после app.listen) добавь:**

```javascript
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Корректное завершение работы
function gracefulShutdown(signal) {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  
  server.close(() => {
    console.log('HTTP server closed.');
    // Здесь можно закрыть соединение с БД:
    // db.close(() => { console.log('Database closed.'); process.exit(0); });
    process.exit(0);
  });

  // Если за 10 секунд не завершились — принудительно
  setTimeout(() => {
    console.error('Forced shutdown after timeout.');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Не забудь убрать или изменить предыдущий app.listen, 
// чтобы не было дублирования!
module.exports = app;
```

**Проверка:** при нажатии Ctrl+C в консоли увидишь "SIGINT received. Shutting down gracefully..." вместо мгновенного обрыва.

---

### Задача 10. Обнови README.md

Текущий README описывает только Docker. Нужно добавить информацию о проекте, установке без Docker, запуске тестов и структуре.

**Замени README.md:**

```markdown
# LearnHub

Образовательная веб-платформа для онлайн-обучения.

## Технологии

- **Backend:** Node.js, Express
- **Database:** SQLite
- **Auth:** JWT (JSON Web Tokens)
- **Containerization:** Docker

## Быстрый старт

### Без Docker

1. Клонируй репозиторий:
   ```bash
   git clone https://github.com/ilyazarovsky-pixel/web_app.git
   cd web_app
   ```

2. Установи зависимости:
   ```bash
   npm install
   ```

3. Создай файл окружения:
   ```bash
   cp .env.example .env
   # Заполни переменные в .env
   ```

4. Запусти сервер:
   ```bash
   npm run dev    # режим разработки (с автоперезагрузкой)
   npm start      # production режим
   ```

5. Открой в браузере: http://localhost:3000

### С Docker

```bash
docker-compose up --build
```

## Тестирование

```bash
npm test
```

## API документация

Подробное описание API — в файле [API.md](./API.md)

## Структура проекта

```
├── backend/
│   ├── server.js          # Основной сервер Express
│   ├── routes/            # Маршруты API
│   ├── utils/             # Утилиты (валидация и др.)
│   └── data/              # SQLite база данных
├── frontend/
│   ├── index.html         # Главная страница
│   ├── 404.html           # Страница ошибки
│   └── ...                # CSS, JS файлы
├── .github/workflows/     # CI/CD (GitHub Actions)
├── Dockerfile             # Конфигурация Docker
├── docker-compose.yml     # Docker Compose
└── API.md                 # Документация API
```
```

**Проверка:** README содержит инструкции для запуска БЕЗ Docker — это важно для разработчиков.

---

### Задача 11. Добавь .vscode в .gitignore

Папка `.vscode` — это личные настройки твоего редактора. У другого разработчика может быть другой редактор или другие настройки.

**Добавь в .gitignore:**
```
.vscode/
```

**Удали из отслеживания:**
```bash
git rm -r --cached .vscode
git commit -m "chore: remove .vscode from tracking, add to .gitignore"
```

**Проверка:** папка `.vscode` не появляется в `git status`.

---

### Задача 12. Добавь переменную окружения для CORS origins

Сейчас список разрешённых доменов для CORS захардкожен в коде. При деплое на сервер придётся менять код. Лучше вынести в переменную окружения.

**В server.js замени массив allowedOrigins:**

```javascript
// Читаем список из переменной окружения
// Формат: CORS_ORIGINS=http://localhost:3000,http://localhost:5000
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
  : ['http://localhost:3000'];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
};
```

**Добавь в .env.example:**
```env
CORS_ORIGINS=http://localhost:3000,http://localhost:5000
```

**Проверка:** при изменении переменной CORS_ORIGINS в .env поведение CORS меняется без изменения кода.

---

## 🚀 Блок 3. Новая функциональность

### Задача 13. Профиль пользователя — GET /profile

Сейчас после авторизации пользователь получает токен, но не может посмотреть свои данные. Добавь эндпоинт для получения профиля текущего пользователя.

**Создай файл backend/routes/profile.js:**

```javascript
const express = require('express');
const router = express.Router();

// Middleware для проверки JWT токена
// (если у тебя уже есть authMiddleware — используй его)
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Токен не предоставлен' });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Недействительный токен' });
  }
}

// GET /profile — получить данные текущего пользователя
router.get('/profile', authMiddleware, (req, res) => {
  // req.user содержит данные из JWT токена
  // Для полных данных — запроси из базы по req.user.id
  
  // Пример с запросом из базы (адаптируй под свою БД):
  const db = require('../data/database'); // или как у тебя подключена БД
  
  db.get(
    'SELECT id, email, name, created_at FROM users WHERE id = ?',
    [req.user.id],
    (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Ошибка сервера' });
      }
      if (!user) {
        return res.status(404).json({ error: 'Пользователь не найден' });
      }
      
      // НИКОГДА не возвращай пароль!
      res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.created_at
      });
    }
  );
});

module.exports = router;
```

**В server.js подключи роутер:**
```javascript
const profileRoutes = require('./routes/profile');
app.use(profileRoutes);
```

**Обнови API.md:** добавь описание нового эндпоинта GET /profile.

**Проверка:** после логина используй полученный токен:
```bash
curl -H "Authorization: Bearer <твой-токен>" http://localhost:3000/profile
```
Должен вернуться JSON с данными пользователя (без пароля!).

---

### Задача 14. Смена пароля — PUT /profile/password

Пользователь должен иметь возможность сменить пароль. Это базовая функция безопасности.

**Добавь в backend/routes/profile.js:**

```javascript
const bcrypt = require('bcrypt');

// PUT /profile/password — сменить пароль
router.put('/profile/password', authMiddleware, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  
  // Валидация входных данных
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Укажите текущий и новый пароль' });
  }
  
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Новый пароль должен быть минимум 6 символов' });
  }
  
  if (currentPassword === newPassword) {
    return res.status(400).json({ error: 'Новый пароль должен отличаться от текущего' });
  }
  
  try {
    const db = require('../data/database');
    
    // Получаем текущий хеш пароля из БД
    db.get('SELECT password FROM users WHERE id = ?', [req.user.id], async (err, user) => {
      if (err) return res.status(500).json({ error: 'Ошибка сервера' });
      if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
      
      // Проверяем текущий пароль
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Неверный текущий пароль' });
      }
      
      // Хешируем и сохраняем новый пароль
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      db.run(
        'UPDATE users SET password = ? WHERE id = ?',
        [hashedPassword, req.user.id],
        function(err) {
          if (err) return res.status(500).json({ error: 'Ошибка сервера' });
          res.json({ message: 'Пароль успешно изменён' });
        }
      );
    });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});
```

**Проверка:**
```bash
curl -X PUT http://localhost:3000/profile/password \
  -H "Authorization: Bearer <токен>" \
  -H "Content-Type: application/json" \
  -d '{"currentPassword": "старый", "newPassword": "новый123"}'
```

---

### Задача 15. Поиск курсов — GET /courses/search

Пользователи должны находить нужные курсы по ключевым словам. Сейчас можно только получить весь список.

**Создай файл backend/routes/courses.js (или добавь в существующий):**

```javascript
const express = require('express');
const router = express.Router();

// GET /courses/search?q=javascript&page=1&limit=10
router.get('/courses/search', (req, res) => {
  const { q, page = 1, limit = 10 } = req.query;
  
  // Валидация
  if (!q || q.trim().length < 2) {
    return res.status(400).json({ error: 'Запрос должен быть минимум 2 символа' });
  }
  
  const searchTerm = `%${q.trim()}%`;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const pageLimit = Math.min(parseInt(limit), 50); // максимум 50 на страницу
  
  const db = require('../data/database');
  
  // Сначала получаем общее количество результатов
  db.get(
    'SELECT COUNT(*) as total FROM courses WHERE title LIKE ? OR description LIKE ?',
    [searchTerm, searchTerm],
    (err, countResult) => {
      if (err) return res.status(500).json({ error: 'Ошибка сервера' });
      
      // Затем получаем результаты с пагинацией
      db.all(
        'SELECT id, title, description FROM courses WHERE title LIKE ? OR description LIKE ? LIMIT ? OFFSET ?',
        [searchTerm, searchTerm, pageLimit, offset],
        (err, courses) => {
          if (err) return res.status(500).json({ error: 'Ошибка сервера' });
          
          res.json({
            courses: courses,
            pagination: {
              page: parseInt(page),
              limit: pageLimit,
              total: countResult.total,
              totalPages: Math.ceil(countResult.total / pageLimit)
            }
          });
        }
      );
    }
  );
});

module.exports = router;
```

**В server.js подключи:**
```javascript
const courseRoutes = require('./routes/courses');
app.use(courseRoutes);
```

**Обнови API.md:** добавь описание GET /courses/search с query-параметрами.

**Проверка:**
```bash
curl "http://localhost:3000/courses/search?q=javascript&page=1&limit=5"
```

---

## 🔧 Блок 4. Качество кода и инфраструктура

### Задача 16. Вынеси authMiddleware в отдельный файл

Middleware авторизации используется в нескольких местах. Чтобы не дублировать код, вынеси его в отдельный файл.

**Создай файл backend/middleware/auth.js:**

```javascript
const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Токен не предоставлен' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Срок действия токена истёк' });
    }
    return res.status(401).json({ error: 'Недействительный токен' });
  }
}

module.exports = authMiddleware;
```

**Используй во всех роутерах:**
```javascript
const authMiddleware = require('../middleware/auth');

router.get('/profile', authMiddleware, (req, res) => { ... });
router.get('/courses', authMiddleware, (req, res) => { ... });
```

**Проверка:** убедись что нигде не осталось дублирования кода проверки JWT.

---

### Задача 17. Добавь запуск линтера (ESLint)

Линтер автоматически находит ошибки и проблемы в коде: неиспользуемые переменные, пропущенные точки с запятой, потенциальные баги.

**Установи:**
```bash
npm install --save-dev eslint
```

**Создай файл .eslintrc.json в корне проекта:**
```json
{
  "env": {
    "node": true,
    "es2021": true,
    "jest": true
  },
  "extends": "eslint:recommended",
  "parserOptions": {
    "ecmaVersion": "latest"
  },
  "rules": {
    "no-unused-vars": "warn",
    "no-console": "off",
    "semi": ["warn", "always"],
    "quotes": ["warn", "single"],
    "no-var": "error",
    "prefer-const": "warn"
  }
}
```

**Добавь скрипт в package.json:**
```json
"scripts": {
  "lint": "eslint backend/ --ext .js",
  "lint:fix": "eslint backend/ --ext .js --fix"
}
```

**Добавь шаг линтинга в GitHub Actions (test.yml):**
```yaml
    - name: Run linter
      run: npm run lint
```

**Проверка:** `npm run lint` покажет предупреждения и ошибки в коде. Исправь хотя бы все ошибки (errors), предупреждения (warnings) можно пока оставить.

---

### Задача 18. Добавь тест на смену пароля

Новая функция смены пароля (задача 14) должна быть покрыта тестами.

**Добавь в server.test.js:**

```javascript
describe('PUT /profile/password', () => {
  let authToken;
  const testEmail = `pwd_test_${Date.now()}@example.com`;
  const testPassword = 'oldpassword123';

  // Перед тестами: создаём пользователя и логинимся
  beforeAll(async () => {
    // Регистрация
    await request(app)
      .post('/register')
      .send({
        email: testEmail,
        password: testPassword,
        name: 'Password Test User'
      });
    
    // Логин для получения токена
    const loginRes = await request(app)
      .post('/login')
      .send({ email: testEmail, password: testPassword });
    
    authToken = loginRes.body.token;
  });

  test('Смена пароля без токена — 401', async () => {
    const response = await request(app)
      .put('/profile/password')
      .send({
        currentPassword: testPassword,
        newPassword: 'newpassword123'
      });
    expect(response.status).toBe(401);
  });

  test('Смена пароля с неверным текущим паролем — 401', async () => {
    const response = await request(app)
      .put('/profile/password')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        currentPassword: 'wrongpassword',
        newPassword: 'newpassword123'
      });
    expect(response.status).toBe(401);
  });

  test('Смена пароля на слишком короткий — 400', async () => {
    const response = await request(app)
      .put('/profile/password')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        currentPassword: testPassword,
        newPassword: '123'
      });
    expect(response.status).toBe(400);
  });

  test('Успешная смена пароля — 200', async () => {
    const response = await request(app)
      .put('/profile/password')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        currentPassword: testPassword,
        newPassword: 'newpassword123'
      });
    expect(response.status).toBe(200);
    expect(response.body.message).toBeDefined();
  });
});
```

**Проверка:** `npm test` — все тесты проходят, включая новые.

---

### Задача 19. Добавь логирование в файл

Сейчас morgan пишет логи только в консоль. При перезапуске сервера вся история теряется. Добавь запись логов в файл для production.

**Установи:**
```bash
npm install rotating-file-stream
```

**В server.js обнови настройку morgan:**

```javascript
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const rfs = require('rotating-file-stream');

// Создаём папку для логов
const logDirectory = path.join(__dirname, 'logs');
if (!fs.existsSync(logDirectory)) {
  fs.mkdirSync(logDirectory);
}

// Ротация логов: новый файл каждый день, хранить 14 дней
const accessLogStream = rfs.createStream('access.log', {
  interval: '1d',    // новый файл каждый день
  path: logDirectory,
  maxFiles: 14        // хранить 14 файлов
});

if (process.env.NODE_ENV === 'production') {
  // Production: подробный формат в файл
  app.use(morgan('combined', { stream: accessLogStream }));
} else {
  // Development: короткий формат в консоль
  app.use(morgan('dev'));
}
```

**Добавь в .gitignore:**
```
backend/logs/
```

**Проверка:** после нескольких запросов появится файл `backend/logs/access.log` с записями.

---

### Задача 20. Добавь endpoint для статистики — GET /stats

Администратору нужна базовая статистика по платформе: сколько пользователей, сколько курсов. Это полезно для dashboard и мониторинга.

**Создай файл backend/routes/stats.js:**

```javascript
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');

// GET /stats — базовая статистика платформы
// Защищён авторизацией
router.get('/stats', authMiddleware, (req, res) => {
  const db = require('../data/database');
  
  const stats = {};
  
  // Собираем статистику из нескольких таблиц
  db.get('SELECT COUNT(*) as count FROM users', (err, usersResult) => {
    if (err) return res.status(500).json({ error: 'Ошибка сервера' });
    stats.totalUsers = usersResult.count;
    
    db.get('SELECT COUNT(*) as count FROM courses', (err, coursesResult) => {
      if (err) return res.status(500).json({ error: 'Ошибка сервера' });
      stats.totalCourses = coursesResult.count;
      
      // Новые пользователи за последние 7 дней
      db.get(
        "SELECT COUNT(*) as count FROM users WHERE created_at >= datetime('now', '-7 days')",
        (err, recentResult) => {
          if (err) return res.status(500).json({ error: 'Ошибка сервера' });
          stats.newUsersLast7Days = recentResult ? recentResult.count : 0;
          
          stats.timestamp = new Date().toISOString();
          res.json(stats);
        }
      );
    });
  });
});

module.exports = router;
```

**В server.js подключи:**
```javascript
const statsRoutes = require('./routes/stats');
app.use(statsRoutes);
```

**Обнови API.md:** добавь описание GET /stats.

**Проверка:**
```bash
curl -H "Authorization: Bearer <токен>" http://localhost:3000/stats
```
Ответ:
```json
{
  "totalUsers": 15,
  "totalCourses": 5,
  "newUsersLast7Days": 3,
  "timestamp": "2026-02-02T12:00:00.000Z"
}
```

---

## Порядок выполнения

| Неделя | Задачи | Фокус |
|--------|--------|-------|
| 1 | 1, 2, 3, 11 | 🔴 Критические исправления и гигиена |
| 2 | 4, 5, 6, 10 | ⚠️ Доработка валидации, тестов, документации |
| 3 | 7, 8, 9, 12 | 🔒 Безопасность и конфигурация |
| 4 | 13, 14, 15, 16 | 🚀 Новая функциональность и рефакторинг |
| 5 | 17, 18, 19, 20 | 🔧 Качество кода и мониторинг |

---

## Правила работы

1. **Один коммит = одна задача.** Используй формат: `feat: add user profile endpoint`
2. **Сначала тесты.** Перед коммитом всегда запускай `npm test`
3. **Не коммить секреты.** Проверяй `git diff --staged` перед каждым коммитом
4. **Обновляй API.md.** При добавлении нового эндпоинта — сразу документируй
5. **Пуш после каждой задачи.** Не копи изменения локально

---

*Документ подготовлен для проекта LearnHub*  
*Версия: 2.0 | Февраль 2026*
