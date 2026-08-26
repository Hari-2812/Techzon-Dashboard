const Lead = require('../models/Lead');
const LeadActivity = require('../models/LeadActivity');
const AuditLog = require('../models/AuditLog');
const leadService = require('../services/lead.service');
const { normalizeSalesStatus } = require('../utils/statusNormalizer');
const StudentCRRelationship = require('../models/StudentCRRelationship');
const mongoose = require('mongoose');

// @route   GET /api/leads
exports.getLeads = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, college, crStatus, leadStatus, priority } = req.query;
    
    let query = {};

    // RBAC check: RGS/BDE only see their assigned leads
    if (req.user.role !== 'ADMIN') {
        query.assignedEmployeeId = req.user.id;
    }

    if (search) {
        query.$or = [
            { studentName: { $regex: search, $options: 'i' } },
            { phone: { $regex: search, $options: 'i' } },
            { college: { $regex: search, $options: 'i' } }
        ];
    }
    if (college) query.college = college;
    if (crStatus) query.crStatus = crStatus;
    if (leadStatus) query.leadStatus = leadStatus;
    if (priority) query.priority = priority;

    const leads = await Lead.find(query)
        .populate('assignedEmployeeId', 'name email')
        .sort({ priority: 1, nextFollowUp: 1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

    const total = await Lead.countDocuments(query);

    // Get KPIs
    let kpiQuery = req.user.role !== 'ADMIN' ? { assignedEmployeeId: req.user.id } : {};
    const totalLeads = await Lead.countDocuments(kpiQuery);
    const newLeads = await Lead.countDocuments({ ...kpiQuery, leadStatus: 'New' });
    const crsIdentified = await Lead.countDocuments({ ...kpiQuery, leadStatus: 'CR Identified' });
    const completed = await Lead.countDocuments({ ...kpiQuery, leadStatus: 'Completed' });

    res.json({ 
        success: true, 
        data: leads, 
        meta: { 
            total, 
            page: parseInt(page), 
            pages: Math.ceil(total / limit),
            kpis: { totalLeads, newLeads, crsIdentified, completed }
        } 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @route   POST /api/leads
exports.createLead = async (req, res) => {
    try {
        const { leadSchema, normalizePhone } = require('../validations/lead.validation');
        const validation = leadSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(422).json({ success: false, message: 'Validation Error', errors: validation.error.format() });
        }

        const data = validation.data;
        data.phone = normalizePhone(data.phone);

        // Enforce employee assigning rules
        if (req.user.role !== 'ADMIN' && data.assignedEmployeeId !== req.user.id) {
            data.assignedEmployeeId = req.user.id;
        }

        const existing = await Lead.findOne({ phone: data.phone });
        if (existing) {
            return res.status(409).json({ success: false, message: 'A lead with this phone number already exists.', existingId: existing._id });
        }

        const lead = await Lead.create(data);

        await AuditLog.create({
            actorId: req.user.id,
            action: 'LEAD_CREATED',
            entityType: 'Lead',
            entityId: lead._id
        });
        
        if (data.assignedEmployeeId) {
             await LeadActivity.create({
                 leadId: lead._id,
                 employeeId: req.user.id,
                 activityType: 'LEAD_ASSIGNED',
                 description: 'Lead assigned upon creation'
             });
        }

        const io = require('../server').io;
        if (io) {
            io.emit('lead:created', { leadId: lead._id, assignedEmployeeId: lead.assignedEmployeeId });
        }

        res.status(201).json({ success: true, data: lead });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
}

// @route   GET /api/leads/:id
exports.getLeadById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ success: false, message: 'Invalid lead ID' });
    }

    const lead = await Lead.findById(req.params.id).populate('assignedEmployeeId', 'name email');
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
    
    // RBAC
    if (req.user.role !== 'ADMIN') {
        const assignedId = lead.assignedEmployeeId ? (lead.assignedEmployeeId._id || lead.assignedEmployeeId).toString() : null;
        if (assignedId !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Forbidden: You do not have access to this lead' });
        }
    }

    const relationship = await StudentCRRelationship.findOne({ studentId: lead._id }).populate('crId');
    
    res.json({ success: true, data: lead, crRelationship: relationship });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @route   GET /api/leads/:id/activities
exports.getLeadActivities = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ success: false, message: 'Invalid lead ID' });
    }
    const activities = await LeadActivity.find({ leadId: req.params.id })
      .populate('employeeId', 'name role')
      .sort({ timestamp: -1 });
    res.json({ success: true, data: activities });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @route POST /api/leads/bulk-assign
