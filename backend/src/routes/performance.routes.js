const express = require('express');
const router = express.Router();
const performanceController = require('../controllers/performance.controller');
const { auth } = require('../middlewares/auth');

router.use(auth);

router.get('/', performanceController.getPerformance);

module.exports = router;
