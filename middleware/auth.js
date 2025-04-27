const Event = require('../models/event');
const Participant = require('../models/participant');

module.exports = {
    isNotLoggedIn: (req, res, next) => {
      if (!req.isAuthenticated()) {
        return next();
      }
      res.redirect('/app');
    },
    isLoggedIn: (req, res, next) => {
      if (req.isAuthenticated()) {
        return next();
      }
      req.flash('error', 'Пожалуйста, войдите в систему');
      res.redirect('/auth/login');
    },
    
    isEventOrganizer: async (req, res, next) => {
      try {
        const event = await Event.findById(req.params.id);
        
        if (!event) {
          req.flash('error', 'Мероприятие не найдено');
          return res.redirect('/events');
        }
        
        if (event.organizer.toString() !== req.user._id.toString()) {
          req.flash('error', 'У вас нет прав для этого действия');
          return res.redirect(`/events/${event._id}`);
        }
        
        next();
      } catch (err) {
        console.error(err);
        req.flash('error', 'Ошибка сервера');
        res.redirect('/events');
      }
    },
    
    isParticipant: async (req, res, next) => {
      try {
        const participant = await Participant.findOne({
          event: req.params.id,
          user: req.user._id
        });
    
        if (!participant) {
          req.flash('error', 'Вы не являетесь участником этого мероприятия');
          return res.redirect(`/events/${req.params.id}`);
        }
    
        req.participant = participant;
        next();
      } catch (err) {
        console.error(err);
        req.flash('error', 'Ошибка проверки участника');
        res.redirect(`/events/${req.params.id}`);
      }
    }
};