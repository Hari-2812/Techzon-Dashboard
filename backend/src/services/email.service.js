const nodemailer = require('nodemailer');

/**
 * Creates a configured nodemailer transport instance based on environment variables.
 */
const createTransporter = () => {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD,
        },
    });
};

/**
 * Email Service
 */
exports.sendEmployeeWelcomeEmail = async (employeeData) => {
    const { email, name, employeeId, role, department, temporaryPassword } = employeeData;
    const dashboardUrl = process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:5173/dashboard';

    // If SMTP is not configured, fall back to logging in dev, or fail in production
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
        if (process.env.NODE_ENV === 'production') {
             console.error('SMTP configuration is missing in production environment');
             throw new Error('Email service is not configured');
        }
        
        console.log(`[MOCK EMAIL] To: ${email} | Subject: Welcome to Techzon`);
        console.log(`[MOCK EMAIL] Temp Password: ${temporaryPassword}`);
        return { success: true, message: 'Email sent successfully (mocked)' };
    }

    const transporter = createTransporter();

    const mailOptions = {
        from: `Techzon / HR <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: email,
        subject: 'Welcome to Techzon — Your CRM Dashboard Access',
        text: `Hello ${name},

Welcome to Techzon.

Your employee account has been created.

Employee ID: ${employeeId}
Role: ${role}
Department: ${department || 'N/A'}

Dashboard: ${dashboardUrl}

Temporary Password: ${temporaryPassword}

For security, you will be required to change your password when you first sign in.

Regards,
Techzon Team`
    };

    try {
        await transporter.sendMail(mailOptions);
        return { success: true, message: 'Email sent successfully' };
    } catch (error) {
        console.error('Error sending welcome email:', error);
        throw new Error('Failed to send welcome email');
    }
};

/**
 * Check SMTP configuration on startup
 */
exports.verifyConnection = async () => {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
        console.log('SMTP: NOT CONFIGURED');
        return false;
    }
    
    try {
        const transporter = createTransporter();
        await transporter.verify();
        console.log('SMTP: CONFIGURED');
        return true;
    } catch (error) {
        console.log('SMTP: CONFIGURED (but connection failed - check credentials)');
        return false;
    }
};
