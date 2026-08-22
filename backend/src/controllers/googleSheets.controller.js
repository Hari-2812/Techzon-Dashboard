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

// --- OAUTH FLOW CONTROLLERS ---

exports.getAuthStatus = async (req, res) => {
    try {
        const settings = await GoogleSheetsSettings.findOne();
        const isConnected = !!(settings && settings.refreshToken);
        res.json({ success: true, isConnected });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.generateAuthUrl = async (req, res) => {
    try {
        // We use JWT to sign the admin's ID as the state to prevent CSRF
        const state = jwt.sign({ adminId: req.user.id }, process.env.JWT_SECRET, { expiresIn: '15m' });
        const url = googleSheetsService.generateAuthUrl(state);
        res.json({ success: true, url });
    } catch (err) {
        console.error('Error generating auth url:', err);
        res.status(500).json({ success: false, message: 'Failed to initialize Google OAuth. Ensure credentials are set.' });
    }
};

exports.handleOAuthCallback = async (req, res) => {
    try {
        const { code, state, error } = req.query;
        
        if (error) {
            return res.redirect(`${process.env.FRONTEND_URL || 'https://techzon-dashboard.vercel.app'}/import-leads?google_error=access_denied`);
        }

        if (!code || !state) {
            return res.status(400).send('Missing code or state parameter.');
        }

        // Verify CSRF state
        try {
            jwt.verify(state, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(403).send('Invalid or expired state token. Please try connecting again.');
        }

        const tokens = await googleSheetsService.exchangeCodeForTokens(code);
        await googleSheetsService.saveTokens(tokens);

        // Redirect back to CRM frontend
        const frontendUrl = process.env.FRONTEND_URL || 'https://techzon-dashboard.vercel.app';
        res.redirect(`${frontendUrl}/import-leads?google_success=true`);
    } catch (err) {
        console.error('OAuth Callback Error:', err);
        let errorMsg = 'access_denied';
        if (err.message && err.message.includes('redirect_uri_mismatch')) {
            errorMsg = 'redirect_uri_mismatch';
        }
        const frontendUrl = process.env.FRONTEND_URL || 'https://techzon-dashboard.vercel.app';
        res.redirect(`${frontendUrl}/import-leads?google_error=${errorMsg}`);
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
            for (const [sheetCol, crmField] of Object.entries(mapping)) {
                if (crmField && row[sheetCol]) {
                    mappedData[crmField] = row[sheetCol];
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
        
        for (const row of rawData) {
            const mappedData = {};
            for (const [sheetCol, crmField] of Object.entries(mapping)) {
                if (crmField && row[sheetCol]) {
                    mappedData[crmField] = row[sheetCol];
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
            if (phoneMap.has(normalizedPhone)) {
                syncRecord.duplicates++;
                continue;
            }
            
            phoneMap.set(normalizedPhone, true);
            
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
                } else {
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
                message: `${syncRecord.newLeads} new leads have been assigned.`
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
