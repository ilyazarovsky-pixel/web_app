// Глобальное состояние
let currentUser = null;
let authToken = null;

// Функция для получения токена из localStorage
function getAuthToken() {
  return localStorage.getItem('authToken');
}

// Функция для сохранения токена в localStorage
function setAuthToken(token) {
  if (token) {
    localStorage.setItem('authToken', token);
    authToken = token;
  } else {
    localStorage.removeItem('authToken');
    authToken = null;
  }
}

// Функция для удаления токена
function removeAuthToken() {
  localStorage.removeItem('authToken');
  authToken = null;
}

// Функция для добавления заголовка авторизации к запросу
function addAuthHeader(headers) {
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  return headers;
}

function navigateTo(pageId) {
  // Убедимся, что элемент существует перед тем, как сделать его активным
  const targetPage = document.getElementById(`page-${pageId}`);
  if (!targetPage) {
    console.error(`Страница с ID page-${pageId} не найдена`);
    return;
  }
  
  document.querySelectorAll('.page').forEach(el => el.classList.remove('active'));
  targetPage.classList.add('active');

  // Обновляем заголовок в шапке
  const titles = {
    'login': 'Авторизация',
    'register': 'Регистрация',
    'main': 'Главная',
    'profile': 'Профиль',
    'course': 'Курс'
  };
  
  // Обновляем заголовок в шапке главной страницы, если он доступен
  const pageTitleElement = document.getElementById('page-title');
  if (pageTitleElement && pageId !== 'login' && pageId !== 'register') {
    pageTitleElement.textContent = titles[pageId] || 'Главная';
  }

  if (pageId === 'main') {
    loadCourses('main-course-list');
  } else if (pageId === 'profile' && currentUser) {
    loadProfile();
  }

  // Скрыть меню при переходе
  if (document.getElementById('mobile-menu')?.classList.contains('active')) {
    toggleMenu();
  }
}

function toggleMenu() {
  const menu = document.getElementById('mobile-menu');
  const overlay = document.getElementById('mobile-menu-overlay');
  menu.classList.toggle('active');
  overlay.classList.toggle('active');
  document.body.style.overflow = menu.classList.contains('active') ? 'hidden' : '';
}

// Выход из аккаунта
function logout() {
  currentUser = null;
  // Удаляем токен аутентификации
  removeAuthToken();
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

    // Очищаем контейнер
    container.innerHTML = '';

    // Создаем элементы курсов и добавляем обработчики событий
    courses.forEach(course => {
      const courseElement = document.createElement('div');
      courseElement.className = 'course-card';
      courseElement.innerHTML = `
        <h3>${course.title}</h3>
        <p>${course.description || 'Описание курса'}</p>
      `;
      
      // Добавляем обработчик события
      courseElement.addEventListener('click', () => openCourse(course.id, course.title));
      
      container.appendChild(courseElement);
    });
  } catch (err) {
    container.innerHTML = '<p class="error">Ошибка загрузки курсов</p>';
  }
}

// Загрузка профиля пользователя
async function loadProfile() {
  try {
    const headers = addAuthHeader({ 'Content-Type': 'application/json' });
    const res = await fetch('/api/profile', {
      method: 'GET',
      headers: headers
    });

    if (res.status === 401) {
      // Если токен недействителен, перенаправляем на страницу входа
      logout();
      return;
    }

    const profile = await res.json();

    if (profile.success === false) {
      console.error('Ошибка получения профиля:', profile.message);
      return;
    }

    document.getElementById('profile-name').textContent = profile.name || 'Пользователь';
  } catch (err) {
    console.error('Ошибка загрузки профиля:', err);
    document.getElementById('profile-name').textContent = currentUser?.name || 'Пользователь';
  }
}

// Текущий курс и индекс страницы
let currentCourse = null;
let currentPageIndex = 0;

// Открытие курса
function openCourse(id, title) {
  // Загружаем данные курса с многостраничным содержимым
  currentCourse = getCourseById(id);
  if (!currentCourse) {
    alert('Курс не найден');
    return;
  }

  document.getElementById('course-title').textContent = title || 'Курс';
  currentPageIndex = 0;
  loadCoursePage(currentCourse, currentPageIndex);
  navigateTo('course');
}

