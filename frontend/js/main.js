// Глобальное состояние
let currentUser = null;
let authToken = null;

// ========== ФУНКЦИИ МЕНЮ ПОЛЬЗОВАТЕЛЯ ==========
function toggleUserMenu() {
  const menu = document.getElementById('user-menu-content');
  const overlay = document.getElementById('user-menu-overlay');
  
  if (!menu) return;
  
  const isHidden = menu.classList.contains('hidden');
  
  if (isHidden) {
    menu.classList.remove('hidden');
    overlay?.classList.add('active');
    updateUserMenuContent();
  } else {
    closeUserMenu();
  }
}

function closeUserMenu() {
  const menu = document.getElementById('user-menu-content');
  const overlay = document.getElementById('user-menu-overlay');
  
  menu?.classList.add('hidden');
  overlay?.classList.remove('active');
}

function updateUserMenuContent() {
  const menuUsername = document.getElementById('menu-username');
  const menuEmail = document.getElementById('menu-email');
  const userNameDisplay = document.getElementById('user-name-display');
  
  if (currentUser) {
    if (menuUsername) menuUsername.textContent = currentUser.name || 'Пользователь';
    if (menuEmail) menuEmail.textContent = currentUser.email || '';
    if (userNameDisplay) {
      const firstName = currentUser.name?.split(' ')[0] || 'Профиль';
      userNameDisplay.textContent = firstName;
    }
  } else {
    if (menuUsername) menuUsername.textContent = 'Гость';
    if (menuEmail) menuEmail.textContent = 'Войдите в систему';
    if (userNameDisplay) userNameDisplay.textContent = 'Войти';
  }
}

function showUserMenuIfLoggedIn() {
  // Функция больше не используется для кнопки в шапке
  // Меню открывается из мобильного меню
  updateUserMenuContent();
}

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

// Глобальная функция навигации
window.navigateTo = function(pageId) {
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
    'course': 'Курс',
    'course-info': 'Информация о курсе'
  };

  // Обновляем заголовок в шапке главной страницы, если он доступен
  const pageTitleElement = document.getElementById('page-title');
  if (pageTitleElement && pageId !== 'login' && pageId !== 'register') {
    pageTitleElement.textContent = titles[pageId] || 'Главная';
  }

  if (pageId === 'main') {
    loadCourses('main-course-list');
    showUserMenuIfLoggedIn();
  } else if (pageId === 'profile' && currentUser) {
    loadProfile();
  }

  // Скрыть мобильное меню при переходе
  if (document.getElementById('mobile-menu')?.classList.contains('active')) {
    toggleMenu();
  }

  // Скрыть меню пользователя при переходе
  closeUserMenu();
}

window.toggleMenu = function() {
  const menu = document.getElementById('mobile-menu');
  const overlay = document.getElementById('mobile-menu-overlay');
  
  if (!menu) return;
  
  menu.classList.toggle('active');
  if (overlay) {
    overlay.classList.toggle('active');
  }
  document.body.style.overflow = menu.classList.contains('active') ? 'hidden' : '';
}

// Выход из аккаунта
window.logout = function() {
  currentUser = null;
  // Удаляем токен аутентификации
  removeAuthToken();
  closeUserMenu();
  navigateTo('login');
  // Очистим данные (опционально)
  localStorage.removeItem('user');
}

// Загрузка курсов
window.loadCourses = async function(containerId) {
  // Используем текущую вкладку для фильтрации
  const filter = window.currentTab || 'all';
  loadCoursesWithFilter(containerId, filter);
}

