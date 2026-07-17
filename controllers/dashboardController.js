const asyncHandler = require('express-async-handler');
const prisma = require('../config/db');

// @route GET /api/dashboard/summary  (agregat semua modul untuk halaman Dashboard)
const getSummary = asyncHandler(async (req, res) => {
  const companyId = req.user.companyId;
  const userScope = req.user.role === 'USER' ? { userId: req.user.id } : {};

  const [
    totalUsers,
    hazardOpen,
    hazardTotal,
    fitTodayNotFit,
    pendingTasks,
    pendingPTO,
    recentInspeksi,
  ] = await Promise.all([
    prisma.user.count({ where: { companyId } }),
    prisma.hazardReport.count({ where: { companyId, status: 'OPEN' } }),
    prisma.hazardReport.count({ where: { companyId } }),
    prisma.fitToWork.count({
      where: { ...userScope, status: 'Not Fit', createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
    }),
    prisma.tasklist.count({ where: { ...userScope, status: { not: 'Done' } } }),
    prisma.pTO.count({ where: { ...userScope, status: 'PENDING' } }),
    prisma.inspeksi.findMany({ where: userScope, orderBy: { createdAt: 'desc' }, take: 5 }),
  ]);

  res.json({
    success: true,
    data: { totalUsers, hazardOpen, hazardTotal, fitTodayNotFit, pendingTasks, pendingPTO, recentInspeksi },
  });
});

module.exports = { getSummary };