exports.bulkAssign = async (req, res) => {
    try {
        if (req.user.role !== 'ADMIN') return res.status(403).json({ success: false, message: 'Admin only' });
        
        const { leadIds, employeeId } = req.body;
        
        await Lead.updateMany({ _id: { $in: leadIds } }, { assignedEmployeeId: employeeId, leadStatus: 'Assigned' });
        
        for (let id of leadIds) {
            await LeadActivity.create({
                leadId: id,
                employeeId: req.user.id, // Admin who did it
                activityType: 'LEAD_REASSIGNED',
                description: `Lead reassigned in bulk to employee ${employeeId}`
            });
            await AuditLog.create({
                actorId: req.user.id,
                action: 'LEAD_REASSIGNED',
                entityType: 'Lead',
                entityId: id,
                newValue: { assignedEmployeeId: employeeId }
            });
        }
        
        res.json({ success: true, message: 'Leads reassigned' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @route POST /api/leads/:id/call
exports.recordCall = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Invalid lead ID' });
        }
        const lead = await leadService.recordCall(req.params.id, req.user.id, req.body.outcome, req.body.notes);
        res.json({ success: true, data: lead });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// @route POST /api/leads/:id/cr/yes
exports.verifyCRYes = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Invalid lead ID' });
        }
        const result = await leadService.verifyCR(req.params.id, req.user.id, true, req.body.details);
        const io = require('../server').io;
        if (io) {
            io.emit('cr:updated', { crId: result.crProfile._id });
        }
        res.json({ success: true, data: result });
    } catch (err) {
        console.error(err);
        if (err.code === 'MISSING_CR_FIELDS') {
            return res.status(400).json({ success: false, code: err.code, message: err.message });
        }
        if (err.name === 'ValidationError') {
            return res.status(400).json({ success: false, message: 'Validation Error', error: err.message });
        }
        res.status(500).json({ success: false, message: err.message });
    }
};

// @route POST /api/leads/:id/cr/no
exports.verifyCRNo = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Invalid lead ID' });
        }
        const result = await leadService.verifyCR(req.params.id, req.user.id, false, req.body.details);
        const io = require('../server').io;
        if (io) {
            io.emit('cr:updated', { crId: result.crProfile._id });
        }
        res.json({ success: true, data: result });
    } catch (err) {
        console.error(err);
        if (err.code === 'MISSING_CR_FIELDS') {
            return res.status(400).json({ success: false, code: err.code, message: err.message });
        }
        if (err.name === 'ValidationError') {
            return res.status(400).json({ success: false, message: 'Validation Error', error: err.message });
        }
        res.status(500).json({ success: false, message: err.message });
    }
};

const fs = require('fs');
const csv = require('csv-parser');
const xlsx = require('xlsx');

const User = require('../models/User');
const crypto = require('crypto');

// In-memory store for previews (In production, use Redis or DB, but this works for development/moderate usage)
const importRawCache = new Map();
const importPreviewCache = new Map();

// @route POST /api/leads/import/parse
exports.importParse = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

        const results = [];
        const filePath = req.file.path;
        
        const parseCSV = () => new Promise((resolve, reject) => {
            fs.createReadStream(filePath)
              .pipe(csv())
              .on('data', (data) => results.push(data))
              .on('end', () => resolve())
              .on('error', reject);
        });

        if (req.file.mimetype === 'text/csv' || req.file.originalname.endsWith('.csv')) {
            await parseCSV();
        } else {
            const workbook = xlsx.readFile(filePath);
            const sheetName = workbook.SheetNames[0];
            const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
            results.push(...data);
        }

        fs.unlinkSync(filePath);

        if (results.length === 0) {
            return res.status(400).json({ success: false, message: 'File is empty' });
        }

        // Extract headers from the first object
        const headers = Object.keys(results[0]);

        const rawId = crypto.randomUUID();
        importRawCache.set(rawId, results);

        // Expire cache after 30 mins
        setTimeout(() => importRawCache.delete(rawId), 30 * 60 * 1000);

        res.json({
            success: true,
            data: {
                rawId,
                headers,
                totalRows: results.length,
                sampleData: results.slice(0, 3)
            }
        });

    } catch (err) {
        console.error(err);
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(500).json({ success: false, message: 'Server Error during parse' });
    }
};

