const Event = require('../models/Event');
const AuditLog = require('../models/AuditLog');

// Helper to determine status dynamically based on dates
const computeEventStatus = (event) => {
  if (event.status === 'CANCELLED') return 'CANCELLED';
  if (event.status === 'REJECTED') return 'REJECTED';
  if (event.status === 'CHANGES_REQUESTED') return 'CHANGES_REQUESTED';
  if (event.status === 'DRAFT') return 'DRAFT';
  if (event.status === 'PENDING_APPROVAL') return 'PENDING_APPROVAL';

  // For PUBLISHED events, calculate UPCOMING / ONGOING / COMPLETED based on current time
  const now = new Date();
  
  // Format string: YYYY-MM-DD and HH:mm
  const startStr = `${event.startDate}T${event.startTime || '00:00'}:00`;
  const endStr = `${event.endDate || event.startDate}T${event.endTime || '23:59'}:00`;

  const startDateTime = new Date(startStr);
  const endDateTime = new Date(endStr);

  if (now < startDateTime) {
    return 'UPCOMING';
  } else if (now >= startDateTime && now <= endDateTime) {
    return 'ONGOING';
  } else {
    return 'COMPLETED';
  }
};

// @desc Get public events with filter, search, & pagination
// @route GET /api/events
exports.getPublicEvents = async (req, res) => {
  try {
    const { 
      search, eventType, school, dateFilter, mode, statusFilter, 
      featured, limit = 50, page = 1 
    } = req.query;

    let query = {};

    // For non-authenticated or student requests, show only PUBLISHED or CANCELLED events
    query.status = { $in: ['PUBLISHED', 'CANCELLED'] };

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { school: { $regex: search, $options: 'i' } },
        { department: { $regex: search, $options: 'i' } },
        { venue: { $regex: search, $options: 'i' } },
        { 'organizer.coordinatorName': { $regex: search, $options: 'i' } }
      ];
    }

    if (eventType && eventType !== 'All') {
      query.eventType = eventType;
    }

    if (school && school !== 'All') {
      query.school = school;
    }

    if (mode && mode !== 'All') {
      query.mode = mode;
    }

    if (featured === 'true') {
      query.isFeatured = true;
    }

    // Date range filter
    const todayStr = new Date().toISOString().split('T')[0];
    if (dateFilter === 'Today') {
      query.startDate = todayStr;
    } else if (dateFilter === 'Tomorrow') {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      query.startDate = tomorrow.toISOString().split('T')[0];
    } else if (dateFilter === 'This Week') {
      const weekEnd = new Date();
      weekEnd.setDate(weekEnd.getDate() + 7);
      query.startDate = { $gte: todayStr, $lte: weekEnd.toISOString().split('T')[0] };
    } else if (dateFilter === 'Upcoming') {
      query.startDate = { $gte: todayStr };
    }

    let events = await Event.find(query)
      .sort({ startDate: 1, startTime: 1 })
      .populate('createdBy', 'name email role');

    // Attach dynamic calculated status
    events = events.map(evt => {
      const computed = computeEventStatus(evt);
      const evtObj = evt.toObject();
      evtObj.computedStatus = computed;
      return evtObj;
    });

    // Apply status filter if provided (UPCOMING, ONGOING, COMPLETED)
    if (statusFilter && statusFilter !== 'All') {
      events = events.filter(e => e.computedStatus === statusFilter || e.status === statusFilter);
    }

    res.json(events);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Get single event details
// @route GET /api/events/:id
exports.getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('createdBy', 'name email role school department')
      .populate('approvedBy', 'name email');

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const eventObj = event.toObject();
    eventObj.computedStatus = computeEventStatus(event);

    res.json(eventObj);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Venue conflict check API
