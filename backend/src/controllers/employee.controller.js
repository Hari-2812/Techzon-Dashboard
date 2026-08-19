const User = require('../models/User');
const Counter = require('../models/Counter');
const bcrypt = require('bcryptjs');
const { sendEmployeeWelcomeEmail } = require('../services/email.service');
const AuditLog = require('../models/AuditLog');

// Helper to generate next employee ID
const getNextEmployeeId = async (role) => {
    const counterId = `TZ-${role}`;
    const counter = await Counter.findOneAndUpdate(
        { id: counterId },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
    );
    // Pad with zeros to length 3
    const seqStr = String(counter.seq).padStart(3, '0');
    return `${counterId}-${seqStr}`;
};

// @route   POST /api/employees
// @desc    Create new employee (Admin only)
// @access  Private/Admin
exports.createEmployee = async (req, res) => {
    try {
        if (req.user.role !== 'ADMIN') return res.status(403).json({ success: false, message: 'Admin only' });
        
        const { 
            firstName, lastName, name, email, phone, role, department, designation, 
            joiningDate, passwordMode, manualPassword, gender, dob, employmentType, workLocation,
            emergencyContactName, emergencyContactPhone, emergencyContactRelation
        } = req.body;
        
        let user = await User.findOne({ $or: [{ email }, { phone }] });
        if (user) {
            return res.status(400).json({ success: false, message: 'User with this email or phone already exists' });
        }

        // Generate Employee ID automatically
        const employeeId = await getNextEmployeeId(role);

        // Determine password
        let rawPassword = '';
        if (passwordMode === 'MANUAL' && manualPassword) {
            rawPassword = manualPassword;
        } else {
            // Generate secure random password
            rawPassword = `TZ@${Math.random().toString(36).slice(-6)}!${Math.floor(Math.random() * 99)}`;
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(rawPassword, salt);
        
        const profilePhotoPath = req.file ? `/uploads/profiles/${req.file.filename}` : '';

        user = await User.create({
            name: name || `${firstName} ${lastName}`.trim(),
            email,
            phone,
            role,
            passwordHash,
            mustChangePassword: true,
            status: 'INVITED',
            isActive: true,
            employeeId,
            department,
            designation,
            joiningDate,
            profilePhoto: profilePhotoPath,
            gender,
            dob,
            employmentType,
            workLocation,
            emergencyContact: {
                name: emergencyContactName,
                phone: emergencyContactPhone,
                relationship: emergencyContactRelation
            }
        });
        
        // Log action
        await AuditLog.create({
            actorId: req.user.id,
            action: 'EMPLOYEE_CREATED',
            entityType: 'User',
            entityId: user._id,
            metadata: { employeeId: user.employeeId, role: user.role }
        });

        let emailSent = false;
        try {
            await sendEmployeeWelcomeEmail({
                email: user.email,
                name: user.name,
                employeeId: user.employeeId,
                role: user.role,
                department: user.department,
                temporaryPassword: rawPassword
            });
            emailSent = true;
            await AuditLog.create({
                actorId: req.user.id,
                action: 'INVITATION_SENT',
                entityType: 'User',
                entityId: user._id
            });
        } catch (err) {
            console.error('Email failed', err);
        }

        // Note: we DO NOT send back rawPassword in response to keep it secure
        res.status(201).json({ 
            success: true, 
            message: emailSent ? 'Employee created successfully' : 'Employee created successfully. Welcome email failed to send.',
            emailSent,
            data: { 
                id: user._id, 
                employeeId: user.employeeId,
                name: user.name, 
                email: user.email, 
                role: user.role,
                status: user.status
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @route   GET /api/employees
// @desc    Get all employees with filters
// @access  Private
exports.getEmployees = async (req, res) => {
    try {
        const query = {};
        if (req.query.status) query.status = req.query.status;
        if (req.query.role) query.role = req.query.role;
        if (req.query.isActive) query.isActive = req.query.isActive === 'true';

        const employees = await User.find(query).select('-passwordHash').sort({ createdAt: -1 });
        res.json({ success: true, data: employees });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @route   GET /api/employees/:id
// @desc    Get single employee details
// @access  Private
exports.getEmployeeById = async (req, res) => {
    try {
        const employee = await User.findById(req.params.id).select('-passwordHash');
        if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });
        res.json({ success: true, data: employee });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @route   PATCH /api/employees/:id/status
// @desc    Update employee status (Activate/Suspend/Deactivate)
// @access  Private/Admin
exports.updateEmployeeStatus = async (req, res) => {
    try {
        if (req.user.role !== 'ADMIN') return res.status(403).json({ success: false, message: 'Admin only' });
        
        const { status, reason } = req.body;
        const validStatuses = ['ACTIVE', 'INVITED', 'SUSPENDED', 'INACTIVE'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }

        const isActive = status === 'ACTIVE' || status === 'INVITED';
        const updateData = { status, isActive };
        
        const user = await User.findByIdAndUpdate(
            req.params.id, 
            updateData, 
            { new: true }
        ).select('-passwordHash');

        if (!user) return res.status(404).json({ success: false, message: 'Employee not found' });

        await AuditLog.create({
            actorId: req.user.id,
            action: `EMPLOYEE_${status}`,
            entityType: 'User',
            entityId: user._id,
            metadata: { reason }
        });

        res.json({ success: true, data: user });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @route   POST /api/employees/:id/resend-invitation
// @desc    Resend welcome email with new temp password
// @access  Private/Admin
exports.resendInvitation = async (req, res) => {
    try {
        if (req.user.role !== 'ADMIN') return res.status(403).json({ success: false, message: 'Admin only' });

        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ success: false, message: 'Employee not found' });

        // Generate new temp password
        const rawPassword = `TZ@${Math.random().toString(36).slice(-6)}!${Math.floor(Math.random() * 99)}`;
        const salt = await bcrypt.genSalt(10);
        user.passwordHash = await bcrypt.hash(rawPassword, salt);
        user.mustChangePassword = true;
        user.status = 'INVITED';
        await user.save();

        await sendEmployeeWelcomeEmail({
            email: user.email,
            name: user.name,
            employeeId: user.employeeId,
            role: user.role,
            department: user.department,
            temporaryPassword: rawPassword
        });

        await AuditLog.create({
            actorId: req.user.id,
            action: 'INVITATION_RESENT',
            entityType: 'User',
            entityId: user._id
        });

        res.json({ success: true, message: 'Invitation resent successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @route   PUT /api/employees/:id
// @desc    Update employee details
// @access  Private/Admin
exports.updateEmployee = async (req, res) => {
    try {
        if (req.user.role !== 'ADMIN') return res.status(403).json({ success: false, message: 'Admin only' });
        
        const { 
            firstName, lastName, name, email, phone, role, department, designation, 
            joiningDate, gender, dob, employmentType, workLocation,
            emergencyContactName, emergencyContactPhone, emergencyContactRelation,
            removePhoto
        } = req.body;
        
        const employee = await User.findById(req.params.id);
        if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });

        // Check duplicates for email/phone excluding current user
        if (email && email !== employee.email) {
            const emailExists = await User.findOne({ email, _id: { $ne: employee._id } });
            if (emailExists) return res.status(400).json({ success: false, message: 'User with this email already exists' });
        }
        if (phone && phone !== employee.phone) {
            const phoneExists = await User.findOne({ phone, _id: { $ne: employee._id } });
            if (phoneExists) return res.status(400).json({ success: false, message: 'User with this phone already exists' });
        }

        const oldValues = { ...employee.toObject() };
        const changedFields = {};

        if (name || (firstName && lastName)) employee.name = name || `${firstName} ${lastName}`.trim();
        if (email) employee.email = email;
        if (phone) employee.phone = phone;
        if (role) employee.role = role;
        if (department) employee.department = department;
        if (designation) employee.designation = designation;
        if (joiningDate) employee.joiningDate = joiningDate;
        if (gender) employee.gender = gender;
        if (dob) employee.dob = dob;
        if (employmentType) employee.employmentType = employmentType;
        if (workLocation) employee.workLocation = workLocation;

        if (emergencyContactName || emergencyContactPhone || emergencyContactRelation) {
            if (!employee.emergencyContact) employee.emergencyContact = {};
            if (emergencyContactName) employee.emergencyContact.name = emergencyContactName;
            if (emergencyContactPhone) employee.emergencyContact.phone = emergencyContactPhone;
            if (emergencyContactRelation) employee.emergencyContact.relationship = emergencyContactRelation;
        }

        if (removePhoto === 'true') {
            employee.profilePhoto = '';
        } else if (req.file) {
            employee.profilePhoto = `/uploads/profiles/${req.file.filename}`;
        }

        // Track changes for Audit Log
        const newValuesObj = employee.toObject();
        Object.keys(newValuesObj).forEach(key => {
            if (JSON.stringify(oldValues[key]) !== JSON.stringify(newValuesObj[key])) {
                changedFields[key] = newValuesObj[key];
            }
        });

        await employee.save();

        if (Object.keys(changedFields).length > 0) {
            await AuditLog.create({
                actorId: req.user.id,
                action: 'EMPLOYEE_UPDATED',
                entityType: 'User',
                entityId: employee._id,
                oldValue: oldValues,
                newValue: newValuesObj,
                metadata: { changedFields }
            });
            if (changedFields.role) {
                await AuditLog.create({
                    actorId: req.user.id,
                    action: 'EMPLOYEE_ROLE_CHANGED',
                    entityType: 'User',
                    entityId: employee._id,
                    metadata: { oldRole: oldValues.role, newRole: employee.role }
                });
            }
            if (changedFields.email) {
                await AuditLog.create({
                    actorId: req.user.id,
                    action: 'EMPLOYEE_EMAIL_UPDATED',
                    entityType: 'User',
                    entityId: employee._id
                });
            }
            if (changedFields.phone) {
                await AuditLog.create({
                    actorId: req.user.id,
                    action: 'EMPLOYEE_PHONE_UPDATED',
                    entityType: 'User',
                    entityId: employee._id
                });
            }
            if (changedFields.department) {
                await AuditLog.create({
                    actorId: req.user.id,
                    action: 'EMPLOYEE_DEPARTMENT_CHANGED',
                    entityType: 'User',
                    entityId: employee._id
                });
            }
            if (changedFields.designation) {
                await AuditLog.create({
                    actorId: req.user.id,
                    action: 'EMPLOYEE_DESIGNATION_CHANGED',
                    entityType: 'User',
                    entityId: employee._id
                });
            }
            if (changedFields.profilePhoto) {
                await AuditLog.create({
                    actorId: req.user.id,
                    action: 'EMPLOYEE_PHOTO_UPDATED',
                    entityType: 'User',
                    entityId: employee._id
                });
            }
        }

        res.json({ success: true, data: employee });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @route   POST /api/employees/:id/reset-password
// @desc    Reset password for employee
// @access  Private/Admin
exports.resetPassword = async (req, res) => {
    try {
        if (req.user.role !== 'ADMIN') return res.status(403).json({ success: false, message: 'Admin only' });

        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ success: false, message: 'Employee not found' });

        const rawPassword = `TZ@${Math.random().toString(36).slice(-6)}!${Math.floor(Math.random() * 99)}`;
        const salt = await bcrypt.genSalt(10);
        user.passwordHash = await bcrypt.hash(rawPassword, salt);
        user.mustChangePassword = true;
        await user.save();

        await sendEmployeeWelcomeEmail({
            email: user.email,
            name: user.name,
            employeeId: user.employeeId,
            role: user.role,
            department: user.department,
            temporaryPassword: rawPassword
        });

        await AuditLog.create({
            actorId: req.user.id,
            action: 'PASSWORD_RESET_BY_ADMIN',
            entityType: 'User',
            entityId: user._id
        });

        res.json({ success: true, message: 'Password reset successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};
