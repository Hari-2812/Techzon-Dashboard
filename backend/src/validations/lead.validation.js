const { z } = require('zod');

const leadSchema = z.object({
  studentName: z.string().min(1, 'Name is required'),
  phone: z.string().regex(/^[0-9]{10}$/, 'Must be a valid 10-digit Indian phone number'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')).nullish(),
  college: z.string().min(1, 'College is required'),
  department: z.string().optional().or(z.literal('')).nullish(),
  year: z.string().optional().or(z.literal('')).nullish(),
  course: z.string().optional().or(z.literal('')).nullish(),
  parentContactName: z.string().optional().or(z.literal('')).nullish(),
  parentContactPhone: z.string().optional().or(z.literal('')).nullish(),
  section: z.string().optional().or(z.literal('')).nullish(),
  leadSource: z.string().optional().or(z.literal('')).nullish(),
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW']).default('MEDIUM'),
  assignedEmployeeId: z.string().optional().nullish(),
  notes: z.string().optional().nullish()
});

const normalizePhone = (phone) => {
  if (!phone) return '';
  const num = phone.toString().replace(/\D/g, '');
  if (num.length > 10 && num.startsWith('91')) {
     return num.slice(-10);
  } else if (num.length > 10 && num.startsWith('0')) {
     return num.slice(-10);
  }
  return num.slice(-10);
};

module.exports = {
  leadSchema,
  normalizePhone
};