// Создание карточки курса (по аналогии с createGameCard из GameLibrary)
window.createCourseCard = function(course, isUserCourse = false) {
  const courseElement = document.createElement('div');
  courseElement.className = 'course-card';

  const isCompleted = course.completed || false;
  const badgeText = isCompleted ? 'ЗАВЕРШЁН' : 'КУРС';
  const badgeClass = isCompleted ? 'completed' : (isUserCourse ? 'in-progress' : '');
  const statusText = isCompleted ? '✅ Завершён' : '📚 В процессе';
  const pageCount = course.pages ? course.pages.length : 0;
  const imageSrc = course.image || 'assets/images/course-default.svg';

  courseElement.innerHTML = `
    <div class="course-badge ${badgeClass}">${badgeText}</div>
    <img src="${imageSrc}" alt="${course.title}" onerror="this.onerror=null; this.src='assets/images/course-default.svg'">
    <div class="course-info">
      <h3>${course.title}</h3>
      <p>${course.description || 'Описание курса'}</p>

      <div class="course-meta">
        ${pageCount > 0 ? `
        <span class="course-pages" title="Количество страниц">
          <i class="fas fa-book-open"></i>
          ${pageCount} стр.
        </span>
        ` : ''}
        <span class="course-duration" title="Статус курса">
          <i class="fas fa-${isCompleted ? 'check-circle' : 'clock'}"></i>
          ${isCompleted ? 'Завершён' : 'В процессе'}
        </span>
      </div>

      <div class="course-actions">
        <button class="btn btn-primary btn-sm start-course-btn" data-course-id="${course.id}" data-course-title="${course.title.replace(/"/g, '&quot;')}">
          <i class="fas fa-play-circle"></i>
          ${isCompleted ? 'Повторить' : 'Начать'}
        </button>
      </div>
    </div>
  `;

  // Добавляем обработчик клика на кнопку "Начать"
  const startBtn = courseElement.querySelector('.start-course-btn');
  if (startBtn) {
    startBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const courseId = parseInt(startBtn.getAttribute('data-course-id'));
      const courseTitle = startBtn.getAttribute('data-course-title');
      startCourse(courseId, courseTitle);
    });
  }

  // Добавляем обработчик клика на карточку (открытие информации о курсе)
  courseElement.addEventListener('click', (e) => {
    // Не открываем информацию при клике на кнопки
    if (!e.target.closest('.course-actions')) {
      showCourseInfo(course.id, course.title);
    }
  });

  return courseElement;
}

// Загрузка профиля пользователя
async function loadProfile() {
  try {
    const headers = addAuthHeader({ 'Content-Type': 'application/json' });
    const res = await fetch('/profile', {
      method: 'GET',
      headers: headers
    });

    if (res.status === 401) {
      logout();
      return;
    }

    const profile = await res.json();

    if (profile.success === false) {
      console.error('Ошибка получения профиля:', profile.message);
      return;
    }

    // Обновляем данные в dashboard
    const userName = profile.name || currentUser?.name || 'Пользователь';
    document.getElementById('dashboard-username').textContent = userName;
    document.getElementById('profile-name-input').value = userName;
    document.getElementById('profile-email-input').value = profile.email || currentUser?.email || '';

    // Загружаем статистику
    loadProfileStats();

    // Загружаем курсы пользователя
    loadUserCourses();
  } catch (err) {
    console.error('Ошибка загрузки профиля:', err);
    const userName = currentUser?.name || 'Пользователь';
    document.getElementById('dashboard-username').textContent = userName;
    if (currentUser) {
      document.getElementById('profile-name-input').value = userName;
      document.getElementById('profile-email-input').value = currentUser.email || '';
    }
    // Загружаем статистику и курсы даже при ошибке
    loadProfileStats();
    loadUserCourses();
  }
}

// Загрузка статистики профиля
function loadProfileStats() {
  // Получаем все курсы
  const allCourses = JSON.parse(localStorage.getItem('userCourses') || '[]');
  const completedCourses = allCourses.filter(c => c.completed).length;
  const inProgressCourses = allCourses.filter(c => !c.completed).length;
  
  document.getElementById('dashboard-total-courses').textContent = allCourses.length;
  document.getElementById('dashboard-completed-courses').textContent = completedCourses;
  document.getElementById('dashboard-in-progress').textContent = inProgressCourses;
}

