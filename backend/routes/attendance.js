const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const supabase = require('../config/supabase');

// GET attendance — admin/teacher sees all, student sees own
router.get('/', auth, async (req, res) => {
  let query = supabase.from('attendance').select('*, students(name, class)').order('date', { ascending: false });
  if (req.user.role === 'student') {
    const { data: stu } = await supabase.from('students').select('id').eq('user_id', req.user.id).single();
    if (stu) query = query.eq('student_id', stu.id);
  }
  if (req.query.month) query = query.gte('date', `${req.query.month}-01`).lte('date', `${req.query.month}-31`);
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET summary per student
router.get('/summary', auth, async (req, res) => {
  const { data: students } = await supabase.from('students').select('id, name, class');
  const results = await Promise.all(students.map(async s => {
    const { data } = await supabase.from('attendance').select('status').eq('student_id', s.id);
    const present = data?.filter(r => r.status === 'Present').length || 0;
    const absent = data?.filter(r => r.status === 'Absent').length || 0;
    const total = data?.length || 0;
    return { ...s, present, absent, total, percentage: total ? Math.round(present / total * 100) : 0 };
  }));
  res.json(results);
});

// POST mark attendance (admin/teacher)
router.post('/', auth, async (req, res) => {
  if (req.user.role === 'student') return res.status(403).json({ error: 'Forbidden' });
  const { records, date } = req.body; // records: [{student_id, status}]
  if (!records?.length) return res.status(400).json({ error: 'Records required' });

  const rows = records.map(r => ({ student_id: r.student_id, date: date || new Date().toISOString().slice(0, 10), status: r.status, marked_by: req.user.id }));
  const { data, error } = await supabase.from('attendance').upsert(rows, { onConflict: 'student_id,date' }).select();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

module.exports = router;
