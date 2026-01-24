// Валидация ID
function validateId(req, res, next) {
  const id = parseInt(req.params.id);
  if (isNaN(id) || id <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Некорректный ID'
    });
  }
  next();
}

// Валидация email
function validateEmail(email) {
  if (typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Check basic email format first
  if (!emailRegex.test(email)) return false;

  // List of valid email domains
  const validDomains = [
    'gmail.com',
    'yahoo.com',
    'hotmail.com',
    'outlook.com',
    'mail.ru',
    'yandex.ru',
    'rambler.ru',
    'bk.ru',
    'list.ru',
    'inbox.ru',
    'qq.com',
    '163.com',
    '126.com',
    'sina.com',
    'sohu.com',
    'aol.com',
    'icloud.com',
    'protonmail.com',
    'zoho.com',
    'gmx.com',
    'web.de',
    't-online.de',
    'orange.fr',
    'free.fr',
    'sfr.fr',
    'laposte.net',
    'wanadoo.fr',
    'neuf.fr',
    'comcast.net',
    'verizon.net',
    'att.net',
    'cox.net',
    'charter.net',
    'me.com',
    'mac.com',
    'live.com',
    'msn.com',
    'hotmail.co.uk',
    'yahoo.co.uk',
    'btinternet.com',
    'sky.com',
    'virginmedia.com',
    'talktalk.net',
    'ntlworld.com',
    'aol.co.uk',
    'tiscali.co.uk',
    'blueyonder.co.uk',
    'freeserve.co.uk',
    'ntlworld.com',
    'o2.pl',
    'interia.pl',
    'wp.pl',
    'onet.pl',
    'gazeta.pl',
    'op.pl',
    'poczta.onet.pl',
    'student.edu', // Educational domains
    'alum.edu',
    'edu.ru',
    'edu.ua',
    'edu.kz',
    'edu.by'
  ];

  // Extract domain from email
  const domain = email.split('@')[1].toLowerCase();

  // Check if the domain is in the list of valid domains
  return validDomains.includes(domain);
}

// Валидация пароля
function validatePassword(password) {
  if (typeof password !== 'string') return false;
  return password.length >= 4;
}

// Валидация имени
function validateName(name) {
  if (typeof name !== 'string') return false;
  return name.length >= 1 && name.length <= 100;
}

// Валидация даты рождения
function validateBirthDate(birthDate) {
  if (typeof birthDate !== 'string') return false;

  const date = new Date(birthDate);
  if (isNaN(date.getTime())) return false; // Проверяем, что это валидная дата

  const today = new Date();
  const age = today.getFullYear() - date.getFullYear();
  const monthDiff = today.getMonth() - date.getMonth();

  // Корректируем возраст, если день рождения в этом году еще не наступил
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
    return age - 1 >= 16;
  }

  return age >= 16;
}

// Альтернативная функция проверки возраста
function validateAge(birthDate) {
  if (typeof birthDate !== 'string') return false;

  const date = new Date(birthDate);
  if (isNaN(date.getTime())) return false;

  const today = new Date();
  const age = today.getFullYear() - date.getFullYear();
  const monthDiff = today.getMonth() - date.getMonth();

  // Корректируем возраст, если день рождения в этом году еще не наступил
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
    return age - 1 >= 16;
  }

  return age >= 16;
}

module.exports = {
  validateId,
  validateEmail,
  validatePassword,
  validateName,
  validateBirthDate,
  validateAge
};