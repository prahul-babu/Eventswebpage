const Registration = require('../models/Registration');
const Event = require('../models/Event');

// @desc Register student for an event
// @route POST /api/registrations
exports.registerForEvent = async (req, res) => {
  try {
    const { eventId, studentDetails } = req.body;
    const studentId = req.user ? req.user._id : null;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (event.currentParticipantsCount >= event.maxParticipants) {
      return res.status(400).json({ message: 'Event registration is full' });
    }

    // Check existing registration
    if (studentId) {
      const existing = await Registration.findOne({ studentId, eventId });
      if (existing) {
        return res.status(400).json({ message: 'You are already registered for this event' });
      }
    }

    const reg = await Registration.create({
      studentId: studentId || event.createdBy,
      eventId,
      studentDetails: studentDetails || {
        name: req.user ? req.user.name : 'Guest Student',
        email: req.user ? req.user.email : 'student@apollo.edu.in',
        studentCode: req.user ? req.user.studentId : 'APU2026-001',
        school: req.user ? req.user.school : 'School of Technology',
        department: req.user ? req.user.department : 'Computer Science',
        year: '3rd Year'
      }
    });

    // Increment current count
    event.currentParticipantsCount = (event.currentParticipantsCount || 0) + 1;
    await event.save();

    res.status(201).json({ message: 'Successfully registered for event', registration: reg });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Get event attendees (Faculty/Admin)
// @route GET /api/registrations/event/:eventId
exports.getEventRegistrations = async (req, res) => {
  try {
    const registrations = await Registration.find({ eventId: req.params.eventId })
      .populate('studentId', 'name email studentId school department')
      .sort({ createdAt: -1 });

    res.json(registrations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Export Attendees CSV
// @route GET /api/registrations/event/:eventId/export
exports.exportRegistrationsCSV = async (req, res) => {
  try {
    const registrations = await Registration.find({ eventId: req.params.eventId })
      .populate('studentId', 'name email studentId school department');

    let csv = 'Registration ID,Name,Email,Student ID,School,Department,Registered At\n';
    registrations.forEach(reg => {
      const name = reg.studentDetails?.name || reg.studentId?.name || 'N/A';
      const email = reg.studentDetails?.email || reg.studentId?.email || 'N/A';
      const code = reg.studentDetails?.studentCode || reg.studentId?.studentId || 'N/A';
      const school = reg.studentDetails?.school || reg.studentId?.school || 'N/A';
      const dept = reg.studentDetails?.department || reg.studentId?.department || 'N/A';
      const date = new Date(reg.createdAt).toISOString();

      csv += `"${reg._id}","${name}","${email}","${code}","${school}","${dept}","${date}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=event_attendees_${req.params.eventId}.csv`);
    res.status(200).send(csv);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
