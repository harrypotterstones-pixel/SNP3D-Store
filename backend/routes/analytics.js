const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const PageView = require('../models/PageView');
const AnalyticsEvent = require('../models/AnalyticsEvent');
const List = require('../models/List');
const { authenticateJWT, requireAdmin } = require('../utils/auth');

const router = express.Router();

// Track page view (public endpoint)
router.post('/page-view', async (req, res) => {
  try {
    const { page, referrer, userAgent, sessionId } = req.body;

    await PageView.create({
      page: page || '',
      referrer: referrer || '',
      userAgent: userAgent || '',
      sessionId: sessionId || ''
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Track page view error:', error);
    res.status(500).json({ error: 'Failed to track page view' });
  }
});

// Track user event (requires auth)
router.post('/event', authenticateJWT, async (req, res) => {
  try {
    const { eventType, eventData, page } = req.body;

    if (!eventType) {
      return res.status(400).json({ error: 'Event type is required' });
    }

    await AnalyticsEvent.create({
      user: req.user.userId,
      eventType,
      eventData: eventData || {},
      page: page || ''
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Track event error:', error);
    res.status(500).json({ error: 'Failed to track event' });
  }
});

// Get analytics dashboard data (admin only)
router.get('/dashboard', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period, 10));

    const [totalUsers, totalProducts, totalOrders, totalRevenueResult] = await Promise.all([
      User.countDocuments(),
      Product.countDocuments(),
      Order.countDocuments(),
      Order.aggregate([{ $group: { _id: null, total: { $sum: '$total' } } }])
    ]);

    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('user', 'username')
      .lean();

    const topProducts = await Order.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          order_count: { $sum: 1 },
          total_quantity: { $sum: '$items.quantity' },
          total_revenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
        }
      },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          productId: '$_id',
          name: '$product.name',
          creator: '$product.creator',
          category: '$product.category',
          order_count: 1,
          total_quantity: 1,
          total_revenue: 1
        }
      },
      { $sort: { total_quantity: -1 } },
      { $limit: 10 }
    ]);

    const pageViews = await PageView.aggregate([
      { $match: { viewedAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$viewedAt' }
          },
          views: { $sum: 1 }
        }
      },
      { $sort: { _id: -1 } },
      { $limit: 30 }
    ]);

    const userRegistrations = await User.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          registrations: { $sum: 1 }
        }
      },
      { $sort: { _id: -1 } },
      { $limit: 30 }
    ]);

    const orderStatuses = await Order.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    res.json({
      overview: {
        totalUsers,
        totalProducts,
        totalOrders,
        totalRevenue: (totalRevenueResult[0] && totalRevenueResult[0].total) || 0
      },
      recentOrders,
      topProducts,
      charts: {
        pageViews: pageViews.map((item) => ({ date: item._id, views: item.views })),
        userRegistrations: userRegistrations.map((item) => ({ date: item._id, registrations: item.registrations })),
        orderStatuses: orderStatuses.map((item) => ({ status: item._id, count: item.count }))
      }
    });
  } catch (error) {
    console.error('Get dashboard analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics data' });
  }
});

// Get user-specific analytics
router.get('/user', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.userId;

    const orderHistory = await Order.find({ user: userId })
      .sort({ createdAt: -1 })
      .lean();

    const favoriteCategories = await Order.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(userId) } },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$product.category',
          order_count: { $sum: 1 }
        }
      },
      { $sort: { order_count: -1 } },
      { $limit: 5 }
    ]);

    const totalSpentAgg = await Order.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(userId) } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);

    const listsCount = await require('../models/List').countDocuments({ owner: userId });

    res.json({
      orderHistory,
      favoriteCategories: favoriteCategories.map((item) => ({ category: item._id, order_count: item.order_count })),
      totalSpent: (totalSpentAgg[0] && totalSpentAgg[0].total) || 0,
      listsCount
    });
  } catch (error) {
    console.error('Get user analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch user analytics' });
  }
});

// Get product performance analytics (admin only)
router.get('/products', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period, 10));

    const productStats = await Order.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          order_count: { $sum: 1 },
          total_quantity_sold: { $sum: '$items.quantity' },
          total_revenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } },
          avg_price_sold: { $avg: '$items.price' },
          last_ordered: { $max: '$createdAt' }
        }
      },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          productId: '$_id',
          name: '$product.name',
          creator: '$product.creator',
          category: '$product.category',
          price: '$product.price',
          order_count: 1,
          total_quantity_sold: 1,
          total_revenue: 1,
          avg_price_sold: 1,
          last_ordered: 1
        }
      },
      { $sort: { total_revenue: -1 } }
    ]);

    res.json({ productStats });
  } catch (error) {
    console.error('Get product analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch product analytics' });
  }
});

// Get sales analytics (admin only)
router.get('/sales', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period, 10));

    const dailySales = await Order.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          orders: { $sum: 1 },
          revenue: { $sum: '$total' }
        }
      },
      { $sort: { _id: -1 } }
    ]);

    const monthlySales = await Order.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          orders: { $sum: 1 },
          revenue: { $sum: '$total' }
        }
      },
      { $sort: { _id: -1 } }
    ]);

    const avgOrderValueResult = await Order.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: null, average: { $avg: '$total' } } }
    ]);

    res.json({
      dailySales: dailySales.map((item) => ({ date: item._id, orders: item.orders, revenue: item.revenue })),
      monthlySales: monthlySales.map((item) => ({ month: item._id, orders: item.orders, revenue: item.revenue })),
      averageOrderValue: (avgOrderValueResult[0] && avgOrderValueResult[0].average) || 0
    });
  } catch (error) {
    console.error('Get sales analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch sales analytics' });
  }
});

module.exports = router;
