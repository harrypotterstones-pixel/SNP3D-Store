const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, lowercase: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  firstName: { type: String, default: '' },
  lastName: { type: String, default: '' },
  phone: { type: String, default: '' },
  address: { type: String, default: '' },
  city: { type: String, default: '' },
  province: { type: String, default: '' },
  postalCode: { type: String, default: '' },
  isAdmin: { type: Boolean, default: false },
  emailVerified: { type: Boolean, default: false },
  verificationToken: { type: String, default: '' },
  lastLogin: { type: Date, default: null },
  resetToken: { type: String, default: null },
  resetTokenExpires: { type: Date, default: null },
  subscriptions: { type: [String], default: [] }
}, { timestamps: true });

UserSchema.methods.toClient = function () {
  const obj = this.toObject({ virtuals: false });
  obj.id = obj._id.toString();
  delete obj._id;
  delete obj.__v;
  delete obj.passwordHash;
  delete obj.resetToken;
  delete obj.resetTokenExpires;
  delete obj.verificationToken;
  return obj;
};

UserSchema.statics.generateToken = function (user) {
  return jwt.sign(
    {
      userId: user.id || user._id,
      username: user.username,
      email: user.email,
      isAdmin: user.isAdmin
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

UserSchema.statics.verifyToken = function (token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid token');
  }
};

UserSchema.statics.createUser = async function (userData) {
  const { username, email, password, firstName, lastName } = userData;
  const saltRounds = 12;
  const passwordHash = await bcrypt.hash(password, saltRounds);
  const verificationToken = uuidv4();

  const user = await this.create({
    username: username.toLowerCase(),
    email: email.toLowerCase(),
    passwordHash,
    firstName: firstName || '',
    lastName: lastName || '',
    verificationToken
  });

  const safeUser = user.toClient();
  return { ...safeUser, verificationToken };
};

UserSchema.statics.authenticate = async function (usernameOrEmail, password) {
  const user = await this.findOne({
    $or: [{ username: usernameOrEmail }, { email: usernameOrEmail }]
  });

  if (!user) {
    throw new Error('Invalid credentials');
  }

  const isValidPassword = await bcrypt.compare(password, user.passwordHash);
  if (!isValidPassword) {
    throw new Error('Invalid credentials');
  }

  if (!user.emailVerified) {
    throw new Error('Please verify your email before logging in');
  }

  user.lastLogin = new Date();
  await user.save();

  return user.toClient();
};

UserSchema.statics.verifyEmail = async function (token) {
  const user = await this.findOne({ verificationToken: token });

  if (!user) {
    throw new Error('Invalid verification token');
  }

  if (user.emailVerified) {
    throw new Error('Email already verified');
  }

  user.emailVerified = true;
  user.verificationToken = null;
  await user.save();

  return { success: true, username: user.username };
};

UserSchema.statics.getById = async function (userId) {
  const user = await this.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }
  return user.toClient();
};

UserSchema.statics.updateProfile = async function (userId, profileData) {
  const user = await this.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const fields = ['firstName', 'lastName', 'phone', 'address', 'city', 'province', 'postalCode'];
  fields.forEach((field) => {
    if (profileData[field] !== undefined) {
      user[field] = profileData[field];
    }
  });

  await user.save();
  return user.toClient();
};

UserSchema.statics.changePassword = async function (userId, currentPassword, newPassword) {
  const user = await this.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isValidPassword) {
    throw new Error('Current password is incorrect');
  }

  const saltRounds = 12;
  user.passwordHash = await bcrypt.hash(newPassword, saltRounds);
  await user.save();

  return { success: true };
};

UserSchema.statics.requestPasswordReset = async function (email) {
  const user = await this.findOne({ email: email.toLowerCase() });
  if (!user) {
    return { success: true };
  }

  const resetToken = uuidv4();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  user.resetToken = resetToken;
  user.resetTokenExpires = expiresAt;
  await user.save();

  return { success: true, resetToken, username: user.username };
};

UserSchema.statics.resetPassword = async function (token, newPassword) {
  const user = await this.findOne({ resetToken: token, resetTokenExpires: { $gt: new Date() } });
  if (!user) {
    throw new Error('Invalid or expired reset token');
  }

  const saltRounds = 12;
  user.passwordHash = await bcrypt.hash(newPassword, saltRounds);
  user.resetToken = null;
  user.resetTokenExpires = null;
  await user.save();

  return { success: true };
};

module.exports = mongoose.model('User', UserSchema);
