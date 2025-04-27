const express = require('express');
const router = express.Router();
const { isLoggedIn } = require('../middleware/auth');
const Event = require('../models/event');

// Главная страница приложения
router.get('/', isLoggedIn, async (req, res) => {
  try {
    const events = await Event.find({})
      .populate('organizer', 'username')
      .populate('participants')
      .sort({ createdAt: -1 });
    
    // Обновление статусов мероприятий
    const updatedEvents = await Promise.all(events.map(async (event) => {
      const now = new Date();
      const startDateTime = new Date(event.startDate);
      const [startHours, startMinutes] = event.startTime.split(':').map(Number);
      startDateTime.setHours(startHours, startMinutes, 0, 0);
      
      const endDateTime = new Date(event.endDate);
      const [endHours, endMinutes] = event.endTime.split(':').map(Number);
      endDateTime.setHours(endHours, endMinutes, 0, 0);

      let newStatus = event.status;
      if (now > endDateTime) {
        newStatus = 'completed';
      } else if (now >= startDateTime && now <= endDateTime) {
        newStatus = 'ongoing';
      } else {
        newStatus = 'upcoming';
      }

      if (event.status !== newStatus) {
        event.status = newStatus;
        await event.save();
      }
      return event;
    }));

    res.render('app/index', {
      title: 'Все мероприятия',
      user: req.user,
      events: updatedEvents
    });
  } catch (err) {
    console.error('Ошибка загрузки мероприятий:', err);
    req.flash('error', 'Не удалось загрузить мероприятия');
    res.redirect('/auth/login');
  }
});

module.exports = router;