const express = require('express');
const router = express.Router();
const { auth, checkRole } = require('../middlewares/auth');
const { 
    getStatus,
    getSettings,
    updateSettings,
    connectAndGetWorksheets,
    previewSync,
    executeSync,
    getSyncHistory
} = require('../controllers/googleSheets.controller');

// All Google Sheets APIs are Admin-only
router.use(auth);
router.use(checkRole('ADMIN'));

router.get('/status', getStatus);
router.get('/settings', getSettings);
router.put('/settings', updateSettings);
router.post('/connect', connectAndGetWorksheets);
router.post('/preview', previewSync);
router.post('/sync', executeSync);
router.get('/sync-history', getSyncHistory);

module.exports = router;
