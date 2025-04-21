const express = require('express');
const router = express.Router();
const Participant = require('../models/participant');
const Event = require('../models/event');
const { isLoggedIn } = require('../middleware/auth');

// Регистрация участника
router.post('/:eventId', async (req, res) => {
  try {
    const { name, phone } = req.body;
    const event = await Event.findById(req.params.eventId);
    
    // Проверка ограничения участников
    if (event.maxParticipants && event.participants.length >= event.maxParticipants) {
      req.flash('error', 'Достигнуто максимальное количество участников');
      return res.redirect(`/events/${req.params.eventId}`);
    }

    const participant = new Participant({ name, phone, event: req.params.eventId });
    await participant.save();
    
    event.participants.push(participant._id);
    await event.save();

    req.flash('success', 'Вы успешно зарегистрировались!');
    res.redirect(`/events/${req.params.eventId}`);
  } catch (err) {
    console.error(err);
    req.flash('error', 'Ошибка при регистрации');
    res.redirect(`/events/${req.params.eventId}`);
  }
});

// Список участников (только для организатора)
router.get('/:eventId', isLoggedIn, async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId)
      .populate('participants');
    
    if (event.organizer.toString() !== req.user._id.toString()) {
      req.flash('error', 'Нет доступа к списку участников');
      return res.redirect('/events');
    }

    res.render('participants/list', {
      title: 'Участники мероприятия',
      event,
      participants: event.participants
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Ошибка при загрузке участников');
    res.redirect('/events');
  }
});

module.exports = router;