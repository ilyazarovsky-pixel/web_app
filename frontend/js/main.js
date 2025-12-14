// Глобальное состояние
let currentUser = null;

// Навигация между страницами
function navigateTo(pageId) {
  document.querySelectorAll('.page').forEach(el => el.classList.remove('active'));
  document.getElementById(`page-${pageId}`).classList.add('active');

  // Обновляем заголовок в шапке
  const titles = {
    'login': 'Авторизация',
    'register': 'Регистрация',
    'main': 'Главная',
    'profile': 'Профиль',
    'course': 'Курс'
  };
  document.getElementById('page-title').textContent = titles[pageId] || 'Главная';

  if (pageId === 'main') {
    loadCourses('main-course-list');
  } else if (pageId === 'profile' && currentUser) {
    document.getElementById('profile-name').textContent = currentUser.name || 'Пользователь';
  }

  // Скрыть меню при переходе
  if (document.getElementById('mobile-menu').classList.contains('active')) {
    toggleMenu();
  }
}

// Переключение мобильного меню
function toggleMenu() {
  const menu = document.getElementById('mobile-menu');
  const overlay = document.getElementById('mobile-menu-overlay');
  menu.classList.toggle('active');
  overlay.classList.toggle('active');
}

// Выход из аккаунта
function logout() {
  currentUser = null;
  navigateTo('login');
  // Очистим данные (опционально)
  localStorage.removeItem('user');
}

// Загрузка курсов
async function loadCourses(containerId) {
  try {
    const res = await fetch('/api/courses');
    const courses = await res.json();
    const container = document.getElementById(containerId);
    
    container.innerHTML = courses.map(course => `
      <div class="course-card" onclick="openCourse(${course.id}, '${course.title}')">
        <h3>${course.title}</h3>
        <p>${course.description || 'Описание курса'}</p>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = '<p class="error">Ошибка загрузки курсов</p>';
  }
}

// Открытие курса
function openCourse(id, title) {
  document.getElementById('course-title').textContent = title || 'Курс';
  navigateTo('course');
}

// ✅ Завершение курса — модальное окно БЕЗ таймера
function completeCourse() {
  if (!currentUser) return alert('Вы не авторизованы');

  const modal = document.getElementById('completion-modal');
  const userName = currentUser.name || 'Ученик';
  document.getElementById('modal-message').textContent = 
    `🎉 Поздравляем, ${userName}! Вы успешно завершили курс!`;
  
  modal.style.display = 'flex';
}

function closeModal() {
  document.getElementById('completion-modal').style.display = 'none';
}

// Вспомогательная функция: валидна ли дата (например, 31.04 — невалидна)
function isValidDate(dateString) {
  if (!dateString) return false;
  const d = new Date(dateString);
  return d instanceof Date && !isNaN(d) && 
         dateString === new Date(d.getTime() - d.getTimezoneOffset() * 60000)
           .toISOString()
           .split('T')[0]; // Сравниваем строку с ISO-форматом (без смещения)
}

// Проверка возраста ≥16 лет
function isAtLeast16(birthDateString) {
  const today = new Date();
  const birthDate = new Date(birthDateString);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age >= 16;
}

// Установим max-дату как "сегодня" (чтобы нельзя было выбрать будущее)
document.addEventListener('DOMContentLoaded', () => {
  const today = new Date().toISOString().split('T')[0];
  const birthInput = document.getElementById('birthDate');
  if (birthInput) birthInput.max = today;
});

// Обработчик регистрации (обновлённый)
document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const name = document.querySelector('#registerForm input[placeholder="Имя"]').value.trim();
  const email = document.querySelector('#registerForm input[placeholder="Email"]').value.trim();
  const password = document.querySelector('#registerForm input[placeholder="Пароль (≥4 символа)"]').value;
  const birthDateString = document.getElementById('birthDate')?.value;

  // ✅ 1. Пароль ≥4 символов (повторная проверка, даже если minlength=4)
  if (password.length < 4) {
    alert('❌ Пароль должен содержать не менее 4 символов');
    return;
  }

  // ✅ 2. Проверка даты рождения
  if (!birthDateString) {
    alert('❌ Укажите дату рождения');
    return;
  }

  // ✅ 3. Валидна ли дата? (защита от 31.02, 30.02 и т.д.)
  if (!isValidDate(birthDateString)) {
    alert('❌ Некорректная дата рождения. Пожалуйста, выберите дату из календаря.');
    return;
  }

  // ✅ 4. Возраст ≥16 лет?
  if (!isAtLeast16(birthDateString)) {
    alert('❌ Вам должно быть не менее 16 лет для регистрации.');
    return;
  }

  if (!name || !email) {
    alert('❌ Заполните все поля');
    return;
  }

  const data = { name, email, password, birthDate: birthDateString };

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();

    if (result.success) {
      alert('✅ Регистрация успешна!');
      navigateTo('login');
    } else {
      alert('❌ ' + (result.message || 'Ошибка регистрации'));
    }
  } catch (err) {
    alert('⚠️ Ошибка подключения к серверу');
  }

  // 🔄 Автовосстановление сессии
  const savedUser = localStorage.getItem('user');
  if (savedUser) {
    try {
      currentUser = JSON.parse(savedUser);
      navigateTo('main');
    } catch (e) {
      localStorage.removeItem('user');
    }
  } else {
    navigateTo('login');
  }

  // Обработчик закрытия модального окна по клику вне
  window.addEventListener('click', (e) => {
    const modal = document.getElementById('completion-modal');
    if (e.target === modal) closeModal();
  });
});

// Вход — обновлённый
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const email = document.querySelector('#loginForm input[placeholder="Email"]').value.trim();
  const password = document.querySelector('#loginForm input[placeholder="Пароль"]').value;
  const errorEl = document.getElementById('login-error');

  // Скроем ошибку перед отправкой
  errorEl.classList.remove('show');
  errorEl.textContent = '';

  // Базовая валидация
  if (!email || !password) {
    errorEl.textContent = '📧 Email и пароль обязательны';
    errorEl.classList.add('show');
    return;
  }

  const data = { email, password };

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();

    if (result.success) {
      currentUser = result.user;
      localStorage.setItem('user', JSON.stringify(currentUser));
      navigateTo('main');
    } else {
      // ✅ Показываем сообщение под формой
      errorEl.textContent = result.message || 'Неверный email или пароль';
      errorEl.classList.add('show');
      
      // Опционально: фокус на поле email
      document.querySelector('#loginForm input[placeholder="Email"]').focus();
    }
  } catch (err) {
    errorEl.textContent = '⚠️ Ошибка подключения к серверу';
    errorEl.classList.add('show');
  }
});