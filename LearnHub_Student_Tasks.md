# 15 задач для студента по проекту LearnHub

**Проект:** https://github.com/ilyazarovsky-pixel/web_app  
**Стек:** Node.js, Express, SQLite, Docker  
**Цель:** Улучшить качество кода и добавить базовые практики разработки

---

## Задача 1. Удали node_modules из репозитория

Сейчас папка `node_modules` закоммичена в Git — это ошибка. Эта папка автоматически создаётся при установке зависимостей и весит сотни мегабайт. Каждый разработчик должен устанавливать зависимости сам через `npm install`.

**Что сделать:**

```bash
# Добавь в файл .gitignore строку
node_modules/

# Удали папку из Git (но не с диска)
git rm -r --cached node_modules

# Закоммить изменения
git commit -m "Remove node_modules from repository"
git push
```

**Проверка:** после клонирования проекта на чистую машину папки node_modules не будет, но команда `npm install` создаст её заново.

---

## Задача 2. Создай файл .env.example

В README написано про JWT_SECRET, но нет примера переменных окружения. Новый разработчик не знает какие переменные нужны для запуска проекта. Создай файл-шаблон, который покажет структуру конфигурации.

**Создай файл .env.example в корне проекта:**

```env
# Сервер
PORT=3000
NODE_ENV=development

# Безопасность
JWT_SECRET=your-secret-key-here

# База данных
DATABASE_URL=sqlite:./backend/data/database.db
```

**Добавь в .gitignore:**

```
.env
```

**Проверка:** любой новый разработчик сможет скопировать `.env.example` в `.env` и заполнить свои значения. Сам файл `.env` не попадёт в репозиторий.

---

## Задача 3. Добавь проверку здоровья сервера (health check)

Сейчас непонятно, работает ли сервер после запуска. Health check — стандартный способ проверки состояния сервиса. Его используют системы мониторинга, балансировщики нагрузки и Docker.

**В файле backend/server.js добавь эндпоинт:**

```javascript
// Эндпоинт для проверки здоровья сервера
// Используется для мониторинга и Docker health checks
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});
```

**Обнови docker-compose.yml — добавь проверку здоровья:**

```yaml
services:
  app:
    # ... существующие настройки
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

**Проверка:** открой в браузере `http://localhost:3000/health` — увидишь JSON с информацией о сервере.

---

## Задача 4. Добавь обработку ошибок

Сейчас при ошибке сервер может упасть или показать пользователю непонятное техническое сообщение. Глобальный обработчик ошибок ловит все необработанные исключения и возвращает пользователю понятный ответ.

**В конце файла backend/server.js (перед app.listen) добавь:**

```javascript
// Глобальный обработчик ошибок
// Ловит все необработанные ошибки и возвращает понятный ответ
app.use((err, req, res, next) => {
  // Логируем ошибку для разработчика
  console.error('Ошибка:', err.message);
  console.error('Stack:', err.stack);
  
  // Определяем статус ответа
  const statusCode = err.status || 500;
  
  // В production не показываем детали ошибки
  const message = process.env.NODE_ENV === 'production' 
    ? 'Внутренняя ошибка сервера' 
    : err.message;
  
  res.status(statusCode).json({
    error: {
      message: message,
      status: statusCode
    }
  });
});
```

**Проверка:** при ошибке пользователь увидит понятное JSON-сообщение, а не crash сервера или HTML-страницу с трейсом.

---

## Задача 5. Добавь валидацию входных данных

Сейчас сервер принимает любые данные от пользователя без проверки. Это небезопасно — злоумышленник может отправить вредоносные данные. Валидация проверяет корректность входных данных до их обработки.

**Создай файл backend/validators.js:**

```javascript
// Функция проверки email
function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return pattern.test(email);
}

// Функция проверки пароля
function isValidPassword(password) {
  if (!password || typeof password !== 'string') return false;
  return password.length >= 6;
}

// Функция проверки имени
function isValidName(name) {
  if (!name || typeof name !== 'string') return false;
  return name.trim().length >= 2;
}

module.exports = { isValidEmail, isValidPassword, isValidName };
```

**Пример использования в обработчике регистрации:**

```javascript
const { isValidEmail, isValidPassword, isValidName } = require('./validators');

app.post('/register', (req, res) => {
  const { email, password, name } = req.body;
  
  // Проверяем что все поля заполнены
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Все поля обязательны' });
  }
  
  // Проверяем формат email
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Неверный формат email' });
  }
  
  // Проверяем длину пароля
  if (!isValidPassword(password)) {
    return res.status(400).json({ error: 'Пароль должен быть минимум 6 символов' });
  }
  
  // Проверяем имя
  if (!isValidName(name)) {
    return res.status(400).json({ error: 'Имя должно быть минимум 2 символа' });
  }
  
  // ... остальной код регистрации
});
```

