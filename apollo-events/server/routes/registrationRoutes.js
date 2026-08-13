const express = require('express');
const router = express.Router();
const {
  registerForEvent,
  getEventRegistrations,
  exportRegistrationsCSV
} = require('../controllers/registrationController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.post('/', registerForEvent);
router.get('/event/:eventId', protect, authorize('faculty', 'admin'), getEventRegistrations);
router.get('/event/:eventId/export', protect, authorize('faculty', 'admin'), exportRegistrationsCSV);

module.exports = router;
