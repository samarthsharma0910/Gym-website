/**
 * IronForge Gym — Backend API Server
 * Node.js + Express.js + MongoDB (Mongoose)
 */

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// ─── MIDDLEWARE ───
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));

// Global rate limiter
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: { success: false, message: 'Too many requests. Please try again shortly.' }
}));

// Stricter limiter for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many login attempts. Please wait 15 minutes.' }
});

// ─── DATABASE ───
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ironforge', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB connected'))
.catch(err => { console.error('❌ MongoDB connection error:', err); process.exit(1); });

// ─── ROUTES ───
app.use('/api/auth',        authLimiter, require('./routes/auth'));
app.use('/api/members',     require('./routes/members'));
app.use('/api/memberships', require('./routes/memberships'));
app.use('/api/trainers',    require('./routes/trainers'));
app.use('/api/programs',    require('./routes/programs'));
app.use('/api/bookings',    require('./routes/bookings'));
app.use('/api/inquiries',   require('./routes/inquiries'));
app.use('/api/newsletter',  require('./routes/newsletter'));
app.use('/api/admin',       require('./routes/admin'));

// Serve static frontend in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../')));
  app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../index.html')));
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'IronForge API running',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV
  });
});

// ─── ERROR HANDLER ───
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

app.listen(PORT, () => console.log(`🏋️  IronForge API running on port ${PORT}`));
module.exports = app;