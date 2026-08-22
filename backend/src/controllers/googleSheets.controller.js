const { google } = require('googleapis');
const Lead = require('../models/Lead');
const User = require('../models/User');
const SyncHistory = require('../models/SyncHistory');
const GoogleSheetsSettings = require('../models/GoogleSheetsSettings');

// Helper to normalize phone for duplicate checking
const normalizePhone = (phone) => {
    if (!phone) return '';
    return phone.replace(/\D/g, '').slice(-10); // Keep last 10 digits
};

// Helper to get Google Sheets Client
const getSheetsClient = async () => {
    if (process.env.NODE_ENV !== 'production') {
        return null; // Mock mode
    }

    const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
    let privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY;
    
    if (!clientEmail || !privateKey) {
        throw new Error('Google Sheets credentials not configured on the server.');
    }
    
    // Replace escaped newlines if passed via environment variables
    privateKey = privateKey.replace(/\\n/g, '\n');

    const auth = new google.auth.JWT(
        clientEmail,
        null,
        privateKey,
        ['https://www.googleapis.com/auth/spreadsheets.readonly']
    );

    return google.sheets({ version: 'v4', auth });
};

// --- MOCK DATA FOR DEVELOPMENT ---
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
            'Parent / Contact Phone': `9988776${String(i).padStart(3, '0')}`
        });
    }
    // Add one duplicate to test duplicates
    data.push({
        'Student Name': `Mock Student 1 (Duplicate)`,
        'Email': `student1@test.com`,
        'Phone': `9876543001`,
        'College': 'PSNA College',
        'Degree / Branch': 'B.E CSE',
        'Year': '4th Year',
        'Course': 'Full Stack',
        'Parent / Contact Name': `Parent 1`,
        'Parent / Contact Phone': `9988776001`
    });
    return data;
};

exports.getSettings = async (req, res) => {
    try {
        let settings = await GoogleSheetsSettings.findOne();
        if (!settings) {
            settings = await GoogleSheetsSettings.create({});
        }
        res.json({ success: true, data: settings });
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
        res.json({ success: true, data: settings });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

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

        const sheets = await getSheetsClient();
        const response = await sheets.spreadsheets.get({
            spreadsheetId
        });

        const worksheets = response.data.sheets.map(sheet => sheet.properties.title);
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

    const sheets = await getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${worksheetName}!A1:Z`
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) return [];

    const headers = rows[0];
    const data = [];

    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const rowObj = {};
        headers.forEach((header, index) => {
            rowObj[header] = row[index] || '';
        });
        // Attach row index for logging
        rowObj._rowIndex = i + 1;
        data.push(rowObj);
    }

    return data;
};

exports.previewSync = async (req, res) => {
    try {
        const { spreadsheetId, worksheetName, mapping } = req.body;
        
        if (!spreadsheetId || !worksheetName || !mapping) {
            return res.status(400).json({ success: false, message: 'Missing required parameters' });
        }

        // Fetch Settings for assignment strategy
        let settings = await GoogleSheetsSettings.findOne();
        if (!settings) return res.status(400).json({ success: false, message: 'Settings not configured' });

        const rawData = await getSheetDataAsObjects(spreadsheetId, worksheetName);
        
        let validRowsCount = 0;
        let duplicatesSkipped = 0;
        let invalidRows = 0;
        let newLeadsCount = 0;
        
        const invalidDetails = [];
        
        // Prepare active employees for simulation
        const activeUsers = await User.find({ 
            _id: { $in: settings.activeEmployees }, 
            isActive: true 
        });
        
        // Fetch existing leads to simulate duplicate detection and assignments
        const allLeads = await Lead.find({}, 'phone email assignedEmployeeId');
        const phoneSet = new Set(allLeads.map(l => normalizePhone(l.phone)));
        
        const assignmentCounts = {};
        activeUsers.forEach(u => assignmentCounts[u._id.toString()] = { name: u.name, count: 0 });

        // Calculate current loads if we need LEAST_ASSIGNED
        if (settings.assignmentStrategy === 'LEAST_ASSIGNED') {
            for (const u of activeUsers) {
                const count = allLeads.filter(l => l.assignedEmployeeId?.toString() === u._id.toString()).length;
                assignmentCounts[u._id.toString()].count = count;
            }
        }
        
        let rrIndex = 0;

        for (const row of rawData) {
            // Apply mapping
            const mappedData = {};
            for (const [sheetCol, crmField] of Object.entries(mapping)) {
                if (crmField && row[sheetCol]) {
                    mappedData[crmField] = row[sheetCol];
                }
            }
            
            // Validate required
            if (!mappedData.studentName || !mappedData.phone || !mappedData.college) {
                invalidRows++;
                if (invalidDetails.length < 100) {
                    invalidDetails.push({ row: row._rowIndex, data: mappedData, reason: 'Missing required fields (Name, Phone, or College)' });
                }
                continue;
            }
            
            validRowsCount++;
            
            // Duplicate Check
            const normalizedPhone = normalizePhone(mappedData.phone);
            if (phoneSet.has(normalizedPhone)) {
                duplicatesSkipped++;
                continue;
            }
            
            // It's a new lead
            newLeadsCount++;
            phoneSet.add(normalizedPhone); // add to set so we catch duplicates WITHIN the sheet itself
            
            // Simulate Assignment
            if (activeUsers.length > 0) {
                let assignedId;
                if (settings.assignmentStrategy === 'ROUND_ROBIN' || settings.assignmentStrategy === 'MANUAL') {
                    // We use round robin simulation for this preview
                    assignedId = activeUsers[rrIndex % activeUsers.length]._id.toString();
                    assignmentCounts[assignedId].count++;
                    rrIndex++;
                } else if (settings.assignmentStrategy === 'LEAST_ASSIGNED') {
                    // Find least assigned
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

        // Create Sync History record
        syncRecord = await SyncHistory.create({
            adminId: req.user.id,
            spreadsheetId,
            worksheetName,
            startedAt: new Date(),
            status: 'Failed' // Default to failed until complete
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
            
            // Prevent duplicates within the same batch
            phoneMap.set(normalizedPhone, true);
            
            // Assign
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
                    // ROUND_ROBIN or MANUAL fallback
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

        // Broadcast to clients
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
