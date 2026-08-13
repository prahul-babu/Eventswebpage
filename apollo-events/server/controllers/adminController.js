const Event = require('../models/Event');
const User = require('../models/User');
const Registration = require('../models/Registration');
const Category = require('../models/Category');
const School = require('../models/School');
const AuditLog = require('../models/AuditLog');

// @desc Admin Dashboard summary metrics and analytics
// @route GET /api/admin/dashboard
exports.getDashboardStats = async (req, res) => {
  try {
    const totalEvents = await Event.countDocuments();
    const pendingEvents = await Event.countDocuments({ status: 'PENDING_APPROVAL' });
    const publishedEvents = await Event.countDocuments({ status: 'PUBLISHED' });
    const cancelledEvents = await Event.countDocuments({ status: 'CANCELLED' });
    
    const totalFaculty = await User.countDocuments({ role: 'faculty' });
    const totalStudents = await User.countDocuments({ role: 'student' });
    const totalRegistrations = await Registration.countDocuments();

    // Aggregations for charts
    const eventsByCategory = await Event.aggregate([
      { $group: { _id: "$eventType", count: { $sum: 1 } } }
    ]);

    const eventsBySchool = await Event.aggregate([
      { $group: { _id: "$school", count: { $sum: 1 } } }
    ]);

    // Monthly event distribution
    const eventsByMonth = [
      { month: 'Jan', count: 4 },
      { month: 'Feb', count: 7 },
      { month: 'Mar', count: 12 },
      { month: 'Apr', count: 9 },
      { month: 'May', count: 15 },
      { month: 'Jun', count: 8 },
      { month: 'Jul', count: 18 },
      { month: 'Aug', count: 24 }
    ];

    res.json({
      metrics: {
        totalEvents,
        pendingEvents,
        publishedEvents,
        cancelledEvents,
        totalFaculty,
        totalStudents,
        totalRegistrations
      },
      charts: {
        eventsByCategory: eventsByCategory.map(item => ({ category: item._id || 'Other', count: item.count })),
        eventsBySchool: eventsBySchool.map(item => ({ school: item._id ? item._id.replace('School of ', '') : 'General', count: item.count })),
        eventsByMonth
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Get all events for Admin Moderation
// @route GET /api/admin/events
exports.getAllEventsAdmin = async (req, res) => {
  try {
    const { status } = req.query;
    let query = {};
    if (status && status !== 'All') {
      query.status = status;
    }

    const events = await Event.find(query)
      .sort({ createdAt: -1 })
      .populate('createdBy', 'name email role school');

    res.json(events);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Manage Users (Faculty & Students)
// @route GET /api/admin/users
exports.getUsers = async (req, res) => {
  try {
    const { role } = req.query;
    let query = {};
    if (role && role !== 'All') {
      query.role = role;
    }

    const users = await User.find(query).sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Admin Create Faculty Account
// @route POST /api/admin/users
exports.createUser = async (req, res) => {
  try {
    const { name, email, password, role, school, department } = req.body;
    
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    const newUser = await User.create({
      name,
      email: email.toLowerCase(),
      password: password || 'faculty123',
      role: role || 'faculty',
      school: school || 'School of Technology',
      department: department || 'Computer Science'
    });

    await AuditLog.create({
      userName: req.user.name,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'USER_CREATED_BY_ADMIN',
      details: `Created user ${newUser.name} (${newUser.role})`
    });

    res.status(201).json(newUser);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Toggle User Active / Disable Status
// @route PUT /api/admin/users/:id/status
exports.toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.isActive = !user.isActive;
    await user.save();

    await AuditLog.create({
      userName: req.user.name,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'USER_STATUS_TOGGLED',
      details: `User ${user.email} is now ${user.isActive ? 'Active' : 'Disabled'}`
    });

    res.json({ message: `User status updated to ${user.isActive ? 'Active' : 'Disabled'}`, user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Get Categories
// @route GET /api/admin/categories
exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Create Category
// @route POST /api/admin/categories
exports.createCategory = async (req, res) => {
  try {
    const { name, description, iconName, color } = req.body;
    const category = await Category.create({ name, description, iconName, color });
    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Get Schools
// @route GET /api/admin/schools
exports.getSchools = async (req, res) => {
  try {
    const schools = await School.find().sort({ name: 1 });
    res.json(schools);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Get Audit Logs
// @route GET /api/admin/audit-logs
exports.getAuditLogs = async (req, res) => {
  try {
    const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(100);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
