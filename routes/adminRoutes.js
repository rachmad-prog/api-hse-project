// Route khusus SUPERADMIN platform (mengelola semua company & license, multi-tenant)
const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const licenseCtrl = require('../controllers/licenseController');

const router = express.Router();

router.use(protect, authorize('SUPERADMIN'));

router.get('/licenses', licenseCtrl.getAllLicenses);
router.post('/licenses', licenseCtrl.issueLicense);
router.put('/licenses/:id/revoke', licenseCtrl.revokeLicense);

module.exports = router;
