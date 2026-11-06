const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 3000;
const dbPath = process.env.DB_PATH || path.join(__dirname, 'data', 'events.db');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const db = new sqlite3.Database(dbPath);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'local-development-secret',
  resave: false, saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax' }
}));
app.use(express.static(path.join(__dirname, 'public')));

const run = (sql, params = []) => new Promise((resolve, reject) =>
  db.run(sql, params, function (err) { if (err) reject(err); else resolve({ id: this.lastID, changes: this.changes }); }));
const get = (sql, params = []) => new Promise((resolve, reject) =>
  db.get(sql, params, (err, row) => err ? reject(err) : resolve(row)));
const all = (sql, params = []) => new Promise((resolve, reject) =>
  db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows)));

async function initDb() {
  await run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'student', created_at TEXT DEFAULT CURRENT_TIMESTAMP)`);
  await run(`CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL,
    description TEXT NOT NULL, event_date TEXT NOT NULL,
    venue TEXT NOT NULL, capacity INTEGER NOT NULL DEFAULT 100)`);
  await run(`CREATE TABLE IF NOT EXISTS registrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL,
    event_id INTEGER NOT NULL, registered_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id,event_id), FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(event_id) REFERENCES events(id))`);
  const admin = await get('SELECT id FROM users WHERE email=?', ['admin@event.com']);
  if (!admin) await run('INSERT INTO users(name,email,password_hash,role) VALUES(?,?,?,?)',
    ['System Admin', 'admin@event.com', bcrypt.hashSync('Admin@123', 10), 'admin']);
  const count = await get('SELECT COUNT(*) AS n FROM events');
  if (!count.n) {
    const samples = [
      ['Tech Fest 2026', 'A day of technology talks, demos and student projects.', '2026-12-05', 'Main Auditorium', 150],
      ['AI & Machine Learning Workshop', 'Hands-on introduction to practical AI and ML.', '2026-12-12', 'Computer Lab 2', 60],
      ['Annual Cultural Fest', 'Music, dance, art and cultural performances.', '2026-12-20', 'College Grounds', 300]
    ];
    for (const e of samples) await run('INSERT INTO events(title,description,event_date,venue,capacity) VALUES(?,?,?,?,?)', e);
  }
}
const asyncRoute = fn => (req,res,next) => Promise.resolve(fn(req,res,next)).catch(next);
const requireLogin = (req,res,next) => req.session.user ? next() : res.status(401).json({ error: 'Please log in first.' });
const requireAdmin = (req,res,next) => req.session.user?.role === 'admin' ? next() : res.status(403).json({ error: 'Admin access required.' });

app.get('/health', (req,res) => res.json({ status: 'ok' }));
app.get('/api/me', (req,res) => res.json({ user: req.session.user || null }));

app.post('/api/register', asyncRoute(async (req,res) => {
  const { name, email, password } = req.body;
  if (!name?.trim() || !email?.trim() || !password) return res.status(400).json({ error: 'All fields are required.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must contain at least 6 characters.' });
  const exists = await get('SELECT id FROM users WHERE email=?', [email.toLowerCase()]);
  if (exists) return res.status(409).json({ error: 'Email is already registered.' });
  const result = await run('INSERT INTO users(name,email,password_hash) VALUES(?,?,?)',
    [name.trim(), email.toLowerCase(), bcrypt.hashSync(password, 10)]);
  req.session.user = { id: result.id, name: name.trim(), email: email.toLowerCase(), role: 'student' };
  res.status(201).json({ message: 'Registration successful. Welcome!', user: req.session.user });
}));

app.post('/api/login', asyncRoute(async (req,res) => {
  const email = (req.body.email || '').toLowerCase().trim();
  const user = await get('SELECT * FROM users WHERE email=?', [email]);
  if (!user || !bcrypt.compareSync(req.body.password || '', user.password_hash))
    return res.status(401).json({ error: 'Invalid email or password.' });
  req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role };
  res.json({ message: 'Login successful.', user: req.session.user });
}));
app.post('/api/logout', (req,res) => req.session.destroy(() => res.json({ message: 'Logged out.' })));

app.get('/api/events', asyncRoute(async (req,res) => {
  const rows = await all(`SELECT e.*, (SELECT COUNT(*) FROM registrations r WHERE r.event_id=e.id) AS registered
    FROM events e ORDER BY event_date`);
  res.json(rows);
}));
app.post('/api/events/:id/register', requireLogin, asyncRoute(async (req,res) => {
  const event = await get('SELECT * FROM events WHERE id=?', [req.params.id]);
  if (!event) return res.status(404).json({ error: 'Event not found.' });
  const current = await get('SELECT COUNT(*) AS n FROM registrations WHERE event_id=?', [event.id]);
  if (current.n >= event.capacity) return res.status(409).json({ error: 'This event is full.' });
  try {
    await run('INSERT INTO registrations(user_id,event_id) VALUES(?,?)', [req.session.user.id, event.id]);
    res.status(201).json({ message: `Registration confirmed for ${event.title}.` });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'You are already registered for this event.' });
    throw e;
  }
}));
app.get('/api/my-registrations', requireLogin, asyncRoute(async (req,res) => {
  res.json(await all(`SELECT e.*, r.registered_at FROM registrations r JOIN events e ON e.id=r.event_id
    WHERE r.user_id=? ORDER BY e.event_date`, [req.session.user.id]));
}));
app.get('/api/admin/participants', requireLogin, requireAdmin, asyncRoute(async (req,res) => {
  res.json(await all(`SELECT r.id, u.name, u.email, e.title AS event_title, e.event_date, r.registered_at
    FROM registrations r JOIN users u ON u.id=r.user_id JOIN events e ON e.id=r.event_id
    ORDER BY e.event_date, u.name`));
}));
app.post('/api/admin/events', requireLogin, requireAdmin, asyncRoute(async (req,res) => {
  const { title, description, event_date, venue, capacity } = req.body;
  if (!title || !description || !event_date || !venue || !(Number(capacity) > 0))
    return res.status(400).json({ error: 'Please provide all event details and a valid capacity.' });
  const result = await run('INSERT INTO events(title,description,event_date,venue,capacity) VALUES(?,?,?,?,?)',
    [title, description, event_date, venue, Number(capacity)]);
  res.status(201).json({ id: result.id, message: 'Event created.' });
}));

app.get('*', (req,res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.use((err,req,res,next) => { console.error(err); res.status(500).json({ error: 'Server error. Please try again.' }); });

initDb().then(() => app.listen(PORT, '0.0.0.0', () => console.log(`Event app running on port ${PORT}`)))
  .catch(err => { console.error('Database initialization failed:', err); process.exit(1); });
