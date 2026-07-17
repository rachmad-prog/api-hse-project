const asyncHandler = require('express-async-handler');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/db');
const { generateAccessToken, generateRefreshToken } = require('../utils/generateToken');
const { generateLicenseToken } = require('../utils/license');
const { sendEmail } = require('../config/mailer');

// @desc    Register a new company + admin user (tenant onboarding)
// @route   POST /api/auth/register-company
const registerCompany = asyncHandler(async (req, res) => {
  const { companyName, name, email, password } = req.body;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(400);
    throw new Error('Email already registered');
  }

  const company = await prisma.company.create({ data: { name: companyName } });

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 14); // trial 14 hari

  const licenseKey = generateLicenseToken({
    companyId: company.id,
    type: 'TRIAL',
    maxUsers: 5,
    expiresAt,
  });

  await prisma.license.create({
    data: { key: licenseKey, type: 'TRIAL', maxUsers: 5, expiresAt, companyId: company.id },
  });

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: { name, email, password: hashedPassword, role: 'ADMIN', companyId: company.id },
  });

  const accessToken = generateAccessToken({ id: user.id, role: user.role });
  const refreshToken = generateRefreshToken({ id: user.id });

  await prisma.user.update({ where: { id: user.id }, data: { refreshToken } });

  sendEmail({
    to: email,
    subject: 'Welcome to HSE System',
    html: `<p>Hi ${name}, your company <b>${companyName}</b> trial license is active for 14 days.</p>`,
  }).catch((e) => console.error('Email failed:', e.message));

  res.status(201).json({
    success: true,
    accessToken,
    refreshToken,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, companyId: company.id },
  });
});

// @desc    Login
// @route   POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    res.status(401);
    throw new Error('Invalid email or password');
  }

  if (!user.isActive) {
    res.status(403);
    throw new Error('Account has been deactivated');
  }

  const accessToken = generateAccessToken({ id: user.id, role: user.role });
  const refreshToken = generateRefreshToken({ id: user.id });

  await prisma.user.update({ where: { id: user.id }, data: { refreshToken } });

  res.json({
    success: true,
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
      avatarUrl: user.avatarUrl,
    },
  });
});

// @desc    Refresh access token
// @route   POST /api/auth/refresh
const refreshToken = asyncHandler(async (req, res) => {
  const { token } = req.body;
  if (!token) {
    res.status(401);
    throw new Error('Refresh token required');
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch (err) {
    res.status(403);
    throw new Error('Invalid or expired refresh token');
  }

  const user = await prisma.user.findUnique({ where: { id: decoded.id } });
  if (!user || user.refreshToken !== token) {
    res.status(403);
    throw new Error('Refresh token does not match');
  }

  const accessToken = generateAccessToken({ id: user.id, role: user.role });
  res.json({ success: true, accessToken });
});

// @desc    Logout
// @route   POST /api/auth/logout
const logout = asyncHandler(async (req, res) => {
  await prisma.user.update({ where: { id: req.user.id }, data: { refreshToken: null } });
  res.json({ success: true, message: 'Logged out successfully' });
});

// @desc    Get current logged-in user profile
// @route   GET /api/auth/me
const getMe = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true, name: true, email: true, role: true, position: true,
      phone: true, avatarUrl: true, companyId: true, createdAt: true,
      company: { select: { id: true, name: true, logoUrl: true } },
    },
  });
  res.json({ success: true, data: user });
});

// @desc    Forgot password - send reset link via email
// @route   POST /api/auth/forgot-password
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });

  // Selalu balas sukses walau user tidak ditemukan (mencegah user enumeration)
  if (user) {
    const resetToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '15m' });
    const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;

    sendEmail({
      to: email,
      subject: 'Reset Your Password',
      html: `<p>Click <a href="${resetUrl}">here</a> to reset your password. Link expires in 15 minutes.</p>`,
    }).catch((e) => console.error('Email failed:', e.message));
  }

  res.json({ success: true, message: 'If the email exists, a reset link has been sent.' });
});

// @desc    Reset password using token from email
// @route   POST /api/auth/reset-password
const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    res.status(400);
    throw new Error('Invalid or expired reset token');
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: decoded.id }, data: { password: hashedPassword } });

  res.json({ success: true, message: 'Password reset successfully' });
});

module.exports = {
  registerCompany,
  login,
  refreshToken,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
};
