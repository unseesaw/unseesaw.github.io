const express = require('express');
const router = express.Router();
const passport = require('passport');
const bcrypt = require('bcryptjs');
const { isNotLoggedIn, isLoggedIn } = require('../middleware/auth');
const User = require('../models/user');

// Контроллеры аутентификации
const authController = {
  // Регистрация нового пользователя
  signup: async (req, res) => {
    try {
      const { username, password, confirmPassword } = req.body;

      if (!username || !password) {
        req.flash('error', 'Имя пользователя и пароль обязательны');
        return res.redirect('/auth/register');
      }

      if (password !== confirmPassword) {
        req.flash('error', 'Пароли не совпадают');
        return res.redirect('/auth/register');
      }

      // Проверка существующего пользователя
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        req.flash('error', 'Имя пользователя уже занято');
        return res.redirect('/auth/register');
      }

      // Создание пользователя
      const newUser = new User({
        username,
        password,
        createdAt: new Date()
      });

      await newUser.save();

      // Автоматический вход
      req.login(newUser, (err) => {
        if (err) {
          console.error('Ошибка автоматического входа:', err);
          return res.redirect('/auth/login');
        }
        req.flash('success', 'Регистрация прошла успешно!');
        return res.redirect('/app');
      });

    } catch (err) {
      console.error('Ошибка регистрации:', err);
      req.flash('error', 'Ошибка при регистрации');
      res.redirect('/auth/register');
    }
  },

  // Обработка успешного входа
  login: (req, res) => {
    req.flash('success', `Добро пожаловать, ${req.user.username}!`);
    res.redirect('/app');
  },

  // Выход
  logout: (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error('Ошибка при выходе:', err);
        return res.redirect('/app');
      }
      req.flash('success', 'Вы успешно вышли');
      res.redirect('/');
    });
  }
};

// Страница регистрации
router.get('/register', isNotLoggedIn, (req, res) => {
  res.render('auth/register', { 
    title: 'Регистрация',
    messages: req.flash() 
  });
});

// Обработка регистрации
router.post('/register', isNotLoggedIn, async (req, res) => {
  try {
    const { username, password, confirmPassword } = req.body;

    // Валидация
    if (password !== confirmPassword) {
      req.flash('error', 'Пароли не совпадают');
      return res.redirect('/auth/register');
    }

    // Создаём пользователя с незахешированным паролем
    const newUser = new User({
      username,
      password // хеширование произойдёт в pre-save хуке
    });

    await newUser.save();
    console.log('User created:', newUser.username);

    // Автовход
    req.login(newUser, (err) => {
      if (err) {
        console.error('Auto-login error:', err);
        return res.redirect('/auth/login');
      }
      return res.redirect('/app');
    });

  } catch (err) {
    console.error('Registration error:', err);
    
    // Обработка ошибок уникальности username
    if (err.code === 11000) {
      req.flash('error', 'Имя пользователя уже занято');
    } else {
      req.flash('error', 'Ошибка при регистрации');
    }
    
    res.redirect('/auth/register');
  }
});

// Страница входа
router.get('/login', isNotLoggedIn, (req, res) => {
  res.render('auth/login', { 
    title: 'Вход',
    messages: req.flash() 
  });
});

// Обработка входа
router.post('/login', isNotLoggedIn, 
  passport.authenticate('local', {
    failureRedirect: '/auth/login',
    failureFlash: 'Неверные учетные данные'
  }),
  (req, res) => {
    console.log('User successfully logged in:', req.user.username); // Логирование
    req.flash('success', `Добро пожаловать, ${req.user.username}!`);
    res.redirect('/app');
  }
);

// Выход
router.get('/logout', isLoggedIn, authController.logout);

module.exports = router;