const mongoose = require('mongoose');

const OrderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  name: { type: String, required: true },
  creator: { type: String, default: '' },
  quantity: { type: Number, required: true, min: 1 },
  color: { type: String, default: '' },
  price: { type: Number, required: true }
}, { _id: false });

const ShippingAddressSchema = new mongoose.Schema({
  name: String,
  phone: String,
  address1: String,
  address2: String,
  city: String,
  province: String,
  postalCode: String,
  country: { type: String, default: 'Canada' }
}, { _id: false });

const OrderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  contactEmail: { type: String, default: '' },
  items: { type: [OrderItemSchema], required: true },
  total: { type: Number, required: true },
  status: {
    type: String,
    enum: ['Pending', 'Processing', 'Ready for Pickup', 'Shipped', 'Delivered', 'Cancelled'],
    default: 'Pending'
  },
  shippingAddress: { type: ShippingAddressSchema, default: {} },
  paymentMethod: { type: String, default: 'Cash' },
  notes: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Order', OrderSchema);
