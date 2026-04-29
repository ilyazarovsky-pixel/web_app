# LearnHub - образовательная веб-платформа

Educational platform для онлайн-обучения с адаптивным дизайном и интерактивными возможностями (многостраничные курсы, анимированные схемы, прогресс обучения).

## Особенности

- ✅ JWT аутентификация с Refresh Token
- ✅ Авторизация (user/admin)
- ✅ Ролевая модель (admin/user)
- ✅ CRUD курсы (только для admin)
- ✅ Регистрация/авторизация
- ✅ Профиль пользователя (редактирование, загрузка аватара)
- ✅ Курсы (просмотр, поиск, фильтрация)
- ✅ Запись на курсы
- ✅ Прогресс обучения
- ✅ Отзывы и рейтинги
- ✅ Избранные курсы
- ✅ Категории курсов
- ✅ Интерактивные элементы (анимированные схемы)
- ✅ Многостраничные курсы
- ✅ Уведомления
- ✅ API документация (Swagger)
- ✅ Docker и Docker Compose
- ✅ Тестирование (unit, integration, e2e)
- ✅ Безопасность (Helmet, CORS, Rate Limiting)
- ✅ Логирование (Morgan)
- ✅ WebSocket уведомления
- ✅ Кэширование (Redis)
- ✅ Рейт-лимит (Redis-based)
- ✅ Структурное логирование (Pino)
- ✅ Метрики (Prometheus)
- ✅ Отслеживание ошибок (Sentry)

## Установка

1. Клонируйте репозиторий:
   ```bash
   git clone https://github.com/ilyazarovsky-pixel/web_app.git
   cd web_app
   ```

2. Установите зависимости:
   ```bash
   npm install
   ```

3. Создайте `.env` файл:
   ```bash
   cp .env.example .env
   ```
   
4. Заполните `.env` файл:
   - `JWT_SECRET` - секретный ключ для JWT (генерируется командой ниже)
   - `SMTP_*` - настройки SMTP для отправки почты
   - `SENTRY_DSN` - DSN для Sentry (опционально)

   Генерация JWT_SECRET:
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

## Запуск

### Dev режим (hot reload)

```bash
# Backend (nodemon)
npm run dev

# Frontend (live-server)
npm run frontend
```

### Production режим

```bash
# Через Docker Compose
docker-compose up --build -d

# Или через npm
npm start
```

### Docker Compose (production)

```bash
# Запуск
docker-compose -f docker-compose.prod.yml up --build -d

# Просмотр логов
docker-compose -f docker-compose.prod.yml logs -f

# Остановка
docker-compose -f docker-compose.prod.yml down
```

## Деплой

Для деплоя используется скрипт `deploy.sh`:

```bash
# Запуск деплоя
./deploy.sh

# В случае проблем можно выполнить откат к предыдущей версии
./deploy.sh rollback
```

Скрипт делает следующее:
1. Проверяет наличие .env и docker-compose.prod.yml файлов
2. Обновляет код из репозитория (git pull)
3. Создает резервную копию текущего образа как learnhub:rollback
4. Собирает новые Docker образы
5. Останавливает старые контейнеры
6. Запускает новые контейнеры
7. Проверяет health-checks
8. В случае ошибки - автоматически откатывается к предыдущей версии
9. Очищает старые образы

## API

API документация доступна по адресу: `http://localhost:3000/api-docs`

## Тестирование

### Unit/Integration тесты

```bash
npm test
```

### E2E тесты (Playwright)

```bash
# Запуск
npm run test:e2e

# Запуск в UI режиме
npm run test:e2e:ui
```

### Линтер

```bash
npm run lint
```

## Стек технологий

- **Frontend**: HTML, CSS, JS
- **Backend**: Node.js, Express.js
- **База данных**: SQLite (embedded)
- **Кэш/Rate Limiting**: Redis
- **Авторизация**: JWT
- **Документация**: Swagger
- **Тестирование**: Jest, Playwright
- **Контейнеризация**: Docker, Docker Compose
- **Логирование**: Pino
- **Метрики**: Prometheus
- **Отслеживание ошибок**: Sentry

## Архитектура

См. [ARCHITECTURE.md](ARCHITECTURE.md) для подробного описания архитектуры проекта.

## Технический долг

См. [TECH_DEBT.md](TECH_DEBT.md) для списка известных проблем и задач по улучшению проекта.

## Откат к предыдущей версии

Если произошла ошибка во время деплоя, вы можете выполнить откат к предыдущей версии:

```bash
# Вручную
docker tag learnhub:rollback learnhub:latest
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d

# Или с помощью скрипта (если он реализован)
./deploy.sh rollback
```

Скрипт деплоя автоматически создает резервную копию перед каждым деплоем и может выполнить откат в случае ошибки.