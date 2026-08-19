const Sale = require('../models/Sale');
const Lead = require('../models/Lead');
const AuditLog = require('../models/AuditLog');

// @route   GET /api/sales
exports.getSales = async (req, res) => {
    try {
        let matchStage = {};
        if (req.user.role !== 'ADMIN') {
            matchStage.employeeId = req.user.id;
        }

        if (req.query.status) matchStage.status = req.query.status;
        if (req.query.employeeId && req.user.role === 'ADMIN') matchStage.employeeId = req.query.employeeId;
        
        const sales = await Sale.find(matchStage)
            .populate('employeeId', 'name role')
            .populate('leadId', 'studentName phone college')
            .sort({ date: -1 });

        res.json({ success: true, data: sales });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @route   POST /api/sales
exports.createSale = async (req, res) => {
    try {
        const { leadId, course, amount, status, date } = req.body;
        
        const lead = await Lead.findById(leadId);
        if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

        const sale = await Sale.create({
            employeeId: req.user.id,
            leadId,
            studentName: lead.studentName,
            course,
            amount,
            status: status || 'Interested',
            date: date || new Date()
        });

        await AuditLog.create({
            actorId: req.user.id,
            action: 'SALE_CREATED',
            entityType: 'Sale',
            entityId: sale._id,
            metadata: { leadId, amount, status: sale.status }
        });

        const io = require('../server').io;
        if (io) io.emit('sale:created', { saleId: sale._id, employeeId: req.user.id });

        res.status(201).json({ success: true, data: sale });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @route   PATCH /api/sales/:id
exports.updateSale = async (req, res) => {
    try {
        const sale = await Sale.findById(req.params.id);
        if (!sale) return res.status(404).json({ success: false, message: 'Not found' });

        if (req.user.role !== 'ADMIN' && sale.employeeId.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }

        const { course, amount, status, date } = req.body;
        
        const oldStatus = sale.status;
        
        if (course) sale.course = course;
        if (amount !== undefined) sale.amount = amount;
        if (status) sale.status = status;
        if (date) sale.date = date;

        await sale.save();

        if (oldStatus !== sale.status && (sale.status === 'Converted' || sale.status === 'Payment Received')) {
            const io = require('../server').io;
            if (io) io.emit('sale:converted', { saleId: sale._id, employeeId: sale.employeeId });
        } else {
            const io = require('../server').io;
            if (io) io.emit('sale:updated', { saleId: sale._id, employeeId: sale.employeeId });
        }

        res.json({ success: true, data: sale });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};
