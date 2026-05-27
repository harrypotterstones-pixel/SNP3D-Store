const express = require('express');
const User = require('../models/User');
const Product = require('../models/Product');
const List = require('../models/List');
const { authenticateJWT, requireAdmin } = require('../utils/auth');

const router = express.Router();

// Get user's lists
router.get('/lists', authenticateJWT, async (req, res) => {
  try {
    const lists = await List.find({ owner: req.user.userId })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ lists });
  } catch (error) {
    console.error('Get lists error:', error);
    res.status(500).json({ error: 'Failed to fetch lists' });
  }
});

// Create new list
router.post('/lists', authenticateJWT, async (req, res) => {
  try {
    const { name, description, isPublic = false } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'List name is required' });
    }

    const list = await List.create({
      owner: req.user.userId,
      name,
      description: description || '',
      isPublic
    });

    res.status(201).json({
      message: 'List created successfully',
      list
    });
  } catch (error) {
    console.error('Create list error:', error);
    res.status(500).json({ error: 'Failed to create list' });
  }
});

// Get public lists
router.get('/lists/public/all', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNumber = Math.max(1, parseInt(page, 10));
    const pageSize = Math.max(1, parseInt(limit, 10));

    const totalItems = await List.countDocuments({ isPublic: true });
    const lists = await List.find({ isPublic: true })
      .populate('owner', 'username')
      .sort({ createdAt: -1 })
      .skip((pageNumber - 1) * pageSize)
      .limit(pageSize)
      .lean();

    res.json({
      lists,
      pagination: {
        currentPage: pageNumber,
        totalPages: Math.ceil(totalItems / pageSize),
        totalItems,
        itemsPerPage: pageSize
      }
    });
  } catch (error) {
    console.error('Get public lists error:', error);
    res.status(500).json({ error: 'Failed to fetch public lists' });
  }
});

// Get list by ID
router.get('/lists/:id', authenticateJWT, async (req, res) => {
  try {
    const list = await List.findById(req.params.id)
      .populate({ path: 'items.product', model: 'Product', select: 'name imageUrl price creator category' })
      .lean();

    if (!list || (!list.isPublic && list.owner.toString() !== req.user.userId)) {
      return res.status(404).json({ error: 'List not found' });
    }

    res.json({ list });
  } catch (error) {
    console.error('Get list error:', error);
    res.status(500).json({ error: 'Failed to fetch list' });
  }
});

// Update list
router.put('/lists/:id', authenticateJWT, async (req, res) => {
  try {
    const list = await List.findOne({ _id: req.params.id, owner: req.user.userId });
    if (!list) {
      return res.status(404).json({ error: 'List not found or access denied' });
    }

    const { name, description, isPublic } = req.body;
    if (name !== undefined) list.name = name;
    if (description !== undefined) list.description = description;
    if (isPublic !== undefined) list.isPublic = isPublic;
    await list.save();

    res.json({ message: 'List updated successfully', list });
  } catch (error) {
    console.error('Update list error:', error);
    res.status(500).json({ error: 'Failed to update list' });
  }
});

// Delete list
router.delete('/lists/:id', authenticateJWT, async (req, res) => {
  try {
    const list = await List.findOneAndDelete({ _id: req.params.id, owner: req.user.userId });
    if (!list) {
      return res.status(404).json({ error: 'List not found or access denied' });
    }

    res.json({ message: 'List deleted successfully' });
  } catch (error) {
    console.error('Delete list error:', error);
    res.status(500).json({ error: 'Failed to delete list' });
  }
});

// Add item to list
router.post('/lists/:id/items', authenticateJWT, async (req, res) => {
  try {
    const { productId, notes } = req.body;

    if (!productId) {
      return res.status(400).json({ error: 'Product ID is required' });
    }

    const list = await List.findOne({ _id: req.params.id, owner: req.user.userId });
    if (!list) {
      return res.status(404).json({ error: 'List not found or access denied' });
    }

    const product = await Product.findById(productId).lean();
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const exists = list.items.some((item) => item.product.toString() === productId);
    if (exists) {
      return res.status(400).json({ error: 'Product already in list' });
    }

    list.items.push({ product: productId, notes: notes || '' });
    await list.save();

    res.status(201).json({ message: 'Item added to list successfully', list });
  } catch (error) {
    console.error('Add item to list error:', error);
    res.status(500).json({ error: 'Failed to add item to list' });
  }
});

// Remove item from list
router.delete('/lists/:listId/items/:itemId', authenticateJWT, async (req, res) => {
  try {
    const list = await List.findOne({ _id: req.params.listId, owner: req.user.userId });
    if (!list) {
      return res.status(404).json({ error: 'List not found or access denied' });
    }

    const initialLength = list.items.length;
    list.items = list.items.filter((item) => item._id.toString() !== req.params.itemId);
    if (list.items.length === initialLength) {
      return res.status(404).json({ error: 'Item not found in list' });
    }

    await list.save();
    res.json({ message: 'Item removed from list successfully', list });
  } catch (error) {
    console.error('Remove item from list error:', error);
    res.status(500).json({ error: 'Failed to remove item from list' });
  }
});

// Get user's email subscriptions
router.get('/subscriptions', authenticateJWT, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).lean();
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ subscriptions: user.subscriptions || [] });
  } catch (error) {
    console.error('Get subscriptions error:', error);
    res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
});

// Update email subscription
router.put('/subscriptions/:type', authenticateJWT, async (req, res) => {
  try {
    const { subscribed } = req.body;
    const subscriptionType = req.params.type;

    const validTypes = ['order_updates', 'promotions', 'newsletter'];
    if (!validTypes.includes(subscriptionType)) {
      return res.status(400).json({ error: 'Invalid subscription type' });
    }

    const update = subscribed
      ? { $addToSet: { subscriptions: subscriptionType } }
      : { $pull: { subscriptions: subscriptionType } };

    const user = await User.findByIdAndUpdate(req.user.userId, update, { new: true }).lean();
    res.json({ message: 'Subscription updated successfully', subscriptions: user.subscriptions || [] });
  } catch (error) {
    console.error('Update subscription error:', error);
    res.status(500).json({ error: 'Failed to update subscription' });
  }
});

module.exports = router;
