// Глобальное состояние
let currentUser = null;
let authToken = null;

// ========== ОПТИМИЗАЦИЯ ЗАПРОСОВ (Debounce & Cache) ==========

// Кэш для хранения загруженных данных курсов
const coursesCache = {
  data: null,
  timestamp: null,
  ttl: 60000 // 1 минута
};

// Debounce таймер для фильтров
let filterDebounceTimer = null;
const FILTER_DEBOUNCE_DELAY = 300; // 300мс задержка

// Функция debounce для предотвращения множественных запросов
function debounceFilter(fn, delay) {
  return function(...args) {
    // Очищаем предыдущий таймер
    if (filterDebounceTimer) {
      clearTimeout(filterDebounceTimer);
    }

    // Устанавливаем новый таймер
    filterDebounceTimer = setTimeout(() => {
      fn.apply(this, args);
      filterDebounceTimer = null;
    }, delay);
  };
}

// Проверка актуальности кэша
function isCacheValid() {
  return coursesCache.data &&
         coursesCache.timestamp &&
         (Date.now() - coursesCache.timestamp) < coursesCache.ttl;
}

// Получение данных из кэша или загрузка с сервера
async function getCoursesData() {
  if (isCacheValid()) {
    console.log('[Cache] Используем кэшированные данные курсов');
    return coursesCache.data;
  }

  console.log('[Cache] Загружаем данные курсов с сервера');
  const res = await fetch('/api/courses');
  const data = await res.json();

  // Сохраняем в кэш
  coursesCache.data = data.courses || [];
  coursesCache.timestamp = Date.now();

  return coursesCache.data;
}

// Очистка кэша (при необходимости)
function clearCoursesCache() {
  coursesCache.data = null;
  coursesCache.timestamp = null;
}

// ========== СИСТЕМА ПРОГРЕССА И АКТИВНОСТИ ==========

// Получить прогресс пользователя из localStorage (резервное хранилище)
function getUserProgress() {
  if (!currentUser || !currentUser.id) return {};
  const progress = localStorage.getItem(`userProgress_${currentUser.id}`);
  return progress ? JSON.parse(progress) : {};
}

// Сохранить прогресс пользователя в localStorage (резервное хранилище)
function saveUserProgress(progress) {
  if (!currentUser || !currentUser.id) return;
  localStorage.setItem(`userProgress_${currentUser.id}`, JSON.stringify(progress));
}

