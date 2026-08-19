const express = require('express');
const router = express.Router();
const { auth, checkRole } = require('../middlewares/auth');
const { testEmail } = require('../services/email.service');

// @route   POST /api/email/test
// @desc    Test Brevo email integration
// @access  Private/Admin
router.post('/test', auth, checkRole('ADMIN'), async (req, res) => {
    try {
        const { to } = req.body;
        
        if (!to) {
            return res.status(400).json({ success: false, message: 'Recipient email "to" is required' });
        }

        const result = await testEmail(to);
        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message || 'Server Error' });
    }
});

module.exports = router;
