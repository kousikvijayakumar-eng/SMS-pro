const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const supabase = require('../config/supabase');

// GET all students (admin/teacher)
router.get('/', auth, async (req, res) => {
  if (req.user.role === 'student') return res.status(403).json({ error: 'Forbidden' });
  const { data, error } = await supabase.from('students').select('*').order('name');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET my profile (student)
router.get('/me', auth, async (req, res) => {
  const { data, error } = await supabase.from('students').select('*').eq('user_id', req.user.id).single();
  if (error) return res.status(404).json({ error: 'Profile not found' });
  res.json(data);
});

// GET single student
router.get('/:id', auth, async (req, res) => {
  const { data, error } = await supabase.from('students').select('*').eq('id', req.params.id).single();
  if (error) return res.status(404).json({ error: 'Student not found' });
  res.json(data);
});

// POST create student (admin only)
router.post('/', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const { name, email, phone, class: cls, roll_no } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'Name and email required' });

  // Create user account first
  const { data: userRow, error: userErr } = await supabase.from('users').insert({ name, email: email.toLowerCase(), role: 'student' }).select().single();
  if (userErr) return res.status(400).json({ error: userErr.message });

  const { data, error } = await supabase.from('students').insert({ user_id: userRow.id, name, email: email.toLowerCase(), phone, class: cls, roll_no, status: 'Active' }).select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
});

// PATCH update student
router.patch('/:id', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const { data, error } = await supabase.from('students').update(req.body).eq('id', req.params.id).select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// DELETE student
router.delete('/:id', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const { error } = await supabase.from('students').delete().eq('id', req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

module.exports = router;
