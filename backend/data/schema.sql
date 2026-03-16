-- Database schema for LearnHub application

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    birth_date TEXT NOT NULL,
    avatar TEXT,
    bio TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Courses table
CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    full_description TEXT,
    image TEXT,
    status TEXT DEFAULT 'active',
    category_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- Course pages table
CREATE TABLE IF NOT EXISTS course_pages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    page_type TEXT DEFAULT 'text',
    video_url TEXT,
    diagram_data TEXT,
    page_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- User progress tracking
CREATE TABLE IF NOT EXISTS user_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    course_id INTEGER NOT NULL,
    completed_pages INTEGER DEFAULT 0,
    total_pages INTEGER DEFAULT 0,
    progress_percentage INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (course_id) REFERENCES courses(id),
    UNIQUE(user_id, course_id)
);

-- Insert sample courses
INSERT OR IGNORE INTO courses (id, title, description, full_description, image, status) VALUES
(1, 'Основы программирования', 'Введение в программирование и базовые концепции', 'Этот курс познакомит вас с основами программирования. Вы изучите переменные, типы данных, условные операторы и циклы. Курс подходит для начинающих.', 'assets/images/course-programming.svg', 'active'),
(2, 'Веб-разработка', 'Создание современных веб-приложений', 'Курс по веб-разработке охватывает HTML, CSS и JavaScript. Вы научитесь создавать адаптивные сайты и интерактивные веб-приложения.', 'assets/images/course-webdev.svg', 'active'),
(3, 'Архитектура веб-приложений', 'Изучите архитектуру клиент-серверных приложений', 'В этом курсе вы подробно изучите, как устроены современные веб-приложения. Мы разберём архитектуру клиент-сервер, протокол HTTP, работу браузеров и серверов.', 'assets/images/course-architecture.svg', 'active');

-- Pages for course 1: Основы программирования
INSERT OR IGNORE INTO course_pages (course_id, title, content, page_type, page_order) VALUES
(1, 'Введение в программирование', '<p>Программирование — это процесс создания компьютерных программ. В этом курсе мы изучим основные концепции, которые лежат в основе любого языка программирования.</p><h3>Что вы узнаете:</h3><ul><li>Что такое переменные и типы данных</li><li>Как работать с условными операторами</li><li>Как использовать циклы</li><li>Как создавать функции</li></ul>', 'text', 1),
(1, 'Переменные и типы данных', '<p>Переменная — это именованная область памяти, в которой хранится значение. В программировании важно понимать, какие типы данных существуют.</p><h3>Основные типы данных:</h3><ul><li><strong>Числа</strong> — целые (1, 42, -10) и дробные (3.14, -0.5)</li><li><strong>Строки</strong> — текст в кавычках ("Привет", ''World'')</li><li><strong>Булевы значения</strong> — true (истина) и false (ложь)</li><li><strong>Массивы</strong> — упорядоченные наборы значений</li></ul>', 'text', 2),
(1, 'Видео: Работа с переменными', 'Изучите на практике, как объявлять и использовать переменные в коде.', 'video', 3),
(1, 'Схема: Структура программы', 'Блок-схема показывает основные этапы выполнения программы: от ввода данных до вывода результата.', 'diagram', 4);

-- Pages for course 2: Веб-разработка
INSERT OR IGNORE INTO course_pages (course_id, title, content, page_type, page_order) VALUES
(2, 'Введение в веб-разработку', '<p>Веб-разработка делится на две основные части:</p><h3>Frontend</h3><p>Это клиентская часть, которая работает в браузере. Технологии: HTML, CSS, JavaScript.</p><h3>Backend</h3><p>Это серверная часть, которая обрабатывает данные. Технологии: Node.js, Python, PHP, базы данных.</p>', 'text', 1),
(2, 'Основы HTML', '<p>HTML (HyperText Markup Language) — это язык разметки веб-страниц.</p><h3>Основные теги:</h3><ul><li><code>&lt;h1&gt;</code> — заголовок первого уровня</li><li><code>&lt;p&gt;</code> — параграф текста</li><li><code>&lt;a href="..."&gt;</code> — ссылка</li><li><code>&lt;img src="..."&gt;</code> — изображение</li></ul>', 'text', 2),
(2, 'Видео: Создание первой страницы', 'На этом видео мы создадим простую HTML-страницу с нуля.', 'video', 3),
(2, 'Схема: Архитектура веб-приложения', 'Интерактивная схема показывает взаимодействие между браузером, сервером и базой данных.', 'diagram', 4);

-- Pages for course 3: Архитектура веб-приложений
INSERT OR IGNORE INTO course_pages (course_id, title, content, page_type, page_order) VALUES
(3, 'Клиент-серверная архитектура', '<p>Современные веб-приложения построены по клиент-серверной архитектуре.</p><h3>Клиент (Browser)</h3><p>Отправляет HTTP-запросы на сервер и отображает полученные данные.</p><h3>Сервер (Backend)</h3><p>Обрабатывает запросы, работает с базой данных и возвращает ответы.</p>', 'text', 1),
(3, 'Протокол HTTP', '<p>HTTP (HyperText Transfer Protocol) — это протокол передачи данных между клиентом и сервером.</p><h3>Основные методы:</h3><ul><li><strong>GET</strong> — получение данных</li><li><strong>POST</strong> — создание данных</li><li><strong>PUT/PATCH</strong> — обновление данных</li><li><strong>DELETE</strong> — удаление данных</li></ul>', 'text', 2),
(3, 'Видео: Как работает HTTP', 'Видеоурок о том, как браузеры и серверы общаются через HTTP.', 'video', 3),
(3, 'Интерактивная схема: HTTP-запрос', 'Наглядная схема процесса HTTP-запроса от клиента к серверу и обратно.', 'diagram', 4);