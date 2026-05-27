const mongoose = require('mongoose');

const PrinterStatusSchema = new mongoose.Schema({
  printerName: { type: String, required: true, trim: true },
  status: {
    type: String,
    enum: ['idle', 'printing', 'paused', 'error', 'maintenance', 'offline'],
    default: 'idle'
  },
  message: { type: String, default: '' },
  isOnline: { type: Boolean, default: false },
  currentJob: { type: mongoose.Schema.Types.ObjectId, ref: 'PrinterJob', default: null },
  queueLength: { type: Number, default: 0 },
  progress: { type: Number, min: 0, max: 100, default: 0 },
  temperature: { type: Number, default: null },
  filamentRemaining: { type: Number, default: null },
  lastUpdated: { type: Date, default: Date.now }
});

module.exports = mongoose.model('PrinterStatus', PrinterStatusSchema);
