const { BrevoClient } = require('@getbrevo/brevo');

/**
 * Initialize Brevo API Client
 */
const initBrevoClient = () => {
    return new BrevoClient({
        apiKey: process.env.BREVO_API_KEY
    });
};

const getSender = () => {
    return {
        name: process.env.BREVO_SENDER_NAME || 'Techzon HR',
        email: process.env.BREVO_SENDER_EMAIL
    };
};

/**
 * Helper to send email via Brevo
 */
const sendEmail = async (toEmail, toName, subject, htmlContent, textContent) => {
    if (!process.env.BREVO_API_KEY || !process.env.BREVO_SENDER_EMAIL) {
        if (process.env.NODE_ENV === 'production') {
            console.error('Brevo configuration is missing in production environment');
            throw new Error('Brevo email service is not configured.');
        }
        console.log(`[MOCK BREVO] To: ${toEmail} | Subject: ${subject}`);
        return { success: true, message: 'Email sent successfully (mocked)' };
    }

    try {
        const brevo = initBrevoClient();
        
        await brevo.transactionalEmails.sendTransacEmail({
            subject,
            ...(htmlContent && { htmlContent }),
            ...(textContent && { textContent }),
            sender: getSender(),
            to: [{ email: toEmail, name: toName }]
        });
        
        return { success: true, message: 'Email sent successfully' };
    } catch (error) {
        console.error('Brevo API Error:', error.statusCode, error.message);
        throw new Error('Unable to send the employee invitation. Please try again.');
    }
};

const baseHtmlTemplate = (title, content) => `
    <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #E5E7EB; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #3525CD; padding: 24px; text-align: center;">
            <h1 style="color: #FFFFFF; margin: 0; font-size: 24px;">${title}</h1>
        </div>
        <div style="padding: 32px; background-color: #FFFFFF; color: #191C1D; line-height: 1.6;">
            ${content}
        </div>
        <div style="background-color: #F8F9FA; padding: 16px; text-align: center; color: #6B7280; font-size: 14px; border-top: 1px solid #E5E7EB;">
            &copy; ${new Date().getFullYear()} Techzon CRM Dashboard. All rights reserved.
        </div>
    </div>
`;

/**
 * Send Employee Welcome Email
 */
exports.sendEmployeeWelcomeEmail = async (employeeData) => {
    const { email, name, employeeId, role, department, temporaryPassword } = employeeData;
    const dashboardUrl = process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:5173/dashboard';

    const textContent = `Hello ${name},

Welcome to Techzon.

Your employee account has been created successfully.

Employee ID: ${employeeId}
Role: ${role}
Department: ${department || 'N/A'}

Dashboard: ${dashboardUrl}

Temporary Password: ${temporaryPassword}

For security reasons, you will be required to change your password after your first login.

Regards,
Techzon HR Team`;

    const htmlContent = baseHtmlTemplate('Techzon CRM Dashboard', `
        <h2 style="color: #3525CD; margin-top: 0;">Welcome to Techzon, ${name}!</h2>
        <p>Your employee account has been created successfully.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #E5E7EB; color: #6B7280;"><strong>Employee ID</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #E5E7EB; text-align: right;">${employeeId}</td></tr>
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #E5E7EB; color: #6B7280;"><strong>Role</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #E5E7EB; text-align: right;">${role}</td></tr>
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #E5E7EB; color: #6B7280;"><strong>Department</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #E5E7EB; text-align: right;">${department || 'N/A'}</td></tr>
        </table>

        <div style="background-color: #F8F9FA; padding: 16px; border-radius: 6px; border-left: 4px solid #FD761A; margin-bottom: 24px;">
            <p style="margin: 0; font-size: 14px; color: #6B7280;">Temporary Password</p>
            <p style="margin: 8px 0 0 0; font-size: 18px; font-family: monospace; font-weight: bold; color: #191C1D;">${temporaryPassword}</p>
        </div>

        <div style="text-align: center; margin-top: 32px;">
            <a href="${dashboardUrl}" style="background-color: #3525CD; color: #FFFFFF; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Access Dashboard</a>
        </div>

        <p style="margin-top: 32px; font-size: 14px; color: #6B7280;">For security reasons, you will be required to change your password after your first login.</p>
    `);

    return sendEmail(email, name, 'Welcome to Techzon — Your CRM Dashboard Access', htmlContent, textContent);
};

exports.sendEmployeeInvitationEmail = exports.sendEmployeeWelcomeEmail;

/**
 * Send Password Reset Email
 */
exports.sendPasswordResetEmail = async (employeeData) => {
    const { email, name, temporaryPassword } = employeeData;
    const dashboardUrl = process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:5173/dashboard';

    const textContent = `Hello ${name},

Your Techzon CRM password has been reset by an Administrator.

Temporary Password: ${temporaryPassword}
Dashboard: ${dashboardUrl}

You will be required to change this password after your next login.

Regards,
Techzon HR Team`;

    const htmlContent = baseHtmlTemplate('Techzon CRM Dashboard', `
        <h2 style="color: #3525CD; margin-top: 0;">Password Reset</h2>
        <p>Hello ${name},</p>
        <p>Your Techzon CRM password has been reset by an Administrator.</p>
        
        <div style="background-color: #F8F9FA; padding: 16px; border-radius: 6px; border-left: 4px solid #FD761A; margin: 24px 0;">
            <p style="margin: 0; font-size: 14px; color: #6B7280;">Temporary Password</p>
            <p style="margin: 8px 0 0 0; font-size: 18px; font-family: monospace; font-weight: bold; color: #191C1D;">${temporaryPassword}</p>
        </div>

        <div style="text-align: center; margin-top: 32px;">
            <a href="${dashboardUrl}" style="background-color: #3525CD; color: #FFFFFF; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Login to Dashboard</a>
        </div>
    `);

    return sendEmail(email, name, 'Your Techzon CRM Password has been reset', htmlContent, textContent);
};

