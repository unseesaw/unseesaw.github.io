const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  format: {
    type: String,
    enum: ['online', 'offline'],
    required: true
  },
  onlineLink: String,
  location: String,
  maxParticipants: Number,
  status: {
    type: String,
    enum: ['upcoming', 'ongoing', 'completed'],
    default: 'upcoming'
  },
  isPublished: { type: Boolean, default: false },
  organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  participants: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    registeredAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now }
});

eventSchema.methods.calculateStatus = function() {
  const now = new Date();
  
  const start = new Date(this.startDate);
  const [startH, startM] = this.startTime.split(':').map(Number);
  start.setHours(startH, startM, 0, 0);
  
  const end = new Date(this.endDate);
  const [endH, endM] = this.endTime.split(':').map(Number);
  end.setHours(endH, endM, 0, 0);

  if (now > end) return 'completed';
  if (now >= start && now <= end) return 'ongoing';
  return 'upcoming';
};

eventSchema.pre('save', function(next) {
  const now = new Date();
  const start = new Date(`${this.startDate.toISOString().split('T')[0]}T${this.startTime}`);
  const end = new Date(`${this.endDate.toISOString().split('T')[0]}T${this.endTime}`);

  if (now > end) {
    this.status = 'completed';
  } else if (now >= start && now <= end) {
    this.status = 'ongoing';
  } else {
    this.status = 'upcoming';
  }
  next();
});

module.exports = mongoose.models.Event || mongoose.model('Event', eventSchema);