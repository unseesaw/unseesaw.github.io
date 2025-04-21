const express = require('express');
const router = express.Router();
const { isLoggedIn } = require('../middleware/auth');
const Event = require('../models/event');

// Главная страница приложения
router.get('/', isLoggedIn, async (req, res) => {
  try {
    const events = await Event.find({})
      .populate('organizer', 'username')
      .populate('participants', 'username')
      .sort({ createdAt: -1 }); // Сортировка по дате создания
    
    // Обновление статусов мероприятий
    const now = new Date();
    for (const event of events) {
    const startDateTime = new Date(event.startDate);
    const [startHours, startMinutes] = event.startTime.split(':').map(Number);
    startDateTime.setHours(startHours, startMinutes, 0, 0);
  
    const endDateTime = new Date(event.endDate);
    const [endHours, endMinutes] = event.endTime.split(':').map(Number);
    endDateTime.setHours(endHours, endMinutes, 0, 0);

    let newStatus = event.status;
    if (now.getTime() > endDateTime.getTime()) {
      newStatus = 'completed';
    } else if (now.getTime() >= startDateTime.getTime() && now.getTime() <= endDateTime.getTime()) {
      newStatus = 'ongoing';
    } else {
      newStatus = 'upcoming';
    }

    if (event.status !== newStatus) {
      event.status = newStatus;
      await event.save();
    }
  }

    res.render('app/index', {
      title: 'Все мероприятия',
      user: req.user,
      events
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Ошибка при загрузке мероприятий');
    res.redirect('/auth/login');
  }
});

module.exports = router;