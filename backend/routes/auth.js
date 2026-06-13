const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const supabase = require('../config/supabase');

const otpStore = new Map(); // { email: { otp, expires, userData } }

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Step 1: Send OTP
router.post('/send-otp', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  // Check user exists in DB
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email.toLowerCase())
    .single();

  if (error || !user)
    return res.status(404).json({ error: 'No account found with this email' });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expires = Date.now() + 10 * 60 * 1000; // 10 mins

  otpStore.set(email.toLowerCase(), { otp, expires, user });

  try {
    await transporter.sendMail({
      from: `"SMS Pro" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Your Login OTP - SMS Pro',
      html: `
        <div style="font-family:sans-serif;max-width:400px;margin:auto;padding:24px;border:1px solid #eee;border-radius:12px">
          <h2 style="color:#185FA5">SMS Pro Login</h2>
          <p>Your one-time password is:</p>
          <div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#185FA5;padding:16px;background:#E6F1FB;border-radius:8px;text-align:center">${otp}</div>
          <p style="color:#888;font-size:13px;margin-top:16px">Valid for 10 minutes. Do not share this OTP.</p>
        </div>
      `,
    });
    res.json({ success: true, message: 'OTP sent to your email' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send OTP email' });
  }
});

// Step 2: Verify OTP
router.post('/verify-otp', (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ error: 'Email and OTP required' });

  const record = otpStore.get(email.toLowerCase());
  if (!record) return res.status(400).json({ error: 'OTP not requested or expired' });
  if (Date.now() > record.expires) {
    otpStore.delete(email.toLowerCase());
    return res.status(400).json({ error: 'OTP expired. Request a new one.' });
  }
  if (record.otp !== otp.toString())
    return res.status(400).json({ error: 'Invalid OTP' });

  otpStore.delete(email.toLowerCase());

  const token = jwt.sign(
    { id: record.user.id, email: record.user.email, role: record.user.role, name: record.user.name },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );

  res.json({ token, user: { id: record.user.id, name: record.user.name, email: record.user.email, role: record.user.role } });
});

// Get current user
router.get('/me', require('../middleware/auth'), async (req, res) => {
  const { data: user } = await supabase.from('users').select('id,name,email,role').eq('id', req.user.id).single();
  res.json(user);
});

module.exports = router;
