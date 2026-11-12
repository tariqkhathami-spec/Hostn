const express = require('express');
const router = express.Router();
const {
  register,
  login,
  refresh,
  logout,
  logoutAll,
  getMe,
  updateProfile,
  changePassword,
  upgradeToHost,
  toggleWishlist,
  forgotPassword,
  resetPassword,
  linkPhone,
  linkEmail,
  deleteAccount,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const {
  registerRules,
  loginRules,
  updateProfileRules,
  changePasswordRules,
  mongoIdParam,
} = require('../middleware/validate');

router.post('/register', registerRules, register);
router.post('/login', loginRules, login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.post('/logout-all', protect, logoutAll);
router.get('/me', protect, getMe);
router.get('/socket-token', protect, require('../controllers/authController').getSocketToken);
router.put('/profile', protect, updateProfileRules, updateProfile);
router.put('/change-password', protect, changePasswordRules, changePassword);
router.put('/upgrade-to-host', protect, upgradeToHost);
router.put('/link-phone', protect, linkPhone);
router.put('/link-email', protect, linkEmail);
router.post('/wishlist/:propertyId', protect, mongoIdParam('propertyId'), toggleWishlist);
router.delete('/account', protect, deleteAccount);

module.exports = router;
