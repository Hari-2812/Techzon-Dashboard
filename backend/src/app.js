const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { env } = require('./config/env');

const app = express();

const allowedOrigins = [
  'https://techzon-dashboard.vercel.app',
  'https://crm.techzonwide.com',
  'http://localhost:5173',
  env.FRONTEND_URL
];

if (process.env.CORS_ORIGINS) {
  allowedOrigins.push(...process.env.CORS_ORIGINS.split(',').map(o => o.trim()));
}

// Middlewares
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1 && !allowedOrigins.includes('*')) {
      var msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Healthcheck route
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    success: true, 
    message: 'Techzon CRM backend is running',
    timestamp: new Date().toISOString()
  });
});

// Setup api routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/dashboard', require('./routes/dashboard.routes'));
app.use('/api/leads', require('./routes/lead.routes'));
app.use('/api/follow-ups', require('./routes/followup.routes'));
app.use('/api/crs', require('./routes/cr.routes'));
app.use('/api/whatsapp-groups', require('./routes/whatsappGroup.routes'));
app.use('/api/attendance', require('./routes/attendance.routes'));
app.use('/api/daily-updates', require('./routes/dailyUpdates.routes'));
app.use('/api/attendance-management', require('./routes/admin-attendance.routes'));
app.use('/api/sales', require('./routes/sale.routes'));
app.use('/api/performance', require('./routes/performance.routes'));
app.use('/api/holidays', require('./routes/holiday.routes'));
app.use('/api/holiday-responses', require('./routes/holidayResponse.routes'));
app.use('/api/employees', require('./routes/employee.routes'));
app.use('/api/email', require('./routes/email.routes'));

module.exports = app;