// Загрузка конкретной страницы курса
function loadCoursePage(course, pageIndex) {
  const container = document.querySelector('.course-pages-container');
  if (!course.pages || pageIndex >= course.pages.length) {
    // Если страницы нет, показываем сообщение или завершаем курс
    showCompletionModal();
    return;
  }

  const page = course.pages[pageIndex];
  let pageContent = '';

  // Создаем контент страницы в зависимости от типа
  switch(page.type) {
    case 'text':
      pageContent = `
        <div class="course-page">
          <h3>${page.title || 'Страница курса'}</h3>
          <div class="page-text-content">${page.content || ''}</div>
        </div>
      `;
      break;
    case 'video':
      pageContent = `
        <div class="course-page">
          <h3>${page.title || 'Видеоурок'}</h3>
          <div class="video-placeholder">
            <p>Видео: ${page.title || 'Видеоурок'}</p>
            <div class="video-scheme">
              <div class="video-placeholder-content">Видеоплеер</div>
            </div>
          </div>
          ${page.description ? `<div class="page-text-content">${page.description}</div>` : ''}
        </div>
      `;
      break;
    case 'diagram':
      pageContent = `
        <div class="course-page">
          <h3>${page.title || 'Схема'}</h3>
          <div class="diagram-placeholder">
            <p>Схема: ${page.title || 'Веб-схема'}</p>
            <div class="diagram-scheme">
              <div class="diagram-placeholder-content">Визуальная схема</div>
            </div>
          </div>
          ${page.description ? `<div class="page-text-content">${page.description}</div>` : ''}
        </div>
      `;
      break;
    default:
      pageContent = `
        <div class="course-page">
          <h3>${page.title || 'Страница курса'}</h3>
          <div class="page-text-content">${page.content || ''}</div>
        </div>
      `;
  }

  container.innerHTML = pageContent;

  // Обновляем текст кнопки "Далее"
  const nextButton = document.getElementById('next-btn');
  if (pageIndex >= course.pages.length - 1) {
    nextButton.textContent = 'Завершить курс';
  } else {
    nextButton.textContent = 'Далее';
  }
}

// Функция для перехода к следующей странице
function nextCoursePage() {
  if (!currentCourse) return;

  currentPageIndex++;

  if (currentPageIndex >= currentCourse.pages.length) {
    // Если больше нет страниц, показываем модальное окно завершения
    showCompletionModal();
  } else {
    // Загружаем следующую страницу
    loadCoursePage(currentCourse, currentPageIndex);
  }
}

// ✅ Завершение курса — модальное окно БЕЗ таймера
function showCompletionModal() {
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

// Функция для получения курса по ID
async function getCourseById(id) {
  try {
    const headers = addAuthHeader({ 'Content-Type': 'application/json' });
    const res = await fetch(`/api/courses/${id}`, {
      method: 'GET',
      headers: headers
    });

    if (res.status === 404) {
      console.error('Курс не найден');
      return null;
    }

    if (res.status === 401) {
      // Если токен недействителен, перенаправляем на страницу входа
      logout();
      return null;
    }

    const course = await res.json();
    return course;
  } catch (err) {
    console.error('Ошибка загрузки курса:', err);
    return null;
  }
}

// Функция для обновления открытия курса с асинхронным получением данных
async function openCourse(id, title) {
  // Загружаем данные курса с многостраничным содержимым
  currentCourse = await getCourseById(id);
  if (!currentCourse) {
    alert('Курс не найден');
    return;
  }

  document.getElementById('course-title').textContent = title || 'Курс';
  currentPageIndex = 0;
  loadCoursePage(currentCourse, currentPageIndex);
  navigateTo('course');
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
    
    if (!res.ok) {
      // Обработка различных HTTP ошибок
      if (res.status === 400) {
        const errorData = await res.json();
        alert('❌ ' + (errorData.message || 'Некорректные данные для регистрации'));
      } else if (res.status === 500) {
        alert('❌ Внутренняя ошибка сервера. Попробуйте позже.');
      } else {
        alert('❌ Ошибка регистрации: ' + res.status);
      }
      return;
    }
    
    const result = await res.json();

    if (result.success) {
      alert('✅ Регистрация успешна!');
      navigateTo('login');
    } else {
      alert('❌ ' + (result.message || 'Ошибка регистрации'));
    }
  } catch (err) {
    console.error('Ошибка при регистрации:', err);
    alert('⚠️ Ошибка подключения к серверу');
  }
});

