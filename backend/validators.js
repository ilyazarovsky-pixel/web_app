// Функция проверки email
function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Check basic email format first
  if (!pattern.test(email)) return false;

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

// Функция проверки пароля
function isValidPassword(password) {
  if (!password || typeof password !== 'string') return false;
  return password.length >= 6;
}

// Функция проверки имени
function isValidName(name) {
  if (!name || typeof name !== 'string') return false;
  return name.trim().length >= 2;
}

module.exports = { isValidEmail, isValidPassword, isValidName };