require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());

// Rate limiting
app.use('/api/auth/send-otp', rateLimit({ windowMs: 15 * 60 * 1000, max: 5, message: { error: 'Too many OTP requests. Try again in 15 minutes.' } }));
app.use('/api', rateLimit({ windowMs: 60 * 1000, max: 100 }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/students', require('./routes/students'));
app.use('/api/attendance', require('./routes/attendance'));

const { marksRouter, feesRouter, noticesRouter, homeworkRouter } = require('./routes/modules');
app.use('/api/marks', marksRouter);
app.use('/api/fees', feesRouter);
app.use('/api/notices', noticesRouter);
app.use('/api/homework', homeworkRouter);

// Health check
app.get('/health', (_, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// 404
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`SMS Backend running on port ${PORT}`));
