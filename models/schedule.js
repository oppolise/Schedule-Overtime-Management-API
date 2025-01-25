const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
  teamId: {
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Team',
    required: true 
  },
  year: {
    type: Number,
    required: true
  },
  month: {
    type: Number 
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now 
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  staffIds: [{ 
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User' 
  }]
});

module.exports = mongoose.model('Schedule', scheduleSchema);