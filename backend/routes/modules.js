const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const supabase = require('../config/supabase');

/* ── MARKS ── */
const marksRouter = express.Router();

marksRouter.get('/', auth, async (req, res) => {
  let query = supabase.from('marks').select('*, students(name, class)').order('created_at', { ascending: false });
  if (req.user.role === 'student') {
    const { data: stu } = await supabase.from('students').select('id').eq('user_id', req.user.id).single();
    if (stu) query = query.eq('student_id', stu.id);
  }
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

marksRouter.post('/', auth, async (req, res) => {
  if (req.user.role === 'student') return res.status(403).json({ error: 'Forbidden' });
  const { student_id, subject, score, max_score, exam_type, term } = req.body;
  const { data, error } = await supabase.from('marks').upsert({ student_id, subject, score, max_score, exam_type, term, entered_by: req.user.id }, { onConflict: 'student_id,subject,exam_type,term' }).select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

/* ── FEES ── */
const feesRouter = express.Router();

feesRouter.get('/', auth, async (req, res) => {
  let query = supabase.from('fees').select('*, students(name, class)').order('created_at', { ascending: false });
  if (req.user.role === 'student') {
    const { data: stu } = await supabase.from('students').select('id').eq('user_id', req.user.id).single();
    if (stu) query = query.eq('student_id', stu.id);
  }
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

feesRouter.post('/', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const { student_id, term, amount, paid, status } = req.body;
  const due = amount - (paid || 0);
  const { data, error } = await supabase.from('fees').insert({ student_id, term, amount, paid: paid || 0, due, status, payment_date: status === 'Paid' ? new Date().toISOString().slice(0, 10) : null }).select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

feesRouter.patch('/:id', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const { data, error } = await supabase.from('fees').update(req.body).eq('id', req.params.id).select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

/* ── NOTICES ── */
const noticesRouter = express.Router();

noticesRouter.get('/', auth, async (req, res) => {
  const { data, error } = await supabase.from('notices').select('*').order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

noticesRouter.post('/', auth, async (req, res) => {
  if (req.user.role === 'student') return res.status(403).json({ error: 'Forbidden' });
  const { title, content, priority, target_class } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });
  const { data, error } = await supabase.from('notices').insert({ title, content, priority: priority || 'Normal', target_class, posted_by: req.user.name }).select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

noticesRouter.delete('/:id', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  await supabase.from('notices').delete().eq('id', req.params.id);
  res.json({ success: true });
});

/* ── HOMEWORK ── */
const homeworkRouter = express.Router();

homeworkRouter.get('/', auth, async (req, res) => {
  let query = supabase.from('homework').select('*, homework_submissions(count)').order('due_date');
  if (req.user.role === 'student') {
    const { data: stu } = await supabase.from('students').select('class').eq('user_id', req.user.id).single();
    if (stu) query = query.eq('class', stu.class);
  }
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

homeworkRouter.post('/', auth, async (req, res) => {
  if (req.user.role === 'student') return res.status(403).json({ error: 'Forbidden' });
  const { subject, class: cls, topic, due_date, description } = req.body;
  const { data, error } = await supabase.from('homework').insert({ subject, class: cls, topic, due_date, description, assigned_by: req.user.name }).select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

homeworkRouter.post('/:id/submit', auth, async (req, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ error: 'Students only' });
  const { data: stu } = await supabase.from('students').select('id').eq('user_id', req.user.id).single();
  const { data, error } = await supabase.from('homework_submissions').upsert({ homework_id: req.params.id, student_id: stu.id, submitted_at: new Date().toISOString(), note: req.body.note }, { onConflict: 'homework_id,student_id' }).select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

module.exports = { marksRouter, feesRouter, noticesRouter, homeworkRouter };
