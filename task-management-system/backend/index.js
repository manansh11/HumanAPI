// Basic Express server setup for Task Management System
const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Initialize express app
const app = express();

// Middleware
app.use(cors());  // Enable CORS for all routes
app.use(express.json());  // Parse JSON bodies

// Test endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Task Management API is running'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    status: 'error',
    message: 'Something went wrong!'
  });
});

// Set port and start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
