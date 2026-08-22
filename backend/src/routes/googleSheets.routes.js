const express = require('express');
const router = express.Router();
const { auth, checkRole } = require('../middlewares/auth');
const { 
    getStatus,
    generateAuthUrl,
    handleOAuthCallback,
    getSettings,
    updateSettings,
    executeSync,
    getSyncHistory
} = require('../controllers/googleSheets.controller');

// Public endpoint for Google redirect (verifies state internally)
router.get('/oauth/callback', handleOAuthCallback);

// All Google Sheets APIs are Admin-only
router.use(auth);
router.use(checkRole('ADMIN'));

router.get('/auth', generateAuthUrl);
router.get('/status', getStatus);
router.get('/settings', getSettings);
router.put('/settings', updateSettings);
router.post('/sync', executeSync);
router.get('/sync-history', getSyncHistory);

module.exports = router;
