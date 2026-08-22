const express = require('express');
const router = express.Router();
const { auth, checkRole } = require('../middlewares/auth');
const { 
    getAuthStatus,
    generateAuthUrl,
    handleOAuthCallback,
    getSettings,
    updateSettings,
    connectAndGetWorksheets,
    previewSync,
    executeSync,
    getSyncHistory
} = require('../controllers/googleSheets.controller');

// Public endpoint for Google redirect (verifies state internally)
router.get('/callback', handleOAuthCallback);

// All other Google Sheets APIs are Admin-only
router.use(auth);
router.use(checkRole('ADMIN'));

router.get('/auth-status', getAuthStatus);
router.get('/auth', generateAuthUrl);

router.get('/settings', getSettings);
router.put('/settings', updateSettings);
router.post('/connect', connectAndGetWorksheets);
router.post('/preview', previewSync);
router.post('/sync', executeSync);
router.get('/sync-history', getSyncHistory);

module.exports = router;
