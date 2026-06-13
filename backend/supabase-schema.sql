-- =============================================
-- SMS Pro — Supabase Database Schema
-- Run this in Supabase SQL Editor
-- =============================================

-- USERS TABLE (all roles)
create table users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text unique not null,
  role text not null check (role in ('admin', 'teacher', 'student')),
  created_at timestamptz default now()
);

-- STUDENTS TABLE
create table students (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  name text not null,
  email text unique not null,
  phone text,
  class text not null,
  roll_no text,
  status text default 'Active' check (status in ('Active', 'Inactive')),
  created_at timestamptz default now()
);

-- ATTENDANCE TABLE
create table attendance (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete cascade,
  date date not null,
  status text not null check (status in ('Present', 'Absent', 'Late')),
  marked_by uuid references users(id),
  created_at timestamptz default now(),
  unique(student_id, date)
);

-- MARKS TABLE
create table marks (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete cascade,
  subject text not null,
  score numeric not null,
  max_score numeric default 100,
  exam_type text default 'Mid-Term',
  term text default 'Term 1',
  entered_by uuid references users(id),
  created_at timestamptz default now(),
  unique(student_id, subject, exam_type, term)
);

-- FEES TABLE
create table fees (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete cascade,
  term text not null,
  amount numeric not null,
  paid numeric default 0,
  due numeric default 0,
  status text default 'Pending' check (status in ('Paid', 'Pending', 'Partial')),
  payment_date date,
  created_at timestamptz default now()
);

-- NOTICES TABLE
create table notices (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text,
  priority text default 'Normal' check (priority in ('Normal', 'High')),
  target_class text,
  posted_by text,
  created_at timestamptz default now()
);

-- HOMEWORK TABLE
create table homework (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  class text not null,
  topic text,
  description text,
  due_date date,
  assigned_by text,
  created_at timestamptz default now()
);

-- HOMEWORK SUBMISSIONS
create table homework_submissions (
  id uuid primary key default gen_random_uuid(),
  homework_id uuid references homework(id) on delete cascade,
  student_id uuid references students(id) on delete cascade,
  submitted_at timestamptz default now(),
  note text,
  unique(homework_id, student_id)
);

-- =============================================
-- SEED DATA — Run after creating tables
-- =============================================

-- Admin user (login with: admin@school.com)
insert into users (name, email, role) values
  ('Admin User', 'admin@school.com', 'admin'),
  ('Mr. Ramesh', 'ramesh@school.com', 'teacher'),
  ('Arun Kumar', 'arun@school.com', 'student'),
  ('Priya Devi', 'priya@school.com', 'student');

-- Sample students (get user IDs from above insert)
insert into students (user_id, name, email, phone, class, roll_no, status)
select id, name, email, '9876543210', '10-A', 'R001', 'Active'
from users where email = 'arun@school.com';

insert into students (user_id, name, email, phone, class, roll_no, status)
select id, name, email, '9876543211', '10-B', 'R002', 'Active'
from users where email = 'priya@school.com';

-- Sample notices
insert into notices (title, content, priority, posted_by) values
  ('Annual Day Celebration', 'Annual Day will be held on July 15th. All students must participate.', 'High', 'Principal'),
  ('Mid-Term Exam Schedule', 'Mid-term examinations begin from June 20th. Timetable attached.', 'High', 'Exam Cell'),
  ('Library Book Return', 'All borrowed books must be returned by June 15th to avoid fines.', 'Normal', 'Librarian');

-- =============================================
-- ROW LEVEL SECURITY (enable in Supabase dashboard)
-- =============================================
-- NOTE: Since we use service role key in backend,
-- RLS policies are bypassed for server requests.
-- Enable RLS but use service key for all backend calls.

alter table users enable row level security;
alter table students enable row level security;
alter table attendance enable row level security;
alter table marks enable row level security;
alter table fees enable row level security;
alter table notices enable row level security;
alter table homework enable row level security;
alter table homework_submissions enable row level security;
