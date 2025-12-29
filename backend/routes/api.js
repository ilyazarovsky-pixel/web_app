const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { validateId } = require('../utils/validation');
const User = require('../models/User');
const router = express.Router();

// Пример данных курсов
const courses = [
  {
    id: 1,
    title: 'Основы программирования',
    description: 'Описание курса 1',
    pages: [
      {
        type: 'text',
        title: 'Введение в программирование',
        content: 'Программирование — это процесс создания компьютерных программ. Программа — это набор инструкций, которые компьютер выполняет для достижения определённой цели.'
      },
      {
        type: 'video',
        title: 'Видеоурок: Переменные и типы данных',
        description: 'В этом видео вы узнаете о переменных и типах данных в программировании.',
      },
      {
        type: 'diagram',
        title: 'Схема: Структура программы',
        description: 'На этой схеме показана типичная структура программы.'
      },
      {
        type: 'text',
        title: 'Заключение',
        content: 'На этом курсе по основам программирования вы узнали: что такое программирование, изучили переменные и типы данных, рассмотрели структуру программы. Эти знания составляют основу для дальнейшего изучения программирования.'
      }
    ]
  },
  {
    id: 2,
    title: 'Веб-разработка',
    description: 'Описание курса 2',
    pages: [
      {
        type: 'text',
        title: 'Введение в веб-разработку',
        content: 'Веб-разработка — это создание веб-сайтов и веб-приложений. Современная веб-разработка делится на фронтенд и бэкенд разработку.'
      },
      {
        type: 'video',
        title: 'Видеоурок: HTML и CSS',
        description: 'В этом видео вы изучите основы HTML и CSS — основных технологий для создания веб-страниц.'
      },
      {
        type: 'diagram',
        title: 'Схема: Архитектура веб-приложения',
        description: 'На этой схеме показана архитектура типичного веб-приложения.'
      },
      {
        type: 'text',
        title: 'Заключение',
        content: 'В рамках курса по веб-разработке вы изучили: основы веб-разработки, освоили HTML и CSS — основные технологии для создания веб-страниц, и рассмотрели архитектуру веб-приложений. Эти навыки являются фундаментом для создания современных веб-сайтов.'
      }
    ]
  }
];

// Получить курсы (публичный маршрут)
router.get('/courses', (req, res) => {
  res.json(courses);
});

// Получить конкретный курс по ID
router.get('/courses/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const course = courses.find(c => c.id === id);

  if (!course) {
    return res.status(404).json({
      success: false,
      message: 'Курс не найден'
    });
  }

  res.json(course);
});

// Получить профиль пользователя (защищенный маршрут)
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    // Получаем обновленные данные пользователя из базы
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Пользователь не найден'
      });
    }

    res.json({
      name: user.name,
      email: user.email,
      birthDate: user.birthDate,
      avatar: 'https://via.placeholder.com/100',
      courses: courses.slice(0, 2),
      bio: 'Люблю учиться и развиваться.',
      createdAt: user.createdAt
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Ошибка сервера при получении профиля'
    });
  }
});

module.exports = router;