# Задание: Pull и анализ изменений LearnHub (v5)

**Дата задания:** 2026-04-20
**Версия:** v5 — Security Hardening + Observability
**Предыдущая версия:** v4 (Advanced: WebSocket, Redis, E2E, Docker Prod)

## Контекст
Проект студента: `E:\Zaro\web_app-main-git`
Репозиторий: https://github.com/ilyazarovsky-pixel/web_app

После v4 студент закрыл: socket.io уведомления, Redis-кэш и rate limit, Playwright E2E, multi-stage Dockerfile, docker-compose.prod.yml, deploy.sh, ARCHITECTURE.md, TECH_DEBT.md, юнит-тесты enrollments.

На код-ревью v4 было найдено **10 HIGH**, **15 MEDIUM** и **5 LOW** проблем. На их основе составлен v5 — Security Hardening + Observability. Твоя задача — проверить, как студент их закрыл.

## Шаг 1. Git Pull

```bash
cd E:\Zaro\web_app-main-git
git pull origin main
```

Если будут конфликты — сообщи и остановись.

## Шаг 2. Последние коммиты

```bash
git log --oneline -20
```

Запиши hash + сообщение для каждого нового коммита после `13f559b4`.

## Шаг 3. Проверь критические исправления (v5 HIGH)

### Исправление H1: Logout требует авторизации
**Файл:** `backend/routes/auth.js`
**Ищи:** маршрут `POST /auth/logout` должен использовать `authMiddleware`, `userId` берётся из `req.user.id`, а НЕ из `req.body`.
**Антипаттерн:** `const { userId } = req.body;` без аутентификации — FAIL.

### Исправление H2: authMiddleware сверяет token_version
**Файл:** `backend/middleware/auth.js`
**Ищи:** после `jwt.verify` — запрос в БД `SELECT token_version FROM users WHERE id = ?` и сравнение `decoded.version !== row.token_version`. При расхождении → 401.

### Исправление H3: WebSocket поддерживает несколько вкладок
**Файл:** `backend/websocket/index.js`
**Ищи:** `userSockets` должен быть `Map<userId, Set<socketId>>`. При disconnect удаляется ТОЛЬКО конкретный socketId, запись в Map очищается лишь когда Set пуст. Функция отправки уведомлений должна итерировать Set и слать всем socketId пользователя.

### Исправление H4: deploy.sh сохраняет прошлый образ для отката
**Файл:** `deploy.sh`
**Ищи:** перед `docker-compose build` — `docker tag learnhub:latest learnhub:rollback`. В блоке ошибки — `docker tag learnhub:rollback learnhub:latest` + повторный `up -d`. Простой `up -d` после failed-билда — FAIL.

### Исправление H5: deploy.sh с `set -euo pipefail`
**Файл:** `deploy.sh`
**Ищи:** в начале файла (строки 1-3) должно быть `set -euo pipefail`. Если вместо этого только проверки `if [ $? -ne 0 ]` — FAIL.

### Исправление H6: invalidateCache использует SCAN, а не KEYS
**Файл:** `backend/middleware/cache.js`
**Ищи:** функция `invalidateCache` должна использовать `redis.scanStream` или `scan` с курсором. Если осталось `redis.keys(pattern)` — FAIL.

### Исправление H7: нормализация ключа кэша
**Файл:** `backend/middleware/cache.js`
**Ищи:** ключ формируется из отсортированного whitelist query-параметров, а не сырого `req.originalUrl`. Например: `normalizeKey(req.query, ['page', 'limit', 'category'])`. Наличие ограничения длины ключа — плюс.

### Исправление H8: security headers в nginx
**Файл:** `nginx/nginx.conf`
**Ищи:** в `server {}` блоке `add_header` минимум для: `Strict-Transport-Security`, `X-Frame-Options DENY`, `X-Content-Type-Options nosniff`, `Referrer-Policy`, `Content-Security-Policy`. Проверь, что они установлены именно в nginx (не полагаемся только на helmet).

### Исправление H9: HTTPS в nginx
**Файл:** `nginx/nginx.conf` и `docker-compose.prod.yml`
**Ищи:** `listen 443 ssl`, `ssl_certificate`, `ssl_certificate_key`, редирект `80 → 443` в отдельном `server {}`. В compose смонтированы сертификаты (letsencrypt/self-signed для dev). Если есть README-объяснение как сгенерировать dev-сертификат — плюс.

### Исправление H10: enrollments проверяет существование курса и транзакция
**Файл:** `backend/routes/enrollments.js`
**Ищи:** перед INSERT — `if (!course) return res.status(404)`. В init БД — `PRAGMA foreign_keys = ON`. Плюсом — обёртка в транзакцию `BEGIN...COMMIT` если обновляется несколько таблиц.

## Шаг 4. Проверь MEDIUM задачи

