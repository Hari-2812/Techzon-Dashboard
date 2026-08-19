const express = require('express');
const router = express.Router();
const saleController = require('../controllers/sale.controller');
const { auth } = require('../middlewares/auth');

router.use(auth);

router.get('/', saleController.getSales);
router.post('/', saleController.createSale);
router.patch('/:id', saleController.updateSale);

module.exports = router;
