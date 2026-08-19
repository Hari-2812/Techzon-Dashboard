const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const app = require('./app');
const { env } = require('./config/env');

const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: env.FRONTEND_URL,
    credentials: true,
  },
});

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });

  // Test Mode Trigger
  socket.on('test:holiday-trigger', async () => {
      console.log('TEST TRIGGER: Simulating Holiday notification');
      const Holiday = require('./models/Holiday');
      // Find ANY active holiday for the sake of the test
      const holiday = await Holiday.findOne({ isActive: true });
      if (holiday) {
         io.emit('holiday:tomorrow-alert', {
            holiday,
            message: `[TEST] Tomorrow is a Government Holiday: ${holiday.name}. Please confirm your availability.`
         });
      } else {
         console.log('TEST FAILED: No active holidays exist in DB to simulate.');
      }
  });
});

// Database connection
if (!env.MONGODB_URI) {
  console.error('❌ FATAL ERROR: MONGODB_URI is not defined in the environment variables.');
  process.exit(1);
}

mongoose.connect(env.MONGODB_URI)
  .then(() => {
    console.log(`
Techzon CRM Backend
-------------------
Environment: ${env.NODE_ENV}
Port: ${env.PORT}
Database: Connected
Socket.IO: Enabled
Server: Running
`);
    // Start Server
    server.listen(env.PORT, async () => {
      console.log(`🚀 Server listening on port ${env.PORT}`);
      
      // Verify Brevo Configuration
      const emailService = require('./services/email.service');
      await emailService.verifyConnection();

      // Initialize Holiday Scheduler
      require('./jobs/holidayScheduler')(io);
    });
  })
  .catch((error) => {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  });

module.exports = { io, server };