**Проверка:** попробуй отправить пустой email или короткий пароль через Postman — сервер вернёт понятную ошибку с кодом 400.

---

## Задача 6. Добавь логирование запросов

Сейчас непонятно какие запросы приходят на сервер. Логирование помогает отлаживать проблемы и понимать как пользователи работают с приложением.

**Установи библиотеку morgan:**

```bash
npm install morgan
```

**В начале server.js добавь:**

```javascript
const morgan = require('morgan');

// Логируем все HTTP-запросы
// Формат 'dev' показывает: метод, URL, статус, время ответа
app.use(morgan('dev'));
```

**Для production можно использовать формат 'combined':**

```javascript
// В production логируем больше информации
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined'));
} else {
  app.use(morgan('dev'));
}
```

**Проверка:** в консоли будешь видеть все запросы, например:
```
GET /health 200 5.234 ms
POST /login 401 12.456 ms
GET /courses 200 45.789 ms
```

---

## Задача 7. Добавь CORS с ограничениями

Если в проекте открытый CORS (`cors()`), это небезопасно — любой сайт может делать запросы к твоему API от имени авторизованного пользователя. Нужно ограничить список разрешённых доменов.

**Измени настройку CORS в server.js:**

```javascript
const cors = require('cors');

// Список разрешённых доменов
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5000',
  // Добавь сюда production URL когда задеплоишь
];

const corsOptions = {
  origin: function (origin, callback) {
    // Разрешаем запросы без origin (например, curl, Postman)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Запрос заблокирован политикой CORS'));
    }
  },
  credentials: true // Разрешаем отправку cookies
};

app.use(cors(corsOptions));
```

**Проверка:** запросы с других доменов будут заблокированы браузером с ошибкой CORS.

---

## Задача 8. Создай простой тест

Сейчас тестов нет — любое изменение кода может сломать приложение незаметно. Автотесты проверяют что код работает правильно после каждого изменения.

**Установи библиотеки для тестирования:**

```bash
npm install --save-dev jest supertest
```

**В server.js добавь экспорт приложения (в конце файла):**

```javascript
// Экспортируем app для тестирования
module.exports = app;
```

**Создай файл backend/server.test.js:**

```javascript
const request = require('supertest');
const app = require('./server');

describe('Health check endpoint', () => {
  
  test('GET /health возвращает статус 200', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
  });
  
  test('GET /health возвращает status: ok', async () => {
    const response = await request(app).get('/health');
    expect(response.body.status).toBe('ok');
  });
  
  test('GET /health содержит timestamp', async () => {
    const response = await request(app).get('/health');
    expect(response.body).toHaveProperty('timestamp');
  });
  
});

describe('404 handling', () => {
  
  test('Несуществующий маршрут возвращает 404', async () => {
    const response = await request(app).get('/nonexistent-route');
    expect(response.status).toBe(404);
  });
  
});
```

**В package.json добавь скрипт:**

```json
"scripts": {
  "test": "jest --detectOpenHandles"
}
```

**Проверка:** команда `npm test` запустит тесты и покажет результат — зелёный если всё ок, красный если что-то сломано.

---

## Задача 9. Добавь скрипт для режима разработки

Сейчас при каждом изменении кода нужно вручную перезапускать сервер. Nodemon автоматически перезапускает сервер при изменении файлов.

**Установи nodemon:**

```bash
npm install --save-dev nodemon
```

**В package.json обнови секцию scripts:**

```json
"scripts": {
  "start": "node backend/server.js",
  "dev": "nodemon backend/server.js",
  "test": "jest --detectOpenHandles"
}
```

**Создай файл nodemon.json в корне проекта:**

```json
{
  "watch": ["backend"],
  "ext": "js,json",
  "ignore": ["node_modules", "*.test.js"],
  "delay": 1000
}
```

**Проверка:** запусти `npm run dev`, измени любой файл в папке backend — сервер перезапустится автоматически через 1 секунду.

---

## Задача 10. Улучши Dockerfile

Текущий Dockerfile можно оптимизировать. Правильный порядок команд ускоряет сборку за счёт кэширования слоёв Docker. Alpine-образ меньше по размеру.

**Замени содержимое Dockerfile:**

