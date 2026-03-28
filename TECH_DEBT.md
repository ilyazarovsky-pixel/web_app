# LearnHub — Технический долг (Tech Debt)

Документ содержит выявленные проблемы в коде и рекомендации по их устранению.

---

## Обзор

| Приоритет | Количество |
|-----------|------------|
| 🔴 High   | 8          |
| 🟡 Medium | 12         |
| 🟢 Low    | 5          |

---

## 🔴 HIGH — Критичные проблемы

### 1. Отсутствие обработки ошибок в async/await

**Файл:** `backend/routes/profile.js`, `backend/routes/enrollments.js` и др.

**Проблема:** Во многих местах отсутствует полная обработка ошибок async функций.

**Пример:**
```javascript
// backend/routes/profile.js:217
const user = await User.findById(userId);
if (user && user.avatar) {
  const oldAvatarPath = path.join(__dirname, '../uploads/avatars', path.basename(user.avatar));
  if (fs.existsSync(oldAvatarPath)) {
    fs.unlinkSync(oldAvatarPath);  // ⚠️ Синхронная операция без try-catch
  }
}
```

**Решение:** Обернуть в try-catch, использовать async fs.promises.

**Приоритет:** HIGH

---

### 2. Потенциальная уязвимость SQL injection

**Файл:** `backend/utils/database.js`

**Проблема:** Использование параметризованных запросов, но нет валидации входных данных на уровне БД.

**Решение:** Добавить Joi/Zod валидацию перед передачей в БД.

**Приоритет:** HIGH

---

### 3. Отсутствие лимита на размер загружаемых файлов

**Файл:** `backend/middleware/upload.js`

**Проблема:** Multer настроен без ограничения размера файла.

```javascript
const upload = multer({
  dest: uploadPath,
  // ❌ Нет limits.fileSize
});
```

**Решение:**
```javascript
const upload = multer({
  dest: uploadPath,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});
```

**Приоритет:** HIGH

---

### 4. Hardcoded значения в коде

**Файл:** `backend/server.js`

**Проблема:**
```javascript
const generalLimiter = rateLimit({
  windowMs: process.env.NODE_ENV === 'test' ? 1 : 15 * 60 * 1000,  // ❌ Magic number
  max: process.env.NODE_ENV === 'test' ? Number.MAX_SAFE_INTEGER : 100,  // ❌ Magic number
});
```

**Решение:** Вынести в переменные окружения:
```javascript
windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
```

**Приоритет:** HIGH

---

### 5. Отсутствие индексации в БД для частых запросов

**Файл:** `backend/utils/database.js`

**Проблема:** Нет индексов для часто используемых полей:
- `reviews.course_id`
- `enrollments.user_id`
- `notifications.user_id`
- `notifications.read`

**Решение:** Добавить индексы при создании таблиц.

**Приоритет:** HIGH

---

### 6. Утечка памяти при WebSocket reconnect

**Файл:** `backend/websocket/index.js`

**Проблема:** Map `userSockets` не очищается при переподключении пользователя.

```javascript
io.on('connection', (socket) => {
  userSockets.set(socket.userId, socket.id);  // ❌ Старое соединение не удаляется
});
```

**Решение:**
```javascript
io.on('connection', (socket) => {
  // Удаляем старое соединение если есть
  const oldSocketId = userSockets.get(socket.userId);
  if (oldSocketId) {
    io.sockets.sockets.get(oldSocketId)?.disconnect();
  }
  userSockets.set(socket.userId, socket.id);
});
```

**Приоритет:** HIGH

---

### 7. Отсутствие fallback при недоступности Redis

**Файл:** `backend/middleware/cache.js`

**Проблема:** Хотя есть проверка `isRedisAvailable()`, нет логирования при падении Redis.

**Решение:** Добавить логирование и метрики.

**Приоритет:** HIGH

---

### 8. Нет валидации JWT версии при logout

**Файл:** `backend/routes/auth.js`

**Проблема:** При logout не увеличивается `token_version`, что позволяет использовать старые токены.

**Приоритет:** HIGH

---

## 🟡 MEDIUM — Средние проблемы

### 9. Функции длиннее 50 строк

**Файл:** `backend/utils/database.js` — `seedCoursePages()` (~150 строк)

**Файл:** `backend/server.js` — `gracefulShutdown()` с вложенными callback

**Решение:** Разбить на меньшие функции.

**Приоритет:** MEDIUM

---

### 10. Дублирование кода валидации

**Файл:** Multiple routes

**Проблема:** Одинаковая валидация ID курса в разных файлах:
```javascript
if (isNaN(courseId) || courseId <= 0) {
  return res.status(400).json({ error: 'Некорректный ID курса' });
}
```

**Решение:** Создать middleware `validateCourseId`.

**Приоритет:** MEDIUM

---

### 11. Отсутствие типизации

**Файл:** Весь проект

**Проблема:** JavaScript без TypeScript/JSDoc типов.

**Решение:** Мигрировать на TypeScript или добавить JSDoc.

**Приоритет:** MEDIUM

