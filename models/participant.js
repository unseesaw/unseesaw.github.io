const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  registeredAt: { type: Date, default: Date.now }
});

// Уникальный индекс, чтобы пользователь не мог зарегистрироваться дважды
participantSchema.index({ user: 1, event: 1 }, { unique: true });

module.exports = mongoose.models.participant || mongoose.model('participant', participantSchema);