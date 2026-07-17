// Factory untuk generate CRUD controller sederhana & konsisten
// dipakai oleh Take5, Tasklist, PTO, Inspeksi (modul dengan pola serupa: milik user, scoped by ownership)
const asyncHandler = require('express-async-handler');
const prisma = require('../config/db');
const { buildQueryOptions } = require('../utils/apiFeatures');

function createCrudController(model, { searchableFields = [], ownerField = 'userId' } = {}) {
  const getAll = asyncHandler(async (req, res) => {
    const { where, skip, take, orderBy, page, limit } = buildQueryOptions(req.query, { searchableFields });

    if (req.user.role === 'USER') where[ownerField] = req.user.id;

    const [data, total] = await Promise.all([
      prisma[model].findMany({
        where, skip, take, orderBy,
        include: { user: { select: { id: true, name: true } } },
      }),
      prisma[model].count({ where }),
    ]);

    res.json({ success: true, data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  });

  const getOne = asyncHandler(async (req, res) => {
    const item = await prisma[model].findUnique({
      where: { id: Number(req.params.id) },
      include: { user: { select: { id: true, name: true } } },
    });
    if (!item) {
      res.status(404);
      throw new Error('Record not found');
    }
    res.json({ success: true, data: item });
  });

  const create = asyncHandler(async (req, res) => {
    const payload = { ...req.body, [ownerField]: req.user.id };
    if (req.file?.path) payload.photoUrl = req.file.path;
    const item = await prisma[model].create({ data: payload });
    res.status(201).json({ success: true, data: item });
  });

  const update = asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const existing = await prisma[model].findUnique({ where: { id } });
    if (!existing) {
      res.status(404);
      throw new Error('Record not found');
    }
    if (req.user.role === 'USER' && existing[ownerField] !== req.user.id) {
      res.status(403);
      throw new Error('Not allowed to edit this record');
    }
    const payload = { ...req.body };
    if (req.file?.path) payload.photoUrl = req.file.path;
    const item = await prisma[model].update({ where: { id }, data: payload });
    res.json({ success: true, data: item });
  });

  const remove = asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const existing = await prisma[model].findUnique({ where: { id } });
    if (!existing) {
      res.status(404);
      throw new Error('Record not found');
    }
    if (req.user.role === 'USER' && existing[ownerField] !== req.user.id) {
      res.status(403);
      throw new Error('Not allowed to delete this record');
    }
    await prisma[model].delete({ where: { id } });
    res.json({ success: true, message: 'Record deleted' });
  });

  return { getAll, getOne, create, update, remove };
}

module.exports = createCrudController;
