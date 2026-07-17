// Seed script - creates a demo company, license, and admin user
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { generateLicenseToken } = require('../utils/license');

const prisma = new PrismaClient();

async function main() {
  const company = await prisma.company.create({
    data: { name: 'Demo Company', address: 'Jakarta, Indonesia' },
  });

  const expiresAt = new Date();
  expiresAt.setFullYear(expiresAt.getFullYear() + 1);

  const licenseKey = generateLicenseToken({
    companyId: company.id,
    type: 'PRO',
    maxUsers: 50,
    expiresAt,
  });

  await prisma.license.create({
    data: {
      key: licenseKey,
      type: 'PRO',
      maxUsers: 50,
      expiresAt,
      companyId: company.id,
    },
  });

  const hashedPassword = await bcrypt.hash('Admin123!', 10);

  await prisma.user.create({
    data: {
      name: 'Super Admin',
      email: 'admin@hse.com',
      password: hashedPassword,
      role: 'ADMIN',
      companyId: company.id,
    },
  });

  console.log('Seed complete.');
  console.log('Login: admin@hse.com / Admin123!');
  console.log('License Key:', licenseKey);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
