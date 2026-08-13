const mongoose = require('mongoose');

const scheduleItemSchema = new mongoose.Schema({
  time: String,
  title: String,
  speaker: String,
  description: String
});

const speakerSchema = new mongoose.Schema({
  name: String,
  designation: String,
  organization: String,
  photo: String,
  bio: String
});

const prizeSchema = new mongoose.Schema({
  rank: String,
  amount: String,
  description: String
});

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Event title is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Event description is required']
  },
  eventType: {
    type: String,
    required: [true, 'Event type is required'],
    default: 'Workshop'
  },
  school: {
    type: String,
    required: [true, 'School is required']
  },
  department: {
    type: String,
    default: ''
  },
  poster: {
    type: String,
    default: '/assets/poster_ai_ml.jpg'
  },
  startDate: {
    type: String,
    required: [true, 'Start date is required'] // YYYY-MM-DD
  },
  endDate: {
    type: String,
    required: [true, 'End date is required'] // YYYY-MM-DD
  },
  startTime: {
    type: String,
    required: [true, 'Start time is required'] // HH:mm format
  },
  endTime: {
    type: String,
    required: [true, 'End time is required'] // HH:mm format
  },
  venue: {
    type: String,
    required: [true, 'Venue is required']
  },
  building: {
    type: String,
    default: 'Main Academic Block'
  },
  room: {
    type: String,
    default: ''
  },
  mapUrl: {
    type: String,
    default: 'https://maps.google.com/?q=The+Apollo+University'
  },
  mode: {
    type: String,
    enum: ['Offline', 'Online', 'Hybrid'],
    default: 'Offline'
  },
  registrationRequired: {
    type: Boolean,
    default: true
  },
  registrationType: {
    type: String,
    enum: ['External', 'Internal'],
    default: 'External'
  },
  registrationUrl: {
    type: String,
    default: 'https://forms.google.com'
  },
  registrationDeadline: {
    type: String,
    default: ''
  },
  maxParticipants: {
    type: Number,
    default: 100
  },
  currentParticipantsCount: {
    type: Number,
    default: 0
  },
  eligibility: {
    programs: [String],
    schools: [String],
    years: [String],
    ugPg: {
      type: String,
      enum: ['All', 'UG Only', 'PG Only', 'Faculty Only'],
      default: 'All'
    },
    facultyAllowed: {
      type: Boolean,
      default: true
    },
    externalAllowed: {
      type: Boolean,
      default: false
    }
  },
  organizer: {
    school: String,
    department: String,
    coordinatorName: String,
    email: String,
    phone: String
  },
  schedule: [scheduleItemSchema],
  speakers: [speakerSchema],
  prizes: [prizeSchema],
  brochureUrl: {
    type: String,
    default: ''
  },
  rulesUrl: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['DRAFT', 'PENDING_APPROVAL', 'PUBLISHED', 'REJECTED', 'CHANGES_REQUESTED', 'CANCELLED'],
    default: 'PENDING_APPROVAL'
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  approvalComment: {
    type: String,
    default: ''
  },
  cancellationReason: {
    type: String,
    default: ''
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Event', eventSchema);
