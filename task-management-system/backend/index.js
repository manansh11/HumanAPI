const express = require('express');
const cors = require('cors');
require('dotenv').config();
const connectDB = require('./config/database');
const taskRoutes = require('./routes/tasks');

const app = express();

// Connect to MongoDB
connectDB();

app.use(cors());
app.use(express.json());

// Task routes
app.use('/api/tasks', taskRoutes);

app.get('/api/health', (req, res) => {
  console.log('Health check endpoint called');
  res.json({
    status: 'ok',
    message: 'Task Management API is running',
    timestamp: new Date().toISOString()
  });
});

app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({
    status: 'error',
    message: 'Something went wrong!'
  });
});

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Graceful shutdown handlers
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