// Загрузка курсов пользователя
function loadUserCourses() {
  const container = document.getElementById('profile-course-list');
  if (!container) return;

  const allCourses = JSON.parse(localStorage.getItem('userCourses') || '[]');

  if (allCourses.length === 0) {
    container.innerHTML = '<p class="text-muted">У вас пока нет курсов. Перейдите на главную, чтобы выбрать курс.</p>';
    return;
  }

  container.innerHTML = '';
  allCourses.forEach(course => {
    const courseCard = createCourseCard(course, true);
    container.appendChild(courseCard);
  });
}

// Текущий курс и индекс страницы
let currentCourse = null;
let currentPageIndex = 0;

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

// ✅ Завершение курса — модальное окно с плавной анимацией
function showCompletionModal() {
  if (!currentUser) return alert('Вы не авторизованы');

  const modal = document.getElementById('completion-modal');
  const userName = currentUser.name || 'Ученик';
  document.getElementById('modal-message').textContent =
    `🎉 Поздравляем, ${userName}! Вы успешно завершили курс!`;

  // Плавное появление
  modal.classList.add('show');
}

function closeModal() {
  const modal = document.getElementById('completion-modal');
  modal.classList.remove('show');
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

// Показ информации о курсе
async function showCourseInfo(id, title) {
  const course = await getCourseById(id);
  if (!course) {
    alert('Курс не найден');
    return;
  }

  // Заполняем информацию о курсе
  document.getElementById('course-info-title').textContent = 'Информация о курсе';
  document.getElementById('course-info-name').textContent = course.title;
  document.getElementById('course-info-description').textContent = course.description || 'Описание курса';
  document.getElementById('course-info-full-description').textContent = course.fullDescription || course.description || 'Подробное описание курса';
  
  // Изображение
  const imageSrc = course.image || 'assets/images/course-default.svg';
  document.getElementById('course-info-image').src = imageSrc;
  document.getElementById('course-info-image').onerror = function() {
    this.src = 'assets/images/course-default.svg';
  };
  
  // Статус и бейдж
  const isCompleted = course.completed || false;
  const statusBadge = document.getElementById('course-info-status');
  statusBadge.textContent = isCompleted ? 'ЗАВЕРШЁН' : 'ДОСТУПЕН';
  statusBadge.className = 'course-info-badge ' + (isCompleted ? 'completed' : '');
  
  // Количество страниц
  const pageCount = course.pages ? course.pages.length : 0;
  document.getElementById('course-info-pages').innerHTML = `
    <i class="fas fa-book-open"></i> ${pageCount} страниц
  `;
  
  // Программа курса
  const syllabusContainer = document.getElementById('course-info-syllabus');
  if (course.pages && course.pages.length > 0) {
    syllabusContainer.innerHTML = course.pages.map((page, index) => {
      const typeLabels = {
        'text': 'Текст',
        'video': 'Видео',
        'diagram': 'Схема'
      };
      const typeIcons = {
        'text': 'fa-file-alt',
        'video': 'fa-play-circle',
        'diagram': 'fa-project-diagram'
      };
      return `
        <div class="syllabus-item ${page.completed ? 'completed' : ''}">
          <div class="syllabus-number">${index + 1}</div>
          <div class="syllabus-content">
            <div class="syllabus-title">
              <i class="fas ${typeIcons[page.type] || 'fa-book'}"></i>
              ${page.title || 'Страница ' + (index + 1)}
            </div>
            <div class="syllabus-type">${typeLabels[page.type] || 'Материал'}</div>
          </div>
        </div>
      `;
    }).join('');
  } else {
    syllabusContainer.innerHTML = '<p class="text-muted">Программа курса пока пуста</p>';
  }
  
  // Кнопка "Начать курс"
  const startBtn = document.getElementById('course-info-start-btn');
  startBtn.onclick = () => startCourse(course.id, course.title);
  startBtn.innerHTML = `
    <i class="fas fa-play-circle"></i>
    ${isCompleted ? 'Повторить курс' : 'Начать курс'}
  `;
  
  navigateTo('course-info');
}

// Начало курса (переход к обучению)
async function startCourse(id, title) {
  // Проверка авторизации
  if (!currentUser) {
    navigateTo('login');
    return;
  }

  try {
    currentCourse = await getCourseById(id);

    if (!currentCourse) {
      alert('Курс не найден');
      return;
    }

    if (!currentCourse.pages || currentCourse.pages.length === 0) {
      alert('В этом курсе пока нет материалов');
      return;
    }

    document.getElementById('course-title').textContent = title || 'Курс';
    currentPageIndex = 0;
    loadCoursePage(currentCourse, currentPageIndex);
    navigateTo('course');
  } catch (error) {
    console.error('Ошибка при запуске курса:', error);
    alert('Ошибка при запуске курса: ' + error.message);
  }
}

// Показать модальное окно помощи
function showHelpModal() {
  alert('Раздел помощи в разработке. Здесь будет информация о поддержке, FAQ и контакты.');
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

  const savedUser = localStorage.getItem('user');
  const savedToken = localStorage.getItem('authToken');

  // Если есть сохраненные данные пользователя и токен
  if (savedUser && savedToken) {
    try {
      currentUser = JSON.parse(savedUser);
      authToken = savedToken;
      
      // Обновляем меню пользователя
      showUserMenuIfLoggedIn();
      navigateTo('main');
    } catch (e) {
      localStorage.removeItem('user');
      localStorage.removeItem('authToken');
      navigateTo('login');
    }
  } else {
    // Если нет сохраненной сессии, остаемся на странице входа (она активна по умолчанию в HTML)
    navigateTo('login');
  }
  
  // Добавляем обработчики для кнопок навигации
  const profileBackBtn = document.getElementById('profile-back-btn');
  const courseBackBtn = document.getElementById('course-back-btn');
  const courseInfoBackBtn = document.getElementById('course-info-back-btn');
  const mainMenuBtn = document.getElementById('main-menu-btn');
  const userProfileBtn = document.getElementById('user-profile-btn');
  const closeMenuBtn = document.getElementById('close-menu-btn');
  const mobileMenuMainBtn = document.getElementById('menu-main-btn');
  const mobileMenuProfileBtn = document.getElementById('menu-profile-btn');
  const mobileMenuLogoutBtn = document.getElementById('menu-logout-btn');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const modalMainBtn = document.getElementById('modal-main-btn');

  if (profileBackBtn) {
    profileBackBtn.addEventListener('click', () => navigateTo('main'));
  }

  if (courseBackBtn) {
    courseBackBtn.addEventListener('click', () => navigateTo('main'));
  }

  if (courseInfoBackBtn) {
    courseInfoBackBtn.addEventListener('click', () => navigateTo('main'));
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

  if (mobileMenuMainBtn) {
    mobileMenuMainBtn.addEventListener('click', function() {
      navigateTo('main');
      toggleMenu();
    });
  }

  if (mobileMenuProfileBtn) {
    mobileMenuProfileBtn.addEventListener('click', function() {
      toggleMenu();
      navigateTo('profile');
    });
  }

  if (mobileMenuLogoutBtn) {
    mobileMenuLogoutBtn.addEventListener('click', function() {
      toggleMenu();
      showLogoutModal();
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

  // ========== ОБРАБОТЧИКИ ВЫПАДАЮЩЕГО МЕНЮ ПОЛЬЗОВАТЕЛЯ ==========
  const dropdownMenuProfileBtn = document.getElementById('menu-profile-details');
  const dropdownMenuSettingsBtn = document.getElementById('menu-settings');
  const dropdownMenuAboutBtn = document.getElementById('menu-about');
  const dropdownMenuHelpBtn = document.getElementById('menu-help');
  const dropdownMenuLogoutBtn = document.getElementById('menu-logout');
  const userMenuOverlay = document.getElementById('user-menu-overlay');

  // Обработчики для модального окна подтверждения выхода
  const logoutModal = document.getElementById('logout-modal');
  const logoutModalClose = document.getElementById('logout-modal-close');
  const logoutModalCancel = document.getElementById('logout-modal-cancel');
  const logoutModalConfirm = document.getElementById('logout-modal-confirm');

  // Функция открытия модального окна выхода
  window.showLogoutModal = function() {
    if (logoutModal) {
      logoutModal.classList.add('show');
      logoutModal.style.display = 'flex';
    } else {
      console.error('logout-modal не найден');
    }
  }

  // Функция закрытия модального окна выхода
  window.hideLogoutModal = function() {
    if (logoutModal) {
      logoutModal.classList.remove('show');
      setTimeout(() => {
        logoutModal.style.display = 'none';
      }, 300);
    }
  }

  if (dropdownMenuLogoutBtn) {
    dropdownMenuLogoutBtn.addEventListener('click', function() {
      closeUserMenu();
      showLogoutModal();
    });
  }

  if (logoutModalClose) {
    logoutModalClose.addEventListener('click', hideLogoutModal);
  } else {
    console.error('logout-modal-close не найден');
  }

  if (logoutModalCancel) {
    logoutModalCancel.addEventListener('click', hideLogoutModal);
  } else {
    console.error('logout-modal-cancel не найден');
  }

  if (logoutModalConfirm) {
    logoutModalConfirm.addEventListener('click', function() {
      hideLogoutModal();
      logout();
    });
  } else {
    console.error('logout-modal-confirm не найден');
  }

  // Закрытие модального окна при клике вне его
  if (logoutModal) {
    logoutModal.addEventListener('click', function(e) {
      if (e.target === logoutModal) {
        hideLogoutModal();
      }
    });
  }

  // Открытие меню аккаунта при клике на "Профиль" в мобильном меню
  // mobileMenuProfileBtn уже объявлен выше для мобильного меню

  // Закрытие меню при клике на оверлей
  if (userMenuOverlay) {
    userMenuOverlay.addEventListener('click', function() {
      closeUserMenu();
    });
  }

  if (dropdownMenuProfileBtn) {
    dropdownMenuProfileBtn.addEventListener('click', function() {
      closeUserMenu();
      navigateTo('profile');
    });
  }

  if (dropdownMenuSettingsBtn) {
    dropdownMenuSettingsBtn.addEventListener('click', function() {
      closeUserMenu();
      alert('Настройки в разработке');
    });
  }

  if (dropdownMenuAboutBtn) {
    dropdownMenuAboutBtn.addEventListener('click', function() {
      closeUserMenu();
      alert('LearnHub — образовательная платформа\nВерсия: 1.0.0\n\n© 2025 Все права защищены');
    });
  }

  if (dropdownMenuHelpBtn) {
    dropdownMenuHelpBtn.addEventListener('click', function() {
      closeUserMenu();
      showHelpModal();
    });
  }

  // ========== ОБРАБОТЧИКИ ДЛЯ ВКЛАДОК (ПОПУЛЯРНЫЕ/НОВИНКИ) ==========
  // Глобальная переменная для текущей вкладки
  window.currentTab = 'all';

  // Обработчики для вкладок
  document.querySelectorAll('.tab-card').forEach(tab => {
    tab.addEventListener('click', function() {
      const tabName = this.getAttribute('data-tab');
      switchTab(tabName);
    });
  });

  // ========== ОБРАБОТЧИКИ DASHBOARD / ПРОФИЛЯ ==========
  // Переключение вкладок
  const dashboardTabs = document.querySelectorAll('.dashboard-tab');
  dashboardTabs.forEach(tab => {
    tab.addEventListener('click', function() {
      const targetTab = this.getAttribute('data-tab');
      
      // Убираем активный класс у всех вкладок
      dashboardTabs.forEach(t => t.classList.remove('active'));
      // Добавляем активный класс текущей вкладке
      this.classList.add('active');
      
      // Скрываем все содержимое
      document.querySelectorAll('.dashboard-tab-content').forEach(content => {
        content.classList.remove('active');
      });
      
      // Показываем нужное содержимое
      const targetContent = document.getElementById(`dashboard-${targetTab}`);
      if (targetContent) {
        targetContent.classList.add('active');
      }
    });
  });

  // Обработка формы профиля
  const profileForm = document.getElementById('profile-form');
  if (profileForm) {
    profileForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const name = document.getElementById('profile-name-input').value.trim();
      const email = document.getElementById('profile-email-input').value.trim();
      
      if (!name || !email) {
        alert('Заполните все обязательные поля');
        return;
      }
      
      // Сохраняем в localStorage
      if (currentUser) {
        currentUser.name = name;
        currentUser.email = email;
        localStorage.setItem('user', JSON.stringify(currentUser));
      }
      
      alert('✅ Профиль обновлён!');
      document.getElementById('dashboard-username').textContent = name;
    });
  }

  // Обработка формы смены пароля
  const passwordForm = document.getElementById('password-form');
  if (passwordForm) {
    passwordForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const currentPassword = passwordForm.querySelector('[name="current_password"]').value;
      const newPassword = passwordForm.querySelector('[name="new_password"]').value;
      
      if (!currentPassword || !newPassword) {
        alert('Заполните все поля');
        return;
      }
      
      if (newPassword.length < 4) {
        alert('Новый пароль должен быть не менее 4 символов');
        return;
      }
      
      // Здесь будет API вызов для смены пароля
      alert('✅ Пароль изменён! (демо режим)');
      passwordForm.reset();
    });
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
      // Обновляем меню пользователя
      showUserMenuIfLoggedIn();
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

// ========== ФУНКЦИИ ДЛЯ ВКЛАДОК ==========
window.switchTab = function(tabName) {
  window.currentTab = tabName;

  // Переключаем активную вкладку
  document.querySelectorAll('.tab-card').forEach(tab => {
    tab.classList.remove('active');
  });
  const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
  if (activeTab) {
    activeTab.classList.add('active');
  }

  // Загружаем курсы с фильтрацией
  loadCoursesWithFilter('main-course-list', tabName);
}

// Загрузка курсов с фильтрацией по вкладке
window.loadCoursesWithFilter = async function(containerId, filter) {
  try {
    const res = await fetch('/api/courses');
    let courses = await res.json();
    const container = document.getElementById(containerId);

    // Очищаем контейнер
    container.innerHTML = '';

    // Применяем фильтр
    if (filter === 'popular') {
      // Популярные - курсы с большим количеством страниц (имитация)
      courses = courses.sort((a, b) => (b.pages?.length || 0) - (a.pages?.length || 0));
    } else if (filter === 'new') {
      // Новинки - курсы в обратном порядке (новые сначала)
      courses = courses.sort((a, b) => b.id - a.id);
    }
    // filter === 'all' - показываем все без сортировки

    // Создаем элементы курсов и добавляем обработчики событий
    courses.forEach(course => {
      const courseCard = createCourseCard(course, false);
      container.appendChild(courseCard);
    });
  } catch (err) {
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = '<p class="error">Ошибка загрузки курсов</p>';
    }
  }
}

// ========== ФУНКЦИИ ДЛЯ МОДАЛЬНОГО ОКНА ПОМОЩИ ==========
window.showHelpModal = function() {
  const modal = document.getElementById('help-modal');
  if (modal) {
    modal.classList.add('show');
    modal.style.display = 'flex';
  }
}

window.closeHelpModal = function() {
  const modal = document.getElementById('help-modal');
  if (modal) {
    modal.classList.remove('show');
    setTimeout(() => {
      modal.style.display = 'none';
    }, 300);
  }
}

// Закрытие модального окна помощи при клике вне его
window.addEventListener('click', (e) => {
  const helpModal = document.getElementById('help-modal');
  if (e.target === helpModal) {
    closeHelpModal();
  }
});

// ========== ФУНКЦИИ ДЛЯ ПОДПИСКИ НА РАССЫЛКУ ==========
window.subscribeToNewsletter = function() {
  const emailInput = document.getElementById('newsletter-email');
  const messageEl = document.getElementById('newsletter-message');
  const email = emailInput ? emailInput.value.trim() : '';

  // Простая валидация email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!email) {
    messageEl.textContent = '⚠️ Введите ваш email';
    messageEl.className = 'newsletter-message error';
    return;
  }

  if (!emailRegex.test(email)) {
    messageEl.textContent = '⚠️ Введите корректный email';
    messageEl.className = 'newsletter-message error';
    return;
  }

  // Имитация отправки на сервер
  messageEl.textContent = '⏳ Обработка...';
  messageEl.className = 'newsletter-message';

  setTimeout(() => {
    // Успешная подписка
    messageEl.textContent = '✅ Вы успешно подписались на рассылку!';
    messageEl.className = 'newsletter-message success';
    if (emailInput) emailInput.value = '';

    // Очистить сообщение через 5 секунд
    setTimeout(() => {
      messageEl.textContent = '';
    }, 5000);
  }, 1000);
}

// ========== ФУНКЦИИ ДЛЯ МОДАЛЬНОГО ОКНА ПОЛИТИКИ ==========
window.showPolicyModal = function() {
  const modal = document.getElementById('policy-modal');
  if (modal) {
    modal.classList.add('show');
    modal.style.display = 'flex';
  }
}

window.closePolicyModal = function() {
  const modal = document.getElementById('policy-modal');
  if (modal) {
    modal.classList.remove('show');
    setTimeout(() => {
      modal.style.display = 'none';
    }, 300);
  }
}

// ========== ФУНКЦИИ ДЛЯ МОДАЛЬНОГО ОКНА FAQ ==========
window.showFaqModal = function() {
  const modal = document.getElementById('faq-modal');
  if (modal) {
    modal.classList.add('show');
    modal.style.display = 'flex';
  }
}

window.closeFaqModal = function() {
  const modal = document.getElementById('faq-modal');
  if (modal) {
    modal.classList.remove('show');
    setTimeout(() => {
      modal.style.display = 'none';
    }, 300);
  }
}

// ========== ФУНКЦИИ ДЛЯ МОДАЛЬНОГО ОКНА КОНТАКТЫ ==========
window.showContactsModal = function() {
  const modal = document.getElementById('contacts-modal');
  if (modal) {
    modal.classList.add('show');
    modal.style.display = 'flex';
  }
}

window.closeContactsModal = function() {
  const modal = document.getElementById('contacts-modal');
  if (modal) {
    modal.classList.remove('show');
    setTimeout(() => {
      modal.style.display = 'none';
    }, 300);
  }
}

// ========== ФУНКЦИИ ДЛЯ МОДАЛЬНОГО ОКНА УСЛОВИЙ ==========
window.showTermsModal = function() {
  const modal = document.getElementById('terms-modal');
  if (modal) {
    modal.classList.add('show');
    modal.style.display = 'flex';
  }
}

window.closeTermsModal = function() {
  const modal = document.getElementById('terms-modal');
  if (modal) {
    modal.classList.remove('show');
    setTimeout(() => {
      modal.style.display = 'none';
    }, 300);
  }
}

// ========== ОБРАБОТЧИКИ ДЛЯ ФУТЕРА ==========
document.addEventListener('DOMContentLoaded', function() {
  // Обработчики для ссылок футера
  document.querySelectorAll('.footer-link').forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      const action = this.getAttribute('data-action');
      
      switch(action) {
        case 'all':
        case 'popular':
        case 'new':
          window.navigateTo('main');
          window.switchTab(action);
          break;
        case 'profile':
          window.navigateTo('profile');
          break;
        case 'help':
          window.showHelpModal();
          break;
        case 'faq':
          window.showFaqModal();
          break;
        case 'contacts':
          window.showContactsModal();
          break;
      }
    });
  });

  // Кнопка подписки на рассылку
  const newsletterBtn = document.getElementById('newsletter-btn');
  if (newsletterBtn) {
    newsletterBtn.addEventListener('click', window.subscribeToNewsletter);
  }

  // Ссылки на политику и условия
  const policyLink = document.getElementById('policy-link');
  const termsLink = document.getElementById('terms-link');
  
  if (policyLink) {
    policyLink.addEventListener('click', function(e) {
      e.preventDefault();
      window.showPolicyModal();
    });
  }
  
  if (termsLink) {
    termsLink.addEventListener('click', function(e) {
      e.preventDefault();
      window.showTermsModal();
    });
  }

  // Кнопки закрытия модальных окон
  const closeHelpBtn = document.getElementById('close-help-btn');
  const closeHelpBtnFooter = document.getElementById('close-help-btn-footer');
  const closePolicyBtn = document.getElementById('close-policy-btn');
  const closePolicyBtnFooter = document.getElementById('close-policy-btn-footer');
  const closeTermsBtn = document.getElementById('close-terms-btn');
  const closeTermsBtnFooter = document.getElementById('close-terms-btn-footer');

  if (closeHelpBtn) closeHelpBtn.addEventListener('click', window.closeHelpModal);
  if (closeHelpBtnFooter) closeHelpBtnFooter.addEventListener('click', window.closeHelpModal);
  if (closePolicyBtn) closePolicyBtn.addEventListener('click', window.closePolicyModal);
  if (closePolicyBtnFooter) closePolicyBtnFooter.addEventListener('click', window.closePolicyModal);
  if (closeTermsBtn) closeTermsBtn.addEventListener('click', window.closeTermsModal);
  if (closeTermsBtnFooter) closeTermsBtnFooter.addEventListener('click', window.closeTermsModal);

  // Кнопки закрытия модального окна FAQ
  const closeFaqBtn = document.getElementById('close-faq-btn');
  const closeFaqBtnFooter = document.getElementById('close-faq-btn-footer');
  if (closeFaqBtn) closeFaqBtn.addEventListener('click', window.closeFaqModal);
  if (closeFaqBtnFooter) closeFaqBtnFooter.addEventListener('click', window.closeFaqModal);

  // Кнопки закрытия модального окна Контакты
  const closeContactsBtn = document.getElementById('close-contacts-btn');
  const closeContactsBtnFooter = document.getElementById('close-contacts-btn-footer');
  if (closeContactsBtn) closeContactsBtn.addEventListener('click', window.closeContactsModal);
  if (closeContactsBtnFooter) closeContactsBtnFooter.addEventListener('click', window.closeContactsModal);

  // Обработчик клика на оверлей мобильного меню
  const mobileMenuOverlay = document.getElementById('mobile-menu-overlay');
  if (mobileMenuOverlay) {
    mobileMenuOverlay.addEventListener('click', function() {
      window.toggleMenu();
    });
  }

  // Закрытие модальных окон при клике вне их
  window.addEventListener('click', (e) => {
    const faqModal = document.getElementById('faq-modal');
    const contactsModal = document.getElementById('contacts-modal');
    
    if (e.target === faqModal) {
      window.closeFaqModal();
    }
    if (e.target === contactsModal) {
      window.closeContactsModal();
    }
  });
});