```dockerfile
# Используем легковесный Alpine образ с конкретной версией Node.js
FROM node:18-alpine

# Устанавливаем рабочую директорию
WORKDIR /app

# Сначала копируем только package.json и package-lock.json
# Это позволяет Docker кэшировать слой с зависимостями
# При изменении кода зависимости не будут переустанавливаться
COPY package*.json ./

# Устанавливаем только production зависимости
# --omit=dev исключает devDependencies
RUN npm ci --omit=dev

# Копируем остальной код приложения
COPY backend ./backend
COPY frontend ./frontend

# Устанавливаем переменные окружения по умолчанию
ENV NODE_ENV=production
ENV PORT=3000

# Создаём непривилегированного пользователя для безопасности
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Создаём директорию для данных и даём права
RUN mkdir -p /app/backend/data && \
    chown -R nodejs:nodejs /app

# Переключаемся на непривилегированного пользователя
USER nodejs

# Открываем порт
EXPOSE 3000

# Запускаем приложение
CMD ["node", "backend/server.js"]
```

**Проверка:** 
- `docker build . -t learnhub` соберёт образ
- При изменении кода (без изменения зависимостей) сборка будет быстрой
- Образ будет меньше по размеру

---

## Задача 11. Добавь favicon

Браузер автоматически запрашивает `/favicon.ico` при загрузке страницы. Без иконки в консоли появляется ошибка 404, а вкладка выглядит пустой.

**Вариант 1 — Emoji как favicon (самый простой):**

В файле frontend/index.html в секции `<head>` добавь:

```html
<!-- Используем emoji как favicon — работает во всех современных браузерах -->
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>📚</text></svg>">
```

**Вариант 2 — Файл favicon:**

1. Создай или скачай файл `favicon.ico` (32x32 или 16x16 пикселей)
2. Положи его в папку `frontend/`
3. В server.js добавь маршрут:

```javascript
const path = require('path');

app.get('/favicon.ico', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/favicon.ico'));
});
```

**Проверка:** обнови страницу — во вкладке браузера появится иконка вместо стандартной.

---

## Задача 12. Добавь страницу 404

Когда пользователь переходит по несуществующему URL, он должен видеть понятное сообщение, а не техническую ошибку. Красивая страница 404 улучшает пользовательский опыт.

**Создай файл frontend/404.html:**

```html
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Страница не найдена - LearnHub</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    
    .container {
      text-align: center;
      padding: 2rem;
    }
    
    .error-code {
      font-size: 120px;
      font-weight: bold;
      line-height: 1;
      opacity: 0.9;
    }
    
    .error-message {
      font-size: 24px;
      margin: 1rem 0 2rem;
      opacity: 0.8;
    }
    
    .home-link {
      display: inline-block;
      padding: 12px 24px;
      background: white;
      color: #667eea;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      transition: transform 0.2s;
    }
    
    .home-link:hover {
      transform: scale(1.05);
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="error-code">404</div>
    <p class="error-message">Страница не найдена</p>
    <a href="/" class="home-link">Вернуться на главную</a>
  </div>
</body>
</html>
```

**В server.js добавь обработчик 404 (перед глобальным обработчиком ошибок):**

```javascript
const path = require('path');

// Обработчик для несуществующих маршрутов
// Должен быть после всех остальных маршрутов
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, '../frontend/404.html'));
});
```

**Проверка:** зайди на `http://localhost:3000/blablabla` — увидишь красивую страницу с кодом 404.

---

## Задача 13. Добавь описание API (документацию)

Без документации другие разработчики не смогут понять как использовать твой API. Даже простой Markdown-файл с описанием эндпоинтов сильно упрощает работу.

**Создай файл API.md в корне проекта:**

```markdown
# LearnHub API Documentation

## Базовая информация

- **Base URL:** `http://localhost:3000`
- **Формат данных:** JSON
- **Авторизация:** Bearer token в заголовке Authorization

---

## Эндпоинты

### Проверка здоровья

**GET /health**

Проверяет работоспособность сервера.

Ответ (200 OK):
```json
{
  "status": "ok",
  "timestamp": "2025-01-20T12:00:00.000Z",
  "uptime": 3600.5
}
```

---

### Аутентификация

#### Регистрация

**POST /register**

Создаёт нового пользователя.

Тело запроса:
```json
{
  "email": "user@example.com",
  "password": "123456",
  "name": "Иван Иванов"
}
```

Ответ (201 Created):
```json
{
  "message": "Пользователь успешно создан",
  "userId": 1
}
```

Ошибки:
- 400 — Неверный формат данных
- 409 — Email уже зарегистрирован

---

#### Вход

**POST /login**

