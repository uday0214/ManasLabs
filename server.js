const express = require('express');
const cors = require('cors');
const path = require('node:path');
const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./database');
const { seed } = require('./seedData');

// Seed database on startup if not already seeded
seed();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'nexora_super_secret_cognitive_key_2026';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Health & Database Connection Diagnostic Endpoint
app.get('/api/health', (req, res) => {
  try {
    const integrity = db.prepare('PRAGMA integrity_check').get();
    const isOk = integrity && integrity.integrity_check === 'ok';
    const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
    const expCount = db.prepare('SELECT COUNT(*) as c FROM experiments').get().c;
    const sessionCount = db.prepare('SELECT COUNT(*) as c FROM sessions').get().c;
    const trialCount = db.prepare('SELECT COUNT(*) as c FROM trial_records').get().c;

    res.json({
      status: 'healthy',
      database: {
        connected: true,
        integrity: isOk ? 'ok' : 'degraded',
        counts: {
          users: userCount,
          experiments: expCount,
          sessions: sessionCount,
          trial_records: trialCount
        }
      },
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('[Health Check Error]', err);
    res.status(500).json({ status: 'unhealthy', database: { connected: false, error: err.message } });
  }
});

// Middleware: Authentication Guard
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token required' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
}

// -------------------------------------------------------------
// AUTHENTICATION ROUTES
// -------------------------------------------------------------
app.post('/api/auth/register', (req, res) => {
  try {
    const { email, password, full_name, institution } = req.body;
    if (!email || !password || !full_name) {
      return res.status(400).json({ error: 'Email, password, and full name are required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = db.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?)').get(cleanEmail);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const id = crypto.randomUUID();
    const passwordHash = bcrypt.hashSync(password, 10);

    db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, institution, role)
      VALUES (?, ?, ?, ?, ?, 'researcher')
    `).run(id, cleanEmail, passwordHash, full_name.trim(), institution ? institution.trim() : 'Independent Research');

    const token = jwt.sign({ id, email: cleanEmail, full_name: full_name.trim(), role: 'researcher' }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id, email: cleanEmail, full_name: full_name.trim(), institution: institution || 'Independent Research', role: 'researcher' } });
  } catch (err) {
    console.error('[Auth Register Error]', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email/Username and password are required' });
    }

    const identifier = email.trim();
    // Allow login by email or participant ID in case user signs in here
    const user = db.prepare(`
      SELECT * FROM users 
      WHERE LOWER(email) = LOWER(?) OR LOWER(participant_id) = LOWER(?)
    `).get(identifier, identifier);

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const valid = bcrypt.compareSync(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, full_name: user.full_name, role: user.role, participant_id: user.participant_id },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        institution: user.institution,
        role: user.role,
        participant_id: user.participant_id,
        age: user.age,
        gender: user.gender,
        handedness: user.handedness,
        vision_correction: user.vision_correction
      }
    });
  } catch (err) {
    console.error('[Auth Login Error]', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  const user = db.prepare('SELECT id, email, full_name, institution, role, participant_id, age, gender, handedness, vision_correction, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user });
});

// -------------------------------------------------------------
// STUDENT / PARTICIPANT AUTHENTICATION & PORTAL ROUTES
// -------------------------------------------------------------
app.post('/api/auth/student/login', (req, res) => {
  try {
    const { participant_id, password } = req.body;
    if (!participant_id || !password) {
      return res.status(400).json({ error: 'Participant ID and password are required' });
    }

    const identifier = participant_id.trim();
    // Allow case-insensitive search by participant_id or email
    const user = db.prepare(`
      SELECT * FROM users 
      WHERE LOWER(participant_id) = LOWER(?) OR LOWER(email) = LOWER(?)
    `).get(identifier, identifier);

    if (!user) {
      return res.status(401).json({ error: 'Invalid Participant ID or password' });
    }

    const valid = bcrypt.compareSync(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid Participant ID or password' });
    }

    const token = jwt.sign(
      {
        id: user.id,
        participant_id: user.participant_id,
        email: user.email,
        full_name: user.full_name,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        participant_id: user.participant_id,
        full_name: user.full_name,
        email: user.email,
        institution: user.institution,
        role: user.role,
        age: user.age,
        gender: user.gender,
        handedness: user.handedness,
        vision_correction: user.vision_correction
      }
    });
  } catch (err) {
    console.error('[Student Login Error]', err);
    res.status(500).json({ error: 'Student login failed' });
  }
});

app.post('/api/auth/student/register', (req, res) => {
  try {
    const { full_name, participant_id, password, institution, age, gender, handedness, vision_correction } = req.body;
    if (!full_name || !password) {
      return res.status(400).json({ error: 'Full name and password are required' });
    }

    // Auto-generate participant ID if not provided
    const assignedId = participant_id && participant_id.trim().length > 0 
      ? participant_id.trim().toUpperCase() 
      : `SUBJ_${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const generatedEmail = `${assignedId.toLowerCase()}@participant.nexora.edu`;

    const existing = db.prepare('SELECT id FROM users WHERE LOWER(participant_id) = LOWER(?)').get(assignedId);
    if (existing) {
      return res.status(409).json({ error: 'This Participant ID is already taken. Please choose another.' });
    }

    const id = crypto.randomUUID();
    const passwordHash = bcrypt.hashSync(password, 10);

    db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, institution, role, participant_id, age, gender, handedness, vision_correction)
      VALUES (?, ?, ?, ?, ?, 'student', ?, ?, ?, ?, ?)
    `).run(
      id,
      generatedEmail,
      passwordHash,
      full_name.trim(),
      institution ? institution.trim() : 'Research Participant',
      assignedId,
      age ? parseInt(age) : null,
      gender || 'unspecified',
      handedness || 'right',
      vision_correction || 'normal'
    );

    const token = jwt.sign(
      { id, participant_id: assignedId, email: generatedEmail, full_name: full_name.trim(), role: 'student' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id,
        participant_id: assignedId,
        full_name: full_name.trim(),
        institution: institution || 'Research Participant',
        role: 'student',
        age: age ? parseInt(age) : null,
        gender: gender || 'unspecified',
        handedness: handedness || 'right',
        vision_correction: vision_correction || 'normal'
      }
    });
  } catch (err) {
    console.error('[Student Register Error]', err);
    res.status(500).json({ error: 'Participant registration failed' });
  }
});

// Student Profile Endpoints
app.get('/api/student/profile', authenticateToken, (req, res) => {
  try {
    const user = db.prepare(`
      SELECT id, participant_id, full_name, email, institution, age, gender, handedness, vision_correction, created_at
      FROM users WHERE id = ?
    `).get(req.user.id);
    if (!user) return res.status(404).json({ error: 'Student not found' });
    res.json({ profile: user });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch student profile' });
  }
});

app.put('/api/student/profile', authenticateToken, (req, res) => {
  try {
    const { full_name, institution, age, gender, handedness, vision_correction, password } = req.body;
    
    let updatePasswordSql = '';
    let passwordHash = null;
    if (password && password.trim().length >= 6) {
      passwordHash = bcrypt.hashSync(password.trim(), 10);
      updatePasswordSql = ', password_hash = ?';
    }

    const sql = `
      UPDATE users
      SET full_name = COALESCE(?, full_name),
          institution = COALESCE(?, institution),
          age = COALESCE(?, age),
          gender = COALESCE(?, gender),
          handedness = COALESCE(?, handedness),
          vision_correction = COALESCE(?, vision_correction)
          ${updatePasswordSql}
      WHERE id = ?
    `;

    const params = [
      full_name || null,
      institution || null,
      age ? parseInt(age) : null,
      gender || null,
      handedness || null,
      vision_correction || null
    ];
    if (passwordHash) params.push(passwordHash);
    params.push(req.user.id);

    db.prepare(sql).run(...params);

    const updated = db.prepare(`
      SELECT id, participant_id, full_name, email, institution, age, gender, handedness, vision_correction
      FROM users WHERE id = ?
    `).get(req.user.id);

    res.json({ message: 'Profile updated successfully', profile: updated });
  } catch (err) {
    console.error('[Update Profile Error]', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Student Test History
app.get('/api/student/history', authenticateToken, (req, res) => {
  try {
    const sessions = db.prepare(`
      SELECT s.id, s.participant_token, s.screen_refresh_rate, s.started_at, s.completed_at, s.status, s.completion_code,
             s.score_accuracy, s.mean_rt_ms, e.title AS experiment_title, e.share_slug,
             (SELECT COUNT(*) FROM trial_records tr WHERE tr.session_id = s.id) AS total_trials
      FROM sessions s
      JOIN experiments e ON s.experiment_id = e.id
      WHERE s.user_id = ?
      ORDER BY s.started_at DESC
    `).all(req.user.id);

    res.json({ history: sessions });
  } catch (err) {
    console.error('[Student History Error]', err);
    res.status(500).json({ error: 'Failed to load test history' });
  }
});

// Student Available Tests
app.get('/api/student/available-tests', (req, res) => {
  try {
    const experiments = db.prepare(`
      SELECT e.id, e.title, e.description, e.share_slug, u.full_name AS researcher_name, u.institution
      FROM experiments e
      JOIN users u ON e.user_id = u.id
      WHERE e.status = 'active'
      ORDER BY e.created_at DESC
    `).all();

    res.json({ experiments });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch available tests' });
  }
});

// -------------------------------------------------------------
// EXPERIMENT ROUTES (RESEARCHER)
// -------------------------------------------------------------
app.get('/api/experiments', authenticateToken, (req, res) => {
  try {
    const experiments = db.prepare(`
      SELECT e.*, 
        (SELECT COUNT(*) FROM sessions s WHERE s.experiment_id = e.id AND s.status = 'completed') AS completed_participants,
        (SELECT COUNT(*) FROM sessions s WHERE s.experiment_id = e.id) AS total_sessions
      FROM experiments e
      WHERE e.user_id = ? 
         OR e.user_id = (SELECT id FROM users WHERE email = 'researcher@nexora.edu')
      ORDER BY e.updated_at DESC
    `).all(req.user.id);

    res.json({ experiments });
  } catch (err) {
    console.error('[Get Experiments Error]', err);
    res.status(500).json({ error: 'Failed to retrieve experiments' });
  }
});

app.post('/api/experiments', authenticateToken, (req, res) => {
  try {
    const { title, description, config, blocks } = req.body;
    if (!title) return res.status(400).json({ error: 'Experiment title is required' });

    const id = crypto.randomUUID();
    const slug = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30)}-${crypto.randomBytes(3).toString('hex')}`;

    db.prepare(`
      INSERT INTO experiments (id, user_id, title, description, status, config, share_slug)
      VALUES (?, ?, ?, ?, 'active', ?, ?)
    `).run(id, req.user.id, title, description || '', JSON.stringify(config || {}), slug);

    if (Array.isArray(blocks) && blocks.length > 0) {
      const insertBlock = db.prepare(`
        INSERT INTO experiment_blocks (id, experiment_id, block_type, block_data, sequence_order)
        VALUES (?, ?, ?, ?, ?)
      `);
      blocks.forEach((b, idx) => {
        insertBlock.run(crypto.randomUUID(), id, b.block_type || b.type, JSON.stringify(b.block_data || b.data || {}), idx + 1);
      });
    }

    res.json({ id, share_slug: slug, message: 'Experiment created successfully' });
  } catch (err) {
    console.error('[Create Experiment Error]', err);
    res.status(500).json({ error: 'Failed to create experiment' });
  }
});

app.get('/api/experiments/:id', (req, res) => {
  try {
    const exp = db.prepare('SELECT * FROM experiments WHERE id = ?').get(req.params.id);
    if (!exp) return res.status(404).json({ error: 'Experiment not found' });

    const blocks = db.prepare(`
      SELECT * FROM experiment_blocks 
      WHERE experiment_id = ? 
      ORDER BY sequence_order ASC
    `).all(req.params.id);

    const parsedBlocks = blocks.map(b => ({
      ...b,
      block_data: typeof b.block_data === 'string' ? JSON.parse(b.block_data) : b.block_data
    }));

    res.json({ experiment: exp, blocks: parsedBlocks });
  } catch (err) {
    console.error('[Get Single Experiment Error]', err);
    res.status(500).json({ error: 'Failed to get experiment' });
  }
});

app.put('/api/experiments/:id', (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    let user = null;
    if (token) {
      try { user = jwt.verify(token, JWT_SECRET); } catch (e) {}
    }

    const exp = db.prepare('SELECT id, user_id FROM experiments WHERE id = ?').get(req.params.id);
    if (!exp) return res.status(404).json({ error: 'Experiment not found in database' });

    // Block participant accounts from modifying experiment structure
    if (user && user.role === 'student') {
      return res.status(403).json({ error: 'Participant accounts are not permitted to modify experiments' });
    }

    const { title, description, status, config, blocks } = req.body;

    let configStr = null;
    if (config) {
      configStr = typeof config === 'string' ? config : JSON.stringify(config);
    }

    db.prepare(`
      UPDATE experiments 
      SET title = COALESCE(?, title),
          description = COALESCE(?, description),
          status = COALESCE(?, status),
          config = COALESCE(?, config),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      title !== undefined ? title : null,
      description !== undefined ? description : null,
      status !== undefined ? status : null,
      configStr !== undefined ? configStr : null,
      req.params.id
    );

    // Replace blocks if provided
    if (Array.isArray(blocks)) {
      db.prepare('DELETE FROM experiment_blocks WHERE experiment_id = ?').run(req.params.id);
      const insertBlock = db.prepare(`
        INSERT INTO experiment_blocks (id, experiment_id, block_type, block_data, sequence_order)
        VALUES (?, ?, ?, ?, ?)
      `);
      blocks.forEach((b, idx) => {
        insertBlock.run(
          b.id || crypto.randomUUID(),
          req.params.id,
          b.block_type || b.type,
          JSON.stringify(b.block_data || b.data || {}),
          idx + 1
        );
      });
    }

    res.json({ message: 'Experiment and Scratch blocks saved successfully' });
  } catch (err) {
    console.error('[Update Experiment Error]', err);
    res.status(500).json({ error: 'Failed to update experiment: ' + err.message });
  }
});

app.delete('/api/experiments/:id', authenticateToken, (req, res) => {
  try {
    const result = db.prepare('DELETE FROM experiments WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Experiment not found or unauthorized' });
    res.json({ message: 'Experiment deleted' });
  } catch (err) {
    console.error('[Delete Experiment Error]', err);
    res.status(500).json({ error: 'Failed to delete experiment' });
  }
});

// -------------------------------------------------------------
// PUBLIC PARTICIPANT ENDPOINTS
// -------------------------------------------------------------
app.get('/api/experiments/share/:slug', (req, res) => {
  try {
    const exp = db.prepare(`
      SELECT e.id, e.title, e.description, e.status, e.config, e.share_slug, u.full_name AS researcher_name, u.institution
      FROM experiments e
      LEFT JOIN users u ON e.user_id = u.id
      WHERE e.share_slug = ?
    `).get(req.params.slug);

    if (!exp) return res.status(404).json({ error: 'Experiment not found' });
    if (exp.status !== 'active') return res.status(400).json({ error: 'This study is currently closed or paused.' });

    const blocks = db.prepare(`
      SELECT block_type, block_data, sequence_order 
      FROM experiment_blocks 
      WHERE experiment_id = ? 
      ORDER BY sequence_order ASC
    `).all(exp.id);

    const parsedBlocks = blocks.map(b => ({
      block_type: b.block_type,
      block_data: typeof b.block_data === 'string' ? JSON.parse(b.block_data) : (b.block_data || {}),
      sequence_order: b.sequence_order
    }));

    res.json({
      experiment: {
        ...exp,
        config: JSON.parse(exp.config || '{}')
      },
      blocks: parsedBlocks
    });
  } catch (err) {
    console.error('[Public Share Slug Error]', err);
    res.status(500).json({ error: 'Failed to load study' });
  }
});

app.post('/api/sessions/start', (req, res) => {
  try {
    const { experiment_id, screen_refresh_rate, user_agent, viewport_resolution } = req.body;
    if (!experiment_id) return res.status(400).json({ error: 'Experiment ID is required' });

    let userId = null;
    let participantPrefix = 'SUBJ_';
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
        if (decoded && decoded.id) {
          userId = decoded.id;
          if (decoded.participant_id) {
            participantPrefix = `${decoded.participant_id}_`;
          }
        }
      } catch (e) {}
    }

    const sessionId = crypto.randomUUID();
    const participantToken = `${participantPrefix}${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    db.prepare(`
      INSERT INTO sessions (id, experiment_id, user_id, participant_token, screen_refresh_rate, user_agent, viewport_resolution)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(sessionId, experiment_id, userId, participantToken, screen_refresh_rate || 60.0, user_agent || '', viewport_resolution || '');

    res.json({ sessionId, participantToken });
  } catch (err) {
    console.error('[Session Start Error]', err);
    res.status(500).json({ error: 'Failed to start session' });
  }
});

app.post('/api/sessions/:sessionId/trials', (req, res) => {
  try {
    const { sessionId } = req.params;
    const { trials } = req.body; // Can be array of trials or single trial object

    const trialList = Array.isArray(trials) ? trials : [req.body];
    const insertTrial = db.prepare(`
      INSERT INTO trial_records (id, session_id, trial_number, condition_name, stimulus_presented, stimulus_onset_time, key_pressed, response_time_ms, is_correct, custom_telemetry)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const t of trialList) {
      insertTrial.run(
        crypto.randomUUID(),
        sessionId,
        t.trial_number || 1,
        t.condition_name || 'standard',
        t.stimulus_presented || '',
        t.stimulus_onset_time || 0.0,
        t.key_pressed || '',
        t.response_time_ms || 0.0,
        t.is_correct ? 1 : 0,
        JSON.stringify(t.custom_telemetry || {})
      );
    }

    res.json({ recorded: trialList.length, message: 'Trials saved successfully' });
  } catch (err) {
    console.error('[Record Trials Error]', err);
    res.status(500).json({ error: 'Failed to save trial telemetry' });
  }
});

app.post('/api/sessions/:sessionId/complete', (req, res) => {
  try {
    const { sessionId } = req.params;
    const completionCode = `NX-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    // Compute accuracy and mean response time
    const stats = db.prepare(`
      SELECT 
        AVG(CASE WHEN is_correct = 1 THEN 100.0 ELSE 0.0 END) AS avg_acc,
        AVG(response_time_ms) AS avg_rt
      FROM trial_records
      WHERE session_id = ?
    `).get(sessionId);

    const scoreAccuracy = stats && stats.avg_acc != null ? parseFloat(stats.avg_acc.toFixed(1)) : 100.0;
    const meanRtMs = stats && stats.avg_rt != null ? parseFloat(stats.avg_rt.toFixed(1)) : 500.0;

    db.prepare(`
      UPDATE sessions 
      SET status = 'completed', completed_at = CURRENT_TIMESTAMP, completion_code = ?,
          score_accuracy = ?, mean_rt_ms = ?
      WHERE id = ?
    `).run(completionCode, scoreAccuracy, meanRtMs, sessionId);

    res.json({ message: 'Session completed', completionCode, scoreAccuracy, meanRtMs });
  } catch (err) {
    console.error('[Complete Session Error]', err);
    res.status(500).json({ error: 'Failed to complete session' });
  }
});

// -------------------------------------------------------------
// ANALYTICS & MATHEMATICAL VISUALIZATION
// -------------------------------------------------------------
app.get('/api/analytics/datasets', (req, res) => {
  try {
    const datasets = db.prepare('SELECT id, slug, name, description, experiment_type, participant_count, created_at FROM dummy_datasets').all();
    res.json({ datasets });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch datasets' });
  }
});

app.get('/api/analytics/dataset/:slug', (req, res) => {
  try {
    const ds = db.prepare('SELECT * FROM dummy_datasets WHERE slug = ?').get(req.params.slug);
    if (!ds) return res.status(404).json({ error: 'Dataset not found' });
    res.json({
      ...ds,
      dataset_payload: JSON.parse(ds.dataset_payload)
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch dataset payload' });
  }
});

app.get('/api/analytics/experiment/:id', (req, res) => {
  try {
    const exp = db.prepare('SELECT id, title, description, share_slug FROM experiments WHERE id = ?').get(req.params.id);
    if (!exp) return res.status(404).json({ error: 'Experiment not found' });

    const trials = db.prepare(`
      SELECT tr.*, s.participant_token, s.screen_refresh_rate, s.started_at, s.completed_at
      FROM trial_records tr
      JOIN sessions s ON tr.session_id = s.id
      WHERE s.experiment_id = ?
      ORDER BY tr.created_at ASC
    `).all(req.params.id);

    const sessions = db.prepare(`
      SELECT s.id, s.participant_token, s.screen_refresh_rate, s.status, s.score_accuracy, s.mean_rt_ms, s.started_at, s.completed_at,
             COUNT(tr.id) as trial_count
      FROM sessions s
      LEFT JOIN trial_records tr ON s.id = tr.session_id
      WHERE s.experiment_id = ? AND s.status = 'completed'
      GROUP BY s.id
      ORDER BY s.completed_at DESC
    `).all(req.params.id);

    if (trials.length === 0) {
      return res.json({
        experiment: exp,
        hasData: false,
        totalTrials: 0,
        participants: 0,
        sessions: [],
        message: 'No participant sessions recorded yet for this experiment.'
      });
    }

    // Mathematical aggregation
    const rts = trials.map(t => t.response_time_ms).filter(r => r > 80 && r < 12000);
    const meanRt = rts.reduce((a, b) => a + b, 0) / rts.length;
    const sortedRts = [...rts].sort((a, b) => a - b);
    const medianRt = sortedRts[Math.floor(sortedRts.length / 2)];
    
    // Variance & SD
    const variance = rts.reduce((sum, r) => sum + Math.pow(r - meanRt, 2), 0) / rts.length;
    const stdev = Math.sqrt(variance);

    // Filter outliers (Tukey's IQR)
    const q1 = sortedRts[Math.floor(sortedRts.length * 0.25)] || 0;
    const q3 = sortedRts[Math.floor(sortedRts.length * 0.75)] || 0;
    const iqr = q3 - q1;
    const trimmedRts = sortedRts.filter(r => r >= q1 - 1.5 * iqr && r <= q3 + 1.5 * iqr);
    const trimmedMean = trimmedRts.length > 0 ? (trimmedRts.reduce((a, b) => a + b, 0) / trimmedRts.length) : meanRt;

    // Accuracy
    const correctCount = trials.filter(t => t.is_correct === 1).length;
    const accuracy = (correctCount / trials.length) * 100;

    // Condition breakdown
    const conditions = {};
    for (const t of trials) {
      if (!conditions[t.condition_name]) {
        conditions[t.condition_name] = { rts: [], correct: 0, total: 0 };
      }
      conditions[t.condition_name].rts.push(t.response_time_ms);
      if (t.is_correct === 1) conditions[t.condition_name].correct++;
      conditions[t.condition_name].total++;
    }

    const conditionStats = Object.keys(conditions).map(cond => {
      const c = conditions[cond];
      const cMean = c.rts.reduce((a, b) => a + b, 0) / c.rts.length;
      return {
        condition: cond,
        meanRt: Math.round(cMean),
        accuracy: parseFloat(((c.correct / c.total) * 100).toFixed(1)),
        sampleSize: c.total
      };
    });

    res.json({
      experiment: exp,
      hasData: true,
      totalTrials: trials.length,
      participants: sessions.length,
      sessions,
      stats: {
        meanRt: Math.round(meanRt),
        medianRt: Math.round(medianRt),
        trimmedMean: Math.round(trimmedMean),
        stdev: Math.round(stdev),
        accuracy: parseFloat(accuracy.toFixed(1)),
        q1: Math.round(q1),
        q3: Math.round(q3),
        iqr: Math.round(iqr)
      },
      conditionStats,
      rawTrials: trials
    });
  } catch (err) {
    console.error('[Analytics Exp Error]', err);
    res.status(500).json({ error: 'Failed to compute analytics' });
  }
});

// Single Session Trial Telemetry
app.get('/api/sessions/:sessionId/trials', (req, res) => {
  try {
    const trials = db.prepare(`
      SELECT * FROM trial_records WHERE session_id = ? ORDER BY trial_number ASC
    `).all(req.params.sessionId);
    const session = db.prepare(`
      SELECT s.*, e.title as experiment_title
      FROM sessions s
      JOIN experiments e ON s.experiment_id = e.id
      WHERE s.id = ?
    `).get(req.params.sessionId);
    res.json({ session, trials });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch session trials' });
  }
});

// CSV Export Endpoint
app.get('/api/experiments/:id/export/csv', (req, res) => {
  try {
    const trials = db.prepare(`
      SELECT tr.trial_number, tr.condition_name, tr.stimulus_presented, tr.response_time_ms, tr.is_correct, tr.key_pressed, s.participant_token, s.screen_refresh_rate, tr.created_at
      FROM trial_records tr
      JOIN sessions s ON tr.session_id = s.id
      WHERE s.experiment_id = ?
      ORDER BY s.participant_token, tr.trial_number ASC
    `).all(req.params.id);

    if (trials.length === 0) {
      return res.status(404).send('No trial records found.');
    }

    let csv = 'participant_id,trial_number,condition,stimulus,response_time_ms,is_correct,key_pressed,refresh_rate,timestamp\n';
    trials.forEach(t => {
      csv += `"${t.participant_token}",${t.trial_number},"${t.condition_name}","${t.stimulus_presented}",${t.response_time_ms},${t.is_correct},"${t.key_pressed}",${t.screen_refresh_rate},"${t.created_at}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="nexora_experiment_${req.params.id}.csv"`);
    res.send(csv);
  } catch (err) {
    res.status(500).send('Error generating CSV');
  }
});

// Serve frontend for all standard client-side routes (Express 5 compatible)
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`[Nexora Server] Running at http://localhost:${PORT}`);
});
