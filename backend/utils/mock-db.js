// Mock In-Memory Database for Testing
// This simulates MongoDB behavior without requiring an actual MongoDB instance

const { v4: uuidv4 } = require('uuid');

class MockDatabase {
  constructor() {
    this.users = [];
    this.products = [];
    this.orders = [];
    this.lists = [];
    this.analyticsEvents = [];
    this.pageViews = [];
    this.printerStatus = [];
    this.printerJobs = [];
    this.printerMaintenance = [];
    
    // Add sample products
    this.initializeSampleData();
  }

  initializeSampleData() {
    const sampleProducts = [
      { _id: uuidv4(), name: "Heavy-Duty Cat Suspension Bridge", creator: "Cujochris", category: "Animals", price: 15, emoji: "🐱", description: "Wall-mounted cat bridge", colors: [], tags: ['cat', '3d-print'], isPublished: true },
      { _id: uuidv4(), name: "Dodge Ram 1500 Dashboard Plate", creator: "Norris Creations", category: "Vehicles", price: 12, emoji: "🚙", description: "Dashboard accessory", colors: [], tags: ['truck', '3d-print'], isPublished: true },
      { _id: uuidv4(), name: "Mid Century Modern Ribbed Planter", creator: "Nordic Creativa", category: "Garden", price: 8, emoji: "🌱", description: "Modern planter with drip tray", colors: [], tags: ['planter', 'modern'], isPublished: true },
      { _id: uuidv4(), name: "Wall Mounted Plant Pot", creator: "Nordic Creativa", category: "Garden", price: 10, emoji: "🪴", description: "Space-saving wall pot", colors: [], tags: ['pot', 'wall'], isPublished: true },
      { _id: uuidv4(), name: "Fidget Clicker Print in Place", creator: "abmaker", category: "Games", price: 5, emoji: "🎮", description: "Stress relief fidget toy", colors: [], tags: ['fidget', 'toy'], isPublished: true },
      { _id: uuidv4(), name: "Iris Fidget Box", creator: "Dansqer Goldfish", category: "Games", price: 20, emoji: "📦", description: "Multi-purpose fidget box", colors: [], tags: ['fidget', 'box'], isPublished: true },
      { _id: uuidv4(), name: "Bike Chain Gear Fidget", creator: "Ciezki", category: "Tools", price: 7, emoji: "⚙️", description: "Mechanical fidget gear", colors: [], tags: ['fidget', 'gear'], isPublished: true },
      { _id: uuidv4(), name: "Fidget Cube", creator: "Ned's Designs", category: "Games", price: 9, emoji: "🎲", description: "Classic fidget cube", colors: [], tags: ['fidget', 'cube'], isPublished: true },
      { _id: uuidv4(), name: "Hexagonal Tensegrity Table", creator: "citratune", category: "Decorations", price: 25, emoji: "✨", description: "Geometric table sculpture", colors: [], tags: ['art', 'geometric'], isPublished: true },
      { _id: uuidv4(), name: "Flexi Skeleton Mini", creator: "PRINT3A", category: "Figurines", price: 6, emoji: "💀", description: "Articulated skeleton toy", colors: [], tags: ['skeleton', 'articulated'], isPublished: true }
    ];

    this.products = sampleProducts;
  }

