const express = require('express');
const router = express.Router();
const Event = require('../models/event');
const { isLoggedIn } = require('../middleware/auth');

// Список мероприятий
router.get('/app', isLoggedIn, async (req, res) => {
  try {
    const events = await Event.find({});
    res.render('events/index', {
      title: 'Мои мероприятия',
      user: req.user,
      events
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
    messages: req.flash()
  });
});

// Создание мероприятия
router.post('/app', isLoggedIn, async (req, res) => {
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
    
    const eventData = {
      title,
      description,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      startTime,
      endTime,
      format,
      organizer: req.user._id,
      maxParticipants: maxParticipants || null,
      status: 'upcoming'
    };

    if (format === 'online') {
      eventData.onlineLink = onlineLink;
    } else {
      eventData.location = location;
    }

    const newEvent = new Event(eventData);
    await newEvent.save();

    for (const event of events) {
      const newStatus = event.calculateStatus();
      if (event.status !== newStatus) {
        event.status = newStatus;
        await event.save();
      }
    }

    req.flash('success', 'Мероприятие создано!');
    res.redirect(`/events/show/${newEvent._id}`);
  } catch (err) {
    console.error(err);
    req.flash('error', 'Ошибка при создании мероприятия');
    res.redirect('/events/new');
  }
});

// Просмотр мероприятия
router.get('/show/:id', isLoggedIn, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('organizer', 'username')
      .populate('participants', 'username');

    if (!event) {
      req.flash('error', 'Мероприятие не найдено');
      return res.redirect('/events');
    }

    res.render('events/show', {
      title: event.title,
      event,
      user: req.user
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Ошибка при загрузке мероприятия');
    res.redirect('/events');
  }
});

// Форма редактирования
router.get('/:id/edit', isLoggedIn, async (req, res) => {
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
router.post('/:id/register', isLoggedIn, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    
    // Проверка ограничения участников
    if (event.maxParticipants && event.participants.length >= event.maxParticipants) {
      return res.status(400).json({ message: 'Достигнуто максимальное количество участников' });
    }

    // Проверка, не зарегистрирован ли уже пользователь
    if (event.participants.some(p => p.equals(req.user._id))) {
      return res.status(400).json({ message: 'Вы уже зарегистрированы на это мероприятие' });
    }

    // Создаем запись участника
    const participant = new Participant({
      name: req.body.name,
      phone: req.body.phone,
      event: event._id,
      user: req.user._id
    });
    await participant.save();
    
    // Добавляем пользователя в список участников мероприятия
    event.participants.push(req.user._id);
    await event.save();

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка при регистрации' });
  }
});

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
router.put('/:id', isLoggedIn, async (req, res) => {
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
    res.redirect(`/events/show/${event._id}`);
  } catch (err) {
    console.error(err);
    req.flash('error', 'Ошибка при обновлении мероприятия');
    res.redirect(`/events/${req.params.id}/edit`);
  }
});

// Удаление мероприятия
router.delete('/:id', isLoggedIn, async (req, res) => {
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