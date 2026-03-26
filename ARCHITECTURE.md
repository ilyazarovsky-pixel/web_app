# LearnHub — Архитектура проекта

Образовательная платформа с адаптивным дизайном, real-time уведомлениями и кэшированием.

---

## 1. Структура проекта

```
learnhub/
├── backend/
│   ├── middleware/          # Express middleware
│   │   ├── auth.js          # JWT аутентификация
│   │   ├── cache.js         # Redis кэширование
│   │   ├── role.js          # Проверка ролей
│   │   └── upload.js        # Загрузка файлов
│   ├── models/              # Модели данных
│   │   └── User.js          # Модель пользователя
│   ├── routes/              # API маршруты
│   │   ├── admin.js         # Админ панель
│   │   ├── api.js           # Публичный API (курсы)
│   │   ├── auth.js          # Аутентификация
│   │   ├── categories.js    # Категории курсов
│   │   ├── courses.js       # Поиск курсов
│   │   ├── enrollments.js   # Запись на курсы
│   │   ├── favorites.js     # Избранное
│   │   ├── notifications.js # Уведомления
│   │   ├── profile.js       # Профиль пользователя
│   │   ├── progress.js      # Прогресс обучения
│   │   ├── reviews.js       # Отзывы и рейтинги
│   │   └── stats.js         # Статистика
│   ├── utils/               # Утилиты
│   │   ├── database.js      # SQLite (sql.js)
│   │   ├── redis.js         # Redis подключение
│   │   ├── swagger.js       # Swagger документация
│   │   └── validation.js    # Валидация данных
│   ├── websocket/           # WebSocket сервер
│   │   └── index.js         # Socket.io настройка
│   ├── data/                # SQLite база данных
│   ├── uploads/             # Загруженные файлы
│   ├── logs/                # Логи приложения
│   ├── init-db.js           # Инициализация БД
│   └── server.js            # Точка входа Express
├── frontend/
│   ├── css/
│   │   └── style.css        # Стили приложения
│   ├── js/
│   │   └── main.js          # Frontend логика
│   ├── assets/
│   │   └── images/          # Изображения
│   └── index.html           # Главная страница
├── e2e/                     # E2E тесты (Playwright)
│   ├── basic.spec.js
│   ├── auth.spec.js
│   └── courses.spec.js
├── nginx/
│   └── nginx.conf           # Nginx конфигурация
├── .github/workflows/
│   └── test.yml             # GitHub Actions CI/CD
├── docker-compose.yml       # Development compose
├── docker-compose.prod.yml  # Production compose
├── Dockerfile               # Multi-stage Dockerfile
├── deploy.sh                # Скрипт деплоя
└── package.json
```

---

## 2. Диаграмма структуры

```
┌─────────────────────────────────────────────────────────────┐
│                        Client (Browser)                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP / WebSocket
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Nginx (Production)                      │
│  - Reverse Proxy    - Gzip       - Rate Limiting            │
│  - Static Files     - SSL Term   - WebSocket Proxy          │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ port 3000
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Node.js / Express Backend                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Middleware Stack:                                    │   │
│  │  helmet → cors → compression → morgan → rateLimit    │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Routes:                                              │   │
│  │  /api/auth, /api/courses, /profile, /enrollments...  │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  WebSocket (Socket.io):                               │   │
│  │  - JWT Auth  - Real-time notifications               │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
            │                    │                    │
            ▼                    ▼                    ▼
    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
    │  SQLite      │    │   Redis      │    │   File       │
    │  (sql.js)    │    │  (ioredis)   │    │   System     │
    │              │    │              │    │              │
    │  - users     │    │  - Cache     │    │  - uploads/  │
    │  - courses   │    │  - Rate Lim  │    │  - data/     │
    │  - reviews   │    │  - Sessions  │    │  - logs/     │
    └──────────────┘    └──────────────┘    └──────────────┘
```

---

## 3. Описание модулей

### Routes (Маршруты)

| Модуль | Префикс | Описание |
|--------|---------|----------|
| `auth.js` | `/api/auth` | Регистрация, вход, refresh токена |
| `api.js` | `/api` | Публичный API: список курсов, поиск |
| `courses.js` | `/` | Детали курса, страницы курса |
| `categories.js` | `/api` | Категории курсов |
| `admin.js` | `/admin` | Админ панель (CRUD курсов, пользователи) |
| `profile.js` | `/` | Профиль пользователя, смена пароля, аватар |
| `enrollments.js` | `/` | Запись на курсы, мои курсы |
| `progress.js` | `/` | Прогресс обучения по курсам |
| `favorites.js` | `/` | Избранные курсы |
| `reviews.js` | `/courses/:id` | Отзывы и рейтинги курсов |
| `stats.js` | `/` | Статистика пользователя |
| `notifications.js` | `/notifications` | Уведомления (WebSocket + история) |

