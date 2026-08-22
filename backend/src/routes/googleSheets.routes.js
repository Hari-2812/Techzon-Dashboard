const express = require('express');
const router = express.Router();
const { auth, restrictTo } = require('../middlewares/auth.middleware');
const { 
    getSettings,
    updateSettings,
    connectAndGetWorksheets,
    previewSync,
    executeSync,
    getSyncHistory
} = require('../controllers/googleSheets.controller');

// All Google Sheets APIs are Admin-only
router.use(auth);
router.use(restrictTo('ADMIN'));

router.get('/settings', getSettings);
router.put('/settings', updateSettings);
router.post('/connect', connectAndGetWorksheets);
router.post('/preview', previewSync);
router.post('/sync', executeSync);
router.get('/sync-history', getSyncHistory);

module.exports = router;
