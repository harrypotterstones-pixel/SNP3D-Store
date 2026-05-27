const mongoose = require('mongoose');

const ColorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  inStock: { type: Boolean, default: true },
  generated: { type: Boolean, default: false }
}, { _id: false });

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  category: { type: String, default: 'General' },
  legacyId: { type: String, unique: true, sparse: true },
  creator: { type: String, required: true, trim: true },
  emoji: { type: String, default: '' },
  creatorUrl: { type: String, default: '' },
  modelUrl: { type: String, default: '' },
  price: { type: Number, default: 0 },
  colors: { type: [ColorSchema], default: [] },
  imageUrl: { type: String, default: '' },
  attributionUrl: { type: String, default: '' },
  license: { type: String, default: 'Creative Commons Attribution' },
  tags: { type: [String], default: [] },
  isPublished: { type: Boolean, default: true }
}, { timestamps: true });

ProductSchema.index({ name: 'text', description: 'text', creator: 'text', category: 'text', tags: 'text' });

module.exports = mongoose.model('Product', ProductSchema);
