const express = require('express');
const router = express.Router();
const { auth } = require('../middlewares/auth');
const { 
  createUpdate, 
  getUpdates, 
  getAnalytics, 
  getLeadUpdates,
  updateRecord 
} = require('../controllers/dailyUpdates.controller');

router.post('/', auth, createUpdate);
router.put('/:id', auth, updateRecord);
router.get('/', auth, getUpdates);
router.get('/analytics', auth, getAnalytics);
router.get('/lead/:leadId', auth, getLeadUpdates);

module.exports = router;