### Middleware

| Модуль | Описание |
|--------|----------|
| `auth.js` | Проверка JWT токена, добавляет `req.user` |
| `cache.js` | Redis кэширование ответов с TTL |
| `role.js` | Проверка роли пользователя (admin/user) |
| `upload.js` | Обработка загрузки файлов (multer) |

### Utils (Утилиты)

| Модуль | Описание |
|--------|----------|
| `database.js` | SQLite через sql.js (in-memory + persistence) |
| `redis.js` | Redis подключение, graceful shutdown |
| `swagger.js` | Swagger/OpenAPI документация |
| `validation.js` | Валидация данных (имя, email, пароль) |

### WebSocket

| Модуль | Описание |
|--------|----------|
| `websocket/index.js` | Socket.io сервер с JWT авторизацией |

---

## 4. Схема базы данных

### Таблицы SQLite

```sql
-- Пользователи
users (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  birth_date TEXT NOT NULL,
  avatar TEXT,
  bio TEXT,
  role TEXT DEFAULT 'user',
  token_version INTEGER DEFAULT 0,
  created_at DATETIME,
  updated_at DATETIME
)

-- Категории
categories (
  id INTEGER PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL
)

-- Курсы
courses (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  full_description TEXT,
  image TEXT,
  status TEXT DEFAULT 'active',
  author_id INTEGER,  -- Для уведомлений
  category_id INTEGER,
  created_at DATETIME,
  FOREIGN KEY (category_id) REFERENCES categories(id),
  FOREIGN KEY (author_id) REFERENCES users(id)
)

-- Страницы курсов
course_pages (
  id INTEGER PRIMARY KEY,
  course_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  page_type TEXT DEFAULT 'text',
  video_url TEXT,
  diagram_data TEXT,
  page_order INTEGER,
  created_at DATETIME,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
)

-- Записи на курсы
enrollments (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL,
  course_id INTEGER NOT NULL,
  enrolled_at DATETIME,
  completed_at DATETIME,
  UNIQUE(user_id, course_id)
)

-- Прогресс
progress (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL,
  course_id INTEGER NOT NULL,
  page_index INTEGER NOT NULL,
  completed_at DATETIME,
  UNIQUE(user_id, course_id, page_index)
)

-- Избранное
favorites (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL,
  course_id INTEGER NOT NULL,
  created_at DATETIME,
  UNIQUE(user_id, course_id)
)

-- Отзывы
reviews (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL,
  course_id INTEGER NOT NULL,
  rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at DATETIME,
  updated_at DATETIME,
  UNIQUE(user_id, course_id)
)

-- Уведомления
notifications (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  data TEXT,  -- JSON
  read INTEGER DEFAULT 0,
  created_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
)
```

---

## 5. API Endpoints

### Аутентификация

| Метод | Endpoint | Описание | Auth |
|-------|----------|----------|------|
| POST | `/api/auth/register` | Регистрация | ❌ |
| POST | `/api/auth/login` | Вход | ❌ |
| POST | `/api/auth/refresh` | Refresh токена | ✅ |
| POST | `/api/auth/logout` | Выход | ✅ |

### Курсы

| Метод | Endpoint | Описание | Auth |
|-------|----------|----------|------|
| GET | `/api/courses` | Список курсов | ❌ |
| GET | `/api/courses/:id` | Детали курса | ❌ |
| GET | `/courses/:id/reviews` | Отзывы курса | ❌ |
| POST | `/courses/:id/reviews` | Оставить отзыв | ✅ |
| DELETE | `/courses/:id/reviews` | Удалить отзыв | ✅ |

### Запись на курсы

| Метод | Endpoint | Описание | Auth |
|-------|----------|----------|------|
| POST | `/enrollments` | Записаться на курс | ✅ |
| GET | `/enrollments` | Мои курсы | ✅ |
| DELETE | `/enrollments/:courseId` | Отписаться | ✅ |
| PUT | `/enrollments/:courseId/complete` | Завершить курс | ✅ |

### Профиль

