const mongoose = require('mongoose');

const AnalyticsEventSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  eventType: { type: String, required: true },
  eventData: { type: mongoose.Schema.Types.Mixed, default: {} },
  page: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('AnalyticsEvent', AnalyticsEventSchema);
