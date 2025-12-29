# Используем более новую версию Node.js, совместимую с better-sqlite3
FROM node:20-alpine

# Устанавливаем Python и другие зависимости для компиляции native модулей
RUN apk add --no-cache python3 make g++

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем package.json и package-lock.json (если есть)
COPY backend/package*.json ./

# Устанавливаем зависимости
RUN npm install

# Создаем директории для backend и frontend
RUN mkdir -p backend frontend

# Копируем backend файлы
COPY backend/ ./backend/

# Копируем frontend файлы
COPY frontend/ ./frontend/

# Создаем директорию для данных (включая базу данных)
RUN mkdir -p backend/data

# Открываем порт 3000
EXPOSE 3000

# Устанавливаем рабочую директорию в backend
WORKDIR /app/backend

# Запускаем приложение
CMD ["node", "server.js"]