# LearnHub

Образовательная веб-платформа для онлайн-обучения.

## Технологии

- **Backend:** Node.js, Express
- **Database:** SQLite
- **Auth:** JWT (JSON Web Tokens) с Refresh токенами
- **Containerization:** Docker
- **File Upload:** Multer
- **Email:** Nodemailer
- **API Docs:** Swagger UI

## Возможности

- ✅ Регистрация и аутентификация (JWT + Refresh токены)
- ✅ Просмотр и поиск курсов по категориям
- ✅ Запись на курсы и отслеживание прогресса
- ✅ **Многостраничные курсы** с текстовым контентом, видео и интерактивными схемами
- ✅ **Интерактивные схемы** с анимацией и информацией об элементах
- ✅ **Модальное окно завершения курса** с поздравлением
- ✅ Избранные курсы
- ✅ Отзывы и рейтинги курсов
- ✅ Редактирование профиля и загрузка аватара
- ✅ Удаление аккаунта
- ✅ Админ-панель для управления курсами и пользователями
- ✅ Email уведомления (приветствие, сброс пароля)
- ✅ Swagger документация API

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

## API документация

После запуска сервера откройте Swagger UI:
- **Swagger:** http://localhost:3000/api-docs

Подробное описание API — в файле [API.md](./API.md)

## Структура проекта

```
├── backend/
│   ├── server.js          # Основной сервер Express
│   ├── middleware/        # Middleware (auth, roles, upload)
│   ├── routes/            # Маршруты API
│   │   ├── auth.js        # Аутентификация
│   │   ├── profile.js     # Профиль пользователя
│   │   ├── api.js         # Курсы
│   │   ├── categories.js  # Категории
│   │   ├── enrollments.js # Запись на курсы
│   │   ├── progress.js    # Прогресс
│   │   ├── favorites.js   # Избранное
│   │   ├── reviews.js     # Отзывы
│   │   ├── admin.js       # Админ-панель
│   │   └── ...
│   ├── models/            # Модели данных
│   ├── utils/             # Утилиты (БД, валидация, email, swagger)
│   ├── uploads/           # Загруженные файлы (аватары)
│   └── data/              # SQLite база данных
├── frontend/
│   ├── index.html         # Главная страница
│   ├── 404.html           # Страница ошибки
│   └── ...                # CSS, JS файлы
├── .github/workflows/     # CI/CD (GitHub Actions)
├── Dockerfile             # Конфигурация Docker
├── docker-compose.yml     # Docker Compose
├── API.md                 # Документация API
└── README.md              # Этот файл
```

## Переменные окружения

См. `.env.example`:
- `JWT_SECRET` — секретный ключ для JWT (обязательно в production!)
- `SMTP_*` — настройки SMTP сервера для email уведомлений

## Роли пользователей

- **user** — обычный пользователь
- **admin** — администратор (может управлять курсами и пользователялями)

Для назначения роли администратора используйте API:
```bash
PUT /api/admin/users/:id/role
{
  "role": "admin"
}
```