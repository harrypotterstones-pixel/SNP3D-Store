const express = require('express');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const { sendOrderConfirmationEmail, sendOrderStatusUpdateEmail } = require('../utils/email');
const { authenticateJWT, requireAdmin } = require('../utils/auth');
const socketUtils = require('../utils/socket');

const router = express.Router();

// Get user's orders
router.get('/', authenticateJWT, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNumber = Math.max(1, parseInt(page, 10));
    const pageSize = Math.max(1, parseInt(limit, 10));

    const totalItems = await Order.countDocuments({ user: req.user.userId });
    const orders = await Order.find({ user: req.user.userId })
      .sort({ createdAt: -1 })
      .skip((pageNumber - 1) * pageSize)
      .limit(pageSize)
      .lean();

    res.json({
      orders,
      pagination: {
        currentPage: pageNumber,
        totalPages: Math.ceil(totalItems / pageSize),
        totalItems,
        itemsPerPage: pageSize
      }
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Get public orders (for admin panel or local storefront review)
router.get('/public', async (req, res) => {
  try {
    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .lean();

    res.json({ orders });
  } catch (error) {
    console.error('Get public orders error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Create new public order without authentication
router.post('/public', async (req, res) => {
  try {
    const { items, shippingAddress = {}, paymentMethod = 'Cash', notes = '', contactEmail = '' } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Order must contain at least one item' });
    }

    let total = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await Product.findById(item.productId).lean();
      if (!product) {
        return res.status(400).json({ error: `Product ${item.productId} not found` });
      }

      const itemTotal = product.price * (item.quantity || 1);
      total += itemTotal;

      orderItems.push({
        product: product._id,
        name: product.name,
        creator: product.creator,
        quantity: item.quantity || 1,
        color: item.color || '',
        price: product.price
      });
    }

    const order = await Order.create({
      user: null,
      contactEmail: contactEmail || '',
      items: orderItems,
      total,
      status: 'Pending',
      shippingAddress: {
        name: shippingAddress.name || '',
        phone: shippingAddress.phone || '',
        address1: shippingAddress.address1 || '',
        address2: shippingAddress.address2 || '',
        city: shippingAddress.city || '',
        province: shippingAddress.province || '',
        postalCode: shippingAddress.postalCode || '',
        country: shippingAddress.country || 'Canada'
      },
      paymentMethod,
      notes
    });

    res.status(201).json({
      message: 'Order created successfully',
      orderId: order._id,
      total
    });
  } catch (error) {
    console.error('Create public order error:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Get all orders (admin only)
router.get('/admin/all', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50, status } = req.query;
    const pageNumber = Math.max(1, parseInt(page, 10));
    const pageSize = Math.max(1, parseInt(limit, 10));

    const filter = {};
    if (status) {
      filter.status = status;
    }

    const totalItems = await Order.countDocuments(filter);
    const orders = await Order.find(filter)
      .populate('user', 'username')
      .sort({ createdAt: -1 })
      .skip((pageNumber - 1) * pageSize)
      .limit(pageSize)
      .lean();

    res.json({
      orders,
      pagination: {
        currentPage: pageNumber,
        totalPages: Math.ceil(totalItems / pageSize),
        totalItems,
        itemsPerPage: pageSize
      }
    });
  } catch (error) {
    console.error('Get all orders error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Get order by ID
router.get('/:id', authenticateJWT, async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user.userId })
      .populate('user', 'username email')
      .lean();

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ order });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// Create new order
router.post('/', authenticateJWT, async (req, res) => {
  try {
    const { items, shippingAddress, paymentMethod, notes } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Order must contain at least one item' });
    }

    let total = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await Product.findById(item.productId).lean();
      if (!product) {
        return res.status(400).json({ error: `Product ${item.productId} not found` });
      }

      const itemTotal = product.price * (item.quantity || 1);
      total += itemTotal;

      orderItems.push({
        product: product._id,
        name: product.name,
        creator: product.creator,
        quantity: item.quantity || 1,
        color: item.color || '',
        price: product.price
      });
    }

    const order = await Order.create({
      user: req.user.userId,
      items: orderItems,
      total,
      status: 'Pending',
      shippingAddress: shippingAddress || {},
      paymentMethod: paymentMethod || 'Cash',
      notes: notes || ''
    });

    const user = await User.getById(req.user.userId);

    try {
      await sendOrderConfirmationEmail(user.email, {
        id: order._id,
        total,
        status: order.status,
        created_at: order.createdAt,
        items: orderItems
      }, user.username);
    } catch (emailError) {
      console.error('Order confirmation email failed:', emailError);
    }

    socketUtils.emitOrderCreated(order);

    res.status(201).json({
      message: 'Order created successfully',
      orderId: order._id,
      total
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Update order status (admin only)
router.put('/:id/status', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const validStatuses = ['Pending', 'Processing', 'Ready for Pickup', 'Shipped', 'Delivered', 'Cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    order.status = status;
    await order.save();

    const user = await User.getById(order.user);

    try {
      await sendOrderStatusUpdateEmail(user.email, {
        id: order._id,
        status,
        total: order.total,
        updated_at: order.updatedAt
      }, user.username);
    } catch (emailError) {
      console.error('Order status update email failed:', emailError);
    }

    res.json({ message: 'Order status updated successfully', order });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// Cancel order (user can cancel if pending)
router.put('/:id/cancel', authenticateJWT, async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user.userId });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.status !== 'Pending') {
      return res.status(400).json({ error: 'Only pending orders can be cancelled' });
    }

    order.status = 'Cancelled';
    await order.save();

    res.json({ message: 'Order cancelled successfully', order });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({ error: 'Failed to cancel order' });
  }
});

module.exports = router;
