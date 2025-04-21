require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const flash = require('connect-flash');
const path = require('path');
const methodOverride = require('method-override');

// Подключение к MongoDB
mongoose.connect('mongodb://localhost:27017/eventhub')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB error:', err));

// Модели
const User = require('./models/user');
const Event = require('./models/event');
const Participant = require('./models/participant');
const Passport = require('./config/passport');
const { isLoggedIn } = require('./middleware/auth');

// Настройка приложения
const app = express();
const PORT = 3000;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(methodOverride('_method'));
app.use(flash());

// Сессии
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// Passport
app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(
  {
    usernameField: 'username',
    passwordField: 'password'
  },
  async (username, password, done) => {
    try {
      console.log('Attempting to authenticate user:', username); // Логирование
      
      const user = await User.findOne({ username }).select('+password');
      if (!user) {
        console.log('User not found:', username);
        return done(null, false, { message: 'Неверное имя пользователя' });
      }

      console.log('Found user:', user.username); // Логирование
      
      const isMatch = await user.correctPassword(password);
      if (!isMatch) {
        console.log('Password mismatch for user:', username);
        return done(null, false, { message: 'Неверный пароль' });
      }

      console.log('Authentication successful for:', username); // Логирование
      return done(null, user);
    } catch (err) {
      console.error('Authentication error:', err); // Логирование
      return done(err);
    }
  }
));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

// Шаблонизатор
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

// Маршруты
const indexRoutes = require('./routes/index');
const authRoutes = require('./routes/auth');
const eventRoutes = require('./routes/events');
const participantRoutes = require('./routes/participants');
const appRoutes = require('./routes/app');

app.use('/', indexRoutes);
app.use('/auth', authRoutes);
app.use('/events', eventRoutes);
app.use('/participants', participantRoutes);
app.use('/app', appRoutes);

// Обработка 404
app.use((req, res, next) => {
  res.status(404).render('404', {
      title: 'Страница не найдена'
  });
});

// Обработка ошибок
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send(`Ошибка: ${err.message}`);
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});