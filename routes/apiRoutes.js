// Router gabungan untuk semua modul HSE (Fit To Work, Hazard, Take5, Tasklist, PTO, Inspeksi)
// + Users, License, Dashboard
const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const checkLicense = require('../middleware/checkLicense');
const { upload } = require('../config/cloudinary');

const fitToWork = require('../controllers/fitToWorkController');
const hazard = require('../controllers/hazardController');
const take5 = require('../controllers/take5Controller');
const tasklist = require('../controllers/tasklistController');
const pto = require('../controllers/ptoController');
const inspeksi = require('../controllers/inspeksiController');
const users = require('../controllers/userController');
const license = require('../controllers/licenseController');
const dashboard = require('../controllers/dashboardController');

const router = express.Router();

// Semua route di bawah ini wajib login + license aktif
router.use(protect, checkLicense);

/* ---------- Dashboard ---------- */
router.get('/dashboard/summary', dashboard.getSummary);

/* ---------- Fit To Work ---------- */
router
  .route('/fit-to-work')
  .get(fitToWork.getAll)
  .post(upload.single('signature'), fitToWork.create);
router
  .route('/fit-to-work/:id')
  .get(fitToWork.getOne)
  .put(fitToWork.update)
  .delete(authorize('ADMIN', 'SUPERVISOR'), fitToWork.remove);

/* ---------- Hazard Report (multi-step form + photo) ---------- */
router.get('/hazard-reports/stats/summary', hazard.stats);
router
  .route('/hazard-reports')
  .get(hazard.getAll)
  .post(upload.single('photo'), hazard.create);
router
  .route('/hazard-reports/:id')
  .get(hazard.getOne)
  .put(upload.single('photo'), hazard.update)
  .delete(authorize('ADMIN', 'SUPERVISOR'), hazard.remove);

/* ---------- Take 5 ---------- */
router.route('/take5').get(take5.getAll).post(take5.create);
router.route('/take5/:id').get(take5.getOne).put(take5.update).delete(take5.remove);

/* ---------- Tasklist ---------- */
router.route('/tasklist').get(tasklist.getAll).post(tasklist.create);
router.route('/tasklist/:id').get(tasklist.getOne).put(tasklist.update).delete(tasklist.remove);

/* ---------- PTO (Permit To Work / cuti) ---------- */
router.route('/pto').get(pto.getAll).post(pto.create);
router.route('/pto/:id').get(pto.getOne).put(pto.update).delete(pto.remove);
router.put('/pto/:id/approval', authorize('ADMIN', 'SUPERVISOR'), pto.setApproval);

/* ---------- Inspeksi (digital checklist) ---------- */
router
  .route('/inspeksi')
  .get(inspeksi.getAll)
  .post(upload.single('photo'), inspeksi.create);
router
  .route('/inspeksi/:id')
  .get(inspeksi.getOne)
  .put(upload.single('photo'), inspeksi.update)
  .delete(inspeksi.remove);

/* ---------- Users (Admin dashboard - manajemen user) ---------- */
router.get('/users', authorize('ADMIN', 'SUPERVISOR'), users.getAll);
router.post('/users', authorize('ADMIN'), users.create);
router.put('/users/:id', authorize('ADMIN'), users.update);
router.delete('/users/:id', authorize('ADMIN'), users.remove);
router.put('/users/me/avatar', upload.single('avatar'), users.updateAvatar);

/* ---------- License ---------- */
router.get('/license', license.getMyLicense);

module.exports = router;
