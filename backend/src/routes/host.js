const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getRecentBookings,
  getNotifications,
  getEarnings,
  getCalendar,
  blockDates,
  getHostReviews,
  togglePropertyStatus,
  addPropertyImage,
  removePropertyImage,
  getHostProperties,
  getHostBookings,
  getUpcomingGuests,
  getHostProfile,
  getHostCalendarAll,
  getHostDashboardStats,
} = require('../controllers/hostController');
const {
  getFinanceSummary,
  getPayouts,
  getPayoutDetail,
  getInvoices,
  getInvoiceDetail,
  getStatements,
  getStatementDetail,
  getBankAccount,
  upsertBankAccount,
  deleteBankAccount,
  updateTransferDuration,
} = require('../controllers/hostFinanceController');
const {
  getPropertiesWithUnits,
  getUnitPoints,
} = require('../controllers/unitPointsController');
const {
  getLicenseOverview,
  upsertLicense,
  deleteLicense,
} = require('../controllers/tourismLicenseController');
const {
  getLoyaltyStatus,
  getLoyaltySummary,
} = require('../controllers/hostLoyaltyController');
const { protect, authorize } = require('../middleware/auth');
const { blockDatesRules, mongoIdParam } = require('../middleware/validate');
const { uploadSingle } = require('../middleware/upload');

// All routes require host or admin role
router.use(protect);
router.use(authorize('host', 'admin'));

// Dashboard
router.get('/stats', getDashboardStats);
router.get('/dashboard/stats', getHostDashboardStats);
router.get('/recent-bookings', getRecentBookings);
router.get('/notifications', getNotifications);
router.get('/earnings', getEarnings);

// Finance
router.get('/finance/summary', getFinanceSummary);
router.get('/finance/payouts', getPayouts);
router.get('/finance/payouts/:id', getPayoutDetail);
router.get('/finance/invoices', getInvoices);
router.get('/finance/invoices/:id', getInvoiceDetail);
router.get('/finance/statements', getStatements);
router.get('/finance/statements/:id', getStatementDetail);
router.get('/finance/bank-account', getBankAccount);
router.put('/finance/bank-account', upsertBankAccount);
router.delete('/finance/bank-account', deleteBankAccount);
router.put('/finance/transfer-duration', updateTransferDuration);

// Properties (grouped as property → units for host app)
router.get('/properties', getHostProperties);
router.put('/properties/:id/toggle', mongoIdParam(), togglePropertyStatus);
router.post('/properties/:id/images', mongoIdParam(), uploadSingle, addPropertyImage);
router.delete('/properties/:id/images', mongoIdParam(), removePropertyImage);

// Bookings
router.get('/bookings', getHostBookings);
router.get('/bookings/upcoming', getUpcomingGuests);

// Calendar
router.get('/calendar', getHostCalendarAll);
router.get('/calendar/:propertyId', mongoIdParam('propertyId'), getCalendar);
router.put('/calendar/:propertyId/block', mongoIdParam('propertyId'), blockDatesRules, blockDates);

// Reviews
router.get('/reviews', getHostReviews);

// Unit Points
router.get('/properties-units', getPropertiesWithUnits);
router.get('/units/:unitId/points', mongoIdParam('unitId'), getUnitPoints);

// Host Loyalty
router.get('/loyalty', getLoyaltyStatus);
router.get('/loyalty/summary', getLoyaltySummary);

// Tourism License
router.get('/tourism-license', getLicenseOverview);
router.put('/units/:unitId/tourism-license', mongoIdParam('unitId'), upsertLicense);
router.delete('/units/:unitId/tourism-license', mongoIdParam('unitId'), deleteLicense);

// Profile
router.get('/profile', getHostProfile);

module.exports = router;
