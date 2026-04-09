const express = require('express');
const router = express.Router();
const { getPublicHostProfile } = require('../controllers/publicHostController');
const { mongoIdParam } = require('../middleware/validate');

router.get('/:id', mongoIdParam(), getPublicHostProfile);

module.exports = router;
