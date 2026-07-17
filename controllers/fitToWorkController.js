const asyncHandler = require('express-async-handler');
const prisma = require('../config/db');
const { buildQueryOptions } = require('../utils/apiFeatures');

// @route GET /api/fit-to-work
const getAll = asyncHandler(async (req, res) => {
  const { where, skip, take, orderBy, page, limit } = buildQueryOptions(req.query, {
    searchableFields: ['status', 'notes'],
  });

  // USER hanya lihat data sendiri, ADMIN/SUPERVISOR lihat semua di company-nya
  if (req.user.role === 'USER') where.userId = req.user.id;

  const [data, total] = await Promise.all([
    prisma.fitToWork.findMany({
      where,
      skip,
      take,
      orderBy,
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
    prisma.fitToWork.count({ where }),
  ]);

  res.json({ success: true, data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

// @route GET /api/fit-to-work/:id
const getOne = asyncHandler(async (req, res) => {
  const item = await prisma.fitToWork.findUnique({
    where: { id: Number(req.params.id) },
    include: { user: { select: { id: true, name: true } } },
  });
  if (!item) {
    res.status(404);
    throw new Error('Record not found');
  }
  res.json({ success: true, data: item });
});

// @route POST /api/fit-to-work
const create = asyncHandler(async (req, res) => {
  const { status, bloodPressure, heartRate, temperature, fatigueLevel, notes } = req.body;

  const item = await prisma.fitToWork.create({
    data: {
      userId: req.user.id,
      status,
      bloodPressure,
      heartRate: heartRate ? Number(heartRate) : null,
      temperature: temperature ? Number(temperature) : null,
      fatigueLevel,
      notes,
      signatureUrl: req.file?.path || null,
    },
  });

  res.status(201).json({ success: true, data: item });
});

// @route PUT /api/fit-to-work/:id
const update = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const existing = await prisma.fitToWork.findUnique({ where: { id } });
  if (!existing) {
    res.status(404);
    throw new Error('Record not found');
  }
  if (existing.userId !== req.user.id && req.user.role === 'USER') {
    res.status(403);
    throw new Error('Not allowed to edit this record');
  }

  const item = await prisma.fitToWork.update({ where: { id }, data: req.body });
  res.json({ success: true, data: item });
});

// @route DELETE /api/fit-to-work/:id
const remove = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  await prisma.fitToWork.delete({ where: { id } });
  res.json({ success: true, message: 'Record deleted' });
});

module.exports = { getAll, getOne, create, update, remove };