---

### 12. Синхронные файловые операции

**Файл:** `backend/utils/database.js`

**Проблема:**
```javascript
const fileBuffer = fs.readFileSync(dbPath);  // ❌ Блокирует event loop
fs.writeFileSync(dbPath, buffer);  // ❌ Блокирует event loop
```

**Решение:** Использовать `fs.promises.readFile/writeFile`.

**Приоритет:** MEDIUM

---

### 13. Нет пагинации для уведомлений

**Файл:** `backend/routes/notifications.js`

**Проблема:** Возвращаются все уведомления (LIMIT 50, но нет пагинации).

**Решение:** Добавить `?page=&limit=` параметры.

**Приоритет:** MEDIUM

---

### 14. Отсутствие кэширования для детального просмотра курса

**Файл:** `backend/routes/api.js`

**Проблема:** Кэшируется только список курсов, но не детали конкретного курса.

**Решение:** Добавить кэш для `/courses/:id`.

**Приоритет:** MEDIUM

---

### 15. Нет обработки 404 для API

**Файл:** `backend/server.js`

**Проблема:** 404 обрабатывается только для статики, API возвращает HTML.

**Решение:** Добавить API-specific 404 handler.

**Приоритет:** MEDIUM

---

### 16. Слабая валидация email

**Файл:** `backend/routes/auth.js`

**Проблема:** Проверка только на наличие `@`, нет проверки формата.

**Решение:** Использовать Joi.string().email() или regex.

**Приоритет:** MEDIUM

---

### 17. Нет retry logic для Redis connection

**Файл:** `backend/utils/redis.js`

**Проблема:** При временной недоступности Redis нет автоматического переподключения.

**Решение:** Настроить `retryStrategy` в ioredis.

**Приоритет:** MEDIUM

---

### 18. Отсутствие метрик производительности

**Файл:** Все

**Проблема:** Нет замеров времени выполнения запросов.

**Решение:** Добавить middleware для логирования slow queries.

**Приоритет:** MEDIUM

---

### 19. Нет rate limiting для WebSocket

**Файл:** `backend/websocket/index.js`

**Проблема:** WebSocket подключения не лимитируются.

**Решение:** Добавить rate limiting на уровне socket.io.

**Приоритет:** MEDIUM

---

### 20. Magic strings для типов уведомлений

**Файл:** `backend/routes/reviews.js`, `backend/routes/enrollments.js`

**Проблема:**
```javascript
type: 'new_review'  // ❌ Magic string
```

**Решение:** Создать константы:
```javascript
const NotificationTypes = {
  NEW_REVIEW: 'new_review',
  NEW_ENROLLMENT: 'new_enrollment'
};
```

**Приоритет:** MEDIUM

---

## 🟢 LOW — Минорные проблемы

### 21. Отсутствие комментариев к сложной логике

**Файл:** `backend/utils/database.js`

**Проблема:** Нет объяснения почему используется sql.js вместо полноценного SQLite.

**Приоритет:** LOW

---

### 22. Неиспользуемые импорты

**Файл:** `backend/routes/profile.js`

**Проблема:** Импорт `invalidateCache` есть, но не используется.

**Приоритет:** LOW

---

### 23. Консольные логи в production

**Файл:** Multiple files

**Проблема:**
```javascript
console.log('Ошибка:...');  // ❌ В production нужно использовать logger
```

**Решение:** Использовать winston/bunyan.

**Приоритет:** LOW

---

### 24. Нет описания API ошибок

**Файл:** Swagger docs

**Проблема:** Не все endpoints имеют описание возможных ошибок.

**Приоритет:** LOW

---

### 25. Отсутствие pre-commit хуков

**Файл:** Project root

**Проблема:** Нет husky для запуска линтера перед коммитом.

**Решение:** Добавить husky + lint-staged.

**Приоритет:** LOW

---

## План рефакторинга

### Спринт 1 (Критичное)
1. ✅ Исправить утечку памяти WebSocket
2. ✅ Добавить лимит размера файлов
3. ✅ Вынести magic numbers в .env
4. ✅ Добавить индексы в БД

### Спринт 2 (Безопасность)
1. ✅ Усилить валидацию email
2. ✅ Добавить token_version при logout
3. ✅ Обработать SQL injection риски

### Спринт 3 (Производительность)
1. ✅ Заменить sync fs на async
2. ✅ Добавить кэш для деталей курса
3. ✅ Настроить retry для Redis

### Спринт 4 (Качество кода)
1. ✅ Разбить длинные функции
2. ✅ Устранить дублирование валидации
3. ✅ Добавить JSDoc типы

---

## Рекомендации

1. **Внедрить TypeScript** — для типобезопасности
2. **Добавить winston** — для структурированного логирования
3. **Настроить CI/CD pipeline** — с автоматическим запуском тестов
4. **Добавить мониторинг** — Prometheus + Grafana
5. **Внедрить интеграционные тесты** — помимо E2E

---

*Документ создан: 2026-03-26*
*Рекомендуется пересматривать раз в спринт*
