const asyncHandler = require('express-async-handler');
const prisma = require('../config/db');
const { buildQueryOptions } = require('../utils/apiFeatures');
const { sendEmail } = require('../config/mailer');

// @route GET /api/hazard-reports
const getAll = asyncHandler(async (req, res) => {
  const { where, skip, take, orderBy, page, limit } = buildQueryOptions(req.query, {
    searchableFields: ['title', 'description', 'location'],
  });

  if (req.user.companyId) where.companyId = req.user.companyId;
  if (req.user.role === 'USER') where.userId = req.user.id;
  if (req.query.riskLevel) where.riskLevel = req.query.riskLevel;

  const [data, total] = await Promise.all([
    prisma.hazardReport.findMany({
      where, skip, take, orderBy,
      include: { user: { select: { id: true, name: true } } },
    }),
    prisma.hazardReport.count({ where }),
  ]);

  res.json({ success: true, data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

// @route GET /api/hazard-reports/:id
const getOne = asyncHandler(async (req, res) => {
  const item = await prisma.hazardReport.findUnique({
    where: { id: Number(req.params.id) },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  if (!item) {
    res.status(404);
    throw new Error('Hazard report not found');
  }
  res.json({ success: true, data: item });
});

// @route POST /api/hazard-reports  (multi-step form: title/desc/location -> risk -> photo)
const create = asyncHandler(async (req, res) => {
  const { title, description, location, category, riskLevel } = req.body;

  const item = await prisma.hazardReport.create({
    data: {
      userId: req.user.id,
      companyId: req.user.companyId,
      title,
      description,
      location,
      category,
      riskLevel,
      photoUrl: req.file?.path || null,
    },
  });

  // Notifikasi email untuk risiko tinggi
  if (['High', 'Extreme'].includes(riskLevel)) {
    const admins = await prisma.user.findMany({
      where: { companyId: req.user.companyId, role: { in: ['ADMIN', 'SUPERVISOR'] } },
      select: { email: true },
    });
    admins.forEach((a) =>
      sendEmail({
        to: a.email,
        subject: `[HIGH RISK] New Hazard Report: ${title}`,
        html: `<p>A new <b>${riskLevel}</b> risk hazard was reported at ${location}.</p><p>${description}</p>`,
      }).catch((e) => console.error('Email failed:', e.message))
    );
  }

  res.status(201).json({ success: true, data: item });
});

// @route PUT /api/hazard-reports/:id
const update = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const existing = await prisma.hazardReport.findUnique({ where: { id } });
  if (!existing) {
    res.status(404);
    throw new Error('Hazard report not found');
  }

  const data = { ...req.body };
  if (req.file?.path) data.photoUrl = req.file.path;
  if (data.status === 'CLOSED' && !existing.closedAt) data.closedAt = new Date();

  const item = await prisma.hazardReport.update({ where: { id }, data });
  res.json({ success: true, data: item });
});

// @route DELETE /api/hazard-reports/:id
const remove = asyncHandler(async (req, res) => {
  await prisma.hazardReport.delete({ where: { id: Number(req.params.id) } });
  res.json({ success: true, message: 'Hazard report deleted' });
});

// @route GET /api/hazard-reports/stats/summary  (dashboard widget)
const stats = asyncHandler(async (req, res) => {
  const where = req.user.companyId ? { companyId: req.user.companyId } : {};

  const [total, open, closed, byRisk] = await Promise.all([
    prisma.hazardReport.count({ where }),
    prisma.hazardReport.count({ where: { ...where, status: 'OPEN' } }),
    prisma.hazardReport.count({ where: { ...where, status: 'CLOSED' } }),
    prisma.hazardReport.groupBy({ by: ['riskLevel'], where, _count: true }),
  ]);

  res.json({ success: true, data: { total, open, closed, byRisk } });
});

module.exports = { getAll, getOne, create, update, remove, stats };
