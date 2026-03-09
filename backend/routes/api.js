const express = require('express');
const router = express.Router();

// Пример данных курсов
const courses = [
  {
    id: 1,
    title: 'Основы программирования',
    description: 'Изучите основы программирования: переменные, типы данных, условия и циклы. Идеально для начинающих.',
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
        content: 'На этом курсе по основам программирования вы узнали: что такое программирование, изучили переменные и типы данных, рассмотрели структуру программы.'
      },
      {
        type: 'text',
        title: 'Практическое задание',
        content: 'Создайте свою первую программу, используя изученные концепции.'
      }
    ]
  },
  {
    id: 2,
    title: 'Веб-разработка',
    description: 'Освойте создание веб-сайтов с помощью HTML, CSS и JavaScript. От основ до продвинутых техник.',
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
        content: 'В рамках курса по веб-разработке вы изучили: основы веб-разработки, освоили HTML и CSS.'
      },
      {
        type: 'text',
        title: 'Проект',
        content: 'Создайте свой первый веб-сайт, используя HTML и CSS.'
      },
      {
        type: 'text',
        title: 'Деплой',
        content: 'Научитесь размещать свой сайт в интернете.'
      }
    ]
  },
  {
    id: 3,
    title: 'JavaScript для начинающих',
    description: 'Полный курс по JavaScript: от основ до асинхронного программирования и работы с API.',
    pages: [
      {
        type: 'text',
        title: 'Введение в JavaScript',
        content: 'JavaScript — это язык программирования, который делает веб-страницы интерактивными.'
      },
      {
        type: 'video',
        title: 'Видеоурок: Функции и объекты',
        description: 'Изучите основы работы с функциями и объектами в JavaScript.'
      },
      {
        type: 'text',
        title: 'DOM манипуляции',
        content: 'Научитесь изменять содержимое веб-страницы с помощью JavaScript.'
      },
      {
        type: 'text',
        title: 'События',
        content: 'Обработка кликов, ввода текста и других действий пользователя.'
      }
    ]
  },
  {
    id: 4,
    title: 'Python для анализа данных',
    description: 'Изучите Python для работы с данными: библиотеки Pandas, NumPy и визуализация данных.',
    pages: [
      {
        type: 'text',
        title: 'Введение в Python',
        content: 'Python — мощный язык программирования, популярный в анализе данных.'
      },
      {
        type: 'video',
        title: 'Видеоурок: Библиотека Pandas',
        description: 'Работа с таблицами данных в Pandas.'
      },
      {
        type: 'text',
        title: 'Визуализация данных',
        content: 'Создание графиков и диаграмм с помощью Matplotlib и Seaborn.'
      }
    ]
  },
  {
    id: 5,
    title: 'React для современных приложений',
    description: 'Создавайте динамические веб-приложения с помощью React. Хуки, контекст и роутинг.',
    pages: [
      {
        type: 'text',
        title: 'Введение в React',
        content: 'React — библиотека JavaScript для создания пользовательских интерфейсов.'
      },
      {
        type: 'video',
        title: 'Видеоурок: Компоненты и Props',
        description: 'Основы работы с компонентами в React.'
      },
      {
        type: 'text',
        title: 'Хуки',
        content: 'useState, useEffect и другие хуки для управления состоянием.'
      },
      {
        type: 'text',
        title: 'React Router',
        content: 'Навигация между страницами в React-приложении.'
      },
      {
        type: 'text',
        title: 'Контекст',
        content: 'Глобальное управление состоянием с помощью Context API.'
      },
      {
        type: 'text',
        title: 'Проект',
        content: 'Создайте полноценное React-приложение.'
      },
      {
        type: 'text',
        title: 'Деплой',
        content: 'Размещение React-приложения в production.'
      }
    ]
  },
  {
    id: 6,
    title: 'Node.js и Express',
    description: 'Бэкенд-разработка на Node.js. Создание REST API, работа с базами данных и аутентификация.',
    pages: [
      {
        type: 'text',
        title: 'Введение в Node.js',
        content: 'Node.js позволяет запускать JavaScript на сервере.'
      },
      {
        type: 'video',
        title: 'Видеоурок: Express框架',
        description: 'Создание веб-сервера с помощью Express.'
      },
      {
        type: 'text',
        title: 'REST API',
        content: 'Проектирование и создание RESTful API.'
      },
      {
        type: 'text',
        title: 'Базы данных',
        content: 'Работа с MongoDB и SQL базами данных.'
      }
    ]
  },
  {
    id: 7,
    title: 'Git и GitHub',
    description: 'Система контроля версий Git. Ветвление, слияние, pull request и совместная разработка.',
    pages: [
      {
        type: 'text',
        title: 'Введение в Git',
        content: 'Git — система контроля версий для отслеживания изменений в коде.'
      },
      {
        type: 'video',
        title: 'Видеоурок: Основные команды',
        description: 'git add, commit, push, pull и другие команды.'
      },
      {
        type: 'text',
        title: 'Ветвление',
        content: 'Работа с ветками и слияние изменений.'
      }
    ]
  },
  {
    id: 8,
    title: 'CSS и адаптивный дизайн',
    description: 'Современный CSS: Flexbox, Grid, анимации. Создание адаптивных сайтов для всех устройств.',
    pages: [
      {
        type: 'text',
        title: 'Введение в CSS',
        content: 'Каскадные таблицы стилей для оформления веб-страниц.'
      },
      {
        type: 'video',
        title: 'Видеоурок: Flexbox',
        description: 'Гибкая верстка с помощью Flexbox.'
      },
      {
        type: 'text',
        title: 'CSS Grid',
        content: 'Двумерная сетка для сложных макетов.'
      },
      {
        type: 'text',
        title: 'Адаптивность',
        content: 'Медиа-запросы и мобильная верстка.'
      },
      {
        type: 'text',
        title: 'Анимации',
        content: 'Создание плавных анимаций на CSS.'
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

module.exports = router;