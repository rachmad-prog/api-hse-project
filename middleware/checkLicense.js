// Middleware: memastikan license perusahaan masih aktif & belum expired
const asyncHandler = require('express-async-handler');
const prisma = require('../config/db');
const { verifyLicenseToken } = require('../utils/license');

const checkLicense = asyncHandler(async (req, res, next) => {
  if (!req.user?.companyId) {
    return next(); // SUPERADMIN tanpa company dilewatkan
  }

  const license = await prisma.license.findUnique({
    where: { companyId: req.user.companyId },
  });

  if (!license || !license.isActive) {
    res.status(403);
    throw new Error('License is not active. Please contact your administrator.');
  }

  if (new Date(license.expiresAt) < new Date()) {
    res.status(403);
    throw new Error('License has expired. Please renew your subscription.');
  }

  try {
    verifyLicenseToken(license.key);
  } catch (err) {
    res.status(403);
    throw new Error('Invalid or corrupted license token.');
  }

  req.license = license;
  next();
});

module.exports = checkLicense;
