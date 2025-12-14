const express = require('express');
const router = express.Router();

// Упрощённая имитация базы данных
let users = [];

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email && u.password === password);
  if (user) {
    res.json({ success: true, message: 'Вход выполнен', user: { id: user.id, name: user.name } });
  } else {
    res.status(401).json({ success: false, message: 'Неверный email или пароль' });
  }
});

// Вспомогательные функции (добавьте в начало файла auth.js)
function isValidDate(dateString) {
  if (!dateString) return false;
  const d = new Date(dateString);
  return d instanceof Date && !isNaN(d) && 
         dateString === new Date(d.getTime() - d.getTimezoneOffset() * 60000)
           .toISOString()
           .split('T')[0];
}

function getAge(birthDateString) {
  const today = new Date();
  const birthDate = new Date(birthDateString);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

// Обновлённый обработчик регистрации
router.post('/register', (req, res) => {
  const { name, email, password, birthDate } = req.body;

  // ✅ 1. Пароль ≥4 символов
  if (!password || password.length < 4) {
    return res.status(400).json({ 
      success: false, 
      message: 'Пароль должен содержать не менее 4 символов' 
    });
  }

  // ✅ 2. Проверка формата и существования даты
  if (!birthDate || !isValidDate(birthDate)) {
    return res.status(400).json({ 
      success: false, 
      message: 'Некорректная дата рождения' 
    });
  }

  // ✅ 3. Возраст ≥16 лет
  const age = getAge(birthDate);
  if (age < 16) {
    return res.status(400).json({ 
      success: false, 
      message: 'Вам должно быть не менее 16 лет для регистрации' 
    });
  }

  // Остальные проверки
  if (!name || !email) {
    return res.status(400).json({ 
      success: false, 
      message: 'Все поля обязательны' 
    });
  }

  if (users.some(u => u.email === email)) {
    return res.status(400).json({ 
      success: false, 
      message: 'Пользователь с таким email уже существует' 
    });
  }

  const newUser = {
    id: Date.now(),
    name,
    email,
    password, // ⚠️ В продакшене — bcrypt.hashSync(password, 10)
    birthDate
  };
  users.push(newUser);
  
  res.json({ 
    success: true, 
    message: 'Регистрация успешна', 
    user: { id: newUser.id, name: newUser.name } 
  });
});

module.exports = router;