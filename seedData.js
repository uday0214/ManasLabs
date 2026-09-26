const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const db = require('./database');

function generateGaussian(mean, stdev) {
  let u = 1 - Math.random();
  let v = Math.random();
  let z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return Math.round(z * stdev + mean);
}

function generateExGaussian(mu, sigma, tau) {
  // Gaussian component + Exponential component for realistic RT tail
  const g = generateGaussian(mu, sigma);
  const exp = -tau * Math.log(1 - Math.random());
  return Math.max(180, Math.round(g + exp));
}

function seed() {
  console.log('[Seed] Seeding initial database data...');

  // Check if researcher already exists
  const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get('researcher@nexora.edu');
  let researcherId;

  if (!existingUser) {
    researcherId = crypto.randomUUID();
    const passwordHash = bcrypt.hashSync('password123', 10);
    db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, institution, role)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      researcherId,
      'researcher@nexora.edu',
      passwordHash,
      'Dr. Elena Vance',
      'Cognitive Science & Neuroinformatics Institute',
      'researcher'
    );
    console.log('[Seed] Created default researcher account: researcher@nexora.edu');
  } else {
    researcherId = existingUser.id;
  }

  // Check if default student account exists
  const existingStudent = db.prepare('SELECT id FROM users WHERE participant_id = ? OR email = ?').get('STUDENT_001', 'student@nexora.edu');
  let studentId;

  if (!existingStudent) {
    studentId = crypto.randomUUID();
    const studentPassHash = bcrypt.hashSync('password123', 10);
    db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, institution, role, participant_id, age, gender, handedness, vision_correction)
      VALUES (?, ?, ?, ?, ?, 'student', ?, ?, ?, ?, ?)
    `).run(
      studentId,
      'student@nexora.edu',
      studentPassHash,
      'Alex Rivera',
      'Cognitive Psychology Dept, Stanford',
      'STUDENT_001',
      21,
      'Non-binary',
      'right',
      'glasses'
    );
    console.log('[Seed] Created default student account: STUDENT_001 / password123');
  } else {
    studentId = existingStudent.id;
  }

  // Check if experiments exist
  const existingExp = db.prepare('SELECT id FROM experiments WHERE share_slug = ?').get('stroop-task-2026');
  if (!existingExp) {
    // 1. Stroop Experiment
    const stroopId = crypto.randomUUID();
    const stroopConfig = JSON.stringify({
      fullscreenRequired: true,
      timeLimitMs: 2500,
      interTrialIntervalMs: 500,
      keyboardKeys: ['r', 'g', 'b', 'y'],
      totalTrials: 24,
      randomize: true
    });

    db.prepare(`
      INSERT INTO experiments (id, user_id, title, description, status, config, share_slug)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      stroopId,
      researcherId,
      'Stroop Color-Word Cognitive Interference Study',
      'Investigates the automaticity of lexical reading versus executive attentional control when color ink conflicts with word semantics.',
      'active',
      stroopConfig,
      'stroop-task-2026'
    );

    // Scratch blocks for Stroop
    const stroopBlocks = [
      {
        id: crypto.randomUUID(),
        type: 'event_start',
        data: { label: 'When Experiment Starts', description: 'Initialize PsychoJS canvas and calibrate refresh rate' },
        seq: 1
      },
      {
        id: crypto.randomUUID(),
        type: 'flow_loop',
        data: { iterations: 24, randomize: true, label: 'Repeat Trial Loop (24 times)' },
        seq: 2
      },
      {
        id: crypto.randomUUID(),
        type: 'stimulus_fixation',
        data: { symbol: '+', durationMs: 600, color: '#FFFFFF', size: 36, label: 'Show Fixation Cross (600ms)' },
        seq: 3
      },
      {
        id: crypto.randomUUID(),
        type: 'stimulus_text',
        data: {
          words: ['RED', 'GREEN', 'BLUE', 'YELLOW'],
          colors: ['#EF4444', '#10B981', '#3B82F6', '#F59E0B'],
          durationMs: 1500,
          label: 'Display Color-Word Stimulus (Max 1500ms)'
        },
        seq: 4
      },
      {
        id: crypto.randomUUID(),
        type: 'response_keypress',
        data: {
          allowedKeys: ['r', 'g', 'b', 'y'],
          keyLabels: 'R=Red, G=Green, B=Blue, Y=Yellow',
          timeoutMs: 2000,
          label: 'Listen for Keypress (R, G, B, Y)'
        },
        seq: 5
      },
      {
        id: crypto.randomUUID(),
        type: 'logic_check_answer',
        data: { logVariable: 'is_correct', label: 'Verify Accuracy & Record RT' },
        seq: 6
      },
      {
        id: crypto.randomUUID(),
        type: 'flow_wait',
        data: { durationMs: 500, label: 'Inter-Trial Interval (500ms)' },
        seq: 7
      },
      {
        id: crypto.randomUUID(),
        type: 'debrief_completion',
        data: { showCode: true, message: 'Thank you! Your trial responses have been recorded.', label: 'Show Completion Code & Debrief' },
        seq: 8
      }
    ];

    const insertBlock = db.prepare(`
      INSERT INTO experiment_blocks (id, experiment_id, block_type, block_data, sequence_order)
      VALUES (?, ?, ?, ?, ?)
    `);

    for (const b of stroopBlocks) {
      insertBlock.run(b.id, stroopId, b.type, JSON.stringify(b.data), b.seq);
    }

    // 2. Mental Rotation Experiment
    const rotId = crypto.randomUUID();
    db.prepare(`
      INSERT INTO experiments (id, user_id, title, description, status, config, share_slug)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      rotId,
      researcherId,
      'Shepard-Metzler 3D Mental Rotation Paradigm',
      'Assesses analog spatial transformation rates by measuring reaction times across paired 3D polygon rotations (0° to 180°).',
      'active',
      JSON.stringify({ fullscreenRequired: true, angles: [0, 45, 90, 135, 180], totalTrials: 30 }),
      'mental-rotation-2026'
    );

    // Scratch blocks for Mental Rotation
    const rotBlocks = [
      {
        id: crypto.randomUUID(),
        type: 'event_start',
        data: { label: 'When Experiment Starts' },
        seq: 1
      },
      {
        id: crypto.randomUUID(),
        type: 'stimulus_fixation',
        data: { symbol: '+', durationMs: 500, color: '#38BDF8', size: 32, label: 'Fixation Cross' },
        seq: 2
      },
      {
        id: crypto.randomUUID(),
        type: 'stimulus_shape',
        data: { shapeType: 'polygon_pair', angles: [0, 45, 90, 135, 180], durationMs: 3000, label: 'Display Rotated Shape Pair' },
        seq: 3
      },
      {
        id: crypto.randomUUID(),
        type: 'response_keypress',
        data: { allowedKeys: ['s', 'd'], keyLabels: 'S = Same, D = Different', timeoutMs: 3000, label: 'Keypress (S=Same, D=Diff)' },
        seq: 4
      },
      {
        id: crypto.randomUUID(),
        type: 'debrief_completion',
        data: { showCode: true, label: 'End Study & Save Telemetry' },
        seq: 5
      }
    ];

    for (const b of rotBlocks) {
      insertBlock.run(b.id, rotId, b.type, JSON.stringify(b.data), b.seq);
    }

    // Seed sample completed sessions for studentId
    const existingStudentSessions = db.prepare('SELECT id FROM sessions WHERE user_id = ?').all(studentId);
    if (existingStudentSessions.length === 0) {
      // 1. Stroop session
      const stroopSessionId = crypto.randomUUID();
      db.prepare(`
        INSERT INTO sessions (id, experiment_id, user_id, participant_token, screen_refresh_rate, user_agent, viewport_resolution, started_at, completed_at, status, completion_code, score_accuracy, mean_rt_ms)
        VALUES (?, ?, ?, 'STUDENT_001', 60.0, 'Chrome/128.0 (Student Laptop)', '1920x1080', datetime('now', '-2 days'), datetime('now', '-2 days', '+12 minutes'), 'completed', 'NX-STR89B', 94.5, 524.0)
      `).run(stroopSessionId, stroopId, studentId);

      // 2. Mental rotation session
      const rotSessionId = crypto.randomUUID();
      db.prepare(`
        INSERT INTO sessions (id, experiment_id, user_id, participant_token, screen_refresh_rate, user_agent, viewport_resolution, started_at, completed_at, status, completion_code, score_accuracy, mean_rt_ms)
        VALUES (?, ?, ?, 'STUDENT_001', 120.0, 'Chrome/128.0 (Student Laptop)', '1920x1080', datetime('now', '-4 hours'), datetime('now', '-4 hours', '+8 minutes'), 'completed', 'NX-ROT41A', 88.0, 680.5)
      `).run(rotSessionId, rotId, studentId);

      console.log('[Seed] Created sample completed test history for STUDENT_001.');
    }

    console.log('[Seed] Created default experiments with visual Scratch blocks.');
  }

  // Pre-loaded Dummy Datasets for Mathematical Graphing
  const existingDummy = db.prepare('SELECT id FROM dummy_datasets WHERE slug = ?').get('stroop-dataset');
  if (!existingDummy) {
    // 1. Stroop Synthetic Dataset (N=120 participants)
    const stroopTrials = [];
    const conditions = ['Congruent', 'Incongruent', 'Neutral'];

    for (let p = 1; p <= 120; p++) {
      const subjectId = `SUBJ_${String(p).padStart(3, '0')}`;
      const baselineRT = generateGaussian(470, 35);

      for (let t = 1; t <= 18; t++) {
        const cond = conditions[t % 3];
        let rt;
        let isCorrect = Math.random() < 0.95 ? 1 : 0;

        if (cond === 'Congruent') {
          rt = generateExGaussian(baselineRT + 30, 30, 45); // Mean ~545ms
          if (Math.random() < 0.03) isCorrect = 0;
        } else if (cond === 'Incongruent') {
          rt = generateExGaussian(baselineRT + 175, 45, 80); // Mean ~690ms (Stroop effect!)
          if (Math.random() < 0.11) isCorrect = 0;
        } else {
          rt = generateExGaussian(baselineRT + 85, 35, 55); // Neutral Mean ~610ms
          if (Math.random() < 0.05) isCorrect = 0;
        }

        stroopTrials.push({
          subjectId,
          trialNumber: t,
          condition: cond,
          responseTimeMs: Math.max(220, rt),
          isCorrect
        });
      }
    }

    db.prepare(`
      INSERT INTO dummy_datasets (id, slug, name, description, experiment_type, participant_count, dataset_payload)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      crypto.randomUUID(),
      'stroop-dataset',
      'Stroop Color-Word Cognitive Interference (N=120)',
      '120 participants, 2,160 trials comparing Congruent vs. Incongruent RT distributions, error rates, and executive control latency.',
      'stroop',
      120,
      JSON.stringify(stroopTrials)
    );

    // 2. Mental Rotation Synthetic Dataset (N=85 participants)
    const rotTrials = [];
    const angles = [0, 45, 90, 135, 180];

    for (let p = 1; p <= 85; p++) {
      const subjectId = `ROT_${String(p).padStart(3, '0')}`;
      const baseSpeed = generateGaussian(420, 40);

      for (const angle of angles) {
        for (let rep = 1; rep <= 4; rep++) {
          // RT increases linearly with angular disparity: ~3.8ms per degree
          const meanAngleRT = baseSpeed + (angle * 3.8);
          const rt = generateExGaussian(meanAngleRT, 45, 60);
          // Accuracy drops gently with angle
          const accProb = 0.98 - (angle / 180) * 0.10;
          const isCorrect = Math.random() < accProb ? 1 : 0;

          rotTrials.push({
            subjectId,
            angle,
            condition: `${angle}° Disparity`,
            responseTimeMs: Math.max(260, rt),
            isCorrect
          });
        }
      }
    }

    db.prepare(`
      INSERT INTO dummy_datasets (id, slug, name, description, experiment_type, participant_count, dataset_payload)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      crypto.randomUUID(),
      'mental-rotation-dataset',
      'Shepard-Metzler Mental Rotation (N=85)',
      '85 participants, 1,700 trials modeling linear reaction time scaling as a function of angular 3D disparity (0° to 180°).',
      'mental_rotation',
      85,
      JSON.stringify(rotTrials)
    );

    // 3. Psychometric Contrast Sensitivity (N=60 participants)
    const psychoData = [];
    const contrastLevels = [0.01, 0.02, 0.04, 0.08, 0.16, 0.32, 0.64];

    for (const c of contrastLevels) {
      // Sigmoid psychometric function: P(Detection) = 0.5 + 0.5 / (1 + exp(-beta * (c - alpha)))
      const alpha = 0.065; // 75% threshold
      const beta = 35.0; // slope
      const pDetect = 0.5 + (0.5 / (1.0 + Math.exp(-beta * (c - alpha))));

      let totalTrials = 60 * 20; // 1,200 trials per contrast level
      let hits = 0;
      let rts = [];

      for (let i = 0; i < totalTrials; i++) {
        const detected = Math.random() < pDetect;
        if (detected) hits++;
        // RT is faster when contrast is high (Pieron's Law)
        const rt = generateExGaussian(300 + (1 / Math.sqrt(c + 0.01)) * 35, 25, 40);
        rts.push(rt);
      }

      const meanRt = Math.round(rts.reduce((a, b) => a + b, 0) / rts.length);
      const hitRate = parseFloat((hits / totalTrials).toFixed(4));

      psychoData.push({
        contrast: c,
        hitRate,
        meanRt,
        totalTrials
      });
    }

    db.prepare(`
      INSERT INTO dummy_datasets (id, slug, name, description, experiment_type, participant_count, dataset_payload)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      crypto.randomUUID(),
      'psychometric-dataset',
      '2-AFC Psychometric Contrast Thresholds (N=60)',
      '60 participants, 8,400 trials fitting a 4-parameter logistic sigmoid psychometric detection curve.',
      'psychometrics',
      60,
      JSON.stringify(psychoData)
    );

    console.log('[Seed] Seeded rich mathematical dummy datasets (Stroop, Mental Rotation, Psychometric curves).');
  }
}

module.exports = { seed };

if (require.main === module) {
  seed();
}
