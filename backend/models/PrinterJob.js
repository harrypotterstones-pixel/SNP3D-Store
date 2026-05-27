const mongoose = require('mongoose');

const PrinterJobSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  productName: { type: String, required: true },
  quantity: { type: Number, default: 1 },
  color: { type: String, default: '' },
  estimatedTime: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['queued', 'printing', 'completed', 'failed', 'cancelled'],
    default: 'queued'
  },
  notes: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('PrinterJob', PrinterJobSchema);
