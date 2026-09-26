// populateTelemetry.js
// Populates rich, realistic participant telemetry and trial records for all 22 experiments
const { DatabaseSync } = require('node:sqlite');
const crypto = require('node:crypto');
const path = require('node:path');

const db = new DatabaseSync(path.join(__dirname, 'data', 'nexora.db'));

function randomGaussian(mean, sd) {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return mean + num * sd;
}

function randomExGaussian(mean, sd, tau) {
  const g = randomGaussian(mean, sd);
  let u = Math.random();
  while (u === 0) u = Math.random();
  const exp = -tau * Math.log(u);
  return Math.round(g + exp);
}

const EXPERIMENT_CONFIGS = {
  'stroop-task-2026': {
    targetN: 38,
    trialsPerSession: 18,
    conditions: [
      { name: 'Congruent', stim: 'GREEN in green ink', key: 'g', baseRt: 480, sd: 35, tau: 40, acc: 0.98 },
      { name: 'Incongruent', stim: 'RED in blue ink', key: 'b', baseRt: 645, sd: 50, tau: 85, acc: 0.91 },
      { name: 'Neutral', stim: 'CHAIR in red ink', key: 'r', baseRt: 520, sd: 40, tau: 50, acc: 0.96 }
    ]
  },
  'flanker-task-2026': {
    targetN: 32,
    trialsPerSession: 16,
    conditions: [
      { name: 'Congruent Left', stim: '<<<<<', key: 'f', baseRt: 430, sd: 30, tau: 35, acc: 0.97 },
      { name: 'Congruent Right', stim: '>>>>>', key: 'j', baseRt: 435, sd: 30, tau: 35, acc: 0.97 },
      { name: 'Incongruent Left', stim: '>><>>', key: 'f', baseRt: 550, sd: 45, tau: 70, acc: 0.90 },
      { name: 'Incongruent Right', stim: '<<><<', key: 'j', baseRt: 555, sd: 45, tau: 70, acc: 0.89 }
    ]
  },
  'simon-task-2026': {
    targetN: 29,
    trialsPerSession: 16,
    conditions: [
      { name: 'Congruent Green Left', stim: 'Left Green Circle', key: 'f', baseRt: 440, sd: 32, tau: 40, acc: 0.96 },
      { name: 'Congruent Red Right', stim: 'Right Red Circle', key: 'j', baseRt: 445, sd: 32, tau: 40, acc: 0.96 },
      { name: 'Incongruent Green Right', stim: 'Right Green Circle', key: 'f', baseRt: 535, sd: 45, tau: 65, acc: 0.91 },
      { name: 'Incongruent Red Left', stim: 'Left Red Circle', key: 'j', baseRt: 540, sd: 45, tau: 65, acc: 0.90 }
    ]
  },
  'visual-search-2026': {
    targetN: 27,
    trialsPerSession: 14,
    conditions: [
      { name: 'Feature Target Present', stim: 'Green Circle among Red Circles', key: 'f', baseRt: 420, sd: 30, tau: 35, acc: 0.98 },
      { name: 'Feature Target Absent', stim: 'Homogeneous Red Circles', key: 'j', baseRt: 460, sd: 35, tau: 40, acc: 0.97 },
      { name: 'Conjunction Present (N=12)', stim: 'Red T among Green Ts and Red Ls', key: 'f', baseRt: 690, sd: 60, tau: 95, acc: 0.92 },
      { name: 'Conjunction Absent (N=12)', stim: 'Green Ts and Red Ls only', key: 'j', baseRt: 820, sd: 70, tau: 120, acc: 0.89 }
    ]
  },
  'change-blindness-2026': {
    targetN: 24,
    trialsPerSession: 12,
    conditions: [
      { name: 'Color Change Flicker', stim: 'Building Facade Hue Swap', key: ' ', baseRt: 1450, sd: 180, tau: 250, acc: 0.94 },
      { name: 'Location Shift Flicker', stim: 'Park Bench 20px Displacement', key: ' ', baseRt: 2100, sd: 240, tau: 380, acc: 0.88 },
      { name: 'Object Deletion Flicker', stim: 'Passing Airplane Removed', key: ' ', baseRt: 1750, sd: 200, tau: 300, acc: 0.91 }
    ]
  },
  'inattentional-blindness-2026': {
    targetN: 21,
    trialsPerSession: 10,
    conditions: [
      { name: 'Low Tracking Load', stim: '2 White Bouncing Disks', key: 'enter', baseRt: 1850, sd: 150, tau: 200, acc: 0.95 },
      { name: 'High Tracking Load', stim: '5 White Bouncing Disks', key: 'enter', baseRt: 2400, sd: 220, tau: 320, acc: 0.86 },
      { name: 'Critical Unexpected Cross', stim: 'Red Cross Traversal Probe', key: 'y', baseRt: 3100, sd: 300, tau: 450, acc: 0.62 }
    ]
  },
  'serial-position-2026': {
    targetN: 26,
    trialsPerSession: 16,
    conditions: [
      { name: 'Primacy Position (1-3)', stim: 'Word: "LANTERN"', key: 'f', baseRt: 560, sd: 45, tau: 60, acc: 0.93 },
      { name: 'Middle Asymptote (4-7)', stim: 'Word: "GLACIER"', key: 'f', baseRt: 690, sd: 60, tau: 95, acc: 0.72 },
      { name: 'Recency Position (8-10)', stim: 'Word: "ORCHID"', key: 'f', baseRt: 510, sd: 40, tau: 50, acc: 0.96 },
      { name: 'Novel Distractor', stim: 'Word: "COMPASS"', key: 'j', baseRt: 580, sd: 45, tau: 65, acc: 0.91 }
    ]
  },
  'spacing-effect-2026': {
    targetN: 25,
    trialsPerSession: 14,
    conditions: [
      { name: 'Spaced Repetition (4 Lag)', stim: 'Pair: KITE - HARBOR', key: 'f', baseRt: 530, sd: 40, tau: 55, acc: 0.94 },
      { name: 'Massed Repetition (0 Lag)', stim: 'Pair: SHIELD - VALLEY', key: 'f', baseRt: 640, sd: 55, tau: 85, acc: 0.81 },
      { name: 'Unstudied Foil Pair', stim: 'Pair: KITE - DESERT', key: 'j', baseRt: 590, sd: 45, tau: 70, acc: 0.89 }
    ]
  },
  'testing-effect-2026': {
    targetN: 28,
    trialsPerSession: 14,
    conditions: [
      { name: 'Active Retrieval Practice', stim: 'Associate: CROWN - [JEWEL]', key: 'f', baseRt: 495, sd: 38, tau: 50, acc: 0.95 },
      { name: 'Passive Rereading', stim: 'Associate: FOREST - [RIVER]', key: 'f', baseRt: 615, sd: 50, tau: 80, acc: 0.83 },
      { name: 'Swapped Foil', stim: 'Associate: CROWN - [OCEAN]', key: 'j', baseRt: 560, sd: 45, tau: 65, acc: 0.90 }
    ]
  },
  'working-memory-span-2026': {
    targetN: 30,
    trialsPerSession: 12,
    conditions: [
      { name: 'Span 4 Digits', stim: 'Sequence: 7-2-9-4', key: 'enter', baseRt: 1250, sd: 110, tau: 150, acc: 0.97 },
      { name: 'Span 5 Digits', stim: 'Sequence: 3-8-1-6-5', key: 'enter', baseRt: 1580, sd: 140, tau: 210, acc: 0.93 },
      { name: 'Span 6 Digits', stim: 'Sequence: 9-4-2-7-1-8', key: 'enter', baseRt: 1950, sd: 180, tau: 280, acc: 0.82 },
      { name: 'Span 7 Digits', stim: 'Sequence: 5-1-8-3-9-2-6', key: 'enter', baseRt: 2450, sd: 220, tau: 360, acc: 0.68 }
    ]
  },
  'n-back-2026': {
    targetN: 34,
    trialsPerSession: 16,
    conditions: [
      { name: '2-Back Match Target', stim: 'Sequence: K ... X ... K', key: 'm', baseRt: 565, sd: 45, tau: 75, acc: 0.89 },
      { name: '2-Back Non-match Foil', stim: 'Sequence: B ... Q ... L', key: 'n', baseRt: 510, sd: 40, tau: 55, acc: 0.94 },
      { name: '1-Back Distractor Foil', stim: 'Sequence: M ... M (1-Back lure)', key: 'n', baseRt: 630, sd: 55, tau: 95, acc: 0.84 }
    ]
  },
  'mental-rotation-2026': {
    targetN: 36,
    trialsPerSession: 16,
    conditions: [
      { name: '0° Angular Disparity', stim: 'Identical 3D block pair', key: 's', baseRt: 460, sd: 35, tau: 45, acc: 0.98 },
      { name: '45° Angular Disparity', stim: '45° Rotated block pair', key: 's', baseRt: 620, sd: 45, tau: 65, acc: 0.95 },
      { name: '90° Angular Disparity', stim: '90° Rotated block pair', key: 's', baseRt: 780, sd: 55, tau: 90, acc: 0.91 },
      { name: '135° Angular Disparity', stim: '135° Rotated block pair', key: 's', baseRt: 960, sd: 65, tau: 120, acc: 0.87 },
      { name: '180° Angular Disparity', stim: '180° Inverted block pair', key: 's', baseRt: 1150, sd: 80, tau: 155, acc: 0.82 },
      { name: 'Mirrored Foil', stim: 'Enantiomer mirror reflection', key: 'd', baseRt: 890, sd: 70, tau: 130, acc: 0.89 }
    ]
  },
  'lexical-decision-2026': {
    targetN: 31,
    trialsPerSession: 18,
    conditions: [
      { name: 'High-Frequency Real Word', stim: 'WATER', key: 'f', baseRt: 450, sd: 35, tau: 40, acc: 0.99 },
      { name: 'Low-Frequency Real Word', stim: 'ABACUS', key: 'f', baseRt: 580, sd: 48, tau: 70, acc: 0.93 },
      { name: 'Pseudoword Foil', stim: 'PRANKE', key: 'j', baseRt: 625, sd: 52, tau: 85, acc: 0.91 }
    ]
  },
  'semantic-priming-2026': {
    targetN: 29,
    trialsPerSession: 16,
    conditions: [
      { name: 'Related Prime: NURSE -> DOCTOR', stim: 'DOCTOR', key: 'f', baseRt: 440, sd: 35, tau: 40, acc: 0.98 },
      { name: 'Unrelated Prime: BUTTER -> DOCTOR', stim: 'DOCTOR', key: 'f', baseRt: 535, sd: 42, tau: 65, acc: 0.94 },
      { name: 'Neutral Prime: XXXXX -> DOCTOR', stim: 'DOCTOR', key: 'f', baseRt: 490, sd: 38, tau: 50, acc: 0.96 },
      { name: 'Non-Word Target: BREAD -> FLIRP', stim: 'FLIRP', key: 'j', baseRt: 590, sd: 48, tau: 80, acc: 0.92 }
    ]
  },
  'emotional-stroop-2026': {
    targetN: 27,
    trialsPerSession: 16,
    conditions: [
      { name: 'Threat Valence Word', stim: 'DANGER in green font', key: 'g', baseRt: 620, sd: 50, tau: 80, acc: 0.91 },
      { name: 'Neutral Valence Word', stim: 'KETTLE in red font', key: 'r', baseRt: 515, sd: 40, tau: 50, acc: 0.96 },
      { name: 'Positive Valence Word', stim: 'JOY in blue font', key: 'b', baseRt: 540, sd: 42, tau: 55, acc: 0.95 }
    ]
  },
  'risk-taking-2026': {
    targetN: 25,
    trialsPerSession: 14,
    conditions: [
      { name: 'Low Variance Dilemma: $5 sure vs 50% $11', stim: 'Safe $5 vs 50% $11', key: '2', baseRt: 1250, sd: 120, tau: 180, acc: 1.0 },
      { name: 'High Variance Dilemma: $5 sure vs 10% $60', stim: 'Safe $5 vs 10% $60', key: '1', baseRt: 1480, sd: 150, tau: 230, acc: 1.0 },
      { name: 'Equal Expected Value: $10 sure vs 50% $20', stim: 'Safe $10 vs 50% $20', key: '1', baseRt: 1650, sd: 170, tau: 260, acc: 1.0 }
    ]
  },
  'delay-discounting-2026': {
    targetN: 26,
    trialsPerSession: 14,
    conditions: [
      { name: 'Short Delay: $10 now vs $12 in 7 days', stim: '$10 Now vs $12 in 7 Days', key: '1', baseRt: 1350, sd: 130, tau: 190, acc: 1.0 },
      { name: 'Medium Delay: $10 now vs $18 in 30 days', stim: '$10 Now vs $18 in 30 Days', key: '2', baseRt: 1620, sd: 160, tau: 240, acc: 1.0 },
      { name: 'Long Delay: $10 now vs $35 in 180 days', stim: '$10 Now vs $35 in 180 Days', key: '2', baseRt: 1890, sd: 190, tau: 290, acc: 1.0 }
    ]
  },
  'ultimatum-game-2026': {
    targetN: 28,
    trialsPerSession: 14,
    conditions: [
      { name: 'Fair Offer ($5 for you / $5 proposer)', stim: 'Proposer Split: $5 / $5', key: 'a', baseRt: 980, sd: 90, tau: 140, acc: 1.0 },
      { name: 'Mildly Unfair ($7 proposer / $3 you)', stim: 'Proposer Split: $3 for you / $7 proposer', key: 'a', baseRt: 1420, sd: 130, tau: 220, acc: 1.0 },
      { name: 'Severely Unfair ($8 proposer / $2 you)', stim: 'Proposer Split: $2 for you / $8 proposer', key: 'r', baseRt: 1680, sd: 160, tau: 280, acc: 1.0 },
      { name: 'Extreme Greed ($9 proposer / $1 you)', stim: 'Proposer Split: $1 for you / $9 proposer', key: 'r', baseRt: 1310, sd: 110, tau: 190, acc: 1.0 }
    ]
  },
  'dictator-game-2026': {
    targetN: 24,
    trialsPerSession: 12,
    conditions: [
      { name: 'Altruistic Endowment Transfer ($5 of $10)', stim: 'Transfer $5 to recipient', key: '5', baseRt: 1540, sd: 140, tau: 220, acc: 1.0 },
      { name: 'Moderate Transfer ($2 of $10)', stim: 'Transfer $2 to recipient', key: '2', baseRt: 1320, sd: 120, tau: 190, acc: 1.0 },
      { name: 'Zero Transfer Retention ($0 of $10)', stim: 'Transfer $0 (keep all $10)', key: '0', baseRt: 1190, sd: 100, tau: 160, acc: 1.0 }
    ]
  },
  'confidence-calibration-2026': {
    targetN: 23,
    trialsPerSession: 14,
    conditions: [
      { name: 'High Confidence Calibration (80-100%)', stim: 'Question: Capital of France (Paris vs Lyon)', key: '1', baseRt: 1450, sd: 130, tau: 200, acc: 0.96 },
      { name: 'Moderate Confidence (60-75%)', stim: 'Question: Mars moons count (2 vs 4)', key: '1', baseRt: 1820, sd: 170, tau: 270, acc: 0.76 },
      { name: 'Overconfident Error Trap', stim: 'Question: Great Wall visible from space (Yes vs No)', key: '2', baseRt: 2150, sd: 210, tau: 340, acc: 0.58 }
    ]
  },
  'probability-estimation-2026': {
    targetN: 22,
    trialsPerSession: 12,
    conditions: [
      { name: 'Strong Evidence Sample (8 Red, 2 Blue)', stim: 'Observed: 8 Red beads, 2 Blue beads', key: '8', baseRt: 2100, sd: 200, tau: 320, acc: 0.92 },
      { name: 'Weak Evidence Sample (5 Red, 5 Blue)', stim: 'Observed: 5 Red beads, 5 Blue beads', key: '5', baseRt: 2600, sd: 250, tau: 400, acc: 0.84 },
      { name: 'Inverse Evidence Sample (2 Red, 8 Blue)', stim: 'Observed: 2 Red beads, 8 Blue beads', key: '2', baseRt: 1950, sd: 180, tau: 290, acc: 0.90 }
    ]
  },
  'cognitive-reflection-2026': {
    targetN: 30,
    trialsPerSession: 10,
    conditions: [
      { name: 'Bat and Ball Problem', stim: 'Bat and ball cost $1.10. Bat costs $1.00 more than ball. Ball costs?', key: '5', baseRt: 3850, sd: 350, tau: 550, acc: 0.65 },
      { name: 'Machines Widget Problem', stim: '5 machines make 5 widgets in 5 mins. 100 machines make 100 widgets in?', key: '5', baseRt: 3450, sd: 320, tau: 500, acc: 0.72 },
      { name: 'Lily Pad Lake Problem', stim: 'Patch doubles each day. Covers lake in 48 days. Covers half lake in?', key: '47', baseRt: 4100, sd: 380, tau: 600, acc: 0.60 }
    ]
  }
};

