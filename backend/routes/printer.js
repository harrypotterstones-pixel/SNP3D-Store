const express = require('express');
const PrinterStatus = require('../models/PrinterStatus');
const PrinterJob = require('../models/PrinterJob');
const PrinterMaintenance = require('../models/PrinterMaintenance');
const { authenticateJWT, requireAdmin } = require('../utils/auth');
const socketUtils = require('../utils/socket');

const router = express.Router();

// Get current printer status
router.get('/status', async (req, res) => {
  try {
    const status = await PrinterStatus.findOne().sort({ lastUpdated: -1 }).lean();

    if (!status) {
      return res.json({
        status: 'unknown',
        message: 'No printer status available',
        lastUpdate: null
      });
    }

    res.json({
      status: status.status,
      message: status.message,
      currentJob: status.currentJob,
      queueLength: status.queueLength,
      estimatedTime: status.progress,
      lastUpdate: status.lastUpdated
    });
  } catch (error) {
    console.error('Get printer status error:', error);
    res.status(500).json({ error: 'Failed to get printer status' });
  }
});

// Update printer status (admin only or automated system)
router.post('/status', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const {
      status,
      message,
      currentJob,
      queueLength,
      estimatedTime,
      temperature,
      filamentRemaining
    } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const validStatuses = ['idle', 'printing', 'paused', 'error', 'maintenance', 'offline'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const queueLengthValue = typeof queueLength === 'number' ? queueLength : 0;
    const printerStatus = await PrinterStatus.create({
      printerName: req.body.printerName || 'Default Printer',
      status,
      message: message || '',
      isOnline: status !== 'offline',
      currentJob: currentJob || null,
      queueLength: queueLengthValue,
      progress: estimatedTime || 0,
      temperature: temperature || null,
      filamentRemaining: filamentRemaining || null,
      lastUpdated: new Date()
    });

    socketUtils.emitPrinterStatus(printerStatus);

    res.json({ message: 'Printer status updated successfully', status: printerStatus });
  } catch (error) {
    console.error('Update printer status error:', error);
    res.status(500).json({ error: 'Failed to update printer status' });
  }
});

// Get printer history/logs
router.get('/history', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const history = await PrinterStatus.find()
      .sort({ lastUpdated: -1 })
      .limit(Math.max(1, parseInt(limit, 10)))
      .lean();

    res.json({ history });
  } catch (error) {
    console.error('Get printer history error:', error);
    res.status(500).json({ error: 'Failed to get printer history' });
  }
});

// Add printer job to queue
router.post('/jobs', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const { orderId, productName, quantity, color, estimatedTime } = req.body;

    if (!orderId || !productName) {
      return res.status(400).json({ error: 'Order ID and product name are required' });
    }

    const job = await PrinterJob.create({
      order: orderId,
      productName,
      quantity: quantity || 1,
      color: color || '',
      estimatedTime: estimatedTime || 0,
      status: 'queued'
    });

    const queueLength = await PrinterJob.countDocuments({ status: 'queued' });
    await PrinterStatus.create({
      printerName: req.body.printerName || 'Default Printer',
      isOnline: true,
      currentJob: null,
      progress: 0,
      lastUpdated: new Date()
    });

    res.status(201).json({ message: 'Printer job added successfully', job });
  } catch (error) {
    console.error('Add printer job error:', error);
    res.status(500).json({ error: 'Failed to add printer job' });
  }
});

// Get printer jobs queue
router.get('/jobs', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) {
      filter.status = status;
    }

    const jobs = await PrinterJob.find(filter).sort({ createdAt: -1 }).lean();
    res.json({ jobs });
  } catch (error) {
    console.error('Get printer jobs error:', error);
    res.status(500).json({ error: 'Failed to get printer jobs' });
  }
});

// Update printer job status
router.put('/jobs/:id', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const { status, notes } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const validStatuses = ['queued', 'printing', 'completed', 'failed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const job = await PrinterJob.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Printer job not found' });
    }

    job.status = status;
    if (notes !== undefined) job.notes = notes;
    await job.save();

    if (status === 'printing') {
      await PrinterStatus.create({
        printerName: req.body.printerName || 'Default Printer',
        isOnline: true,
        currentJob: job._id,
        progress: job.estimatedTime || 0,
        lastUpdated: new Date()
      });
    }

    res.json({ message: 'Printer job updated successfully', job });
  } catch (error) {
    console.error('Update printer job error:', error);
    res.status(500).json({ error: 'Failed to update printer job' });
  }
});

// Get printer maintenance logs
router.get('/maintenance', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const logs = await PrinterMaintenance.find().sort({ performedAt: -1 }).limit(20).lean();
    res.json({ logs });
  } catch (error) {
    console.error('Get maintenance logs error:', error);
    res.status(500).json({ error: 'Failed to get maintenance logs' });
  }
});

// Add maintenance log
router.post('/maintenance', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const { type, description, performedBy } = req.body;

    if (!type || !description) {
      return res.status(400).json({ error: 'Type and description are required' });
    }

    const log = await PrinterMaintenance.create({
      type,
      description,
      performedBy: performedBy || 'System'
    });

    res.status(201).json({ message: 'Maintenance log added successfully', log });
  } catch (error) {
    console.error('Add maintenance log error:', error);
    res.status(500).json({ error: 'Failed to add maintenance log' });
  }
});

// Get printer statistics
router.get('/stats', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period, 10));

    const jobStats = await PrinterJob.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const avgResult = await PrinterJob.aggregate([
      { $match: { status: 'completed', createdAt: { $gte: startDate } } },
      { $group: { _id: null, averageTime: { $avg: '$estimatedTime' } } }
    ]);

    const uptimeStats = await PrinterStatus.aggregate([
      { $match: { lastUpdated: { $gte: startDate } } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    res.json({
      jobStats: jobStats.map((item) => ({ status: item._id, count: item.count })),
      averagePrintTime: (avgResult[0] && avgResult[0].averageTime) || 0,
      uptimeStats: uptimeStats.map((item) => ({ status: item._id, count: item.count }))
    });
  } catch (error) {
    console.error('Get printer stats error:', error);
    res.status(500).json({ error: 'Failed to get printer statistics' });
  }
});

module.exports = router;
