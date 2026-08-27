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

const normalizeColumn = (colName) => {
    return colName.toLowerCase().replace(/[^a-z0-9]/g, '');
};

exports.getStatus = async (req, res) => {
    try {
        const status = await googleSheetsService.getDetailedStatus();
        res.json({ success: true, ...status });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.generateAuthUrl = async (req, res) => {
    try {
        const status = await googleSheetsService.getDetailedStatus();
        if (!status.canSetupOAuth) {
            return res.status(400).send('Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in environment variables.');
        }
        
        // Generate a random state string for CSRF
        const crypto = require('crypto');
        const state = crypto.randomBytes(16).toString('hex');
        
        const url = googleSheetsService.generateAuthUrl(state);
        res.redirect(url);
    } catch (err) {
        console.error('Error generating auth url:', err);
        res.status(500).send('Failed to initialize Google OAuth. Ensure credentials are set.');
    }
};

exports.handleOAuthCallback = async (req, res) => {
    try {
        const { code, state, error } = req.query;
        
        if (error === 'access_denied') {
            return res.status(400).send('Google authorization was denied. Please authorize Google Sheets access and try again.');
        } else if (error) {
            return res.status(400).send('Google authentication failed.');
        }

        if (!code) {
            return res.status(400).send('Google OAuth callback did not receive an authorization code.');
        }

        const tokens = await googleSheetsService.exchangeCodeForTokens(code);
        
        if (!tokens.refresh_token) {
            return res.status(400).send('No refresh token received. You may need to revoke the app permissions in your Google Account and try again to force a new refresh token.');
        }

        // Render a secure HTML page for the Admin to copy the token
        res.send(`
            <html>
                <head>
                    <title>Google Sheets Authorization</title>
                    <style>
                        body { font-family: system-ui, sans-serif; padding: 40px; background: #f0fdf4; color: #166534; text-align: center; }
                        .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
                        .token-box { background: #f8fafc; padding: 15px; border: 1px solid #e2e8f0; border-radius: 6px; word-break: break-all; font-family: monospace; font-size: 14px; color: #334155; margin: 20px 0; }
                        p { font-size: 16px; color: #1e293b; line-height: 1.6; font-weight: 500; }
                        .warning { color: #b91c1c; font-weight: bold; margin-top: 20px; font-size: 14px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <p>Google Sheets authorization successful.<br/>Refresh token generated.<br/>Add the token to Render as GOOGLE_REFRESH_TOKEN.</p>
                        
                        <div class="token-box">${tokens.refresh_token}</div>
                        
                        <p class="warning">Close this window when finished.</p>
                    </div>
                </body>
            </html>
        `);
    } catch (err) {
        console.error('OAuth Callback Error:', err);
        if (err.message && err.message.includes('redirect_uri_mismatch')) {
            return res.status(400).send('Google authentication failed. Error: redirect_uri_mismatch. Check Google Cloud OAuth configuration.');
        }
        res.status(500).send('Failed to authenticate with Google.');
    }
};

// --- SETTINGS CONTROLLERS ---

exports.getSheets = async (req, res) => {
    try {
        const { targetEmployeeId } = req.query;
        let spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
        
        if (targetEmployeeId) {
            const user = await User.findById(targetEmployeeId);
            if (user && user.googleSheetId) {
                spreadsheetId = user.googleSheetId;
            } else {
                return res.status(400).json({ success: false, message: 'Google Sheet ID is not configured for this employee.' });
            }
        }

        if (!spreadsheetId) {
            return res.status(400).json({ success: false, message: 'Google Spreadsheet ID is not configured.' });
        }
        
        const sheetsList = await googleSheetsService.getWorksheets(spreadsheetId);
        
        // Format to the expected response shape
        const formattedSheets = sheetsList.map((title, index) => ({
            title: title,
            sheetId: index // Mock sheetId for frontend if actual isn't retrieved, but title is what matters
        }));
        
        res.json({ success: true, sheets: formattedSheets });
    } catch (err) {
        console.error('Error fetching sheets:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch sheets from Google. Make sure the ID is correct and shared with the service account.' });
    }
};

exports.getSettings = async (req, res) => {
    try {
        let settings = await GoogleSheetsSettings.findOne();
        if (!settings) {
            settings = await GoogleSheetsSettings.create({});
        }
        // Only settings related to Assignment exist here now
        const safeSettings = {
            assignmentStrategy: settings.assignmentStrategy
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
        
        const { assignmentStrategy } = req.body;
        
        if (assignmentStrategy !== undefined) settings.assignmentStrategy = assignmentStrategy;
        
        await settings.save();
        
        res.json({ success: true, data: { assignmentStrategy: settings.assignmentStrategy } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// --- SYNC CONTROLLERS ---

const getSheetDataAsObjects = async (spreadsheetId, worksheetName) => {
    if (process.env.NODE_ENV !== 'production' && (!process.env.GOOGLE_CLIENT_ID && !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL)) {
        return generateMockData();
    }
    return googleSheetsService.getSheetData(spreadsheetId, worksheetName);
};

exports.executeSync = async (req, res) => {
    let syncRecord;
    try {
        const { worksheets, targetEmployeeId } = req.body;
        let spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

        // Security Validation & override
        let finalTargetEmployeeId = targetEmployeeId;
        if (req.user.role !== 'ADMIN') {
            finalTargetEmployeeId = req.user.id;
        }

        if (finalTargetEmployeeId) {
            const user = await User.findById(finalTargetEmployeeId);
            if (user && user.googleSheetId) {
                spreadsheetId = user.googleSheetId;
            } else {
                return res.status(400).json({ success: false, message: 'Google Sheet ID is not configured for this employee.' });
            }
        }

        if (!spreadsheetId) {
            return res.status(400).json({ success: false, message: 'Spreadsheet ID is not configured in .env or user profile' });
        }
        
        if (!worksheets || !Array.isArray(worksheets) || worksheets.length === 0) {
            return res.status(400).json({ success: false, message: 'No sheets selected for sync.' });
        }

        let settings = await GoogleSheetsSettings.findOne();
        if (!settings) {
            settings = new GoogleSheetsSettings();
            await settings.save();
        }

        syncRecord = await SyncHistory.create({
            adminId: req.user.id,
            spreadsheetId,
            worksheetName: worksheets.join(', '), // Save all names in history
            startedAt: new Date(),
            status: 'Failed',
            errors: []
        });

        // Collect all data from all selected sheets
        let allRawData = [];
        for (const sheet of worksheets) {
            try {
                const data = await getSheetDataAsObjects(spreadsheetId, sheet);
                // Attach the source sheet name directly to each row object
                const dataWithSource = data.map(row => ({ ...row, _sourceSheetName: sheet }));
                allRawData = allRawData.concat(dataWithSource);
            } catch (err) {
                syncRecord.errors.push(`Failed to read sheet ${sheet}: ${err.message}`);
            }
        }

        syncRecord.totalRows = allRawData.length;
        
        // Active RGS/BDE users for assignment
        const activeUsers = await User.find({ 
            role: { $in: ['RGS', 'BDE'] }, 
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
        
        // Expected columns mapping with robust case-insensitive names
        const mapping = {
            'name': 'studentName', // Changed from 'Student Name'
            'phonenumber': 'phone', // Handled space
            'phone': 'phone',
            'college': 'college',
            'department': 'department',
            'degreebranch': 'department',
            'year': 'year'
        };

        for (const row of allRawData) {
            // Check for completely empty rows
            const hasData = Object.keys(row).some(k => k !== '_rowIndex' && k !== '_sourceSheetName' && row[k] && String(row[k]).trim() !== '');
            if (!hasData) continue;

            const mappedData = {};
            const normalizedRow = {};
            for (const key of Object.keys(row)) {
                if (key === '_rowIndex' || key === '_sourceSheetName') {
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
            
            if (!mappedData.studentName || !mappedData.phone) {
                syncRecord.invalidRows++;
                if (syncRecord.errors.length < 50) {
                    syncRecord.errors.push(`Row ${row._rowIndex} in ${row._sourceSheetName}: Missing Name or Phone number`);
                }
                continue;
            }
            
            const normalizedPhone = normalizePhone(mappedData.phone);
            const existingLead = phoneMap.get(normalizedPhone);

            if (existingLead) {
                if (existingLead === true) {
                    syncRecord.duplicates++;
                    continue; // Skip duplicate inside the current sync batch
                }
                
                phoneMap.set(normalizedPhone, true); 
                syncRecord.duplicates++; // Since it already exists, count it as duplicate according to user requirements
                
                const updateData = {
                    studentName: mappedData.studentName,
                    college: mappedData.college || existingLead.college,
                    department: mappedData.department || existingLead.department,
                    year: mappedData.year || existingLead.year,
                    sourceWorksheet: row._sourceSheetName // Overwrite or preserve the source
                };
                
                existingLeadsToUpdate.push({ id: existingLead._id, update: updateData });
                continue;
            }
            
            phoneMap.set(normalizedPhone, true); 
            
            let assignedEmployeeId = null;
            if (finalTargetEmployeeId) {
                assignedEmployeeId = finalTargetEmployeeId;
            } else if (activeUsers.length > 0) {
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
                college: mappedData.college || '',
                department: mappedData.department || '',
                year: mappedData.year || '',
                assignedEmployeeId,
                leadStatus: 'New',
                source: 'GOOGLE_SHEETS',
                sourceSpreadsheetId: spreadsheetId,
                sourceWorksheet: row._sourceSheetName,
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
        // Return number of sheets processed in the result for the frontend
        const resultData = syncRecord.toObject();
        resultData.sheetsSynced = worksheets.length;

        await syncRecord.save();

        const io = req.app.get('io');
        if (io) {
            io.emit('leads:synced', { 
                newLeadsCount: syncRecord.newLeads,
                updatedLeadsCount: syncRecord.updatedLeads,
                message: `${syncRecord.newLeads} new leads imported and ${syncRecord.updatedLeads} updated.`
            });
        }

        res.json({ success: true, data: resultData });
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
            'Name': `Mock Student ${i}`,
            'Phone number': `9876543${String(i).padStart(3, '0')}`,
            'college': i % 2 === 0 ? 'PSNA College' : 'Anna University',
            'department': 'CSE',
            'year': '4th Year',
            '_rowIndex': i + 1
        });
    }
    // Add a duplicate
    data.push({
        'Name': `Hari Prasath`,
        'Phone number': `9876543210`,
        'college': 'PSNA College',
        'department': 'CSE',
        'year': '4th Year',
        '_rowIndex': 32
    });
    // Add invalid row
    data.push({
        'Name': `Missing Phone`,
        'Phone number': ``,
        'college': 'PSNA College',
        'department': 'CSE',
        'year': '4th Year',
        '_rowIndex': 33
    });
    return data;
};