// @route POST /api/events/check-conflict
exports.checkVenueConflict = async (req, res) => {
  try {
    const { venue, room, startDate, endDate, startTime, endTime, excludeEventId } = req.body;

    if (!venue || !startDate || !startTime || !endTime) {
      return res.status(400).json({ message: 'Missing required schedule parameters' });
    }

    const targetEnd = endDate || startDate;

    let query = {
      venue: { $regex: new RegExp(`^${venue.trim()}$`, 'i') },
      status: { $in: ['PUBLISHED', 'PENDING_APPROVAL'] },
      $or: [
        { startDate: { $lte: targetEnd }, endDate: { $gte: startDate } }
      ]
    };

    if (room) {
      query.room = { $regex: new RegExp(`^${room.trim()}$`, 'i') };
    }

    if (excludeEventId) {
      query._id = { $ne: excludeEventId };
    }

    const existingEvents = await Event.find(query);

    // Check time slot overlap
    const conflicts = existingEvents.filter(evt => {
      // Overlap condition: start1 < end2 AND start2 < end1
      const start1 = evt.startTime;
      const end1 = evt.endTime;
      const start2 = startTime;
      const end2 = endTime;

      return (start1 < end2 && start2 < end1);
    });

    if (conflicts.length > 0) {
      const conflict = conflicts[0];
      return res.json({
        hasConflict: true,
        conflictingEvent: {
          id: conflict._id,
          title: conflict.title,
          venue: conflict.venue,
          room: conflict.room,
          startDate: conflict.startDate,
          startTime: conflict.startTime,
          endTime: conflict.endTime,
          organizer: conflict.organizer ? conflict.organizer.coordinatorName : 'Faculty',
          status: conflict.status
        }
      });
    }

    res.json({ hasConflict: false });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Create Event (Faculty / Admin)
// @route POST /api/events
exports.createEvent = async (req, res) => {
  try {
    const eventData = req.body;
    eventData.createdBy = req.user._id;

    // Default status: If Faculty, set PENDING_APPROVAL unless saved as DRAFT; if Admin, default to PUBLISHED
    if (req.user.role === 'admin') {
      eventData.status = eventData.status || 'PUBLISHED';
      eventData.approvedBy = req.user._id;
    } else {
      eventData.status = eventData.status === 'DRAFT' ? 'DRAFT' : 'PENDING_APPROVAL';
    }

    const event = await Event.create(eventData);

    await AuditLog.create({
      userName: req.user.name,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'EVENT_CREATED',
      targetType: 'EVENT',
      targetTitle: event.title,
      details: `Created event in state ${event.status}`
    });

    res.status(201).json(event);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Update Event (Faculty or Admin)
// @route PUT /api/events/:id
exports.updateEvent = async (req, res) => {
  try {
    let event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Permission check
    if (req.user.role !== 'admin' && event.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this event' });
    }

    const updateData = req.body;

    // If faculty edited after change request or rejection, re-submit to PENDING_APPROVAL
    if (req.user.role === 'faculty' && (event.status === 'CHANGES_REQUESTED' || event.status === 'REJECTED')) {
      updateData.status = 'PENDING_APPROVAL';
    }

    event = await Event.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });

    await AuditLog.create({
      userName: req.user.name,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'EVENT_UPDATED',
      targetType: 'EVENT',
      targetTitle: event.title,
      details: `Updated event details`
    });

    res.json(event);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Delete Event (Drafts or Admin)
// @route DELETE /api/events/:id
exports.deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (req.user.role !== 'admin' && event.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this event' });
    }

    await event.deleteOne();

    await AuditLog.create({
      userName: req.user.name,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'EVENT_DELETED',
      targetType: 'EVENT',
      targetTitle: event.title,
      details: `Deleted event`
    });

    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Admin Moderation Action (Approve, Reject, Request Changes, Cancel, Feature)
// @route POST /api/events/:id/review
exports.reviewEvent = async (req, res) => {
  try {
    const { action, comment, cancellationReason, isFeatured } = req.body;
    let event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (action === 'APPROVE') {
      event.status = 'PUBLISHED';
      event.approvedBy = req.user._id;
      event.approvalComment = comment || 'Approved by administrator';
    } else if (action === 'REJECT') {
      event.status = 'REJECTED';
      event.approvalComment = comment || 'Event rejected by administrator';
    } else if (action === 'REQUEST_CHANGES') {
      event.status = 'CHANGES_REQUESTED';
      event.approvalComment = comment || 'Please update event details based on feedback.';
    } else if (action === 'CANCEL') {
      event.status = 'CANCELLED';
      event.cancellationReason = cancellationReason || 'Cancelled due to administrative decision.';
    } else if (action === 'TOGGLE_FEATURED') {
      event.isFeatured = typeof isFeatured === 'boolean' ? isFeatured : !event.isFeatured;
    }

    await event.save();

    await AuditLog.create({
      userName: req.user.name,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: `EVENT_${action}`,
      targetType: 'EVENT',
      targetTitle: event.title,
      details: `Moderation action: ${action}. Note: ${comment || cancellationReason || ''}`
    });

    res.json(event);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Get My Events (Faculty Dashboard)
// @route GET /api/events/faculty/my-events
exports.getFacultyEvents = async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'faculty') {
      query.createdBy = req.user._id;
    }

    const events = await Event.find(query).sort({ createdAt: -1 });

    const processed = events.map(e => {
      const obj = e.toObject();
      obj.computedStatus = computeEventStatus(e);
      return obj;
    });

    res.json(processed);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
