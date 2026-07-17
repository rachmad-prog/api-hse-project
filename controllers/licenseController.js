const asyncHandler = require('express-async-handler');
const prisma = require('../config/db');
const { generateLicenseToken, generateReadableLicenseCode } = require('../utils/license');

// @route GET /api/license  (current company's license info)
const getMyLicense = asyncHandler(async (req, res) => {
  const license = await prisma.license.findUnique({ where: { companyId: req.user.companyId } });
  if (!license) {
    res.status(404);
    throw new Error('No license found for your company');
  }
  const userCount = await prisma.user.count({ where: { companyId: req.user.companyId } });
  res.json({ success: true, data: { ...license, currentUsers: userCount } });
});

// @route POST /api/admin/licenses  (SUPERADMIN: generate a new license/token for a company)
const issueLicense = asyncHandler(async (req, res) => {
  const { companyId, type, maxUsers, durationDays } = req.body;

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + (Number(durationDays) || 365));

  const key = generateLicenseToken({ companyId: Number(companyId), type, maxUsers: Number(maxUsers), expiresAt });
  const readableCode = generateReadableLicenseCode(type);

  const license = await prisma.license.upsert({
    where: { companyId: Number(companyId) },
    update: { key, type, maxUsers: Number(maxUsers), expiresAt, isActive: true },
    create: { key, type, maxUsers: Number(maxUsers), expiresAt, companyId: Number(companyId) },
  });

  res.status(201).json({ success: true, data: { ...license, readableCode } });
});

// @route PUT /api/admin/licenses/:id/revoke  (SUPERADMIN)
const revokeLicense = asyncHandler(async (req, res) => {
  const license = await prisma.license.update({
    where: { id: Number(req.params.id) },
    data: { isActive: false },
  });
  res.json({ success: true, data: license });
});

// @route GET /api/admin/licenses  (SUPERADMIN: list all)
const getAllLicenses = asyncHandler(async (req, res) => {
  const licenses = await prisma.license.findMany({ include: { company: true } });
  res.json({ success: true, data: licenses });
});

module.exports = { getMyLicense, issueLicense, revokeLicense, getAllLicenses };
