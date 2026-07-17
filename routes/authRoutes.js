const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const ctrl = require('../controllers/authController');

const router = express.Router();

router.post(
  '/register-company',
  [
    body('companyName').notEmpty().withMessage('Company name is required'),
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  validate,
  ctrl.registerCompany
);

router.post(
  '/login',
  [body('email').isEmail(), body('password').notEmpty()],
  validate,
  ctrl.login
);

router.post('/refresh', ctrl.refreshToken);
router.post('/logout', protect, ctrl.logout);
router.get('/me', protect, ctrl.getMe);
router.post('/forgot-password', [body('email').isEmail()], validate, ctrl.forgotPassword);
router.post(
  '/reset-password',
  [body('token').notEmpty(), body('newPassword').isLength({ min: 6 })],
  validate,
  ctrl.resetPassword
);

module.exports = router;
