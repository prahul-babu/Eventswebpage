const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  userName: { type: String, required: true },
  userEmail: { type: String, required: true },
  userRole: { type: String, required: true },
  action: { type: String, required: true }, // e.g. "EVENT_CREATED", "EVENT_APPROVED", "USER_UPDATED"
  targetType: { type: String, default: 'EVENT' },
  targetTitle: { type: String, default: '' },
  details: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
