const express = require('express');
const router = express.Router();

// Пример данных курсов
const courses = [
  { id: 1, title: 'Курс 1', description: 'Описание курса 1' },
  { id: 2, title: 'Курс 2', description: 'Описание курса 2' },
];

// Получить курсы
router.get('/courses', (req, res) => {
  res.json(courses);
});

// Получить профиль пользователя
router.get('/profile', (req, res) => {
  res.json({
    name: 'Иван Иванов',
    avatar: 'https://via.placeholder.com/100',
    courses: courses.slice(0, 2),
    bio: 'Люблю учиться и развиваться.'
  });
});

module.exports = router;