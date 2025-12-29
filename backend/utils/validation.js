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
  return emailRegex.test(email);
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