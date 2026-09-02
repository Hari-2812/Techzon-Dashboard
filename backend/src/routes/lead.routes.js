const express = require('express');
const router = express.Router();
const { 
  getLeads, 
  getLeadById, 
  getLeadActivities, 
  createLead, 
  bulkAssign, 
  recordCall, 
  verifyCRYes, 
  verifyCRNo,
  importParse,
  importPreview,
  importConfirm,
  deleteOldAssignedLeads,
  getLeadAssignmentStats,
  resetEmployeeLeads,
  autoAssign
} = require('../controllers/lead.controller');
const { auth } = require('../middlewares/auth');

router.use(auth); // All routes require authentication

const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

router.get('/', getLeads);
router.post('/', createLead);
router.post('/import/parse', upload.single('file'), importParse);
router.post('/import/preview', importPreview);
router.post('/import/confirm', importConfirm);
router.post('/bulk-assign', bulkAssign);
router.delete('/admin/delete-old-assigned-leads', deleteOldAssignedLeads);
router.get('/admin/assignment-stats', getLeadAssignmentStats);
router.delete('/admin/employees/:employeeId/all', resetEmployeeLeads);
router.post('/admin/auto-assign', autoAssign);
router.get('/:id', getLeadById);
router.get('/:id/activities', getLeadActivities);
router.post('/:id/call', recordCall);
router.post('/:id/cr/yes', verifyCRYes);
router.post('/:id/cr/no', verifyCRNo);
router.patch('/:id/status', require('../controllers/lead.controller').updateLeadStatus);

module.exports = router;
