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
  if (!email || typeof email !== 'string') return false;

  // Проверяем формат email регулярным выражением
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  // Проверяем длину (RFC 5321: максимум 254 символа)
  if (email.length > 254) return false;

  return emailRegex.test(email);
}

// Валидация пароля
// Требования: минимум 8 символов, буквы и цифры
function validatePassword(password) {
  if (typeof password !== 'string') return false;

  // Минимальная длина
  if (password.length < 8) return false;

  // Максимальная длина (защита от DoS при хешировании)
  if (password.length > 128) return false;

  // Должна быть хотя бы одна буква
  const hasLetter = /[a-zA-Z]/.test(password);

  // Должна быть хотя бы одна цифра
  const hasNumber = /[0-9]/.test(password);

  return hasLetter && hasNumber;
}

// Сообщение о требованиях (для UI и ошибок)
function getPasswordRequirements() {
  return 'Пароль должен содержать минимум 8 символов, включая буквы и цифры';
}

// Валидация имени
function validateName(name) {
  if (typeof name !== 'string') return false;
  return name.length >= 1 && name.length <= 100;
}

// Валидация даты рождения — ТОЛЬКО формат
function validateBirthDate(birthDate) {
  if (typeof birthDate !== 'string') return false;

  const date = new Date(birthDate);

  // Проверяем что это валидная дата
  if (isNaN(date.getTime())) return false;

  const today = new Date();

  // Дата должна быть в прошлом
  if (date > today) return false;

  // Дата не должна быть слишком старой (120 лет)
  const minDate = new Date();
  minDate.setFullYear(today.getFullYear() - 120);
  if (date < minDate) return false;

  return true;
}

// Валидация возраста — минимальный возраст
function validateAge(birthDate, minAge = 16) {
  // Сначала проверяем формат даты
  if (!validateBirthDate(birthDate)) return false;

  const date = new Date(birthDate);
  const today = new Date();

  // Вычисляем возраст
  let age = today.getFullYear() - date.getFullYear();
  const monthDiff = today.getMonth() - date.getMonth();
  const dayDiff = today.getDate() - date.getDate();

  // Корректируем если день рождения ещё не наступил в этом году
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age--;
  }

  return age >= minAge;
}

module.exports = {
  validateId,
  validateEmail,
  validatePassword,
  validateName,
  validateBirthDate,
  validateAge,
  getPasswordRequirements
};
