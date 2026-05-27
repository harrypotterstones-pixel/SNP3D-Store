const express = require('express');
const Product = require('../models/Product');
const { authenticateJWT, requireAdmin } = require('../utils/auth');

const router = express.Router();

// Get all products
router.get('/', async (req, res) => {
  try {
    const { category, search, page = 1, limit = 50 } = req.query;
    const pageNumber = Math.max(1, parseInt(page, 10));
    const pageSize = Math.max(1, parseInt(limit, 10));

    const filter = { isPublished: true };

    if (category && category !== 'all') {
      filter.category = category;
    }

    if (search) {
      const regex = new RegExp(search, 'i');
      filter.$or = [
        { name: regex },
        { description: regex },
        { creator: regex },
        { category: regex },
        { tags: regex }
      ];
    }

    const totalItems = await Product.countDocuments(filter);
    const products = await Product.find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNumber - 1) * pageSize)
      .limit(pageSize)
      .lean();

    res.json({
      products,
      pagination: {
        currentPage: pageNumber,
        totalPages: Math.ceil(totalItems / pageSize),
        totalItems,
        itemsPerPage: pageSize
      }
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Get product categories
router.get('/meta/categories', async (req, res) => {
  try {
    const categories = await Product.aggregate([
      { $match: { isPublished: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.json({ categories: categories.map((item) => ({ category: item._id, count: item.count })) });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Get featured products
router.get('/meta/featured', async (req, res) => {
  try {
    const products = await Product.find({ isPublished: true })
      .sort({ createdAt: -1 })
      .limit(12)
      .lean();

    res.json({ products });
  } catch (error) {
    console.error('Get featured products error:', error);
    res.status(500).json({ error: 'Failed to fetch featured products' });
  }
});

// Get product by ID
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).lean();

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ product });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// Create new product (admin only)
router.post('/', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const {
      name,
      description,
      category,
      creator,
      creatorUrl,
      modelUrl,
      emoji,
      legacyId,
      price,
      colors,
      imageUrl,
      attributionUrl,
      license,
      tags,
      isPublished = true
    } = req.body;

    if (!name || !description || !category || !creator || price === undefined) {
      return res.status(400).json({ error: 'Name, description, category, creator, and price are required' });
    }

    const product = await Product.create({
      legacyId: legacyId !== undefined && legacyId !== null ? String(legacyId) : undefined,
      name,
      description,
      category,
      creator,
      creatorUrl: creatorUrl || '',
      modelUrl: modelUrl || '',
      emoji: emoji || '',
      price,
      colors: Array.isArray(colors) ? colors : [],
      imageUrl: imageUrl || '',
      attributionUrl: attributionUrl || '',
      license: license || 'Creative Commons Attribution',
      tags: Array.isArray(tags) ? tags : [],
      isPublished: Boolean(isPublished)
    });

    res.status(201).json({
      message: 'Product created successfully',
      product
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// Update product (admin only)
router.put('/:id', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const {
      name,
      description,
      category,
      creator,
      creatorUrl,
      modelUrl,
      emoji,
      price,
      colors,
      imageUrl,
      attributionUrl,
      license,
      tags,
      isPublished
    } = req.body;

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    product.name = name || product.name;
    product.description = description || product.description;
    product.category = category || product.category;
    product.creator = creator || product.creator;
    product.creatorUrl = creatorUrl || product.creatorUrl;
    product.modelUrl = modelUrl || product.modelUrl;
    product.emoji = emoji || product.emoji;
    product.price = price !== undefined ? price : product.price;
    product.colors = Array.isArray(colors) ? colors : product.colors;
    product.imageUrl = imageUrl || product.imageUrl;
    product.attributionUrl = attributionUrl || product.attributionUrl;
    product.license = license || product.license;
    product.tags = Array.isArray(tags) ? tags : product.tags;
    if (typeof isPublished === 'boolean') {
      product.isPublished = isPublished;
    }
    await product.save();

    res.json({ message: 'Product updated successfully', product });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// Delete product (admin only)
router.delete('/:id', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

module.exports = router;