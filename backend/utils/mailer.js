const nodemailer = require('nodemailer');

// Конфигурация SMTP из переменных окружения
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT) || 587;
const SMTP_SECURE = process.env.SMTP_SECURE === 'true';
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASSWORD = process.env.SMTP_PASSWORD;
const SMTP_FROM = process.env.SMTP_FROM || 'LearnHub <noreply@learnhub.com>';

// Создаём транспорт для отправки писем
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_SECURE, // true для 465, false для других портов
  auth: SMTP_USER && SMTP_PASSWORD ? {
    user: SMTP_USER,
    pass: SMTP_PASSWORD
  } : undefined
});

// Проверяем подключение к SMTP серверу
let isConfigured = false;

async function verifyConnection() {
  if (isConfigured) return true;

  try {
    await transporter.verify();
    isConfigured = true;
    console.log('✅ SMTP подключение настроено');
    return true;
  } catch {
    console.warn('⚠️  SMTP не настроен. Email уведомления не будут отправляться.');
    console.warn('   Добавьте SMTP настройки в .env файл');
    return false;
  }
}

/**
 * Отправить email
 * @param {Object} options - Опции письма
 * @param {string} options.to - Email получателя
 * @param {string} options.subject - Тема письма
 * @param {string} options.text - Текст письма (plain text)
 * @param {string} [options.html] - HTML версия письма (опционально)
 * @returns {Promise<Object>} Результат отправки
 */
async function sendEmail({ to, subject, text, html }) {
  // Проверяем подключение
  const connected = await verifyConnection();

  if (!connected) {
    // В development режиме не выбрасываем ошибку
    if (process.env.NODE_ENV !== 'production') {
      console.log('📧 [DEV] Email не отправлен (SMTP не настроен):');
      console.log(`   To: ${to}`);
      console.log(`   Subject: ${subject}`);
      console.log(`   Text: ${text.substring(0, 100)}...`);
      return { messageId: 'dev-mode', accepted: [to] };
    }

    throw new Error('SMTP не настроен. Невозможно отправить email');
  }

  const mailOptions = {
    from: SMTP_FROM,
    to,
    subject,
    text
  };

  if (html) {
    mailOptions.html = html;
  }

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email отправлен: ${info.messageId}`);
    return info;
  } catch (err) {
    console.error('❌ Ошибка отправки email:', err.message);
    throw new Error(`Не удалось отправить email: ${err.message}`);
  }
}

/**
 * Отправить приветственное письмо после регистрации
 * @param {string} to - Email получателя
 * @param {string} name - Имя пользователя
 */
async function sendWelcomeEmail(to, name) {
  const subject = 'Добро пожаловать в LearnHub!';
  const text = `Здравствуйте, ${name}!\n\n` +
    'Спасибо за регистрацию в LearnHub!\n\n' +
    'Теперь вы можете:\n' +
    '- Изучать курсы по программированию\n' +
    '- Отслеживать свой прогресс\n' +
    '- Получать сертификаты\n\n' +
    'Начните обучение: http://localhost:3000/courses\n\n' +
    'С уважением,\nКоманда LearnHub';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #4CAF50;">Добро пожаловать в LearnHub!</h1>
      <p>Здравствуйте, <strong>${name}</strong>!</p>
      <p>Спасибо за регистрацию в нашей образовательной платформе.</p>

      <h2>Теперь вы можете:</h2>
      <ul>
        <li>Изучать курсы по программированию</li>
        <li>Отслеживать свой прогресс</li>
        <li>Получать сертификаты</li>
      </ul>

      <a href="http://localhost:3000/courses"
         style="display: inline-block; padding: 12px 24px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px; margin-top: 20px;">
        Начать обучение
      </a>

      <hr style="margin-top: 40px; border: none; border-top: 1px solid #eee;">
      <p style="color: #888; font-size: 14px;">С уважением, команда LearnHub</p>
    </div>
  `;

  return sendEmail({ to, subject, text, html });
}

/**
 * Отправить письмо для сброса пароля
 * @param {string} to - Email получателя
 * @param {string} name - Имя пользователя
 * @param {string} resetToken - Токен для сброса пароля
 */
