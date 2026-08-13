const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getAllEventsAdmin,
  getUsers,
  createUser,
  toggleUserStatus,
  getCategories,
  createCategory,
  getSchools,
  getAuditLogs
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);
router.use(authorize('admin'));

router.get('/dashboard', getDashboardStats);
router.get('/events', getAllEventsAdmin);
router.get('/users', getUsers);
router.post('/users', createUser);
router.put('/users/:id/status', toggleUserStatus);
router.get('/categories', getCategories);
router.post('/categories', createCategory);
router.get('/schools', getSchools);
router.get('/audit-logs', getAuditLogs);

module.exports = router;
