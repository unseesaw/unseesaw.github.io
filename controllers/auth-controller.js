const User = require('../models/user');
const AppError = require('../utils/app-error');
const catchAsync = require('../utils/catch-async');

// Регистрация
exports.signup = catchAsync(async (req, res, next) => {
  console.log('Received data:', req.body);
  const { username, password, confirmPassword } = req.body;
  
  // 1) Проверка совпадения паролей
  if (password !== confirmPassword) {
    return next(new AppError('Пароли не совпадают', 400));
  }

  // 2) Создание пользователя
  const newUser = await User.create({
    username,
    password
  });

  // 3) Автоматический вход после регистрации
  req.login(newUser, err => {
    if (err) return next(err);
    res.redirect('/app');
  });
});

// Вход
exports.login = catchAsync(async (req, res, next) => {
    res.redirect('/app');
});

// Выход
exports.logout = (req, res) => {
  req.logout();
  res.redirect('/login');
};