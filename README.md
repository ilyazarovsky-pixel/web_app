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