const express = require('express');
const router = express.Router();
const { login, getMe, logout, getUsers, createUser, changePassword, forgotPassword, resetPassword } = require('../controllers/auth.controller');
const { auth } = require('../middlewares/auth');

router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/me', auth, getMe);
router.post('/logout', auth, logout);
router.post('/change-password', auth, changePassword);
router.get('/users', auth, getUsers);
router.post('/users', auth, createUser);

module.exports = router;