// 🔄 Автовосстановление сессии при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
  const savedUser = localStorage.getItem('user');
  const savedToken = localStorage.getItem('authToken');

  // Если есть сохраненные данные пользователя и токен
  if (savedUser && savedToken) {
    try {
      currentUser = JSON.parse(savedUser);
      authToken = savedToken;
      
      // Проверяем, находимся ли мы на странице входа или регистрации
      const loginPage = document.getElementById('page-login');
      const registerPage = document.getElementById('page-register');
      
      // Если мы не на страницах входа или регистрации, перенаправляем на главную
      if (!(loginPage?.classList.contains('active') || registerPage?.classList.contains('active'))) {
        navigateTo('main');
      }
    } catch (e) {
      localStorage.removeItem('user');
      localStorage.removeItem('authToken');
    }
  } else {
    // Если нет сохраненной сессии, убедимся, что отображается страница входа
    navigateTo('login');
  }

  // Установим max-дату как "сегодня" (чтобы нельзя было выбрать будущее)
  const today = new Date().toISOString().split('T')[0];
  const birthInput = document.getElementById('birthDate');
  if (birthInput) birthInput.max = today;

  // Обработчик закрытия модального окна по клику вне
  window.addEventListener('click', (e) => {
    const modal = document.getElementById('completion-modal');
    if (e.target === modal) closeModal();
  });
  
  // Добавляем обработчики для ссылок регистрации и входа
  const registerLink = document.getElementById('register-link');
  const loginLink = document.getElementById('login-link');
  
  if (registerLink) {
    registerLink.addEventListener('click', function(e) {
      e.preventDefault();
      navigateTo('register');
    });
  }
  
  if (loginLink) {
    loginLink.addEventListener('click', function(e) {
      e.preventDefault();
      navigateTo('login');
    });
  }
  
  // Добавляем обработчики для кнопок навигации
  const profileBackBtn = document.getElementById('profile-back-btn');
  const courseBackBtn = document.getElementById('course-back-btn');
  const mainMenuBtn = document.getElementById('main-menu-btn');
  const userProfileBtn = document.getElementById('user-profile-btn');
  const closeMenuBtn = document.getElementById('close-menu-btn');
  const menuMainBtn = document.getElementById('menu-main-btn');
  const menuProfileBtn = document.getElementById('menu-profile-btn');
  const menuLogoutBtn = document.getElementById('menu-logout-btn');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const modalMainBtn = document.getElementById('modal-main-btn');
  
  if (profileBackBtn) {
    profileBackBtn.addEventListener('click', () => navigateTo('main'));
  }
  
  if (courseBackBtn) {
    courseBackBtn.addEventListener('click', () => navigateTo('main'));
  }
  
  if (mainMenuBtn) {
    mainMenuBtn.addEventListener('click', toggleMenu);
  }
  
  if (userProfileBtn) {
    userProfileBtn.addEventListener('click', () => navigateTo('profile'));
  }
  
  if (closeMenuBtn) {
    closeMenuBtn.addEventListener('click', function(e) {
      toggleMenu();
      e.stopPropagation();
    });
  }
  
  if (menuMainBtn) {
    menuMainBtn.addEventListener('click', function() {
      navigateTo('main');
      toggleMenu();
    });
  }
  
  if (menuProfileBtn) {
    menuProfileBtn.addEventListener('click', function() {
      navigateTo('profile');
      toggleMenu();
    });
  }
  
  if (menuLogoutBtn) {
    menuLogoutBtn.addEventListener('click', function() {
      logout();
      toggleMenu();
    });
  }
  
  if (modalCloseBtn) {
    modalCloseBtn.addEventListener('click', closeModal);
  }
  
  if (modalMainBtn) {
    modalMainBtn.addEventListener('click', function() {
      closeModal();
      navigateTo('main');
    });
  }
  
  // Обработчик для кнопки "Далее" в курсе
  const nextBtn = document.getElementById('next-btn');
  if (nextBtn) {
    nextBtn.addEventListener('click', nextCoursePage);
  }
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
    
    if (!res.ok) {
      // Обработка различных HTTP ошибок
      if (res.status === 400) {
        const errorData = await res.json();
        errorEl.textContent = errorData.message || 'Некорректные данные для входа';
      } else if (res.status === 401) {
        errorEl.textContent = 'Неверный email или пароль';
      } else if (res.status === 429) {
        errorEl.textContent = 'Слишком много попыток входа. Попробуйте позже.';
      } else if (res.status === 500) {
        errorEl.textContent = 'Внутренняя ошибка сервера. Попробуйте позже.';
      } else {
        errorEl.textContent = `Ошибка входа: ${res.status}`;
      }
      errorEl.classList.add('show');
      return;
    }
    
    const result = await res.json();

    if (result.success) {
      currentUser = result.user;
      localStorage.setItem('user', JSON.stringify(currentUser));
      // Сохраняем токен аутентификации
      setAuthToken(result.token);
      navigateTo('main');
    } else {
      // ✅ Показываем сообщение под формой
      errorEl.textContent = result.message || 'Неверный email или пароль';
      errorEl.classList.add('show');

      // Опционально: фокус на поле email
      document.querySelector('#loginForm input[placeholder="Email"]').focus();
    }
  } catch (err) {
    console.error('Ошибка при входе:', err);
    errorEl.textContent = '⚠️ Ошибка подключения к серверу';
    errorEl.classList.add('show');
  }
});