async function run() {
  console.log('[Telemetry Seeder] Starting telemetry population for all 22 experiments...');

  // First, restore ultimatum-game blocks if it had only 1 block
  const ultExp = db.prepare("SELECT id FROM experiments WHERE share_slug = 'ultimatum-game-2026'").get();
  if (ultExp) {
    const ultBlocks = db.prepare("SELECT COUNT(*) as count FROM experiment_blocks WHERE experiment_id = ?").get(ultExp.id);
    if (ultBlocks.count <= 1) {
      console.log('[Telemetry Seeder] Restoring ultimatum-game standard Scratch blocks...');
      db.prepare("DELETE FROM experiment_blocks WHERE experiment_id = ?").run(ultExp.id);
      const insertB = db.prepare("INSERT INTO experiment_blocks (id, experiment_id, block_type, block_data, sequence_order) VALUES (?, ?, ?, ?, ?)");
      const blocksSpec = [
        { type: "event_start", data: { label: "Initialize Ultimatum Protocol" } },
        { type: "flow_loop", data: { iterations: 10, label: "Offers from 10 Anonymous Proposers" } },
        { type: "stimulus_text", data: { label: "Proposer Split: $X for you, $Y for proposer" } },
        { type: "response_keypress", data: { allowedKeys: "a, r", label: "Press [A] Accept or [R] Reject" } },
        { type: "logic_check_answer", data: { label: "Compute Minimum Acceptable Offer (MAO)" } },
        { type: "debrief_completion", data: { label: "Debrief Social Preferences" } }
      ];
      blocksSpec.forEach((b, idx) => {
        insertB.run(crypto.randomUUID(), ultExp.id, b.type, JSON.stringify(b.data), idx + 1);
      });
    }
  }

  const experiments = db.prepare("SELECT id, title, share_slug FROM experiments").all();
  console.log(`Found ${experiments.length} experiments in database.`);

  const insertSessionStmt = db.prepare(`
    INSERT INTO sessions (id, experiment_id, participant_token, screen_refresh_rate, user_agent, viewport_resolution, started_at, completed_at, status, completion_code, score_accuracy, mean_rt_ms)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?, ?, ?)
  `);

  const insertTrialStmt = db.prepare(`
    INSERT INTO trial_records (id, session_id, trial_number, condition_name, stimulus_presented, stimulus_onset_time, key_pressed, response_time_ms, is_correct, custom_telemetry, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let totalSessionsAdded = 0;
  let totalTrialsAdded = 0;

  for (const exp of experiments) {
    const slug = exp.share_slug;
    const config = EXPERIMENT_CONFIGS[slug] || EXPERIMENT_CONFIGS['stroop-task-2026'];

    // Check existing completed sessions count
    const existingCount = db.prepare(`
      SELECT COUNT(DISTINCT s.id) as count 
      FROM sessions s 
      JOIN trial_records tr ON s.id = tr.session_id 
      WHERE s.experiment_id = ? AND s.status = 'completed'
    `).get(exp.id).count;

    const needed = Math.max(0, config.targetN - existingCount);
    if (needed === 0) {
      console.log(`[OK] ${exp.title} already has ${existingCount} participants with trials.`);
      continue;
    }

    console.log(`[Seeding] Adding ${needed} completed participant sessions for: ${exp.title} (${slug})...`);

    const refreshRates = [60.0, 60.0, 120.0, 144.0];
    const resolutions = ['1920x1080', '2560x1440', '1920x1080', '1440x900', '1680x1050'];

    for (let p = 0; p < needed; p++) {
      const sessionId = crypto.randomUUID();
      const token = `SUBJ_${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
      const hz = refreshRates[Math.floor(Math.random() * refreshRates.length)];
      const res = resolutions[Math.floor(Math.random() * resolutions.length)];

      const daysAgo = Math.floor(Math.random() * 14) + 1;
      const hoursAgo = Math.floor(Math.random() * 24);
      const minutesAgo = Math.floor(Math.random() * 60);

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);
      startDate.setHours(startDate.getHours() - hoursAgo);
      startDate.setMinutes(startDate.getMinutes() - minutesAgo);

      const sessionDurationMinutes = Math.floor(Math.random() * 8) + 6;
      const endDate = new Date(startDate.getTime() + sessionDurationMinutes * 60 * 1000);

      const startIso = startDate.toISOString().replace('T', ' ').slice(0, 19);
      const endIso = endDate.toISOString().replace('T', ' ').slice(0, 19);
      const completionCode = `NX-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

      // Generate trials for this participant
      const trials = [];
      let totalRt = 0;
      let correctCount = 0;

      for (let t = 1; t <= config.trialsPerSession; t++) {
        const condObj = config.conditions[(t - 1) % config.conditions.length];
        const isCorrect = Math.random() < condObj.acc ? 1 : 0;
        const rt = Math.max(180, randomExGaussian(condObj.baseRt, condObj.sd, condObj.tau));

        totalRt += rt;
        if (isCorrect === 1) correctCount++;

        const trialOnset = t * 1200 + Math.floor(Math.random() * 400);
        const trialDate = new Date(startDate.getTime() + (t * 25 * 1000)).toISOString().replace('T', ' ').slice(0, 19);

        trials.push({
          id: crypto.randomUUID(),
          sessionId,
          trialNumber: t,
          condition: condObj.name,
          stimulus: condObj.stim,
          onset: trialOnset,
          key: isCorrect ? condObj.key : (condObj.key === 'f' ? 'j' : 'f'),
          rt,
          isCorrect,
          createdAt: trialDate
        });
      }

      const meanRt = Math.round(totalRt / trials.length);
      const scoreAcc = parseFloat(((correctCount / trials.length) * 100).toFixed(1));

      // Insert session
      insertSessionStmt.run(
        sessionId,
        exp.id,
        token,
        hz,
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0',
        res,
        startIso,
        endIso,
        completionCode,
        scoreAcc,
        meanRt
      );

      // Insert trial records
      for (const tr of trials) {
        insertTrialStmt.run(
          tr.id,
          tr.sessionId,
          tr.trialNumber,
          tr.condition,
          tr.stimulus,
          tr.onset,
          tr.key,
          tr.rt,
          tr.isCorrect,
          JSON.stringify({ vSyncJitterMs: (Math.random() * 1.2).toFixed(2) }),
          tr.createdAt
        );
      }

      totalSessionsAdded++;
      totalTrialsAdded += trials.length;
    }
  }

  console.log(`[Telemetry Seeder] SUCCESS! Added ${totalSessionsAdded} participant sessions and ${totalTrialsAdded} trial records across all 22 experiments.`);
}

run().catch(err => {
  console.error('[Telemetry Seeder Error]', err);
  process.exit(1);
});
