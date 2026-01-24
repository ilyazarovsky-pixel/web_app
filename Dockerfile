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