const express = require('express');
const router = express.Router();
const Event = require('../models/event');
const Participant = require('../models/participant');
const { isLoggedIn, isEventOrganizer, isParticipant } = require('../middleware/auth');
const catchAsync = require('../utils/catch-async');

// Главная страница
router.get('/', isLoggedIn, async(req, res) => {
  try {
    const events = await Event.find({ organizer: req.user._id })
      .populate({
        path: 'participants.user',
        select: 'username' // Загружаем только нужные поля
      })
      .sort({ createdAt: -1 });
    
    res.render('events/index', {
      title: 'Мои мероприятия',
      user: req.user,
      events: events,
      messages: {
        error: req.flash('error'),
        success: req.flash('success')
      }
    });
  } catch (err) {
    console.error('Ошибка загрузки мероприятий:', err);
    req.flash('error', 'Ошибка при загрузке мероприятий');
    res.redirect('/app');
  }
});

// Форма создания
router.get('/new', isLoggedIn, (req, res) => {
  res.render('events/new', {
    title: 'Новое мероприятие',
    user: req.user,
    messages: {
      error: req.flash('error')
    }
  });
});

// Создание мероприятия
router.post('/', isLoggedIn, async (req, res) => {
  try {
    const { 
      title, 
      description, 
      startDate, 
      endDate, 
      startTime, 
      endTime, 
      format, 
      onlineLink, 
      location, 
      maxParticipants 
    } = req.body;
    
    const newEvent = await Event.create({
      title,
      description,
      startDate,
      endDate,
      startTime,
      endTime,
      format,
      onlineLink: format === 'online' ? onlineLink : undefined,
      location: format === 'offline' ? location : undefined,
      maxParticipants: maxParticipants || undefined,
      organizer: req.user._id
  });

    req.flash('success', 'Мероприятие создано!');
    res.redirect(`/events/${newEvent._id}`);
  } catch (err) {
    console.error(err);
    req.flash('error', 'Ошибка при создании мероприятия');
    res.redirect('/events/new');
  }
});

// Просмотр мероприятия
router.get('/:id', isLoggedIn, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('organizer', 'username')
      .populate('participants.user', 'username');
    
    if (!event) {
      req.flash('error', 'Мероприятие не найдено');
      return res.redirect('/events');
    }
    
    res.render('events/show', { 
      title: event.title,
      event,
      user: req.user,
      messages: {
        error: req.flash('error'),
        success: req.flash('success')
      }
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Ошибка при загрузке мероприятия');
    res.redirect('/events');
  }
});

// Форма редактирования
router.get('/:id/edit', isLoggedIn, isEventOrganizer, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      req.flash('error', 'Мероприятие не найдено');
      return res.redirect('/events');
    }

    if (event.organizer.toString() !== req.user._id.toString()) {
      req.flash('error', 'Нет прав для редактирования');
      return res.redirect('/events');
    }

    // Добавляем проверку на существование дат
    if (!event.startDate) event.startDate = new Date();
    if (!event.endDate) event.endDate = new Date();

    res.render('events/edit', {
      title: 'Редактировать',
      event,
      user: req.user,
      messages: { error: req.flash('error'), success: req.flash('success') }
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Ошибка при загрузке формы');
    res.redirect('/events');
  }
});

// Регистрация на мероприятие
router.post('/:id/register', isLoggedIn, catchAsync(async (req, res) => {
  const event = await Event.findById(req.params.id);
  
  // Проверка статуса события
  if (event.status === 'completed') {
    return res.status(400).json({ message: 'Нельзя зарегистрироваться на завершенное мероприятие' });
  }

  // Проверка максимального количества участников
  if (event.maxParticipants && event.participants.length >= event.maxParticipants) {
    return res.status(400).json({ message: 'Достигнуто максимальное количество участников' });
  }

  // Проверка, не зарегистрирован ли уже
  const isParticipant = event.participants.some(p => 
    p.user && p.user.toString() === req.user._id.toString()
  );
  if (isParticipant) {
    return res.status(400).json({ message: 'Вы уже зарегистрированы на это мероприятие' });
  }

  // Добавление участника к мероприятию
  event.participants.push({
    user: req.user._id,
    name: req.body.name || req.user.username,
    phone: req.body.phone || 'Не указан' // Значение по умолчанию для телефона
  });
  
  await event.save();

  // Создание записи участника
  if (Participant) {
    await Participant.create({
      user: req.user._id,
      event: event._id,
      name: req.body.name || req.user.username,
      phone: req.body.phone || 'Не указан'
    });
  }

  res.json({ success: true });
}));

