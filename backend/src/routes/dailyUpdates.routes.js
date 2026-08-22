const express = require('express');
const router = express.Router();
const { auth } = require('../middlewares/auth');
const { 
  createUpdate, 
  getUpdates, 
  getAnalytics, 
  getLeadUpdates 
} = require('../controllers/dailyUpdates.controller');

router.post('/', auth, createUpdate);
router.get('/', auth, getUpdates);
router.get('/analytics', auth, getAnalytics);
router.get('/lead/:leadId', auth, getLeadUpdates);

module.exports = router;
