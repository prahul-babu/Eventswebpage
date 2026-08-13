const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  registeredAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['REGISTERED', 'CANCELLED', 'ATTENDED'],
    default: 'REGISTERED'
  },
  studentDetails: {
    name: String,
    email: String,
    studentCode: String,
    school: String,
    department: String,
    year: String
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Registration', registrationSchema);
