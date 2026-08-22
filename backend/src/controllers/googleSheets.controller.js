const Lead = require('../models/Lead');
const User = require('../models/User');
const SyncHistory = require('../models/SyncHistory');
const GoogleSheetsSettings = require('../models/GoogleSheetsSettings');
const googleSheetsService = require('../services/googleSheets.service');
const jwt = require('jsonwebtoken');

// Helper to normalize phone for duplicate checking
const normalizePhone = (phone) => {
    if (!phone) return '';
    return phone.replace(/\D/g, '').slice(-10); // Keep last 10 digits
};

exports.getStatus = async (req, res) => {
    try {
        const isConnected = await googleSheetsService.checkStatus();
        res.json({ success: true, isConnected });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// --- SETTINGS CONTROLLERS ---

exports.getSettings = async (req, res) => {
    try {
        let settings = await GoogleSheetsSettings.findOne();
        if (!settings) {
            settings = await GoogleSheetsSettings.create({});
        }
        // Never send tokens to frontend
        const safeSettings = {
            spreadsheetId: settings.spreadsheetId,
            autoSyncEnabled: settings.autoSyncEnabled,
            syncInterval: settings.syncInterval,
            assignmentStrategy: settings.assignmentStrategy,
            activeEmployees: settings.activeEmployees
        };
        res.json({ success: true, data: safeSettings });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.updateSettings = async (req, res) => {
    try {
        let settings = await GoogleSheetsSettings.findOne();
        if (!settings) {
            settings = new GoogleSheetsSettings();
        }
        
        const { spreadsheetId, autoSyncEnabled, syncInterval, assignmentStrategy, activeEmployees } = req.body;
        
        if (spreadsheetId !== undefined) settings.spreadsheetId = spreadsheetId;
        if (autoSyncEnabled !== undefined) settings.autoSyncEnabled = autoSyncEnabled;
        if (syncInterval !== undefined) settings.syncInterval = syncInterval;
        if (assignmentStrategy !== undefined) settings.assignmentStrategy = assignmentStrategy;
        if (activeEmployees !== undefined) settings.activeEmployees = activeEmployees;
        
        await settings.save();
        
        const safeSettings = {
            spreadsheetId: settings.spreadsheetId,
            autoSyncEnabled: settings.autoSyncEnabled,
            syncInterval: settings.syncInterval,
            assignmentStrategy: settings.assignmentStrategy,
            activeEmployees: settings.activeEmployees
        };
        res.json({ success: true, data: safeSettings });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// --- SYNC CONTROLLERS ---

exports.connectAndGetWorksheets = async (req, res) => {
    try {
        const { spreadsheetId } = req.body;
        
        if (!spreadsheetId) {
            return res.status(400).json({ success: false, message: 'Spreadsheet ID is required' });
        }

        if (process.env.NODE_ENV !== 'production') {
            return res.json({ 
                success: true, 
                data: ['August Leads (Mock)', 'September Leads (Mock)'] 
            });
        }

        const worksheets = await googleSheetsService.getWorksheets(spreadsheetId);
        res.json({ success: true, data: worksheets });
    } catch (err) {
        console.error('Error connecting to Google Sheets:', err);
        res.status(500).json({ 
            success: false, 
            message: err.message || 'Failed to connect to Google Sheets' 
        });
    }
};

const getSheetDataAsObjects = async (spreadsheetId, worksheetName) => {
    if (process.env.NODE_ENV !== 'production') {
        return generateMockData();
    }
    return googleSheetsService.getSheetData(spreadsheetId, worksheetName);
};

exports.previewSync = async (req, res) => {
    try {
        const { spreadsheetId, worksheetName, mapping } = req.body;
        
        if (!spreadsheetId || !worksheetName || !mapping) {
            return res.status(400).json({ success: false, message: 'Missing required parameters' });
        }

        let settings = await GoogleSheetsSettings.findOne();
        if (!settings) return res.status(400).json({ success: false, message: 'Settings not configured' });

        const rawData = await getSheetDataAsObjects(spreadsheetId, worksheetName);
        
        let validRowsCount = 0;
        let duplicatesSkipped = 0;
        let invalidRows = 0;
        let newLeadsCount = 0;
        
        const invalidDetails = [];
        
        const activeUsers = await User.find({ 
            _id: { $in: settings.activeEmployees }, 
            isActive: true 
        });
        
        const allLeads = await Lead.find({}, 'phone email assignedEmployeeId');
        const phoneSet = new Set(allLeads.map(l => normalizePhone(l.phone)));
        
        const assignmentCounts = {};
        activeUsers.forEach(u => assignmentCounts[u._id.toString()] = { name: u.name, count: 0 });

        if (settings.assignmentStrategy === 'LEAST_ASSIGNED') {
            for (const u of activeUsers) {
                const count = allLeads.filter(l => l.assignedEmployeeId?.toString() === u._id.toString()).length;
                assignmentCounts[u._id.toString()].count = count;
            }
        }
        
        let rrIndex = 0;

        for (const row of rawData) {
            const mappedData = {};
            const normalizedRow = {};
            for (const key of Object.keys(row)) {
                if (key === '_rowIndex') {
                    normalizedRow[key] = row[key];
                } else {
                    normalizedRow[normalizeColumn(key)] = row[key];
                }
            }

            for (const [sheetCol, crmField] of Object.entries(mapping)) {
                const normSheetCol = normalizeColumn(sheetCol);
                if (crmField && normalizedRow[normSheetCol]) {
                    mappedData[crmField] = normalizedRow[normSheetCol];
                }
            }
            
            if (!mappedData.studentName || !mappedData.phone || !mappedData.college) {
                invalidRows++;
                if (invalidDetails.length < 100) {
                    invalidDetails.push({ row: row._rowIndex, data: mappedData, reason: 'Missing required fields (Name, Phone, or College)' });
                }
                continue;
            }
            
            validRowsCount++;
            
            const normalizedPhone = normalizePhone(mappedData.phone);
            if (phoneSet.has(normalizedPhone)) {
                duplicatesSkipped++;
                continue;
            }
            
            newLeadsCount++;
            phoneSet.add(normalizedPhone); 
            
            if (activeUsers.length > 0) {
                let assignedId;
                if (settings.assignmentStrategy === 'ROUND_ROBIN' || settings.assignmentStrategy === 'MANUAL') {
                    assignedId = activeUsers[rrIndex % activeUsers.length]._id.toString();
                    assignmentCounts[assignedId].count++;
                    rrIndex++;
                } else if (settings.assignmentStrategy === 'LEAST_ASSIGNED') {
                    let leastId = activeUsers[0]._id.toString();
                    for (const u of activeUsers) {
                        if (assignmentCounts[u._id.toString()].count < assignmentCounts[leastId].count) {
                            leastId = u._id.toString();
                        }
                    }
                    assignedId = leastId;
                    assignmentCounts[assignedId].count++;
                }
            }
        }

        const assignmentPreview = Object.values(assignmentCounts).filter(e => e.count > 0);

        res.json({
            success: true,
            data: {
                totalRows: rawData.length,
                validRowsCount,
                newLeadsCount,
                duplicatesSkipped,
                invalidRows,
                invalidDetails,
                assignmentPreview
            }
        });

    } catch (err) {
        console.error('Error during preview:', err);
        res.status(500).json({ success: false, message: err.message || 'Server error' });
    }
};

const normalizeColumn = (colName) => {
    return colName.toLowerCase().replace(/[^a-z0-9]/g, '');
};

exports.executeSync = async (req, res) => {
    let syncRecord;
    try {
        const { spreadsheetId, worksheetName, mapping } = req.body;
        
        if (!spreadsheetId || !worksheetName || !mapping) {
            return res.status(400).json({ success: false, message: 'Missing required parameters' });
        }

        let settings = await GoogleSheetsSettings.findOne();
        if (!settings) return res.status(400).json({ success: false, message: 'Settings not configured' });

        syncRecord = await SyncHistory.create({
            adminId: req.user.id,
            spreadsheetId,
            worksheetName,
            startedAt: new Date(),
            status: 'Failed'
        });

        const rawData = await getSheetDataAsObjects(spreadsheetId, worksheetName);
        syncRecord.totalRows = rawData.length;
        
        const activeUsers = await User.find({ 
            _id: { $in: settings.activeEmployees }, 
            isActive: true 
        });
        
        const allLeads = await Lead.find({}, 'phone email assignedEmployeeId');
        const phoneMap = new Map();
        allLeads.forEach(l => phoneMap.set(normalizePhone(l.phone), l));
        
        const employeeLoad = new Map();
        activeUsers.forEach(u => employeeLoad.set(u._id.toString(), 0));
        
        if (settings.assignmentStrategy === 'LEAST_ASSIGNED') {
            for (const u of activeUsers) {
                const count = allLeads.filter(l => l.assignedEmployeeId?.toString() === u._id.toString()).length;
                employeeLoad.set(u._id.toString(), count);
            }
        }
        
        let rrIndex = 0;
        const newLeadsToInsert = [];
        const existingLeadsToUpdate = [];
        
        for (const row of rawData) {
            const mappedData = {};
            // Normalize row keys for robust matching
            const normalizedRow = {};
            for (const key of Object.keys(row)) {
                if (key === '_rowIndex') {
                    normalizedRow[key] = row[key];
                } else {
                    normalizedRow[normalizeColumn(key)] = row[key];
                }
            }

            for (const [sheetCol, crmField] of Object.entries(mapping)) {
                const normSheetCol = normalizeColumn(sheetCol);
                if (crmField && normalizedRow[normSheetCol]) {
                    mappedData[crmField] = normalizedRow[normSheetCol];
                }
            }
            
            if (!mappedData.studentName || !mappedData.phone || !mappedData.college) {
                syncRecord.invalidRows++;
                if (syncRecord.errors.length < 50) {
                    syncRecord.errors.push(`Row ${row._rowIndex}: Missing Name, Phone, or College`);
                }
                continue;
            }
            
            const normalizedPhone = normalizePhone(mappedData.phone);
            const existingLead = phoneMap.get(normalizedPhone);

            if (existingLead) {
                // Determine if it's already in our map for this sync batch (duplicate in sheet)
                if (existingLead === true) {
                    syncRecord.duplicates++;
                    continue;
                }
                // Update existing lead safely
                phoneMap.set(normalizedPhone, true); // Mark as processed for this batch
                
                // Construct update object - DO NOT overwrite assignments, followups, or status
                const updateData = {
                    studentName: mappedData.studentName,
                    email: mappedData.email || existingLead.email,
                    college: mappedData.college,
                    department: mappedData.department || existingLead.department,
                    year: mappedData.year || existingLead.year,
                    course: mappedData.course || existingLead.course,
                    parentContactName: mappedData.parentContactName || existingLead.parentContactName,
                    parentContactPhone: mappedData.parentContactPhone || existingLead.parentContactPhone,
                };
                
                existingLeadsToUpdate.push({ id: existingLead._id, update: updateData });
                continue;
            }
            
            phoneMap.set(normalizedPhone, true); // Mark as processed
            
            let assignedEmployeeId = null;
            if (activeUsers.length > 0) {
                if (settings.assignmentStrategy === 'LEAST_ASSIGNED') {
                    let minId = activeUsers[0]._id.toString();
                    for (const [id, count] of employeeLoad.entries()) {
                        if (count < employeeLoad.get(minId)) {
                            minId = id;
                        }
                    }
                    assignedEmployeeId = minId;
                    employeeLoad.set(minId, employeeLoad.get(minId) + 1);
                } else if (settings.assignmentStrategy === 'ROUND_ROBIN' || settings.assignmentStrategy === 'MANUAL') {
                    assignedEmployeeId = activeUsers[rrIndex % activeUsers.length]._id;
                    rrIndex++;
                }
            }

            const newLead = {
                studentName: mappedData.studentName,
                phone: mappedData.phone,
                email: mappedData.email,
                college: mappedData.college,
                department: mappedData.department,
                year: mappedData.year,
                course: mappedData.course,
                parentContactName: mappedData.parentContactName,
                parentContactPhone: mappedData.parentContactPhone,
                assignedEmployeeId,
                leadStatus: 'New',
                source: 'GOOGLE_SHEETS',
                sourceSpreadsheetId: spreadsheetId,
                sourceWorksheet: worksheetName,
                sourceRowId: row._rowIndex.toString()
            };
            
            newLeadsToInsert.push(newLead);
        }

        if (existingLeadsToUpdate.length > 0) {
            for (const item of existingLeadsToUpdate) {
                await Lead.findByIdAndUpdate(item.id, item.update, { runValidators: true });
            }
            syncRecord.updatedLeads = existingLeadsToUpdate.length;
        }

        if (newLeadsToInsert.length > 0) {
            await Lead.insertMany(newLeadsToInsert);
            syncRecord.newLeads = newLeadsToInsert.length;
            syncRecord.assignedLeads = newLeadsToInsert.filter(l => l.assignedEmployeeId).length;
            syncRecord.unassignedLeads = newLeadsToInsert.filter(l => !l.assignedEmployeeId).length;
        }

        syncRecord.status = 'Success';
        syncRecord.completedAt = new Date();
        await syncRecord.save();

        const io = req.app.get('io');
        if (io) {
            io.emit('leads:synced', { 
                newLeadsCount: syncRecord.newLeads,
                updatedLeadsCount: syncRecord.updatedLeads,
                message: `${syncRecord.newLeads} new leads imported and ${syncRecord.updatedLeads} updated.`
            });
        }

        res.json({ success: true, data: syncRecord });
    } catch (err) {
        console.error('Error during execution:', err);
        if (syncRecord) {
            syncRecord.status = 'Failed';
            syncRecord.completedAt = new Date();
            syncRecord.errors.push(err.message);
            await syncRecord.save();
        }
        res.status(500).json({ success: false, message: err.message || 'Server error' });
    }
};

exports.getSyncHistory = async (req, res) => {
    try {
        const history = await SyncHistory.find().populate('adminId', 'name').sort({ createdAt: -1 }).limit(50);
        res.json({ success: true, data: history });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const generateMockData = () => {
    const data = [];
    for (let i = 1; i <= 30; i++) {
        data.push({
            'Student Name': `Mock Student ${i}`,
            'Email': `student${i}@test.com`,
            'Phone': `9876543${String(i).padStart(3, '0')}`,
            'College': i % 2 === 0 ? 'PSNA College' : 'Anna University',
            'Degree / Branch': 'B.E CSE',
            'Year': '4th Year',
            'Course': 'Full Stack',
            'Parent / Contact Name': `Parent ${i}`,
            'Parent / Contact Phone': `9988776${String(i).padStart(3, '0')}`,
            '_rowIndex': i + 1
        });
    }
    data.push({
        'Student Name': `Mock Student 1 (Duplicate)`,
        'Email': `student1@test.com`,
        'Phone': `9876543001`,
        'College': 'PSNA College',
        'Degree / Branch': 'B.E CSE',
        'Year': '4th Year',
        'Course': 'Full Stack',
        'Parent / Contact Name': `Parent 1`,
        'Parent / Contact Phone': `9988776001`,
        '_rowIndex': 32
    });
    return data;
};
