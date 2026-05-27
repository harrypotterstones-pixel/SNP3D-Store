const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Product = require('../models/Product');

let memoryServer = null;
let isUsingMemoryDb = false;

const sampleProducts = [
  { name: 'Heavy-Duty Cat Suspension Bridge', creator: 'Cujochris', category: 'Animals', price: 15, emoji: '🐱', description: 'Wall-mounted cat bridge', colors: [{ name: 'Black', inStock: true }, { name: 'White', inStock: true }, { name: 'Gray', inStock: true }], tags: ['cat', '3d-print'], imageUrl: '', attributionUrl: '', license: 'Creative Commons Attribution', isPublished: true },
  { name: 'Dodge Ram 1500 Dashboard Plate', creator: 'Norris Creations', category: 'Vehicles', price: 12, emoji: '🚙', description: 'Dashboard accessory', colors: [{ name: 'Black', inStock: true }, { name: 'Chrome', inStock: true }, { name: 'Carbon', inStock: true }], tags: ['truck', '3d-print'], imageUrl: '', attributionUrl: '', license: 'Creative Commons Attribution', isPublished: true },
  { name: 'Mid Century Modern Ribbed Planter', creator: 'Nordic Creativa', category: 'Garden', price: 8, emoji: '🌱', description: 'Modern planter with drip tray', colors: [{ name: 'Terracotta', inStock: true }, { name: 'White', inStock: true }, { name: 'Gray', inStock: true }, { name: 'Sage Green', inStock: true }], tags: ['planter', 'modern'], imageUrl: '', attributionUrl: '', license: 'Creative Commons Attribution', isPublished: true },
  { name: 'Wall Mounted Plant Pot', creator: 'Nordic Creativa', category: 'Garden', price: 10, emoji: '🪴', description: 'Space-saving wall pot', colors: [{ name: 'White', inStock: true }, { name: 'Gray', inStock: true }, { name: 'Black', inStock: true }], tags: ['pot', 'wall'], imageUrl: '', attributionUrl: '', license: 'Creative Commons Attribution', isPublished: true },
  { name: 'Fidget Clicker Print in Place', creator: 'abmaker', category: 'Games', price: 5, emoji: '🎮', description: 'Stress relief fidget toy', colors: [{ name: 'Rainbow', inStock: true }, { name: 'Neon Green', inStock: true }, { name: 'Neon Pink', inStock: true }, { name: 'Glow', inStock: true }], tags: ['fidget', 'toy'], imageUrl: '', attributionUrl: '', license: 'Creative Commons Attribution', isPublished: true },
  { name: 'Iris Fidget Box', creator: 'Dansqer Goldfish', category: 'Games', price: 20, emoji: '📦', description: 'Multi-purpose fidget box', colors: [{ name: 'Rainbow', inStock: true }, { name: 'Blue', inStock: true }, { name: 'Purple', inStock: true }], tags: ['fidget', 'box'], imageUrl: '', attributionUrl: '', license: 'Creative Commons Attribution', isPublished: true },
  { name: 'Bike Chain Gear Fidget', creator: 'Ciezki', category: 'Tools', price: 7, emoji: '⚙️', description: 'Mechanical fidget gear', colors: [{ name: 'Silver', inStock: true }, { name: 'Black', inStock: true }, { name: 'Gold', inStock: false }], tags: ['fidget', 'gear'], imageUrl: '', attributionUrl: '', license: 'Creative Commons Attribution', isPublished: true },
  { name: 'Fidget Cube', creator: "Ned's Designs", category: 'Games', price: 9, emoji: '🎲', description: 'Classic fidget cube', colors: [{ name: 'Rainbow', inStock: true }, { name: 'Black', inStock: true }, { name: 'Blue', inStock: true }, { name: 'Red', inStock: true }], tags: ['fidget', 'cube'], imageUrl: '', attributionUrl: '', license: 'Creative Commons Attribution', isPublished: true },
  { name: 'Hexagonal Tensegrity Table', creator: 'citratune', category: 'Decorations', price: 25, emoji: '✨', description: 'Geometric table sculpture', colors: [{ name: 'Natural', inStock: true }, { name: 'Black', inStock: true }, { name: 'White', inStock: true }], tags: ['art', 'geometric'], imageUrl: '', attributionUrl: '', license: 'Creative Commons Attribution', isPublished: true },
  { name: 'Flexi Skeleton Mini', creator: 'PRINT3A', category: 'Figurines', price: 6, emoji: '💀', description: 'Articulated skeleton toy', colors: [{ name: 'White', inStock: true }, { name: 'Glow', inStock: true }, { name: 'Black', inStock: true }], tags: ['skeleton', 'articulated'], imageUrl: '', attributionUrl: '', license: 'Creative Commons Attribution', isPublished: true }
];

const seedDatabase = async () => {
  await User.init();
  await Product.init();

  const userCount = await User.countDocuments();
  if (userCount === 0) {
    const password = process.env.ADMIN_PASSWORD || 'admin123!';
    const passwordHash = await bcrypt.hash(password, 12);
    await User.create({
      username: (process.env.ADMIN_USERNAME || 'admin').toLowerCase(),
      email: (process.env.ADMIN_EMAIL || 'admin@snp3d.ca').toLowerCase(),
      passwordHash,
      isAdmin: true,
      emailVerified: true
    });
    console.log('✅ Created default admin user');
    console.log(`   Username: ${process.env.ADMIN_USERNAME || 'admin'}`);
    console.log(`   Email: ${process.env.ADMIN_EMAIL || 'admin@snp3d.ca'}`);
    console.log(`   Password: ${password}`);
  }

  const productCount = await Product.countDocuments();
  if (productCount === 0) {
    await Product.insertMany(sampleProducts);
    console.log(`✅ Seeded ${sampleProducts.length} sample products`);
  }
};

const connectMongo = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  mongoose.set('strictQuery', true);

  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/snp3d';

  try {
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 3000
    });
    console.log(`✅ Connected to MongoDB: ${uri}`);
    isUsingMemoryDb = false;
  } catch (error) {
    console.warn('⚠️  MongoDB connection failed:', error.message);
    console.warn('➡️  Falling back to in-memory MongoDB for local development');
    memoryServer = await MongoMemoryServer.create();
    const memoryUri = memoryServer.getUri();
    await mongoose.connect(memoryUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    isUsingMemoryDb = true;
    console.log('✅ Connected to in-memory MongoDB');
  }

  await seedDatabase();
  return mongoose.connection;
};

const disconnectMongo = async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.disconnect();
  }

  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
  isUsingMemoryDb = false;
};

const isUsingInMemoryDb = () => isUsingMemoryDb;

module.exports = {
  connectMongo,
  disconnectMongo,
  isUsingInMemoryDb
};

