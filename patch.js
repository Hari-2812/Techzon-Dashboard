const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'backend', 'src', 'controllers', 'admin-attendance.controller.js');
let content = fs.readFileSync(file, 'utf8');

const newController = `
exports.getEmployeeAttendanceHistory = async (req, res) => {
    try {
        const { employeeId } = req.params;
        const { month } = req.query; // e.g. "2026-09"
        
        const AttendanceDaily = require('../models/AttendanceDaily');
        const WorkSession = require('../models/WorkSession');
        const User = require('../models/User');

        const employee = await User.findById(employeeId).select('name email role');
        if (!employee) {
            return res.status(404).json({ success: false, message: 'Employee not found' });
        }

        let query = { employeeId, isTestSession: { $ne: true } };
        if (month) {
            query.date = { $regex: \`^\${month}\` };
        }

        const dailies = await AttendanceDaily.find(query).sort({ date: -1 }).lean();
        const sessions = await WorkSession.find(query).lean();

        // Merge dailies with sessions
        const history = dailies.map(daily => {
            const session = sessions.find(s => s.date === daily.date) || null;
            return {
                ...daily,
                session
            };
        });

        res.json({ success: true, data: { employee, history } });
    } catch (error) {
        console.error('Error fetching employee history:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};
`;

content = content + newController;

content = content.replace(
    /const parseTime = \(timeStr\) => \{\s+if \(!timeStr\) return null;\s+const \[hours, minutes\] = timeStr\.split\(':'\);\s+return moment\.tz\(date, 'Asia\/Kolkata'\)\.set\(\{ hour: parseInt\(hours\), minute: parseInt\(minutes\), second: 0 \}\)\.toDate\(\);\s+\};/g,
    `const parseTime = (timeStr) => {
            if (!timeStr) return null;
            if (timeStr.includes('T')) {
                return moment.tz(timeStr, 'Asia/Kolkata').toDate();
            }
            const [hours, minutes] = timeStr.split(':');
            return moment.tz(date, 'Asia/Kolkata').set({ hour: parseInt(hours, 10), minute: parseInt(minutes, 10), second: 0, millisecond: 0 }).toDate();
        };`
);

fs.writeFileSync(file, content);
