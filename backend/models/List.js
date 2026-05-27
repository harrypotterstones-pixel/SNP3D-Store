const mongoose = require('mongoose');

const ListItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  notes: { type: String, default: '' },
  addedAt: { type: Date, default: Date.now }
}, { _id: false });

const ListSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  isPublic: { type: Boolean, default: false },
  items: { type: [ListItemSchema], default: [] }
}, { timestamps: true });

module.exports = mongoose.model('List', ListSchema);
