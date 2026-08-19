const express = require('express');
const router = express.Router();
const whatsappGroupController = require('../controllers/whatsappGroup.controller');
const { auth } = require('../middlewares/auth');

router.use(auth);

router.get('/', whatsappGroupController.getWhatsAppGroups);
router.get('/:id', whatsappGroupController.getWhatsAppGroupById);
router.post('/', whatsappGroupController.createWhatsAppGroup);
router.patch('/:id', whatsappGroupController.updateWhatsAppGroup);

module.exports = router;
