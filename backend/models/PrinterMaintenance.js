const mongoose = require('mongoose');

const PrinterMaintenanceSchema = new mongoose.Schema({
  type: { type: String, required: true },
  description: { type: String, required: true },
  performedBy: { type: String, default: '' },
  performedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('PrinterMaintenance', PrinterMaintenanceSchema);
