const User = require('./models/User');

// Тестирование функциональности базы данных
async function testDatabase() {
  console.log('Тестируем подключение к базе данных...');
  
  try {
    // Попробуем создать тестового пользователя с уникальным email
    const timestamp = Date.now();
    const testUser = await User.create({
      name: `Test User ${timestamp}`,
      email: `test${timestamp}@example.com`,
      password: 'password123',
      birthDate: '1990-01-01'
    });
    
    console.log('Тестовый пользователь создан:', testUser);
    
    // Проверим валидацию пароля
    const validatedUser = await User.validatePassword(testUser.email, 'password123');
    console.log('Проверка пароля пройдена:', validatedUser ? validatedUser.name : 'null');
    
    // Найдем пользователя по ID
    const foundUser = await User.findById(testUser.id);
    console.log('Пользователь найден по ID:', foundUser ? foundUser.name : 'null');
    
    console.log('✅ Все тесты пройдены успешно!');
  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error.message);
  }
}

testDatabase();