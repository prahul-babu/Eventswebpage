const express = require('express');
const router = express.Router();
const {
  getPublicEvents,
  getEventById,
  checkVenueConflict,
  createEvent,
  updateEvent,
  deleteEvent,
  reviewEvent,
  getFacultyEvents
} = require('../controllers/eventController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/', getPublicEvents);
router.post('/check-conflict', checkVenueConflict);
router.get('/faculty/my-events', protect, authorize('faculty', 'admin'), getFacultyEvents);
router.get('/:id', getEventById);
router.post('/', protect, authorize('faculty', 'admin'), createEvent);
router.put('/:id', protect, authorize('faculty', 'admin'), updateEvent);
router.delete('/:id', protect, authorize('faculty', 'admin'), deleteEvent);
router.post('/:id/review', protect, authorize('admin'), reviewEvent);

module.exports = router;