// @route POST /api/leads/import/preview
exports.importPreview = async (req, res) => {
    try {
        const { rawId, mapping } = req.body;
        
        if (!rawId || !importRawCache.has(rawId)) {
            return res.status(400).json({ success: false, message: 'Invalid or expired parsing session. Please upload again.' });
        }

        const rawResults = importRawCache.get(rawId);
        
        const { leadSchema, normalizePhone } = require('../validations/lead.validation');
        const validRows = [];
        const invalidRowsList = [];
        let duplicates = 0;
        let invalid = 0;

        // Active employees for Round Robin
        const activeEmployees = await User.find({ isActive: true, role: { $in: ['RGS', 'BDE'] } });
        let rrIndex = 0;
        const employeeStats = {};
        activeEmployees.forEach(emp => {
            employeeStats[emp._id.toString()] = { name: emp.name, count: 0 };
        });

        for (let i = 0; i < rawResults.length; i++) {
            const row = rawResults[i];
            
            // Map according to provided mapping
            const rawData = {};
            for (const [excelCol, crmField] of Object.entries(mapping)) {
                if (crmField && row[excelCol] !== undefined) {
                    let val = row[excelCol];
                    if (val !== null && val !== undefined) {
                        val = String(val).trim();
                    }
                    if (val !== '') {
                        rawData[crmField] = val;
                    }
                }
            }
            
            // Handle alternative column names if mapping was missed or auto-detected poorly
            const detectAlt = (keys, target) => {
                if (!rawData[target]) {
                    const match = Object.keys(row).find(k => keys.includes(k.toLowerCase().trim()));
                    if (match && row[match]) {
                        rawData[target] = String(row[match]).trim();
                    }
                }
            };
            
            detectAlt(['name', 'student name', 'studentname'], 'studentName');
            detectAlt(['phone', 'phone number', 'phonenumber', 'contact'], 'phone');
            detectAlt(['college', 'university', 'institution'], 'college');
            detectAlt(['department', 'branch', 'degreebranch', 'degree branch'], 'department');
            detectAlt(['year', 'batch'], 'year');
            detectAlt(['salesstatus', 'sales status', 'sales_status', 'status'], 'salesStatus');
            detectAlt(['remarks', 'notes', 'studentresponse'], 'studentResponse');
            
            rawData.priority = rawData.priority || 'MEDIUM';

            const validation = leadSchema.safeParse(rawData);
            if (!validation.success) {
                invalid++;
                invalidRowsList.push({
                    row: i + 1,
                    data: rawData,
                    reason: validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
                });
                continue;
            }

            const data = validation.data;
            data.phone = normalizePhone(data.phone);

            if (!data.phone) {
                 invalid++;
                 invalidRowsList.push({
                     row: i + 1,
                     data: rawData,
                     reason: 'Phone number is missing or invalid after normalization'
                 });
                 continue;
            }

            // Normalize salesStatus specifically
            if (rawData.salesStatus) {
                data.salesStatus = normalizeSalesStatus(rawData.salesStatus);
            } else {
                data.salesStatus = 'Not Contacted';
            }

            const existing = await Lead.findOne({ phone: data.phone });
            if (existing) {
                duplicates++;
                data._id = existing._id;
                data.isUpdate = true;
                data.existingLead = existing; // Store for merge logic
                validRows.push(data);
                continue;
            }

            if (validRows.some(l => l.phone === data.phone && !l.isUpdate)) {
                duplicates++;
                continue;
            }
            
            data.leadStatus = 'New';
            data.crStatus = 'Not Verified'; // Note: using 'Not Verified' matching schema enum exactly

            // Auto Assignment for new leads only
            if (!data.isUpdate && !data.assignedEmployeeId) {
                if (req.user.role !== 'ADMIN') {
                    // Employee imports their own leads
                    data.assignedEmployeeId = req.user.id;
                    if (employeeStats[req.user.id]) {
                        employeeStats[req.user.id].count++;
                    } else {
                        employeeStats[req.user.id] = { name: req.user.name || 'Current User', count: 1 };
                    }
                } else if (activeEmployees.length > 0) {
                    // Admin imports: Round Robin
                    const emp = activeEmployees[rrIndex % activeEmployees.length];
                    data.assignedEmployeeId = emp._id.toString();
                    employeeStats[emp._id.toString()].count++;
                    rrIndex++;
                }
            } else if (!data.isUpdate && data.assignedEmployeeId && employeeStats[data.assignedEmployeeId]) {
                employeeStats[data.assignedEmployeeId].count++;
            }

            validRows.push(data);
        }

        const previewId = crypto.randomUUID();
        importPreviewCache.set(previewId, validRows);

        // Expire cache after 30 mins
        setTimeout(() => importPreviewCache.delete(previewId), 30 * 60 * 1000);

        res.json({
            success: true,
            data: {
                previewId,
                totalRows: rawResults.length,
                validRowsCount: validRows.length,
                duplicatesSkipped: duplicates,
                invalidRows: invalid,
                invalidDetails: invalidRowsList.slice(0, 100), // Return max 100 invalid reasons to avoid huge payload
                assignmentPreview: Object.values(employeeStats).filter(s => s.count > 0)
            }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server Error during preview' });
    }
};

// @route POST /api/leads/import/confirm
exports.importConfirm = async (req, res) => {
    try {
        const { previewId, duplicateAction = 'merge' } = req.body; // 'merge', 'skip', 'overwrite'
        if (!previewId || !importPreviewCache.has(previewId)) {
            return res.status(400).json({ success: false, message: 'Invalid or expired preview session' });
        }

        const validRows = importPreviewCache.get(previewId);
        importPreviewCache.delete(previewId);
        
        const importBatchId = `IMP-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
        
        const newLeads = [];
        const updatedLeads = [];
        const logs = [];

        for (const row of validRows) {
            row.metadata = { ...row.metadata, importBatchId };

            if (row.isUpdate) {
                if (duplicateAction === 'skip') continue;

                let updateObj = {};
                if (duplicateAction === 'merge') {
                    // Update missing info only
                    for (const [key, val] of Object.entries(row)) {
                        if (['isUpdate', 'existingLead', '_id', 'metadata'].includes(key)) continue;
                        if (val && !row.existingLead[key]) {
                            updateObj[key] = val;
                        }
                    }
                } else if (duplicateAction === 'overwrite') {
                    for (const [key, val] of Object.entries(row)) {
                        if (['isUpdate', 'existingLead', '_id', 'metadata'].includes(key)) continue;
                        updateObj[key] = val;
                    }
                }

                if (Object.keys(updateObj).length > 0) {
                    await Lead.findByIdAndUpdate(row._id, { $set: updateObj });
                    updatedLeads.push(row._id);
                    logs.push({
                        actorId: req.user.id,
                        action: 'LEAD_UPDATED',
                        entityType: 'Lead',
                        entityId: row._id,
                        metadata: { source: 'bulk_import_merge', importBatchId }
                    });
                }
            } else {
                // Ensure assignedEmployeeId is preserved for newly imported rows
                newLeads.push(row);
            }
        }

        if (newLeads.length > 0) {
            const createdLeads = await Lead.insertMany(newLeads);
            createdLeads.forEach(l => {
                logs.push({
                    actorId: req.user.id,
                    action: 'LEAD_CREATED',
                    entityType: 'Lead',
                    entityId: l._id,
                    metadata: { source: 'bulk_import', importBatchId }
                });
            });
        }

        if (logs.length > 0) await AuditLog.insertMany(logs);
        
        const io = require('../server').io;
        if (io && (newLeads.length > 0 || updatedLeads.length > 0)) {
             io.emit('leads:imported', { count: newLeads.length, updatedCount: updatedLeads.length, importBatchId });
        }

        // Calculate final distribution for response
        const employeeStats = {};
        for(const row of newLeads) {
           if(row.assignedEmployeeId) {
               employeeStats[row.assignedEmployeeId] = (employeeStats[row.assignedEmployeeId] || 0) + 1;
           }
        }

        res.json({
            success: true,
            data: {
                successfullyImported: newLeads.length,
                successfullyUpdated: updatedLeads.length,
                importBatchId,
                distribution: employeeStats
            }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server Error during confirm' });
    }
};

// @route PATCH /api/leads/:id/status
exports.updateLeadStatus = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Invalid lead ID' });
        }
        const lead = await Lead.findById(req.params.id);
        if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
        
        // RBAC
        if (req.user.role !== 'ADMIN' && lead.assignedEmployeeId.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }

        const { leadStatus, notes } = req.body;
        
        if (leadStatus === 'Completed' && lead.leadStatus !== 'Completed') {
            await LeadActivity.create({
                leadId: lead._id,
                employeeId: req.user.id,
                activityType: 'LEAD_COMPLETED',
                description: notes || 'Lead marked as completed',
            });
        } else {
             await LeadActivity.create({
                leadId: lead._id,
                employeeId: req.user.id,
                activityType: 'STATUS_UPDATED',
                description: `Status changed to ${leadStatus}`
            });
        }
        
        lead.leadStatus = leadStatus;
        await lead.save();

        const io = require('../server').io;
        if (io) io.emit('lead:updated', { leadId: lead._id });
        if (leadStatus === 'Completed' && io) io.emit('lead:completed', { leadId: lead._id, employeeId: req.user.id });

        res.json({ success: true, data: lead });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};
