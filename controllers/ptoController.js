const createCrudController = require('./genericController');
const base = createCrudController('pTO', { searchableFields: ['type', 'reason'] });
const asyncHandler = require('express-async-handler');
const prisma = require('../config/db');

// Tambahan: approve/reject khusus untuk ADMIN/SUPERVISOR
const setApproval = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body; // APPROVED | REJECTED

  const item = await prisma.pTO.update({
    where: { id },
    data: { status, approvedBy: req.user.id },
  });

  res.json({ success: true, data: item });
});

module.exports = { ...base, setApproval };
