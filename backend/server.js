const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const { sequelize } = require('./config/database');
const authRoutes = require('./modules/auth/routes');
const userRoutes = require('./modules/users/routes');
const projectRoutes = require('./modules/projects/routes');
const projectMemberRoutes = require('./modules/project-members/routes');
const taskRoutes = require('./modules/tasks/routes');
const materialRoutes = require('./modules/materials/routes');
const labourRoutes = require('./modules/labours/routes');
const issueRoutes = require('./modules/issues/routes');
const reportRoutes = require('./modules/reports/routes');
const documentRoutes = require('./modules/documents/routes');
const payrollRoutes = require('./modules/payroll/routes');
const expenseRoutes = require('./modules/expenses/routes');
const paymentRoutes = require('./modules/payments/routes');
const commercialRoutes = require('./modules/commercial/routes');
const mrrRoutes = require('./modules/mrr/routes');
const purchaseOrderRoutes = require('./modules/purchase-orders/routes');
const supplierLedgerRoutes = require('./modules/supplier-ledger/routes');
const supplierRoutes = require('./modules/suppliers/routes');
const materialReceiptRoutes = require('./modules/material-receipts/routes');
const materialManagementRoutes = require('./modules/material-management/routes');
const subcontractorRoutes = require('./modules/subcontractors/routes');
const subcontractorLedgerRoutes = require('./modules/subcontractor-ledger/routes');

const { authenticateToken } = require('./middleware/auth');
const { errorHandler } = require('./middleware/errorHandler');
const { setupSocketHandlers } = require('./services/socketService');

const app = express();
const server = createServer(app);

// Trust proxy for rate limiting behind reverse proxy
app.set('trust proxy', 1);
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:3000",
      "http://localhost:4042", 
      "https://www.constructease.hellbent.in",
      "http://www.constructease.hellbent.in",
      "https://www.lminfra.hellbent.in",
      "http://www.lminfra.hellbent.in",
      "http://89.116.34.49:4042",
      "https://89.116.34.49:4042",
      "https://api.cms.hellbent.in"
    ],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Security middleware
app.use(helmet());
app.use(cors({
  origin: [
    "http://localhost:3000",
    "http://localhost:4042", 
    "https://www.constructease.hellbent.in",
    "http://www.constructease.hellbent.in",
    "https://www.lminfra.hellbent.in",
    "http://www.lminfra.hellbent.in",
    "http://89.116.34.49:4042",
    "https://89.116.34.49:4042",
    "https://api.cms.hellbent.in"
  ],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000, // Increased from 100 to 1000
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting in development
    return process.env.NODE_ENV === 'development';
  }
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use('/uploads', express.static('uploads'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', authenticateToken, userRoutes);
app.use('/api/projects', authenticateToken, projectRoutes);
app.use('/api/project-members', authenticateToken, projectMemberRoutes);
app.use('/api/tasks', authenticateToken, taskRoutes);
app.use('/api/materials', authenticateToken, materialRoutes);
app.use('/api/labours', authenticateToken, labourRoutes);
app.use('/api/issues', authenticateToken, issueRoutes);
app.use('/api/reports', authenticateToken, reportRoutes);
app.use('/api/documents', authenticateToken, documentRoutes);
app.use('/api/payroll', authenticateToken, payrollRoutes);
app.use('/api/expenses', authenticateToken, expenseRoutes);
app.use('/api/payments', authenticateToken, paymentRoutes);
app.use('/api/commercial', authenticateToken, commercialRoutes);
app.use('/api/mrr', authenticateToken, mrrRoutes);
app.use('/api/purchase-orders', authenticateToken, purchaseOrderRoutes);
app.use('/api/supplier-ledger', authenticateToken, supplierLedgerRoutes);
app.use('/api/suppliers', authenticateToken, supplierRoutes);
app.use('/api/material-receipts', authenticateToken, materialReceiptRoutes);

// Admin routes
const adminRoutes = require('./modules/admin/routes');
app.use('/api/admin', adminRoutes);
app.use('/api/material-management', authenticateToken, materialManagementRoutes);
app.use('/api/subcontractors', authenticateToken, subcontractorRoutes);
app.use('/api/subcontractor-ledger', authenticateToken, subcontractorLedgerRoutes);

// Socket.io setup
setupSocketHandlers(io);

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Database connection and server start
const PORT = process.env.PORT || 4041;

const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    
    // Check if tables exist before syncing
    if (process.env.NODE_ENV === 'development') {
      try {
        // Try to query a table to see if it exists
        await sequelize.query('SELECT 1 FROM users LIMIT 1');
        console.log('Database tables already exist, skipping sync.');
      } catch (error) {
        // Tables don't exist, sync them
        console.log('Creating database tables...');
        await sequelize.sync({ force: false });
        console.log('Database synchronized.');
      }
    }
    
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    console.error('Unable to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await sequelize.close();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await sequelize.close();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

startServer();

module.exports = { app, server, io };
