# =============================================================================
# Stage 1: Builder
# Устанавливаем ВСЕ зависимости для сборки (если нужна сборка frontend)
# =============================================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Копируем package файлы
COPY package*.json ./

# Устанавливаем ВСЕ зависимости (включая dev)
RUN npm ci

# Копируем весь код
COPY . .

# Если нужна сборка frontend - раскомментируйте:
# RUN npm run build

# =============================================================================
# Stage 2: Production
# Минимальный образ только с production зависимостями
# =============================================================================
FROM node:20-alpine AS production

# Устанавливаем wget для healthcheck
RUN apk add --no-cache wget

WORKDIR /app

# Копируем package файлы
COPY package*.json ./

# Устанавливаем только production зависимости
RUN npm ci --omit=dev && npm cache clean --force

# Копируем код приложения из builder stage
COPY --from=builder /app/backend ./backend
COPY --from=builder /app/frontend ./frontend

# Создаём директорию для данных
RUN mkdir -p /app/backend/data && \
    mkdir -p /app/backend/uploads && \
    mkdir -p /app/backend/logs

# Создаём непривилегированного пользователя
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

# Переключаемся на непривилегированного пользователя
USER nodejs

# Открываем порт
EXPOSE 3000

# Переменные окружения
ENV NODE_ENV=production
ENV PORT=3000

# HEALTHCHECK - проверка здоровья контейнера
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Запускаем приложение
CMD ["node", "backend/server.js"]