// Отписка от мероприятия
router.post('/:id/unregister', isLoggedIn, catchAsync(async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      req.flash('error', 'Мероприятие не найдено');
      return res.redirect('/app');
    }

    // Удаляем участника из мероприятия
    event.participants = event.participants.filter(
      p => p.user.toString() !== req.user._id.toString()
    );
    await event.save();

    // Удаляем запись участника (если используете отдельную коллекцию)
    if (Participant) {
      await Participant.deleteOne({
        event: req.params.id,
        user: req.user._id
      });
    }

    req.flash('success', 'Вы успешно отписались от мероприятия');
    res.redirect('/app');
  } catch (err) {
    console.error('Ошибка при отписке:', err);
    req.flash('error', 'Ошибка при отписке от мероприятия');
    res.redirect('/app');
  }
}));

// Публикация мероприятия
router.post('/:id/publish', isLoggedIn, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    
    if (event.organizer.toString() !== req.user._id.toString()) {
      req.flash('error', 'Нет прав для публикации');
      return res.redirect('/events');
    }

    event.isPublished = true;
    await event.save();

    req.flash('success', 'Мероприятие опубликовано!');
    res.redirect(`/events/${event._id}`);
  } catch (err) {
    console.error(err);
    req.flash('error', 'Ошибка при публикации');
    res.redirect(`/events/${req.params.id}`);
  }
});

// Изменение статуса
router.post('/:id/status', isLoggedIn, async (req, res) => {
  try {
    const { status } = req.body;
    const event = await Event.findById(req.params.id);
    
    if (event.organizer.toString() !== req.user._id.toString()) {
      req.flash('error', 'Нет прав для изменения статуса');
      return res.redirect('/events');
    }

    event.status = status;
    await event.save();

    req.flash('success', 'Статус мероприятия обновлен!');
    res.redirect(`/events/${event._id}`);
  } catch (err) {
    console.error(err);
    req.flash('error', 'Ошибка при изменении статуса');
    res.redirect(`/events/${req.params.id}`);
  }
});

// Обновление мероприятия
router.put('/:id', isLoggedIn, isEventOrganizer, async (req, res) => {
  try {
    const { title, description, startDate, endDate, startTime, endTime, location, format, onlineLink, maxParticipants } = req.body;
    
    const updateData = {
      title,
      description,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      startTime,
      endTime,
      format,
      maxParticipants: maxParticipants || null,
      location: format === 'offline' ? location : null,
      onlineLink: format === 'online' ? onlineLink : null
    };

    const event = await Event.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!event) {
      req.flash('error', 'Мероприятие не найдено');
      return res.redirect('/events');
    }
    
    req.flash('success', 'Мероприятие успешно обновлено!');
    res.redirect(`/events/${event._id}`);
  } catch (err) {
    console.error(err);
    req.flash('error', 'Ошибка при обновлении мероприятия');
    res.redirect(`/events/${req.params.id}/edit`);
  }
});

// Удаление мероприятия
router.delete('/:id', isLoggedIn, isEventOrganizer, async (req, res) => {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);

    if (!event) {
      req.flash('error', 'Мероприятие не найдено');
      return res.redirect('/events');
    }

    req.flash('success', 'Мероприятие успешно удалено');
    res.redirect('/events');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Ошибка при удалении мероприятия');
    res.redirect(`/events/${req.params.id}`);
  }
});

module.exports = router;