/**
 * Send Holiday Notification Email
 */
exports.sendHolidayNotificationEmail = async (email, name, holidayName, date) => {
    const textContent = `Hello ${name},

Please note that tomorrow (${new Date(date).toLocaleDateString()}) is a Government Holiday: ${holidayName}.

Regards,
Techzon HR Team`;

    return sendEmail(email, name, `Holiday Alert: ${holidayName}`, null, textContent);
};

/**
 * Send General Notification Email
 */
exports.sendNotificationEmail = async (email, name, subject, message) => {
    return sendEmail(email, name, subject, null, `Hello ${name},\n\n${message}\n\nRegards,\nTechzon HR Team`);
};

/**
 * Send Attendance Reminder Email
 */
exports.sendAttendanceReminderEmail = async (employeeData) => {
    const { email, name, reason, message, date, expectedLoginTime, currentStatus } = employeeData;
    const dashboardUrl = process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:5173/dashboard';
    const attendanceUrl = dashboardUrl.replace('/dashboard', '/attendance');
    
    const statusText = currentStatus || 'Not Clocked In';
    const expectedTimeText = expectedLoginTime || '09:30 AM';
    
    const textContent = `Dear ${name},

Your attendance for today (${date}) has not been recorded.

Employee Name: ${name}
Today's Date: ${date}
Expected Login Time: ${expectedTimeText}
Current status: ${statusText}

Reason:
${reason}

${message ? 'Message from Admin:\n' + message + '\n\n' : ''}Please complete the appropriate attendance action in the employee portal.

If you are unable to clock in because you require leave or permission, submit the appropriate request from the Attendance section.

Complete your attendance here:
${attendanceUrl}

If you are on approved leave or permission, no action is required if your request has already been approved.

Regards,
Techzon Administrator`;

    const htmlContent = baseHtmlTemplate('Attendance Update Required', `
        <h2 style="color: #3525CD; margin-top: 0;">Attendance Reminder</h2>
        <p>Dear ${name},</p>
        <p>Your attendance for today (<strong>${date}</strong>) has not been recorded.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #E5E7EB; color: #6B7280;"><strong>Employee Name</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #E5E7EB; text-align: right;">${name}</td></tr>
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #E5E7EB; color: #6B7280;"><strong>Today's Date</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #E5E7EB; text-align: right;">${date}</td></tr>
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #E5E7EB; color: #6B7280;"><strong>Expected Login Time</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #E5E7EB; text-align: right;">${expectedTimeText}</td></tr>
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #E5E7EB; color: #6B7280;"><strong>Current status</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #E5E7EB; text-align: right; font-weight: bold; color: #DC2626;">${statusText}</td></tr>
        </table>

        <div style="background-color: #F8F9FA; padding: 16px; border-radius: 6px; border-left: 4px solid #FD761A; margin: 24px 0;">
            <p style="margin: 0; font-size: 14px; color: #6B7280;">Reason</p>
            <p style="margin: 8px 0 0 0; font-size: 16px; font-weight: bold; color: #191C1D;">${reason}</p>
        </div>

        ${message ? `
        <div style="background-color: #EEF2FF; padding: 16px; border-radius: 6px; border-left: 4px solid #3525CD; margin: 24px 0;">
            <p style="margin: 0; font-size: 14px; color: #6B7280;">Message from Admin</p>
            <p style="white-space: pre-wrap; margin: 8px 0 0 0; font-size: 14px; color: #191C1D;">${message}</p>
        </div>
        ` : ''}
        
        <p>Please complete the appropriate attendance action in the employee portal.</p>
        <p>If you are unable to clock in because you require leave or permission, submit the appropriate request from the Attendance section.</p>

        <div style="text-align: center; margin-top: 32px; margin-bottom: 32px;">
            <a href="${attendanceUrl}" style="background-color: #3525CD; color: #FFFFFF; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Update Attendance</a>
        </div>

        <p style="font-size: 14px; color: #6B7280; margin-top: 24px;">If you are on approved leave or permission, no action is required if your request has already been approved.</p>
        <p style="margin-top: 24px;">Regards,<br/><strong>Techzon Administrator</strong></p>
    `);

    return sendEmail(email, name, `Attendance Action Required - ${date}`, htmlContent, textContent);
};

/**
 * Test Endpoint Handler logic
 */
exports.testEmail = async (toEmail) => {
    const htmlContent = baseHtmlTemplate('Techzon CRM Email Test', `
        <p>This is a test email from the Techzon CRM Dashboard.</p>
        <p>If you are receiving this, the Brevo Transactional Email API is configured correctly.</p>
    `);
    
    return sendEmail(toEmail, 'Test User', 'Techzon CRM Email Test', htmlContent, 'This is a test email from the Techzon CRM Dashboard.');
};

/**
 * Check Brevo configuration on startup
 */
exports.verifyConnection = async () => {
    if (!process.env.BREVO_API_KEY || !process.env.BREVO_SENDER_EMAIL) {
        console.log('Brevo email service: NOT CONFIGURED');
        return false;
    }
    
    // Attempting a simple initialization to confirm SDK works
    try {
        const brevo = initBrevoClient();
        if (brevo && brevo.transactionalEmails) {
            console.log('Brevo email service: CONFIGURED');
            return true;
        } else {
            throw new Error('Brevo instance invalid');
        }
    } catch (error) {
        console.log('Brevo email service: CONFIGURED (but SDK initialization failed)');
        return false;
    }
};