// Получить прогресс всех курсов с сервера (один запрос вместо множества)
async function fetchAllProgress() {
  if (!currentUser || !authToken) {
    return {};
  }

  try {
    const res = await fetch('/api/progress', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (res.ok) {
      const data = await res.json();
      // Преобразуем формат данных
      const progress = {};
      for (const [courseId, courseData] of Object.entries(data)) {
        progress[courseId] = {
          completedPages: courseData.completedLessons || [],
          currentPage: courseData.currentPage || 0,
          completed: courseData.totalCompleted > 0,
          startedAt: null,
          completedAt: null,
          lastAccessedAt: null,
          timeSpent: 0,
          quizScores: []
        };
      }
      return progress;
    }
  } catch (err) {
    console.error('Ошибка загрузки прогресса:', err);
  }

  return {};
}

// Получить прогресс курса с сервера
async function fetchCourseProgress(courseId) {
  if (!currentUser || !authToken) {
    return getCourseProgress(courseId);
  }

  try {
    const res = await fetch(`/api/progress/${courseId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (res.ok) {
      const data = await res.json();
      return {
        completedPages: data.completedLessons || [],
        currentPage: data.currentPage || 0,
        completed: data.completed || false,
        startedAt: data.startedAt || null,
        completedAt: data.completedAt || null,
        lastAccessedAt: data.lastAccessedAt || null,
        timeSpent: 0,
        quizScores: []
      };
    }
  } catch (err) {
    console.error(`Ошибка загрузки прогресса курса ${courseId}:`, err);
  }

  // Fallback на localStorage
  return getCourseProgress(courseId);
}

// Сохранить прогресс курса на сервер (с debouncing)
let progressSyncTimeout = null;
let pendingSync = new Map();

async function syncCourseProgress(courseId, courseProgress) {
  if (!currentUser || !authToken) {
    saveCourseProgress(courseId, courseProgress);
    return;
  }

  // Добавляем в очередь на синхронизацию
  pendingSync.set(courseId, courseProgress);

  // Очищаем предыдущий таймер
  if (progressSyncTimeout) {
    clearTimeout(progressSyncTimeout);
  }

  // Сохраняем в localStorage как резерв
  saveCourseProgress(courseId, courseProgress);

  // Ждём 1 секунду перед отправкой (debouncing)
  progressSyncTimeout = setTimeout(async () => {
    try {
      // Отправляем все накопленные изменения одним пакетом
      const syncPromises = [];

      for (const [cid, progress] of pendingSync) {
        for (const pageIndex of progress.completedPages) {
          syncPromises.push(
            fetch('/api/progress', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
              },
              body: JSON.stringify({
                courseId: parseInt(cid),
                pageIndex: parseInt(pageIndex)
              })
            }).catch(err => console.error(`Ошибка синхронизации курса ${cid}:`, err))
          );
        }
      }

      await Promise.all(syncPromises);
      pendingSync.clear();
      console.log('[syncCourseProgress] Прогресс синхронизирован');
    } catch (err) {
      console.error('Ошибка синхронизации прогресса:', err);
    }
  }, 1000);
}

// Получить или создать прогресс для конкретного курса (из localStorage)
function getCourseProgress(courseId) {
  const progress = getUserProgress();
  if (!progress[courseId]) {
    progress[courseId] = {
      completedPages: [],
      currentPage: 0,
      completed: false,
      startedAt: null,
      completedAt: null,
      lastAccessedAt: null,
      timeSpent: 0, // в секундах
      quizScores: [] // результаты квизов
    };
  }
  return progress[courseId];
}

// Сохранить прогресс курса (в localStorage)
function saveCourseProgress(courseId, courseProgress) {
  const progress = getUserProgress();
  progress[courseId] = courseProgress;
  saveUserProgress(progress);
}

// Обновить прогресс страницы
async function updatePageProgress(courseId, pageIndex) {
  console.log(`[updatePageProgress] Вызов для курса ${courseId}, страница ${pageIndex}`);
  console.log(`[updatePageProgress] currentUser:`, currentUser);

  const progress = getUserProgress();
  console.log(`[updatePageProgress] Текущий прогресс:`, progress[courseId]);

  if (!progress[courseId]) {
    progress[courseId] = {
      completedPages: [],
      currentPage: 0,
      completed: false,
      startedAt: new Date().toISOString(),
      completedAt: null,
      lastAccessedAt: null,
      timeSpent: 0,
      quizScores: []
    };
  }

  const courseProgress = progress[courseId];
  const prevCount = courseProgress.completedPages.length;

  // Добавляем страницу в завершённые если ещё нет
  if (!courseProgress.completedPages.includes(pageIndex)) {
    courseProgress.completedPages.push(pageIndex);
  }

  console.log(`[updatePageProgress] Добавлена страница ${pageIndex}. Было: ${prevCount}, стало: ${courseProgress.completedPages.length}`);

  courseProgress.currentPage = pageIndex;
  courseProgress.lastAccessedAt = new Date().toISOString();

  // Проверяем завершён ли курс (используем currentCourse если доступен)
  const course = currentCourse && currentCourse.id === courseId
    ? currentCourse
    : (JSON.parse(localStorage.getItem('userCourses') || '[]').find(c => c.id === courseId));

  if (course && course.pages && courseProgress.completedPages.length >= course.pages.length) {
    courseProgress.completed = true;
    courseProgress.completedAt = new Date().toISOString();
  }

  progress[courseId] = courseProgress;
  saveUserProgress(progress);

  console.log(`[updatePageProgress] Сохранён прогресс:`, progress[courseId]);

  // Синхронизируем с сервером (не блокируя UI)
  syncCourseProgress(courseId, courseProgress).catch(err => {
    console.error('Ошибка синхронизации прогресса:', err);
  });

  // Записываем активность
  logActivity('page_completed', { courseId, pageIndex, courseTitle: course?.title });

  return courseProgress;
}

// Вычислить процент прогресса
function calculateProgressPercent(courseId, course) {
  if (!course || !course.pages || course.pages.length === 0) return 0;
  const progress = getCourseProgress(courseId);
  const percent = Math.round((progress.completedPages.length / course.pages.length) * 100);
  console.log(`[Progress] Курс ${courseId}: ${progress.completedPages.length}/${course.pages.length} страниц = ${percent}%`);
  return percent;
}

// ========== ИСТОРИЯ АКТИВНОСТИ ==========

// Получить историю активности
function getActivityHistory() {
  if (!currentUser) return [];
  const history = localStorage.getItem(`activityHistory_${currentUser.id}`);
  return history ? JSON.parse(history) : [];
}

// Сохранить историю активности
function saveActivityHistory(history) {
  if (!currentUser) return;
  localStorage.setItem(`activityHistory_${currentUser.id}`, JSON.stringify(history));
}

// Записать событие активности
function logActivity(actionType, data = {}) {
  if (!currentUser) return;

  const history = getActivityHistory();
  const activity = {
    id: Date.now(),
    actionType,
    timestamp: new Date().toISOString(),
    data
  };

  // Добавляем в начало (новые события первыми)
  history.unshift(activity);

  // Храним последние 100 событий
  if (history.length > 100) {
    history.splice(100);
  }

  saveActivityHistory(history);
}

// Получить отформатированное время
function formatActivityTime(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const diff = now - date;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Только что';
  if (minutes < 60) return `${minutes} мин. назад`;
  if (hours < 24) return `${hours} ч. назад`;
  if (days < 7) return `${days} дн. назад`;

  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}

// Получить иконку для типа активности
function getActivityIcon(actionType) {
  const icons = {
    'course_started': 'fa-play-circle',
    'course_completed': 'fa-trophy',
    'page_completed': 'fa-check-circle',
    'quiz_completed': 'fa-clipboard-check',
    'login': 'fa-sign-in-alt',
    'profile_updated': 'fa-user-edit'
  };
  return icons[actionType] || 'fa-circle';
}

// Получить цвет для типа активности
function getActivityColor(actionType) {
  const colors = {
    'course_started': '#4CAF50',
    'course_completed': '#FFD700',
    'page_completed': '#2196F3',
    'quiz_completed': '#9C27B0',
    'login': '#607D8B',
    'profile_updated': '#FF9800'
  };
  return colors[actionType] || '#757575';
}

// ========== СИСТЕМА КВИЗОВ ==========

// База вопросов для квизов (можно расширять)
const quizQuestionsBank = {
  default: [
    {
      id: 1,
      question: 'Что такое HTML?',
      options: [
        'Язык программирования',
        'Язык разметки гипертекста',
        'База данных',
        'Операционная система'
      ],
      correct: 1
    },
    {
      id: 2,
      question: 'Какой тег используется для создания ссылки?',
      options: [
        '<link>',
        '<href>',
        '<a>',
        '<url>'
      ],
      correct: 2
    },
    {
      id: 3,
      question: 'Что означает CSS?',
      options: [
        'Computer Style Sheets',
        'Creative Style Sheets',
        'Cascading Style Sheets',
        'Colorful Style Sheets'
      ],
      correct: 2
    },
    {
      id: 4,
      question: 'Какой язык используется для программирования в браузере?',
      options: [
        'Python',
        'Java',
        'JavaScript',
        'C++'
      ],
      correct: 2
    },
    {
      id: 5,
      question: 'Что такое DOM?',
      options: [
        'Document Object Model',
        'Data Object Mode',
        'Digital Ordinance Model',
        'Desktop Orientation Module'
      ],
      correct: 0
    }
  ],
  programming: [
    {
      id: 1,
      question: 'Что такое переменная?',
      options: [
        'Константное значение',
        'Именованная область памяти для хранения данных',
        'Функция без параметров',
        'Тип данных'
      ],
      correct: 1
    },
    {
      id: 2,
      question: 'Какой оператор используется для присваивания?',
      options: [
        '==',
        '=',
        '===',
        ':='
      ],
      correct: 1
    },
    {
      id: 3,
      question: 'Что такое функция?',
      options: [
        'Тип данных',
        'Блок кода для выполнения задачи',
        'Переменная',
        'Оператор условия'
      ],
      correct: 1
    }
  ]
};

// Получить квиз для курса
function getQuizForCourse(course) {
  // Определяем тип курса по названию
  const title = (course.title || '').toLowerCase();
  let questions = quizQuestionsBank.default;

  if (title.includes('программ') || title.includes('javascript') || title.includes('python')) {
    questions = [...quizQuestionsBank.programming, ...quizQuestionsBank.default.slice(0, 2)];
  }

  // Перемешиваем вопросы и берём 5 случайных
  const shuffled = [...questions].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 5);
}

// Сохранить результат квиза
function saveQuizResult(courseId, score, total) {
  const progress = getUserProgress();
  if (!progress[courseId]) {
    progress[courseId] = {
      completedPages: [],
      currentPage: 0,
      completed: false,
      startedAt: null,
      completedAt: null,
      lastAccessedAt: null,
      timeSpent: 0,
      quizScores: []
    };
  }

  progress[courseId].quizScores.push({
    score,
    total,
    percentage: Math.round((score / total) * 100),
    timestamp: new Date().toISOString()
  });

  saveUserProgress(progress);

  // Записываем активность
  logActivity('quiz_completed', { courseId, score, total });
}

// Получить лучший результат квиза
function getBestQuizScore(courseId) {
  const progress = getCourseProgress(courseId);
  if (!progress.quizScores || progress.quizScores.length === 0) return null;

  return progress.quizScores.reduce((best, current) =>
    current.percentage > best.percentage ? current : best
  );
}

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
  } else if (pageId === 'course') {
    // Обновляем прогресс-бар при переходе на страницу курса
    setTimeout(() => updateCourseProgressBars(), 100);
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
  debouncedLoadCoursesWithFilter(containerId, filter);
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

  // Получаем прогресс для курса
  const progressPercent = currentUser ? calculateProgressPercent(course.id, course) : 0;
  const courseProgress = currentUser ? getCourseProgress(course.id) : null;
  const completedPages = courseProgress ? courseProgress.completedPages.length : 0;

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

      ${currentUser && !isCompleted ? `
      <div class="course-progress-container">
        <div class="course-progress-bar">
          <div class="course-progress-fill" style="width: ${progressPercent}%"></div>
        </div>
        <div class="course-progress-text">${progressPercent}% (${completedPages}/${pageCount})</div>
      </div>
      ` : ''}

      <div class="course-actions">
        <button class="btn btn-primary btn-sm start-course-btn" data-course-id="${course.id}" data-course-title="${course.title.replace(/"/g, '&quot;')}">
          <i class="fas fa-play-circle"></i>
          ${isCompleted ? 'Повторить' : (progressPercent > 0 ? 'Продолжить' : 'Начать')}
        </button>
        ${currentUser ? `
        <button class="btn btn-sm quiz-btn" data-course-id="${course.id}" data-course-title="${course.title.replace(/"/g, '&quot;')}" title="Пройти тест">
          <i class="fas fa-clipboard-question"></i>
          Пройти тест
        </button>
        ` : ''}
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

  // Добавляем обработчик для кнопки квиза
  const quizBtn = courseElement.querySelector('.quiz-btn');
  if (quizBtn) {
    quizBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const courseId = parseInt(quizBtn.getAttribute('data-course-id'));
      const courseTitle = quizBtn.getAttribute('data-course-title');
      showQuizModal(courseId, courseTitle);
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

    // Загружаем историю активности
    loadActivityHistory();
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
    loadActivityHistory();
  }
}

// Загрузка статистики профиля
function loadProfileStats() {
  // Получаем все курсы
  const allCourses = JSON.parse(localStorage.getItem('userCourses') || '[]');
  const completedCourses = allCourses.filter(c => c.completed).length;
  const inProgressCourses = allCourses.filter(c => !c.completed).length;

  // Получаем прогресс пользователя
  const userProgress = getUserProgress();
  let totalProgress = 0;
  let coursesWithProgress = 0;
  let totalQuizzes = 0;
  let bestQuizScore = 0;

  allCourses.forEach(course => {
    const progress = getCourseProgress(course.id);
    if (progress.completedPages.length > 0) {
      coursesWithProgress++;
      const percent = calculateProgressPercent(course.id, course);
      totalProgress += percent;
    }

    // Считаем квизы
    if (progress.quizScores && progress.quizScores.length > 0) {
      totalQuizzes += progress.quizScores.length;
      const best = getBestQuizScore(course.id);
      if (best && best.percentage > bestQuizScore) {
        bestQuizScore = best.percentage;
      }
    }
  });

  const avgProgress = coursesWithProgress > 0 ? Math.round(totalProgress / coursesWithProgress) : 0;

  // Обновляем статистику
  document.getElementById('dashboard-total-courses').textContent = allCourses.length;
  document.getElementById('dashboard-completed-courses').textContent = completedCourses;
  document.getElementById('dashboard-in-progress').textContent = inProgressCourses;

  // Добавляем дополнительную статистику если элементы существуют
  const avgProgressEl = document.getElementById('dashboard-avg-progress');
  if (avgProgressEl) {
    avgProgressEl.textContent = `${avgProgress}%`;
  }

  const quizzesEl = document.getElementById('dashboard-quizzes');
  if (quizzesEl) {
    quizzesEl.textContent = totalQuizzes;
  }
}

// Загрузка истории активности
function loadActivityHistory() {
  const container = document.getElementById('dashboard-activity-list');
  if (!container) return;

  const history = getActivityHistory();

  if (history.length === 0) {
    container.innerHTML = '<p class="text-muted">История активности пока пуста. Начните обучение!</p>';
    return;
  }

  container.innerHTML = history.map(activity => {
    const icon = getActivityIcon(activity.actionType);
    const color = getActivityColor(activity.actionType);
    const timeAgo = formatActivityTime(activity.timestamp);

    let actionText = '';
    switch(activity.actionType) {
      case 'course_started':
        actionText = `Начал курс "${activity.data?.courseTitle || ''}"`;
        break;
      case 'course_completed':
        actionText = `✅ Завершил курс "${activity.data?.courseTitle || ''}"`;
        break;
      case 'page_completed':
        actionText = `📄 Страница ${activity.data?.pageIndex + 1} в курсе "${activity.data?.courseTitle || ''}"`;
        break;
      case 'quiz_completed':
        actionText = `📝 Тест: ${activity.data?.score}/${activity.data?.total} (${Math.round(activity.data?.score / activity.data?.total * 100)}%)`;
        break;
      case 'login':
        actionText = '🔐 Вход в систему';
        break;
      case 'profile_updated':
        actionText = '✏️ Профиль обновлён';
        break;
      default:
        actionText = 'Действие в системе';
    }

    return `
      <div class="activity-item" style="border-left: 3px solid ${color}">
        <div class="activity-icon" style="background: ${color}20; color: ${color}">
          <i class="fas ${icon}"></i>
        </div>
        <div class="activity-content">
          <div class="activity-text">${actionText}</div>
          <div class="activity-time">${timeAgo}</div>
        </div>
      </div>
    `;
  }).join('');
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

  // Обновляем прогресс-бары после загрузки курсов
  updateCourseProgressBars();
}

// Текущий курс и индекс страницы
let currentCourse = null;
let currentPageIndex = 0;

// Загрузка конкретной страницы курса
function loadCoursePage(course, pageIndex, animate = false, direction = 'forward') {
  const container = document.querySelector('.course-pages-container');
  if (!course.pages || pageIndex >= course.pages.length) {
    // Если страницы нет, показываем сообщение или завершаем курс
    showCompletionModal();
    return;
  }

  const page = course.pages[pageIndex];

  // Получаем прогресс для отображения
  const progressPercent = currentUser ? calculateProgressPercent(course.id, course) : 0;
  const completedPages = currentUser ? getCourseProgress(course.id).completedPages.length : 0;

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
            <i class="fas fa-play-circle" style="font-size: 3rem; margin-bottom: 15px;"></i>
            <div class="video-placeholder-content">${page.title || 'Видеоурок'}</div>
            <div class="video-scheme">
              <div class="video-placeholder-content">
                <i class="fas fa-film" style="font-size: 2rem; opacity: 0.8;"></i>
                <p style="margin-top: 10px; font-size: 0.9rem;">Место для видеоплеера</p>
              </div>
            </div>
          </div>
          ${page.content ? `<div class="page-text-content">${page.content}</div>` : ''}
        </div>
      `;
      break;
    case 'diagram':
      pageContent = `
        <div class="course-page">
          <h3>${page.title || 'Схема'}</h3>
          <div class="diagram-placeholder">
            <div class="diagram-scheme">
              <div class="interactive-diagram" id="interactive-diagram-${pageIndex}">
                <!-- Интерактивная схема будет сгенерирована здесь -->
              </div>
            </div>
            <div class="diagram-info">
              <strong>💡 Подсказка:</strong> Наведите курсор на элементы схемы для взаимодействия
            </div>
          </div>
          ${page.content ? `<div class="page-text-content">${page.content}</div>` : ''}
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

  // Добавляем прогресс-бар в контейнер
  const newContent = `
    <div class="course-progress-header">
      <div class="course-progress-info">
        <span><i class="fas fa-chart-line"></i> Прогресс курса</span>
        <span>${progressPercent}% (${completedPages}/${course.pages.length})</span>
      </div>
      <div class="course-progress-bar-large">
        <div class="course-progress-fill-large" style="width: ${progressPercent}%"></div>
      </div>
    </div>
    ${pageContent}
  `;

  // Применяем анимацию если нужно
  if (animate) {
    const leaveClass = direction === 'forward' ? 'page-transition-leave' : 'page-transition-leave-back';
    const enterClass = direction === 'forward' ? 'page-transition-enter' : 'page-transition-enter-back';

    container.classList.add(leaveClass);

    setTimeout(() => {
      container.innerHTML = newContent;
      container.classList.remove(leaveClass);
      container.classList.add(enterClass);

      // Удаляем класс анимации после завершения
      setTimeout(() => {
        container.classList.remove(enterClass);
      }, 400);

      // Инициализируем интерактивную схему для страниц типа diagram
      if (page.type === 'diagram') {
        initInteractiveDiagram(pageIndex, page.title || '');
      }
    }, 350);
  } else {
    container.innerHTML = newContent;

    // Инициализируем интерактивную схему для страниц типа diagram
    if (page.type === 'diagram') {
      initInteractiveDiagram(pageIndex, page.title || '');
    }
  }

  // Обновляем текст кнопки "Далее" и управляем видимостью кнопок
  const nextButton = document.getElementById('next-btn');
  const prevButton = document.getElementById('prev-btn');

  // Показываем/скрываем кнопку "Назад"
  if (prevButton) {
    prevButton.style.display = pageIndex === 0 ? 'none' : 'inline-flex';
  }

  if (nextButton) {
    if (pageIndex >= course.pages.length - 1) {
      nextButton.textContent = 'Завершить курс';
    } else {
      nextButton.innerHTML = 'Далее <i class="fas fa-arrow-right"></i>';
    }
  }
}

// Инициализация интерактивной схемы
function initInteractiveDiagram(pageIndex, pageTitle) {
  const diagramContainer = document.getElementById(`interactive-diagram-${pageIndex}`);
  if (!diagramContainer) return;

  // Определяем тип схемы по названию
  const isArchitecture = pageTitle.toLowerCase().includes('архитектура') ||
                         pageTitle.toLowerCase().includes('веб-приложени') ||
                         pageTitle.toLowerCase().includes('http');

  const isProgramStructure = pageTitle.toLowerCase().includes('структура') ||
                             pageTitle.toLowerCase().includes('программ');

  if (isArchitecture || isProgramStructure) {
    // Схема клиент-сервер или HTTP-запрос
    diagramContainer.innerHTML = `
      <div class="diagram-row">
        <div class="diagram-node" data-node="client">
          <i class="fas fa-laptop" style="margin-right: 8px;"></i>
          Клиент
        </div>
        <div class="diagram-arrow">
          <i class="fas fa-arrow-right"></i>
        </div>
        <div class="diagram-node" data-node="server">
          <i class="fas fa-server" style="margin-right: 8px;"></i>
          Сервер
        </div>
        <div class="diagram-arrow">
          <i class="fas fa-arrow-right"></i>
        </div>
        <div class="diagram-node" data-node="database">
          <i class="fas fa-database" style="margin-right: 8px;"></i>
          База данных
        </div>
      </div>
    `;

    // Добавляем обработчики событий
    const nodes = diagramContainer.querySelectorAll('.diagram-node');
    nodes.forEach(node => {
      node.addEventListener('click', function() {
        nodes.forEach(n => n.classList.remove('active'));
        this.classList.add('active');

        // Показываем информацию о выбранном узле
        showDiagramInfo(this.dataset.node, diagramContainer);
      });

      node.addEventListener('mouseenter', function() {
        this.style.transform = 'scale(1.1)';
      });

      node.addEventListener('mouseleave', function() {
        if (!this.classList.contains('active')) {
          this.style.transform = 'scale(1)';
        }
      });
    });
  } else {
    // Универсальная схема
    diagramContainer.innerHTML = `
      <div class="diagram-row">
        <div class="diagram-node" data-node="input">
          <i class="fas fa-keyboard" style="margin-right: 8px;"></i>
          Ввод
        </div>
        <div class="diagram-arrow">
          <i class="fas fa-arrow-right"></i>
        </div>
        <div class="diagram-node" data-node="process">
          <i class="fas fa-cog" style="margin-right: 8px;"></i>
          Обработка
        </div>
        <div class="diagram-arrow">
          <i class="fas fa-arrow-right"></i>
        </div>
        <div class="diagram-node" data-node="output">
          <i class="fas fa-desktop" style="margin-right: 8px;"></i>
          Вывод
        </div>
      </div>
    `;

    const nodes = diagramContainer.querySelectorAll('.diagram-node');
    nodes.forEach(node => {
      node.addEventListener('click', function() {
        nodes.forEach(n => n.classList.remove('active'));
        this.classList.add('active');
        showDiagramInfo(this.dataset.node, diagramContainer);
      });

      node.addEventListener('mouseenter', function() {
        this.style.transform = 'scale(1.1)';
      });

      node.addEventListener('mouseleave', function() {
        if (!this.classList.contains('active')) {
          this.style.transform = 'scale(1)';
        }
      });
    });
  }
}

// Показ информации об узле схемы
function showDiagramInfo(nodeType, container) {
  let info = document.getElementById('diagram-info-text');

  if (!info) {
    info = document.createElement('div');
    info.id = 'diagram-info-text';
    info.className = 'diagram-info';
    container.parentElement.appendChild(info);
  }

  const infoTexts = {
    'client': '<strong>Клиент (Browser)</strong><br>Отправляет запросы на сервер и отображает полученные данные. Примеры: Chrome, Firefox, Safari.',
    'server': '<strong>Сервер (Backend)</strong><br>Обрабатывает запросы клиента, выполняет бизнес-логику и работает с базой данных.',
    'database': '<strong>База данных</strong><br>Хранит и организует данные. Примеры: SQLite, PostgreSQL, MongoDB.',
    'input': '<strong>Ввод данных</strong><br>Пользователь вводит данные через клавиатуру, мышь или другие устройства.',
    'process': '<strong>Обработка</strong><br>Программа обрабатывает входные данные согласно заданному алгоритму.',
    'output': '<strong>Вывод данных</strong><br>Результат обработки показывается пользователю на экране или сохраняется в файл.'
  };

  info.innerHTML = infoTexts[nodeType] || 'Нажмите на элемент схемы для получения информации';
}

// Функция для перехода к следующей странице
function nextCoursePage() {
  if (!currentCourse) return;

  // Сохраняем прогресс текущей страницы перед переходом
  updatePageProgress(currentCourse.id, currentPageIndex);

  currentPageIndex++;

  if (currentPageIndex >= currentCourse.pages.length) {
    // Если больше нет страниц, показываем модальное окно завершения
    // Записываем активность завершения курса
    logActivity('course_completed', { courseId: currentCourse.id, courseTitle: currentCourse.title });
    showCompletionModal();
  } else {
    // Загружаем следующую страницу с анимацией
    loadCoursePage(currentCourse, currentPageIndex, true, 'forward');
  }
}

// Функция для перехода к предыдущей странице
function prevCoursePage() {
  if (!currentCourse || currentPageIndex <= 0) return;

  currentPageIndex--;

  // Загружаем предыдущую страницу с анимацией
  loadCoursePage(currentCourse, currentPageIndex, true, 'backward');
}

// Обновить отображение прогресса в карточках курсов
function updateCourseProgressBars() {
  console.log('[updateCourseProgressBars] Вызов функции');

  // Получаем доступные курсы из localStorage
  const availableCourses = JSON.parse(localStorage.getItem('availableCourses') || '[]');

  document.querySelectorAll('.course-card').forEach(card => {
    const startBtn = card.querySelector('.start-course-btn');
    if (!startBtn) return;

    const courseId = parseInt(startBtn.getAttribute('data-course-id'));
    const courseTitle = startBtn.getAttribute('data-course-title');

    // Ищем курс в доступных курсах
    let course = availableCourses.find(c => c.id === courseId);

    // Если не нашли, создаём заглушку
    if (!course) {
      course = {
        id: courseId,
        title: courseTitle,
        pages: []
      };
    }

    // Получаем прогресс (сначала из курса если загружен с сервера, потом из localStorage)
    const courseProgress = course.userProgress || (currentUser ? getCourseProgress(courseId) : null);
    const completedPages = courseProgress ? courseProgress.completedPages.length : 0;

    // Получаем количество страниц из курса или из currentCourse если это тот же курс
    let totalPages = course.pages ? course.pages.length : 0;
    if (totalPages === 0 && currentCourse && currentCourse.id === courseId) {
      totalPages = currentCourse.pages.length;
    }

    // Вычисляем процент вручную, чтобы было правильно
    const progressPercent = totalPages > 0 ? Math.round((completedPages / totalPages) * 100) : 0;

    const isCompleted = courseProgress?.completed || false;

    console.log(`[updateCourseProgressBars] Курс ${courseId}: ${completedPages}/${totalPages} страниц = ${progressPercent}% (завершён: ${isCompleted})`);

    // Обновляем или создаём прогресс-бар (показываем всегда, даже для завершённых курсов)
    let progressContainer = card.querySelector('.course-progress-container');
    if (!progressContainer && currentUser && totalPages > 0) {
      const courseInfo = card.querySelector('.course-info');
      const courseMeta = courseInfo.querySelector('.course-meta');
      const courseActions = courseInfo.querySelector('.course-actions');

      progressContainer = document.createElement('div');
      progressContainer.className = 'course-progress-container';

      // Добавляем класс для завершённого курса
      const badgeClass = isCompleted ? 'completed' : '';
      progressContainer.innerHTML = `
        <div class="course-progress-bar ${badgeClass}">
          <div class="course-progress-fill" style="width: ${progressPercent}%"></div>
        </div>
        <div class="course-progress-text">${progressPercent}% (${completedPages}/${totalPages}) ${isCompleted ? '✅' : ''}</div>
      `;

      if (courseMeta && courseActions) {
        courseMeta.after(progressContainer);
      }
    } else if (progressContainer && currentUser && totalPages > 0) {
      const fill = progressContainer.querySelector('.course-progress-fill');
      const text = progressContainer.querySelector('.course-progress-text');
      if (fill) fill.style.width = `${progressPercent}%`;
      if (text) text.textContent = `${progressPercent}% (${completedPages}/${totalPages}) ${isCompleted ? '✅' : ''}`;
    }

    // Обновляем текст кнопки
    if (startBtn) {
      if (isCompleted) {
        startBtn.innerHTML = '<i class="fas fa-redo"></i> Повторить';
      } else if (progressPercent > 0) {
        startBtn.innerHTML = '<i class="fas fa-play-circle"></i> Продолжить';
      } else {
        startBtn.innerHTML = '<i class="fas fa-play-circle"></i> Начать';
      }
    }
  });
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

    // Записываем активность начала курса
    logActivity('course_started', { courseId: id, courseTitle: title });
  } catch (error) {
    console.error('Ошибка при запуске курса:', error);
    alert('Ошибка при запуске курса: ' + error.message);
  }
}

// ========== ФУНКЦИИ ДЛЯ КВИЗОВ ==========

// Текущее состояние квиза
let currentQuizState = {
  courseId: null,
  courseTitle: '',
  questions: [],
  currentQuestion: 0,
  answers: [],
  score: 0
};

// Показать модальное окно квиза
window.showQuizModal = function(courseId, courseTitle) {
  if (!currentUser) {
    navigateTo('login');
    return;
  }

  const course = JSON.parse(localStorage.getItem('userCourses') || '[]').find(c => c.id === courseId);
  const questions = getQuizForCourse(course || { title: courseTitle });

  currentQuizState = {
    courseId,
    courseTitle,
    questions,
    currentQuestion: 0,
    answers: [],
    score: 0
  };

  // Показываем модальное окно
  const modal = document.getElementById('quiz-modal');
  if (modal) {
    modal.classList.add('show');
    modal.style.display = 'flex';
    renderQuizQuestion();
  }
};

// Отобразить текущий вопрос
function renderQuizQuestion() {
  const question = currentQuizState.questions[currentQuizState.currentQuestion];
  if (!question) return;

  const container = document.getElementById('quiz-question-container');
  if (!container) return;

  // Обновляем прогресс
  const progressEl = document.getElementById('quiz-progress');
  if (progressEl) {
    progressEl.textContent = `Вопрос ${currentQuizState.currentQuestion + 1} из ${currentQuizState.questions.length}`;
  }

  // Рендерим вопрос
  container.innerHTML = `
    <div class="quiz-question">
      <h3 class="quiz-question-text">${question.question}</h3>
      <div class="quiz-options">
        ${question.options.map((option, index) => `
          <button class="quiz-option" data-index="${index}" onclick="selectQuizAnswer(${index})">
            <span class="quiz-option-letter">${String.fromCharCode(65 + index)}</span>
            <span class="quiz-option-text">${option}</span>
          </button>
        `).join('')}
      </div>
    </div>
  `;
}

// Выбрать ответ
window.selectQuizAnswer = function(index) {
  // Сохраняем ответ
  currentQuizState.answers[currentQuizState.currentQuestion] = index;

  // Проверяем правильность
  const question = currentQuizState.questions[currentQuizState.currentQuestion];
  const isCorrect = index === question.correct;

  if (isCorrect) {
    currentQuizState.score++;
  }

  // Визуально показываем выбор
  const options = document.querySelectorAll('.quiz-option');
  options.forEach((opt, i) => {
    opt.classList.remove('selected', 'correct', 'incorrect');
    if (i === index) {
      opt.classList.add('selected');
      opt.classList.add(isCorrect ? 'correct' : 'incorrect');
    }
    if (i === question.correct && i !== index) {
      opt.classList.add('correct');
    }
    opt.disabled = true;
  });

  // Показываем кнопку "Далее"
  const nextBtn = document.getElementById('quiz-next-btn');
  if (nextBtn) {
    nextBtn.style.display = 'block';
    nextBtn.textContent = currentQuizState.currentQuestion < currentQuizState.questions.length - 1 ? 'Далее' : 'Завершить тест';
  }
};

// Следующий вопрос
window.nextQuizQuestion = function() {
  if (currentQuizState.currentQuestion < currentQuizState.questions.length - 1) {
    currentQuizState.currentQuestion++;
    renderQuizQuestion();
    const nextBtn = document.getElementById('quiz-next-btn');
    if (nextBtn) nextBtn.style.display = 'none';
  } else {
    finishQuiz();
  }
};

// Завершить квиз
function finishQuiz() {
  const total = currentQuizState.questions.length;
  const score = currentQuizState.score;
  const percentage = Math.round((score / total) * 100);

  // Сохраняем результат
  saveQuizResult(currentQuizState.courseId, score, total);

  // Показываем результаты
  const resultsContainer = document.getElementById('quiz-results');
  if (resultsContainer) {
    let message = '';
    let icon = '';

    if (percentage >= 80) {
      message = 'Отличный результат!';
      icon = '🏆';
    } else if (percentage >= 60) {
      message = 'Хороший результат!';
      icon = '👍';
    } else if (percentage >= 40) {
      message = 'Неплохо, но можно лучше';
      icon = '📚';
    } else {
      message = 'Попробуйте ещё раз';
      icon = '🔄';
    }

    resultsContainer.innerHTML = `
      <div class="quiz-results-content">
        <div class="quiz-results-icon">${icon}</div>
        <h3>${message}</h3>
        <div class="quiz-score">
          <div class="quiz-score-circle" style="--percentage: ${percentage}">
            <span>${percentage}%</span>
          </div>
        </div>
        <p class="quiz-score-text">${score} из ${total} правильных ответов</p>
        ${percentage < 60 ? `
          <button class="btn btn-primary" onclick="showQuizModal(${currentQuizState.courseId}, '${currentQuizState.courseTitle.replace(/'/g, "\\'")}')">
            <i class="fas fa-redo"></i> Пройти ещё раз
          </button>
        ` : ''}
      </div>
    `;
    resultsContainer.style.display = 'block';
  }

  // Скрываем вопрос
  const questionContainer = document.getElementById('quiz-question-container');
  if (questionContainer) questionContainer.style.display = 'none';

  // Скрываем кнопку "Далее"
  const nextBtn = document.getElementById('quiz-next-btn');
  if (nextBtn) nextBtn.style.display = 'none';

  // Скрываем прогресс
  const progressEl = document.getElementById('quiz-progress');
  if (progressEl) progressEl.style.display = 'none';
}

// Закрыть квиз
window.closeQuizModal = function() {
  const modal = document.getElementById('quiz-modal');
  if (modal) {
    modal.classList.remove('show');
    setTimeout(() => {
      modal.style.display = 'none';
    }, 300);
  }

  // Сбрасываем состояние
  const resultsContainer = document.getElementById('quiz-results');
  if (resultsContainer) {
    resultsContainer.style.display = 'none';
    resultsContainer.innerHTML = '';
  }

  const questionContainer = document.getElementById('quiz-question-container');
  if (questionContainer) {
    questionContainer.style.display = 'block';
  }

  const progressEl = document.getElementById('quiz-progress');
  if (progressEl) {
    progressEl.style.display = 'block';
  }
};

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
  const password = document.querySelector('#registerForm input[placeholder="Пароль (≥8 символов, буквы и цифры)"]').value;
  const birthDateString = document.getElementById('birthDate')?.value;

  // ✅ 1. Пароль ≥8 символов, буквы и цифры
  if (password.length < 8) {
    alert('❌ Пароль должен содержать не менее 8 символов');
    return;
  }

  // Проверка наличия букв и цифр
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    alert('❌ Пароль должен содержать буквы и цифры');
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
    alert('⚠️ Ошибка подк����ючения к серверу');
  }
});

// 🔄 Автовосстановление сессии при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
  // Установим max-дату как "сегодня" (чтобы нельзя было выбрать будущее)
  const today = new Date().toISOString().split('T')[0];
  const birthInput = document.getElementById('birthDate');
  if (birthInput) birthInput.max = today;

  // Обработчик закрытия модального окна по клик�� вне
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

  // Если ������сть сохраненные данные пользователя и токен
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

  // Обработчик для кнопки "Назад" в курсе
  const prevBtn = document.getElementById('prev-btn');
  if (prevBtn) {
    prevBtn.addEventListener('click', prevCoursePage);
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

  // ========== ОБРАБОТЧИКИ ДЛЯ ПОИСКА КУРСОВ ==========
  const searchInput = document.getElementById('course-search-input');
  const searchBtn = document.getElementById('search-btn');
  const clearSearchBtn = document.getElementById('clear-search-btn');

  // Поиск при вводе с задержкой (debouncing)
  let searchTimeout = null;
  if (searchInput) {
    searchInput.addEventListener('input', function() {
      const query = this.value.trim();

      // Очищаем предыдущий таймер
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }

      // Если запрос короче 2 символов — загружаем все курсы
      if (query.length < 2) {
        clearSearchBtn.style.display = 'none';
        debouncedLoadCoursesWithFilter('main-course-list', window.currentTab || 'all');
        return;
      }

      // Показываем кнопку очистки
      clearSearchBtn.style.display = 'block';

      // Задержка 300мс перед поиском
      searchTimeout = setTimeout(() => {
        performSearch(query);
      }, 300);
    });
  }

  // Поиск по кнопке
  if (searchBtn) {
    searchBtn.addEventListener('click', function() {
      const query = searchInput.value.trim();
      if (query.length >= 2) {
        performSearch(query);
      }
    });
  }

  // Очистка поиска
  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', function() {
      searchInput.value = '';
      clearSearchBtn.style.display = 'none';
      searchInput.focus();
      debouncedLoadCoursesWithFilter('main-course-list', window.currentTab || 'all');
    });
  }

  // Функция поиска курсов
  window.performSearch = async function(query) {
    try {
      console.log('Поиск:', query);

      // Используем кэш для получения курсов
      const courses = await getCoursesData();

      // Фильтруем курсы по названию (ищем вхождение запроса)
      const searchTerm = query.toLowerCase();
      const filteredCourses = courses.filter(course =>
        course.title && course.title.toLowerCase().includes(searchTerm)
      );

      console.log('Найдено курсов:', filteredCourses.length);

      const container = document.getElementById('main-course-list');
      if (container) {
        container.innerHTML = '';

        if (filteredCourses.length > 0) {
          filteredCourses.forEach(course => {
            const courseCard = createCourseCard(course, false);
            container.appendChild(courseCard);
          });
        } else {
          container.innerHTML = '<p class="text-muted">Курсы не найдены</p>';
        }
      }
    } catch (err) {
      console.error('Ошибка поиска:', err);
      const container = document.getElementById('main-course-list');
      if (container) {
        container.innerHTML = '<p class="error">Ошибка при поиске курсов</p>';
      }
    }
  };

  // ========== ��БРАБОТЧИКИ DASHBOARD / ПРОФИЛЯ ==========
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

        // Загружаем историю активности при переключении на вкладку
        if (targetTab === 'activity') {
          loadActivityHistory();
        }
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

      // Записываем активность
      logActivity('profile_updated', { name, email });

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

      if (newPassword.length < 8) {
        alert('Новый пароль должен быть не менее 8 символов');
        return;
      }

      // Проверка наличия букв и цифр
      if (!/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
        alert('Пароль должен содержать буквы и цифры');
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
      // Записываем активность
      logActivity('login', {});
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

  // Используем debounced версию для предотвращения множественных запросов
  debouncedLoadCoursesWithFilter('main-course-list', tabName);
}

// Загрузка курсов с фильтрацией по вкладке
window.loadCoursesWithFilter = async function(containerId, filter) {
  try {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error('Контейнер для курсов не найден');
      return;
    }

    // Используем кэш для получения базовых данных курсов
    console.log('[loadCoursesWithFilter] Загружаем курсы...');
    const courses = await getCoursesData();

    console.log('[loadCoursesWithFilter] Загружено курсов:', courses.length);
    if (courses.length > 0) {
      console.log('[loadCoursesWithFilter] Первый курс:', courses[0]);
    }

    // Загружаем страницы для каждого курса (с кэшированием запросов)
    console.log('[loadCoursesWithFilter] Загружаем страницы курсов...');
    const coursesWithPages = await Promise.all(courses.map(async (course) => {
      try {
        // Проверяем localStorage кэш для страниц курса
        const cachedPages = localStorage.getItem(`course_pages_${course.id}`);
        if (cachedPages) {
          const parsed = JSON.parse(cachedPages);
          // Проверяем актуальность кэша (5 минут)
          if (Date.now() - parsed.timestamp < 300000) {
            return { ...course, pages: parsed.data };
          }
        }

        const courseRes = await fetch(`/api/courses/${course.id}`);
        if (courseRes.ok) {
          const courseData = await courseRes.json();
          // Кэшируем страницы в localStorage
          localStorage.setItem(`course_pages_${course.id}`, JSON.stringify({
            data: courseData.pages || [],
            timestamp: Date.now()
          }));
          return { ...course, pages: courseData.pages || [] };
        }
        return course;
      } catch (err) {
        console.error(`Ошибка загрузки страниц для курса ${course.id}:`, err);
        return course;
      }
    }));

    // Фильтруем курсы без страниц (тестовые курсы)
    const filteredCourses = coursesWithPages.filter(course => course.pages && course.pages.length > 0);
    console.log('[loadCoursesWithFilter] Курсов с главами:', filteredCourses.length);

    // Загружаем прогресс для всех курсов одним запросом (если пользователь авторизован)
    let allProgress = {};
    if (currentUser && authToken) {
      console.log('[loadCoursesWithFilter] Загружаем прогресс пользователя...');
      try {
        allProgress = await fetchAllProgress();
      } catch (err) {
        console.error('Ошибка загрузки прогресса:', err);
      }
    }

    // Применяем прогресс к курсам
    filteredCourses.forEach(course => {
      course.userProgress = allProgress[course.id] || getCourseProgress(course.id);
    });

    // Сохраняем курсы с страницами в localStorage для отслеживания прогресса
    localStorage.setItem('availableCourses', JSON.stringify(filteredCourses));

    // Очищаем контейнер
    container.innerHTML = '';

    // Применяем фильтр
    if (filter === 'popular') {
      // Популярные - курсы с большим количеством страниц (имитация)
      filteredCourses.sort((a, b) => (b.pages?.length || 0) - (a.pages?.length || 0));
    } else if (filter === 'new') {
      // Новинки - курсы в обратном порядке (новые сначала)
      filteredCourses.sort((a, b) => b.id - a.id);
    }
    // filter === 'all' - показываем все без сортировки

    // Создаем элементы курсов и добавляем обработчики событий
    filteredCourses.forEach(course => {
      const courseCard = createCourseCard(course, false);
      container.appendChild(courseCard);
    });

    // Обновляем прогресс-бары после загрузки курсов
    updateCourseProgressBars();
  } catch (err) {
    console.error('Ошибка загрузки курсов:', err);
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = '<p class="error">Ошибка загрузки курсов</p>';
    }
  }
}

// Debounced версия функции loadCoursesWithFilter
const debouncedLoadCoursesWithFilter = debounceFilter((containerId, filter) => {
  window.loadCoursesWithFilter(containerId, filter);
}, FILTER_DEBOUNCE_DELAY);

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

  // Кнопка закрытия модального окна квиза
  const closeQuizBtn = document.getElementById('quiz-close-btn');
  if (closeQuizBtn) {
    closeQuizBtn.addEventListener('click', window.closeQuizModal);
  }

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
    const quizModal = document.getElementById('quiz-modal');

    if (e.target === faqModal) {
      window.closeFaqModal();
    }
    if (e.target === contactsModal) {
      window.closeContactsModal();
    }
    if (e.target === quizModal) {
      window.closeQuizModal();
    }
  });
});