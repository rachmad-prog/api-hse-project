// License Token generator & verifier
// Setiap company punya "license key" berupa JWT yang berisi companyId, type, maxUsers, expiresAt.
// Token ini disimpan di kolom License.key dan diverifikasi di middleware/checkLicense.js
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const LICENSE_SECRET = process.env.LICENSE_SECRET || 'fallback_license_secret';

/**
 * Generate a signed license token (JWT) - fungsi "buatkan token license"
 * @param {{companyId:number, type:string, maxUsers:number, expiresAt:Date}} data
 */
function generateLicenseToken({ companyId, type, maxUsers, expiresAt }) {
  const jti = crypto.randomUUID(); // unique license id, untuk revocation tracking

  const expSeconds = Math.floor(new Date(expiresAt).getTime() / 1000);

  return jwt.sign(
    {
      companyId,
      type,
      maxUsers,
      jti,
    },
    LICENSE_SECRET,
    { expiresIn: expSeconds - Math.floor(Date.now() / 1000) }
  );
}

/**
 * Verify a license token. Throws if invalid/expired.
 */
function verifyLicenseToken(token) {
  return jwt.verify(token, LICENSE_SECRET);
}

/**
 * Format a human-readable license key, e.g. HSE-PRO-XXXX-XXXX-XXXX
 * (Bisa dipakai sebagai "serial" tampilan, terpisah dari JWT token asli)
 */
function generateReadableLicenseCode(type = 'TRIAL') {
  const segment = () => crypto.randomBytes(2).toString('hex').toUpperCase();
  return `HSE-${type}-${segment()}-${segment()}-${segment()}`;
}

module.exports = {
  generateLicenseToken,
  verifyLicenseToken,
  generateReadableLicenseCode,
};
