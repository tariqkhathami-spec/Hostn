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
router.post('/refresh', refresh);
router.post('/logout', logout);
router.post('/logout-all', protect, logoutAll);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfileRules, updateProfile);
router.put('/change-password', protect, changePasswordRules, changePassword);
router.put('/upgrade-to-host', protect, upgradeToHost);
router.post('/wishlist/:propertyId', protect, mongoIdParam('propertyId'), toggleWishlist);

module.exports = router;