| # | Задача | Где смотреть | Критерий ✅ |
|---|--------|-------------|------------|
| M1 | schema.sql синхронизирован с database.js | `backend/data/schema.sql` | Все таблицы (notifications, reviews, enrollments, favorites, progress) + колонки role, token_version, author_id |
| M2 | Индексы в БД | `backend/utils/database.js` | CREATE INDEX для `notifications.user_id`, `enrollments.user_id`, `enrollments.course_id`, `reviews.course_id` |
| M3 | enrollments PUT /complete возвращает 404 | `backend/routes/enrollments.js` | Проверка `result.changes === 0` → 404 |
| M4 | Тесты на in-memory SQLite | `backend/routes/enrollments.test.js` | `DATABASE_FILE=':memory:'` или отдельный `setupTestDb` с транзакционным откатом |
| M5 | E2E без waitForTimeout | `e2e/*.spec.js` | `grep waitForTimeout e2e/` должен вернуть ≤1 использования (idle-wait можно, scroll-wait — нет) |
| M6 | playwright.config с NODE_ENV=test | `playwright.config.mjs` | webServer command: `NODE_ENV=test npm run start` или отдельная test-db |
| M7 | JWT_SECRET из GitHub Secrets | `.github/workflows/test.yml` | `${{ secrets.JWT_SECRET }}`, не хардкод |
| M8 | Линтер обязателен | `.github/workflows/test.yml` | Нет `|| true` после `npm run lint` |
| M9 | Dockerfile копирует node_modules из builder | `Dockerfile` | `COPY --from=builder /app/node_modules ./node_modules`, нет повторного npm ci |
| M10 | Healthcheck для nginx и start_period для redis | `docker-compose.prod.yml` | Оба есть |
| M11 | Транзакция при удалении курса | `backend/routes/admin.js` | `BEGIN; DELETE...; COMMIT;` или FK ON DELETE CASCADE |
| M12 | invalidateCache await перед res.json | `backend/routes/admin.js` | `await invalidateCache(...)` выше `res.json(...)` |
| M13 | Порядок роутов notifications | `backend/routes/notifications.js` | `PUT /notifications/read-all` зарегистрирован ДО `PUT /notifications/:id/read` |
| M14 | Кэш Playwright в CI | `.github/workflows/test.yml` | `actions/cache@v4` для `~/.cache/ms-playwright` |
| M15 | TECH_DEBT.md актуален | `TECH_DEBT.md` | Нет ложных ✅ на невыполненных задачах |

## Шаг 5. Проверь новые фичи v5 (Observability + Security)

| # | Функция | Файл/команда | Критерий ✅ |
|---|---------|--------------|------------|
| 1 | Structured logging (pino) | `backend/utils/logger.js` | Pino + pino-http, JSON в prod, pretty в dev |
| 2 | Request ID middleware | `backend/middleware/requestId.js` | Заголовок `X-Request-Id` на входе и выходе |
| 3 | /metrics endpoint (Prometheus) | `backend/routes/metrics.js` | Экспорт default metrics + http_request_duration_seconds |
| 4 | /health и /ready эндпоинты | `backend/server.js` | `/health` — liveness, `/ready` — проверяет БД и Redis |
| 5 | CSRF защита (double-submit или header) | `backend/middleware/csrf.js` | Токен проверяется для state-changing запросов от cookie-auth клиентов |
| 6 | Helmet с кастомной CSP | `backend/server.js` | `helmet({ contentSecurityPolicy: {...} })` — не дефолтная |
| 7 | Лимит размера файла аватара | `backend/middleware/upload.js` | `limits.fileSize` ≤ 2 МБ, `fileFilter` по MIME |
| 8 | Sentry или аналог error tracking | `backend/server.js` | `@sentry/node` или эквивалент, инициализация до роутов |
| 9 | Graceful shutdown всего стека | `backend/server.js` | `SIGTERM` → close HTTP → close WS → close Redis → close DB |
| 10 | OpenAPI сгенерирован из кода | `backend/utils/swagger.js` | JSDoc-аннотации на роутах, /api-docs доступен |
| 11 | Dependabot/Renovate | `.github/dependabot.yml` | Настроен еженедельный апдейт |
| 12 | CODEOWNERS + PR template | `.github/CODEOWNERS`, `.github/pull_request_template.md` | Файлы присутствуют |
| 13 | Docker image сканируется trivy в CI | `.github/workflows/test.yml` | job с `aquasecurity/trivy-action` |
| 14 | Load test (k6 или autocannon) | `loadtest/` | Минимум 1 сценарий, README с инструкциями |
| 15 | Rollback документирован | `deploy.sh` + `README.md` | Отдельная команда `./deploy.sh rollback` или секция в README |

## Шаг 6. Составь отчёт

Формат:

```
## Результат проверки LearnHub v5

### Git Pull
- Статус: OK / CONFLICT / ERROR
- Новых коммитов: N
- Текущий HEAD: <hash>

### Новые коммиты
1. hash — сообщение
2. ...

### HIGH исправления (10)
| # | Проблема | Статус | Комментарий |
|---|----------|--------|-------------|
| H1 | Logout требует auth | ✅/❌/⚠️ | ... |
| H2 | token_version в access | ✅/❌/⚠️ | ... |
| ... | ... | ... | ... |

### MEDIUM задачи (15)
| # | Задача | Статус | Комментарий |
|---|--------|--------|-------------|
| M1 | ... | ✅/❌/⚠️ | ... |

### Новые фичи v5 (15)
| # | Функция | Статус | Комментарий |
|---|---------|--------|-------------|
| 1 | Pino logger | ✅/❌/⚠️ | ... |

### Сводка
- HIGH закрыто: X/10
- MEDIUM закрыто: X/15
- v5-фич реализовано: X/15
- Общая готовность: X%

### Дополнительные замечания
- ...

### Регрессии (новые проблемы, появившиеся в v5)
- файл:строка — описание
```

## Важно
- Читай файлы, не угадывай. На сомнительных местах — процитируй строку.
- Если коммитов нет (студент не пушил) — так и пиши: "v5 не начат".
- ⚠️ используй когда задача сделана частично: логика правильная, но неполная, либо есть явный баг.
- Регрессии (поломки v4 при работе над v5) — отдельный раздел, это важно.
- Отчёт конкретный, без воды. Не пересказывай файлы — указывай путь:строку.
