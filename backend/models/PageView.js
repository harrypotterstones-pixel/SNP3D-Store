const mongoose = require('mongoose');

const PageViewSchema = new mongoose.Schema({
  page: { type: String, default: '' },
  referrer: { type: String, default: '' },
  userAgent: { type: String, default: '' },
  sessionId: { type: String, default: '' }
}, { timestamps: { createdAt: 'viewedAt', updatedAt: false } });

module.exports = mongoose.model('PageView', PageViewSchema);