async function sendPasswordResetEmail(to, name, resetToken) {
  const resetUrl = `http://localhost:3000/reset-password?token=${resetToken}`;
  const subject = 'Сброс пароля - LearnHub';
  const text = `Здравствуйте, ${name}!\n\n` +
    'Вы запросили сброс пароля.\n\n' +
    `Перейдите по ссылке для сброса:\n${resetUrl}\n\n` +
    'Ссылка действительна в течение 1 часа.\n\n' +
    'Если вы не запрашивали сброс, просто проигнорируйте это письмо.\n\n' +
    'С уважением,\nКоманда LearnHub';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Сброс пароля</h2>
      <p>Здравствуйте, <strong>${name}</strong>!</p>
      <p>Вы запросили сброс пароля для вашего аккаунта LearnHub.</p>

      <a href="${resetUrl}"
         style="display: inline-block; padding: 12px 24px; background-color: #2196F3; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0;">
        Сбросить пароль
      </a>

      <p style="color: #666; font-size: 14px;">
        Ссылка действительна в течение 1 часа.
      </p>
      <p style="color: #888; font-size: 14px;">
        Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо.
      </p>

      <hr style="margin-top: 40px; border: none; border-top: 1px solid #eee;">
      <p style="color: #888; font-size: 14px;">С уважением, команда LearnHub</p>
    </div>
  `;

  return sendEmail({ to, subject, text, html });
}

/**
 * Отправить уведомление о успешной записи на курс
 * @param {string} to - Email получателя
 * @param {string} name - Имя пользователя
 * @param {string} courseTitle - Название курса
 */
async function sendEnrollmentEmail(to, name, courseTitle) {
  const subject = `Вы записались на курс "${courseTitle}"`;
  const text = `Здравствуйте, ${name}!\n\n` +
    `Вы успешно записались на курс: ${courseTitle}\n\n` +
    'Перейдите к обучению: http://localhost:3000/my-courses\n\n' +
    'Удачи в обучении!\nКоманда LearnHub';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #4CAF50;">📚 Вы записались на курс!</h2>
      <p>Здравствуйте, <strong>${name}</strong>!</p>
      <p>Вы успешно записались на курс:</p>
      <p style="font-size: 18px; font-weight: bold; color: #333;">${courseTitle}</p>

      <a href="http://localhost:3000/my-courses"
         style="display: inline-block; padding: 12px 24px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px; margin-top: 20px;">
        Начать обучение
      </a>

      <hr style="margin-top: 40px; border: none; border-top: 1px solid #eee;">
      <p style="color: #888; font-size: 14px;">Удачи в обучении! Команда LearnHub</p>
    </div>
  `;

  return sendEmail({ to, subject, text, html });
}

/**
 * Отправить уведомление о завершении курса
 * @param {string} to - Email получателя
 * @param {string} name - Имя пользователя
 * @param {string} courseTitle - Название курса
 */
async function sendCourseCompletionEmail(to, name, courseTitle) {
  const subject = `Поздравляем! Вы завершили курс "${courseTitle}"`;
  const text = `Здравствуйте, ${name}!\n\n` +
    `Поздравляем! Вы успешно завершили курс: ${courseTitle}\n\n` +
    'Ваш сертификат будет доступен в личном кабинете.\n\n' +
    'Продолжайте обучение: http://localhost:3000/courses\n\n' +
    'С уважением,\nКоманда LearnHub';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #FF9800;">🎉 Поздравляем!</h1>
      <p>Здравствуйте, <strong>${name}</strong>!</p>
      <p>Вы успешно завершили курс:</p>
      <p style="font-size: 18px; font-weight: bold; color: #333;">${courseTitle}</p>

      <p>Ваш сертификат будет доступен в личном кабинете.</p>

      <a href="http://localhost:3000/courses"
         style="display: inline-block; padding: 12px 24px; background-color: #FF9800; color: white; text-decoration: none; border-radius: 4px; margin-top: 20px;">
        Продолжить обучение
      </a>

      <hr style="margin-top: 40px; border: none; border-top: 1px solid #eee;">
      <p style="color: #888; font-size: 14px;">С уважением, команда LearnHub</p>
    </div>
  `;

  return sendEmail({ to, subject, text, html });
}

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendEnrollmentEmail,
  sendCourseCompletionEmail,
  verifyConnection
};
