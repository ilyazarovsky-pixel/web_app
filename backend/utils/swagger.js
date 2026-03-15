const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'LearnHub API',
      version: '1.0.0',
      description: 'API документация для образовательной платформы LearnHub',
      contact: {
        name: 'LearnHub Support',
        email: 'support@learnhub.example.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Введите JWT токен в формате: Bearer <ваш_токен>'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: 'ID пользователя' },
            name: { type: 'string', description: 'Имя пользователя' },
            email: { type: 'string', format: 'email', description: 'Email' },
            birthDate: { type: 'string', format: 'date', description: 'Дата рождения' },
            avatar: { type: 'string', nullable: true, description: 'URL аватара' },
            bio: { type: 'string', nullable: true, description: 'О себе' },
            createdAt: { type: 'string', format: 'date-time', description: 'Дата регистрации' }
          }
        },
        Course: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: 'ID курса' },
            title: { type: 'string', description: 'Название курса' },
            description: { type: 'string', description: 'Описание курса' },
            categoryName: { type: 'string', nullable: true, description: 'Название категории' },
            categorySlug: { type: 'string', nullable: true, description: 'Slug категории' },
            createdAt: { type: 'string', format: 'date-time', description: 'Дата создания' }
          }
        },
        Review: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: 'ID отзыва' },
            rating: { type: 'integer', minimum: 1, maximum: 5, description: 'Оценка от 1 до 5' },
            comment: { type: 'string', nullable: true, description: 'Текст отзыва' },
            userName: { type: 'string', description: 'Имя автора' },
            createdAt: { type: 'string', format: 'date-time', description: 'Дата создания' }
          }
        },
        Enrollment: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: 'ID записи' },
            userId: { type: 'integer', description: 'ID пользователя' },
            courseId: { type: 'integer', description: 'ID курса' },
            enrolledAt: { type: 'string', format: 'date-time', description: 'Дата записи' },
            completedAt: { type: 'string', format: 'date-time', nullable: true, description: 'Дата завершения' }
          }
        },
        Progress: {
          type: 'object',
          properties: {
            courseId: { type: 'integer', description: 'ID курса' },
            completedLessons: { type: 'array', items: { type: 'integer' }, description: 'Пройденные уроки' },
            totalCompleted: { type: 'integer', description: 'Всего пройдено' },
            currentPage: { type: 'integer', description: 'Текущая страница' }
          }
        },
        Favorite: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: 'ID курса' },
            title: { type: 'string', description: 'Название курса' },
            description: { type: 'string', description: 'Описание курса' },
            addedAt: { type: 'string', format: 'date-time', description: 'Дата добавления' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string', description: 'Сообщение об ошибке' },
            status: { type: 'integer', description: 'HTTP статус код' }
          }
        }
      }
    },
    tags: [
      { name: 'Auth', description: 'Аутентификация и регистрация' },
      { name: 'Users', description: 'Управление профилем пользователя' },
      { name: 'Courses', description: 'Курсы и категории' },
      { name: 'Enrollments', description: 'Запись на курсы' },
      { name: 'Progress', description: 'Прогресс обучения' },
      { name: 'Favorites', description: 'Избранные курсы' },
      { name: 'Reviews', description: 'Отзывы и рейтинги' },
      { name: 'Admin', description: 'Админ-панель' }
    ]
  },
  apis: ['./backend/routes/*.js'] // Путь к файлам с JSDoc комментариями
};

const specs = swaggerJsdoc(options);

module.exports = specs;
