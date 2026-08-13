const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/authMiddleware');
const AuditLog = require('../models/AuditLog');

const generateToken = (id) => {
  return jwt.sign({ id }, JWT_SECRET, { expiresIn: '30d' });
};

// @desc Login user (student, faculty, admin)
// @route POST /api/auth/login
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please enter email and password' });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'Account disabled. Please contact administrator.' });
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      school: user.school,
      department: user.department,
      studentId: user.studentId,
      token: generateToken(user._id)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Get current logged in user
// @route GET /api/auth/me
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Register Student or Faculty Request
// @route POST /api/auth/register
exports.registerUser = async (req, res) => {
  try {
    const { name, email, password, role, school, department, studentId } = req.body;

    const userExists = await User.findOne({ email: email.toLowerCase() });
    if (userExists) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Role restrictions: public cannot self-register as admin
    const targetRole = role === 'admin' ? 'student' : (role || 'student');

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role: targetRole,
      school: school || '',
      department: department || '',
      studentId: studentId || ''
    });

    await AuditLog.create({
      userName: user.name,
      userEmail: user.email,
      userRole: user.role,
      action: 'USER_REGISTERED',
      details: `New ${user.role} account created`
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      school: user.school,
      department: user.department,
      studentId: user.studentId,
      token: generateToken(user._id)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
