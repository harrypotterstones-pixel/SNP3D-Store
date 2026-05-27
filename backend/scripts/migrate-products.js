require('dotenv').config();
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { connectMongo } = require('../utils/mongo');
const Product = require('../models/Product');

const catalogPath = path.join(__dirname, '..', '..', 'catalog-data.js');
const catalogContent = fs.readFileSync(catalogPath, 'utf8');
const productsMatch = catalogContent.match(/const DEFAULT_PRODUCTS = (\[[\s\S]*?\]);/);

if (!productsMatch) {
  console.error('❌ Could not find DEFAULT_PRODUCTS in catalog-data.js');
  process.exit(1);
}

let DEFAULT_PRODUCTS;
try {
  eval('DEFAULT_PRODUCTS = ' + productsMatch[1]);
} catch (error) {
  console.error('❌ Failed to parse DEFAULT_PRODUCTS:', error);
  process.exit(1);
}

const inferCategory = (name) => {
  if (!name) return 'General';
  const normalized = name.toLowerCase();
  if (normalized.includes('figurine') || normalized.includes('miniature')) return 'Figurines';
  if (normalized.includes('planter') || normalized.includes('pot')) return 'Planters';
  if (normalized.includes('holder') || normalized.includes('stand')) return 'Holders';
  if (normalized.includes('decoration') || normalized.includes('ornament') || normalized.includes('art')) return 'Decorations';
  if (normalized.includes('tool') || normalized.includes('organizer') || normalized.includes('rack')) return 'Tools';
  if (normalized.includes('game') || normalized.includes('puzzle') || normalized.includes('dice')) return 'Games';
  if (normalized.includes('animal') || normalized.includes('pet')) return 'Animals';
  if (normalized.includes('kitchen') || normalized.includes('food') || normalized.includes('utensil')) return 'Kitchen';
  if (normalized.includes('plant') || normalized.includes('garden') || normalized.includes('succulent')) return 'Garden';
  if (normalized.includes('clock') || normalized.includes('shelf') || normalized.includes('table')) return 'Home';
  return 'General';
};

const buildTags = (product, category) => {
  const tags = new Set();
  if (Array.isArray(product.tags)) {
    product.tags.forEach((tag) => { if (tag) tags.add(String(tag).toLowerCase()); });
  }
  if (product.name) {
    product.name.split(/\W+/).forEach((segment) => { if (segment) tags.add(segment.toLowerCase()); });
  }
  if (product.creator) {
    product.creator.split(/\W+/).forEach((segment) => { if (segment) tags.add(segment.toLowerCase()); });
  }
  tags.add(category.toLowerCase());
  return Array.from(tags).slice(0, 12);
};

(async () => {
  await connectMongo();

  console.log('🔄 Starting product migration...');
  console.log(`📦 Found ${DEFAULT_PRODUCTS.length} products to migrate`);

  let successCount = 0;
  let errorCount = 0;

  for (const product of DEFAULT_PRODUCTS) {
    try {
      const category = inferCategory(product.name);
      const colors = [];

      if (product.colors && typeof product.colors === 'object') {
        for (const [name, colorMeta] of Object.entries(product.colors)) {
          colors.push({
            name,
            inStock: Boolean(colorMeta?.inStock),
            generated: Boolean(colorMeta?.generated)
          });
        }
      }

      const legacyId = product.id !== undefined ? String(product.id) : uuidv4();
      const price = typeof product.price === 'number' ? product.price : Math.floor(Math.random() * 45) + 5;

      const migrated = await Product.findOneAndUpdate(
        { legacyId },
        {
          legacyId,
          name: product.name,
          description: product.description || `${product.name} — A unique 3D printed design by ${product.creator}.`,
          category,
          creator: product.creator || 'Unknown Creator',
          emoji: product.emoji || '',
          creatorUrl: product.creatorUrl || '',
          modelUrl: product.modelUrl || '',
          price,
          colors,
          imageUrl: product.imageUrl || '',
          attributionUrl: product.attributionUrl || product.creatorUrl || '',
          license: product.license || 'Creative Commons Attribution',
          tags: buildTags(product, category),
          isPublished: true
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      successCount += 1;
      console.log(`✅ Migrated: ${product.name} (${category}) - $${price} [${migrated._id}]`);
    } catch (error) {
      errorCount += 1;
      console.error(`❌ Failed to migrate: ${product.name || 'Unknown product'}`, error.message || error);
    }
  }

  console.log('\n📊 Migration Summary:');
  console.log(`✅ Successfully migrated: ${successCount} products`);
  console.log(`❌ Failed to migrate: ${errorCount} products`);
  process.exit(errorCount > 0 ? 1 : 0);
})();
