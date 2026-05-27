require('dotenv').config();
const { connectMongo } = require('../utils/mongo');
const User = require('../models/User');
const Product = require('../models/Product');
const bcrypt = require('bcryptjs');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@snp3d.ca';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123!';

async function initDatabase() {
  await connectMongo();

  await Promise.all([
    User.init(),
    Product.init()
  ]);

  const existingAdmin = await User.findOne({ isAdmin: true });
  if (existingAdmin) {
    console.log('✅ Admin user already exists:', existingAdmin.email);
    return;
  }

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  await User.create({
    username: ADMIN_USERNAME.toLowerCase(),
    email: ADMIN_EMAIL.toLowerCase(),
    passwordHash,
    isAdmin: true,
    emailVerified: true
  });

  console.log('✅ Created default admin user');
  console.log(`   Username: ${ADMIN_USERNAME}`);
  console.log(`   Email: ${ADMIN_EMAIL}`);
  console.log(`   Password: ${ADMIN_PASSWORD}`);
  console.log('   ⚠️  Change this password before using this in production.');
}

initDatabase()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  });
