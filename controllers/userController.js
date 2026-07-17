const asyncHandler = require('express-async-handler');
const bcrypt = require('bcryptjs');
const prisma = require('../config/db');
const { buildQueryOptions } = require('../utils/apiFeatures');
const { sendEmail } = require('../config/mailer');

// @route GET /api/users  (ADMIN only - list users in own company)
const getAll = asyncHandler(async (req, res) => {
  const { where, skip, take, orderBy, page, limit } = buildQueryOptions(req.query, {
    searchableFields: ['name', 'email'],
  });
  where.companyId = req.user.companyId;

  const [data, total] = await Promise.all([
    prisma.user.findMany({
      where, skip, take, orderBy,
      select: { id: true, name: true, email: true, role: true, position: true, isActive: true, createdAt: true },
    }),
    prisma.user.count({ where }),
  ]);

  res.json({ success: true, data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

// @route POST /api/users  (ADMIN invites a new user, enforces license maxUsers)
const create = asyncHandler(async (req, res) => {
  const { name, email, password, role, position, phone } = req.body;

  const currentCount = await prisma.user.count({ where: { companyId: req.user.companyId } });
  if (req.license && currentCount >= req.license.maxUsers) {
    res.status(403);
    throw new Error(`User limit reached (${req.license.maxUsers}). Please upgrade your license.`);
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(400);
    throw new Error('Email already registered');
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      name, email, password: hashedPassword,
      role: role || 'USER', position, phone,
      companyId: req.user.companyId,
    },
    select: { id: true, name: true, email: true, role: true },
  });

  sendEmail({
    to: email,
    subject: 'You have been added to HSE System',
    html: `<p>Hi ${name}, an account has been created for you. Temporary password: <b>${password}</b></p>`,
  }).catch((e) => console.error('Email failed:', e.message));

  res.status(201).json({ success: true, data: user });
});

// @route PUT /api/users/:id
const update = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { name, role, position, phone, isActive } = req.body;

  const user = await prisma.user.update({
    where: { id },
    data: { name, role, position, phone, isActive },
    select: { id: true, name: true, email: true, role: true, isActive: true },
  });

  res.json({ success: true, data: user });
});

// @route DELETE /api/users/:id
const remove = asyncHandler(async (req, res) => {
  await prisma.user.delete({ where: { id: Number(req.params.id) } });
  res.json({ success: true, message: 'User deleted' });
});

// @route PUT /api/users/me/avatar (upload cloudinary)
const updateAvatar = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error('No image uploaded');
  }
  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: { avatarUrl: req.file.path },
    select: { id: true, avatarUrl: true },
  });
  res.json({ success: true, data: user });
});

module.exports = { getAll, create, update, remove, updateAvatar };
