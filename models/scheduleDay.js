const mongoose = require('mongoose');

const scheduleDaySchema = new mongoose.Schema({
  scheduleId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Schedule', 
    required: true 
  },
  date: {
    type: Date,
    required: true
  },
  isWorkingDay: {
    type: Boolean,
    required: true
  },
  staffId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User'
  }
});

module.exports = mongoose.model('ScheduleDay', scheduleDaySchema);