Авторизует пользователя и возвращает токен.

Тело запроса:
```json
{
  "email": "user@example.com",
  "password": "123456"
}
```

Ответ (200 OK):
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "Иван Иванов"
  }
}
```

Ошибки:
- 401 — Неверный email или пароль

---

### Курсы

#### Получить список курсов

**GET /courses**

Возвращает список всех курсов.

Заголовки:
```
Authorization: Bearer <token>
```

Ответ (200 OK):
```json
{
  "courses": [
    {
      "id": 1,
      "title": "Основы JavaScript",
      "description": "Курс для начинающих",
      "lessonsCount": 10
    }
  ]
}
```

---

## Коды ошибок

| Код | Описание |
|-----|----------|
| 400 | Неверный запрос (ошибка валидации) |
| 401 | Не авторизован |
| 403 | Доступ запрещён |
| 404 | Ресурс не найден |
| 500 | Внутренняя ошибка сервера |
```

**Проверка:** любой разработчик сможет прочитать документацию и понять как работать с API без чтения исходного кода.

---

## Задача 14. Добавь сжатие ответов

Большие JSON-ответы и статические файлы загружаются медленно. Gzip-сжатие уменьшает размер ответов в 3-5 раз, ускоряя загрузку страницы.

**Установи библиотеку compression:**

```bash
npm install compression
```

**В начале server.js добавь:**

```javascript
const compression = require('compression');

// Включаем gzip-сжатие для всех ответов
// Браузер автоматически распаковывает сжатые данные
app.use(compression({
  // Сжимаем ответы больше 1KB
  threshold: 1024,
  // Уровень сжатия (1-9, где 6 — баланс скорости и размера)
  level: 6
}));
```

**Проверка:** 
1. Открой DevTools в браузере (F12)
2. Перейди на вкладку Network
3. Сделай запрос к API
4. В заголовках ответа увидишь `Content-Encoding: gzip`
5. Колонка Size покажет сжатый размер, а не оригинальный

---

## Задача 15. Настрой GitHub Actions для автотестов

Сейчас тесты нужно запускать вручную локально. GitHub Actions автоматически запускает тесты при каждом коммите и pull request. Это называется CI (Continuous Integration).

**Создай папку и файл .github/workflows/test.yml:**

```yaml
name: Тесты

# Когда запускать workflow
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    # Запускаем на Ubuntu
    runs-on: ubuntu-latest
    
    steps:
    # Шаг 1: Клонируем репозиторий
    - name: Клонируем репозиторий
      uses: actions/checkout@v4
    
    # Шаг 2: Устанавливаем Node.js
    - name: Устанавливаем Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
    
    # Шаг 3: Устанавливаем зависимости
    - name: Устанавливаем зависимости
      run: npm ci
    
    # Шаг 4: Запускаем тесты
    - name: Запускаем тесты
      run: npm test
      env:
        NODE_ENV: test
        JWT_SECRET: test-secret-key
```

**Проверка:** 
1. Закоммить и запушь изменения
2. Зайди на GitHub в раздел Actions
3. Увидишь запущенный workflow
4. Зелёная галочка — тесты прошли, красный крестик — есть ошибки

---

## Порядок выполнения

Рекомендуемый порядок задач по неделям:

| Неделя | Задачи | Что получишь |
|--------|--------|--------------|
| 1 | 1, 2, 3, 9 | Базовая гигиена проекта: правильный .gitignore, переменные окружения, health check, автоперезагрузка |
| 2 | 4, 5, 6 | Надёжность сервера: обработка ошибок, валидация, логирование |
| 3 | 7, 10, 14 | Безопасность и производительность: CORS, оптимизированный Docker, сжатие |
| 4 | 8, 15 | Автотесты и CI/CD: тесты запускаются автоматически при каждом коммите |
| 5 | 11, 12, 13 | Документация и UX: favicon, страница 404, описание API |

---

## Советы

1. **Делай отдельный коммит для каждой задачи.** Это показывает историю развития проекта и упрощает откат изменений.

2. **Пиши понятные commit messages.** Например: "Add health check endpoint", "Configure CORS restrictions", "Add API documentation".

3. **Тестируй каждое изменение.** Перед коммитом убедись что приложение запускается и работает.

4. **Читай ошибки внимательно.** Node.js и npm выдают подробные сообщения об ошибках — в них обычно есть решение.

5. **Используй Git-ветки.** Создавай отдельную ветку для каждой задачи, потом делай pull request в main.

---

*Документ подготовлен для проекта LearnHub*  
*Дата: январь 2025*