| Метод | Endpoint | Описание | Auth |
|-------|----------|----------|------|
| GET | `/profile` | Получить профиль | ✅ |
| PUT | `/profile` | Обновить профиль | ✅ |
| PUT | `/profile/password` | Сменить пароль | ✅ |
| POST | `/profile/avatar` | Загрузить аватар | ✅ |
| DELETE | `/profile/avatar` | Удалить аватар | ✅ |
| DELETE | `/profile` | Удалить аккаунт | ✅ |

### Уведомления

| Метод | Endpoint | Описание | Auth |
|-------|----------|----------|------|
| GET | `/notifications` | Список уведомлений | ✅ |
| GET | `/notifications/unread-count` | Кол-во непрочитанных | ✅ |
| PUT | `/notifications/:id/read` | Отметить прочитанным | ✅ |
| PUT | `/notifications/read-all` | Все прочитаны | ✅ |
| DELETE | `/notifications/:id` | Удалить уведомление | ✅ |

### Админ панель

| Метод | Endpoint | Описание | Auth |
|-------|----------|----------|------|
| GET | `/admin/courses` | Список курсов | ✅ Admin |
| POST | `/admin/courses` | Создать курс | ✅ Admin |
| PUT | `/admin/courses/:id` | Обновить курс | ✅ Admin |
| DELETE | `/admin/courses/:id` | Удалить курс | ✅ Admin |
| GET | `/admin/users` | Список пользователей | ✅ Admin |
| PUT | `/admin/users/:id/role` | Изменить роль | ✅ Admin |

---

## 6. WebSocket события

### Клиент → Сервер

| Событие | Данные | Описание |
|---------|--------|----------|
| `connect` | `{ token }` | Подключение с JWT токеном |
| `disconnect` | — | Отключение (автоматически) |

### Сервер → Клиент

| Событие | Данные | Описание |
|---------|--------|----------|
| `notification` | `{ type, courseId, courseTitle, reviewerName?, rating?, comment?, studentName?, timestamp }` | Real-time уведомление |

### Типы уведомлений

| Тип | Описание | Данные |
|-----|----------|--------|
| `new_review` | Новый отзыв на курс автора | courseId, courseTitle, reviewerName, rating, comment |
| `new_enrollment` | Новый студент записался на курс | courseId, courseTitle, studentName |

---

## 7. Переменные окружения

| Переменная | Описание | Пример |
|------------|----------|--------|
| `PORT` | Порт сервера | `3000` |
| `NODE_ENV` | Окружение | `development`, `production`, `test` |
| `JWT_SECRET` | Секретный ключ JWT | `your-secret-key` |
| `CORS_ORIGINS` | Разрешённые CORS домены | `http://localhost:3000,http://localhost:5000` |
| `REDIS_URL` | Redis подключение | `redis://localhost:6379` |
| `SMTP_HOST` | SMTP сервер | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP порт | `587` |
| `SMTP_USER` | SMTP пользователь | `your-email@gmail.com` |
| `SMTP_PASSWORD` | SMTP пароль | `app-password` |

---

## 8. Технологии

### Backend
- **Node.js** 18+ / 20
- **Express.js** — веб-фреймворк
- **sql.js** — SQLite in-memory
- **ioredis** — Redis клиент
- **socket.io** — WebSocket
- **jsonwebtoken** — JWT аутентификация
- **bcryptjs** — Хеширование паролей
- **multer** — Загрузка файлов
- **express-rate-limit** — Rate limiting
- **helmet** — Security headers
- **compression** — Gzip сжатие
- **morgan** — HTTP логи

### Frontend
- **Vanilla JavaScript** (ES6+)
- **CSS3** (Flexbox, Grid)
- **Font Awesome** — иконки

### DevOps
- **Docker** / **Docker Compose**
- **Nginx** — reverse proxy
- **Redis** — кэширование
- **GitHub Actions** — CI/CD
- **Playwright** — E2E тесты
- **Jest** — unit тесты

---

## 9. Кэширование (Redis)

### Ключи кэша

| Паттерн | Описание | TTL |
|---------|----------|-----|
| `courses:list:*` | Список курсов | 5 мин |
| `user:{userId}` | Профиль пользователя | 10 мин |

### Инвалидация

- Курсы: при создании/обновлении/удалении курса
- Профиль: при обновлении профиля/пароля/аватара

---

## 10. Безопасность

- JWT токены с версионированием (для logout)
- HTTPS в production (nginx)
- Rate limiting (API + auth)
- CORS whitelist
- Helmet security headers
- Непривилегированный пользователь в Docker
- SQL injection защита (parameterized queries)

---

*Документ сгенерирован автоматически. Последнее обновление: 2026-03-26*
