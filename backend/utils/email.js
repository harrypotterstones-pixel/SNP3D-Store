const nodemailer = require('nodemailer');

// Create transporter (configure with your email service)
const createTransporter = () => {
  // For development, you can use a service like Gmail, Outlook, or a service like SendGrid
  // Make sure to set environment variables for security
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER, // Your email
      pass: process.env.EMAIL_PASS  // Your email password or app password
    }
  });
};

// Send verification email
const sendVerificationEmail = async (email, token, username) => {
  const transporter = createTransporter();

  const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${token}`;

  const mailOptions = {
    from: `"SNP3D Store" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Verify Your SNP3D Account',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welcome to SNP3D Store, ${username}!</h2>
        <p>Thank you for creating an account. Please verify your email address to complete your registration.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}"
             style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Verify Email Address
          </a>
        </div>
        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
        <p>This link will expire in 24 hours.</p>
        <p>If you didn't create an account, please ignore this email.</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px;">
          SNP3D Store - 3D Print Attribution Catalog<br>
          Questions? Contact us at support@snp3d.ca
        </p>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};

// Send password reset email
const sendPasswordResetEmail = async (email, token, username) => {
  const transporter = createTransporter();

  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;

  const mailOptions = {
    from: `"SNP3D Store" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Reset Your SNP3D Password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>Hi ${username},</p>
        <p>We received a request to reset your password for your SNP3D Store account. Click the button below to create a new password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}"
             style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666;">${resetUrl}</p>
        <p>This link will expire in 24 hours.</p>
        <p>If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px;">
          SNP3D Store - 3D Print Attribution Catalog<br>
          Questions? Contact us at support@snp3d.ca
        </p>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};

// Send order confirmation email
const sendOrderConfirmationEmail = async (email, orderDetails, username) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: `"SNP3D Store" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `Order Confirmation - SNP3D Store #${orderDetails.id}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Order Confirmation</h2>
        <p>Hi ${username},</p>
        <p>Thank you for your order! Here are the details:</p>

        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3>Order #${orderDetails.id}</h3>
          <p><strong>Status:</strong> ${orderDetails.status}</p>
          <p><strong>Total:</strong> $${orderDetails.total.toFixed(2)}</p>
          <p><strong>Order Date:</strong> ${new Date(orderDetails.created_at).toLocaleDateString()}</p>
        </div>

        <h3>Items Ordered:</h3>
        <ul>
          ${orderDetails.items.map(item => `
            <li>${item.name} (${item.color}) - $${item.price.toFixed(2)} x ${item.quantity}</li>
          `).join('')}
        </ul>

        <p>We will notify you when your order is ready for pickup or shipping.</p>

        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px;">
          SNP3D Store - 3D Print Attribution Catalog<br>
          Questions? Contact us at support@snp3d.ca
        </p>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};

// Send order status update email
const sendOrderStatusUpdateEmail = async (email, orderDetails, username) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: `"SNP3D Store" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `Order Update - SNP3D Store #${orderDetails.id}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Order Status Update</h2>
        <p>Hi ${username},</p>
        <p>Your order status has been updated:</p>

        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3>Order #${orderDetails.id}</h3>
          <p><strong>New Status:</strong> ${orderDetails.status}</p>
          <p><strong>Total:</strong> $${orderDetails.total.toFixed(2)}</p>
          <p><strong>Last Updated:</strong> ${new Date(orderDetails.updated_at).toLocaleDateString()}</p>
        </div>

        ${orderDetails.status === 'Ready for Pickup' ?
          '<p>Your order is ready for pickup at our store!</p>' :
          orderDetails.status === 'Shipped' ?
          '<p>Your order has been shipped and is on its way!</p>' :
          '<p>We will keep you updated on your order progress.</p>'
        }

        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px;">
          SNP3D Store - 3D Print Attribution Catalog<br>
          Questions? Contact us at support@snp3d.ca
        </p>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendOrderConfirmationEmail,
  sendOrderStatusUpdateEmail
};