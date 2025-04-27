const express = require('express');
const router = express.Router();

// Замените это на реальные данные из вашей БД или временные мок-данные
const mockEvents = [
  {
    id: 1,
    title: "Концерт популярной группы",
    date: "15 мая 2023",
    location: "Москва, Крокус Сити Холл",
    description: "Незабываемый вечер с лучшими хитами",
    price: "от 2000 ₽",
  },
  {
    id: 2,
    title: "Технологическая конференция",
    date: "20 июня 2023",
    location: "Санкт-Петербург, Экспофорум",
    description: "Последние тенденции в IT-индустрии",
    price: "Бесплатно",
  },
  {
    id: 3,
    title: "Выставка современного искусства",
    date: "10 июля 2023",
    location: "Казань, Галерея современного искусства",
    description: "Работы молодых художников",
    price: "500 ₽",
  }
];

router.get('/', (req, res) => {
  res.render('index', { 
    title: 'EventHub',
    events: mockEvents
  });
});

module.exports = router;