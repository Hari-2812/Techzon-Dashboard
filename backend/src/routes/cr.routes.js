const express = require('express');
const router = express.Router();
const { 
  getCRs, 
  getCRById, 
  getCRActivities, 
  updateCRStatus, 
  updateCRAssignment, 
  getSourceStudents, 
  createFollowUp, 
  createWhatsAppGroup,
  updateWhatsAppGroup
} = require('../controllers/cr.controller');
const { auth } = require('../middlewares/auth');

router.use(auth);

router.get('/', getCRs);
router.get('/:id', getCRById);
router.get('/:id/activities', getCRActivities);
router.patch('/:id/status', updateCRStatus);
router.patch('/:id/assign', updateCRAssignment);
router.get('/:id/source-students', getSourceStudents);
router.post('/:id/follow-ups', createFollowUp);
router.post('/:id/whatsapp-groups', createWhatsAppGroup);
router.patch('/:id/whatsapp-groups', updateWhatsAppGroup);

module.exports = router;
