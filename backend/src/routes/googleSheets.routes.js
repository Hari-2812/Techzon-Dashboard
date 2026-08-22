const express = require('express');
const router = express.Router();
const { auth, checkRole } = require('../middlewares/auth');
const { 
    getStatus,
    generateAuthUrl,
    handleOAuthCallback,
    getSheets,
    getSettings,
    updateSettings,
    executeSync,
    getSyncHistory
} = require('../controllers/googleSheets.controller');

// Public endpoint for Google redirect
router.get('/oauth/callback', handleOAuthCallback);
router.get('/oauth/start', generateAuthUrl);

// All Google Sheets APIs are Admin-only
router.use(auth);
router.use(checkRole('ADMIN'));

router.get('/status', getStatus);
router.get('/sheets', getSheets);
router.get('/settings', getSettings);
router.put('/settings', updateSettings);
router.post('/sync', executeSync);
router.get('/sync-history', getSyncHistory);

module.exports = router;