  // User operations
  async createUser(userData) {
    const user = {
      _id: uuidv4(),
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.users.push(user);
    return user;
  }

  async findUser(query) {
    return this.users.find(u => 
      (query.email && u.email === query.email) ||
      (query.username && u.username === query.username) ||
      (query._id && u._id === query._id) ||
      (query.isAdmin && u.isAdmin === query.isAdmin)
    ) || null;
  }

  async updateUser(userId, data) {
    const user = this.users.find(u => u._id === userId);
    if (!user) return null;
    Object.assign(user, data, { updatedAt: new Date() });
    return user;
  }

  // Product operations
  async createProduct(data) {
    const product = {
      _id: uuidv4(),
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.products.push(product);
    return product;
  }

  async findProducts(filter = {}, skip = 0, limit = 50) {
    let filtered = this.products.filter(p => p.isPublished !== false);

    if (filter.category && filter.category !== 'all') {
      filtered = filtered.filter(p => p.category === filter.category);
    }

    if (filter.$or) {
      const searchTerms = filter.$or;
      filtered = filtered.filter(p =>
        searchTerms.some(term => {
          const regex = term.name;
          return regex.test(p.name) || regex.test(p.description) || regex.test(p.creator);
        })
      );
    }

    return filtered.slice(skip, skip + limit);
  }

  async countProducts(filter = {}) {
    let count = this.products.filter(p => p.isPublished !== false).length;
    if (filter.category && filter.category !== 'all') {
      count = this.products.filter(p => p.category === filter.category).length;
    }
    return count;
  }

  async findProductById(id) {
    return this.products.find(p => p._id === id) || null;
  }

  async updateProduct(id, data) {
    const product = this.products.find(p => p._id === id);
    if (!product) return null;
    Object.assign(product, data, { updatedAt: new Date() });
    return product;
  }

  async deleteProduct(id) {
    const index = this.products.findIndex(p => p._id === id);
    if (index === -1) return null;
    return this.products.splice(index, 1)[0];
  }

  // Order operations
  async createOrder(data) {
    const order = {
      _id: uuidv4(),
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.orders.push(order);
    return order;
  }

  async findOrders(filter = {}) {
    return this.orders.filter(o => {
      if (filter.user && o.user !== filter.user) return false;
      if (filter.status && o.status !== filter.status) return false;
      return true;
    });
  }

  async findOrderById(id) {
    return this.orders.find(o => o._id === id) || null;
  }

  async updateOrder(id, data) {
    const order = this.orders.find(o => o._id === id);
    if (!order) return null;
    Object.assign(order, data, { updatedAt: new Date() });
    return order;
  }

  // List operations
  async createList(data) {
    const list = {
      _id: uuidv4(),
      ...data,
      items: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.lists.push(list);
    return list;
  }

  async findLists(filter = {}) {
    return this.lists.filter(l => {
      if (filter.owner && l.owner !== filter.owner) return false;
      if (filter.isPublic !== undefined && l.isPublic !== filter.isPublic) return false;
      return true;
    });
  }

  async findListById(id) {
    return this.lists.find(l => l._id === id) || null;
  }

  async updateList(id, data) {
    const list = this.lists.find(l => l._id === id);
    if (!list) return null;
    Object.assign(list, data, { updatedAt: new Date() });
    return list;
  }

  async deleteList(id) {
    const index = this.lists.findIndex(l => l._id === id);
    if (index === -1) return null;
    return this.lists.splice(index, 1)[0];
  }

  // Analytics operations
  async createAnalyticsEvent(data) {
    const event = { _id: uuidv4(), ...data, createdAt: new Date() };
    this.analyticsEvents.push(event);
    return event;
  }

  async createPageView(data) {
    const view = { _id: uuidv4(), ...data, viewedAt: new Date() };
    this.pageViews.push(view);
    return view;
  }

  // Printer operations
  async createPrinterJob(data) {
    const job = { _id: uuidv4(), ...data, createdAt: new Date(), updatedAt: new Date() };
    this.printerJobs.push(job);
    return job;
  }

  async getPrinterStatus() {
    return this.printerStatus[this.printerStatus.length - 1] || {
      status: 'offline',
      message: 'No printer status available'
    };
  }

  // Utility
  getCategories() {
    const categories = new Map();
    this.products.forEach(p => {
      if (!categories.has(p.category)) {
        categories.set(p.category, 0);
      }
      categories.set(p.category, categories.get(p.category) + 1);
    });
    return Array.from(categories.entries()).map(([category, count]) => ({ category, count }));
  }
}

// Singleton instance
let mockDb = null;

const getMockDb = () => {
  if (!mockDb) {
    mockDb = new MockDatabase();
  }
  return mockDb;
};

module.exports = {
  getMockDb,
  MockDatabase
};
