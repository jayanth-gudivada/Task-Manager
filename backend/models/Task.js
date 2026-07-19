const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  status: {
    type: Number,
    enum: [0, 1], // 1 = Active, 0 = Completed
    default: 1,
  }
}, { timestamps: true });

module.exports = mongoose.model('Task', taskSchema);
