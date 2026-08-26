const express = require('express');
const router = express.Router();
const salesController = require('../controllers/sales.controller');
const { auth } = require('../middlewares/auth');

router.use(auth);

router.get('/dashboard', salesController.getDashboard);
router.get('/queue', salesController.getCallQueue);
router.post('/bulk', salesController.bulkUpdate);
router.post('/from-lead', salesController.moveLeadToSales);
router.post('/employee-contacts', salesController.importEmployeeContacts);

router.route('/')
    .get(salesController.getSales);

router.route('/:id')
    .get(salesController.getSalesDetail);

router.patch('/:id/status', salesController.updateStatus);
router.patch('/:id/priority', salesController.updatePriority);
router.post('/:id/response', salesController.addResponse);
router.post('/:id/call', salesController.logCall);
router.post('/:id/convert', salesController.convertSale);

module.exports = router;
