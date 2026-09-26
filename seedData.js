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
  const g = generateGaussian(mu, sigma);
  const exp = -tau * Math.log(1 - Math.random());
  return Math.max(180, Math.round(g + exp));
}

// Full 22 Scientific Cognitive & Behavioral Paradigms Specification
const EXPERIMENTS_SPEC = [
  {
    slug: 'stroop-task-2026',
    title: 'Stroop Color-Word Cognitive Interference Study',
    category: 'Attention, Inhibition',
    description: 'Name the font color of words while ignoring semantic word meanings to assess executive inhibitory control.',
    config: { trials: 16, keys: ['r', 'g', 'b', 'y'], timeLimitMs: 2500, itiMs: 400 },
    blocks: [
      { type: 'event_start', data: { label: 'When Experiment Starts' } },
      { type: 'flow_loop', data: { iterations: 16, randomize: true, label: 'Repeat 16 Trials' } },
      { type: 'stimulus_fixation', data: { symbol: '+', durationMs: 500, color: '#FFFFFF', label: 'Fixation Cross' } },
      { type: 'stimulus_text', data: { words: ['RED', 'GREEN', 'BLUE', 'YELLOW'], colors: ['#EF4444', '#10B981', '#3B82F6', '#F59E0B'], label: 'Color-Word Stimulus' } },
      { type: 'response_keypress', data: { allowedKeys: ['r', 'g', 'b', 'y'], label: 'Color Keypress (R, G, B, Y)' } },
      { type: 'logic_check_answer', data: { label: 'Evaluate Response Accuracy & RT' } },
      { type: 'flow_wait', data: { durationMs: 400, label: 'Inter-Trial Interval' } },
      { type: 'debrief_completion', data: { label: 'Show Debrief & Save Telemetry' } }
    ]
  },
  {
    slug: 'flanker-task-2026',
    title: 'Eriksen Flanker Selective Attention Paradigm',
    category: 'Selective Attention',
    description: 'Respond to a central target arrow flanked by congruent (<<<<<) or incongruent (<<><<) distractors to test selective attention.',
    config: { trials: 16, keys: ['f', 'j', 'ArrowLeft', 'ArrowRight'], timeLimitMs: 2000, itiMs: 400 },
    blocks: [
      { type: 'event_start', data: { label: 'When Experiment Starts' } },
      { type: 'flow_loop', data: { iterations: 16, randomize: true, label: 'Trial Loop (Congruent vs Incongruent)' } },
      { type: 'stimulus_fixation', data: { symbol: '+', durationMs: 500, label: 'Central Fixation' } },
      { type: 'stimulus_text', data: { arrays: ['<<<<<', '>>>>>', '<<><<', '>><>>'], durationMs: 1200, label: 'Flanker Array Stimulus' } },
      { type: 'response_keypress', data: { allowedKeys: ['f', 'j'], label: 'Target Arrow Direction (F=Left, J=Right)' } },
      { type: 'logic_check_answer', data: { label: 'Calculate Flanker Interference Cost' } },
      { type: 'flow_wait', data: { durationMs: 400, label: 'ITI' } },
      { type: 'debrief_completion', data: { label: 'Record Reaction Time Data' } }
    ]
  },
  {
    slug: 'simon-task-2026',
    title: 'Simon Spatial Conflict & Response Interference Task',
    category: 'Response Interference',
    description: 'Respond to stimulus color (Green=Left, Red=Right) while ignoring its lateral presentation location on screen.',
    config: { trials: 16, keys: ['f', 'j'], timeLimitMs: 2000, itiMs: 400 },
    blocks: [
      { type: 'event_start', data: { label: 'Initialize Simon Experiment' } },
      { type: 'flow_loop', data: { iterations: 16, label: 'Randomize Spatial Positions & Colors' } },
      { type: 'stimulus_fixation', data: { symbol: '+', durationMs: 400, label: 'Fixation' } },
      { type: 'stimulus_shape', data: { positions: ['left', 'right'], colors: ['#10B981', '#EF4444'], label: 'Lateral Target Circle' } },
      { type: 'response_keypress', data: { allowedKeys: ['f', 'j'], label: 'Color Response (F=Green, J=Red)' } },
      { type: 'logic_check_answer', data: { label: 'Calculate Simon Effect Delta' } },
      { type: 'debrief_completion', data: { label: 'Debrief Session' } }
    ]
  },
  {
    slug: 'visual-search-2026',
    title: 'Feature & Conjunction Visual Search Experiment',
    category: 'Attention, Perception',
    description: 'Find a target stimulus among distractors across varying set sizes (4, 8, 16) to distinguish pop-out from serial focal search.',
    config: { trials: 16, keys: ['f', 'j'], timeLimitMs: 3000, itiMs: 500 },
    blocks: [
      { type: 'event_start', data: { label: 'Start Visual Search' } },
      { type: 'flow_loop', data: { iterations: 16, label: 'Vary Set Size (4, 8, 16)' } },
      { type: 'stimulus_fixation', data: { symbol: '+', durationMs: 600, label: 'Fixation' } },
      { type: 'stimulus_shape', data: { target: 'Red T', distractors: ['Green T', 'Red L'], label: 'Scatter Stimuli Field' } },
      { type: 'response_keypress', data: { allowedKeys: ['f', 'j'], label: 'Target Detection (F=Present, J=Absent)' } },
      { type: 'logic_check_answer', data: { label: 'Compute Search Slope (ms/item)' } },
      { type: 'debrief_completion', data: { label: 'Complete Task' } }
    ]
  },
  {
    slug: 'change-blindness-2026',
    title: 'Flicker Paradigm Change Blindness Study',
    category: 'Visual Attention',
    description: 'Detect subtle visual modifications between alternating scenes interrupted by an 80ms blank mask.',
    config: { trials: 8, keys: ['space'], timeLimitMs: 15000, itiMs: 800 },
    blocks: [
      { type: 'event_start', data: { label: 'Start Flicker Engine' } },
      { type: 'flow_loop', data: { iterations: 8, label: 'Flicker Alternation Loop' } },
      { type: 'stimulus_shape', data: { sceneA: 'Original Scene', sceneB: 'Modified Scene', blankMs: 80, label: 'A/Blank/B/Blank Cycle' } },
      { type: 'response_keypress', data: { allowedKeys: ['space'], label: 'Press Spacebar upon Change Detection' } },
      { type: 'logic_check_answer', data: { label: 'Log Alternation Cycles to Detect' } },
      { type: 'debrief_completion', data: { label: 'Debrief Change Blindness' } }
    ]
  },
  {
    slug: 'inattentional-blindness-2026',
    title: 'Dynamic Inattentional Blindness Paradigm',
    category: 'Attention',
    description: 'Perform a tracking/counting task on moving geometric shapes while an unexpected probe crosses the display.',
    config: { trials: 6, keys: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'y', 'n'], timeLimitMs: 10000, itiMs: 500 },
    blocks: [
      { type: 'event_start', data: { label: 'Initialize Dynamic Simulation' } },
      { type: 'stimulus_shape', data: { objects: 6, unexpectedProbe: 'Gray Cross', label: 'Bouncing Shapes Animation (10s)' } },
      { type: 'response_keypress', data: { label: 'Count Wall Bounces' } },
      { type: 'stimulus_text', data: { question: 'Did you notice an unexpected shape floating across the screen?', label: 'Inattentional Probe' } },
      { type: 'response_keypress', data: { allowedKeys: ['y', 'n'], label: 'Y=Yes, N=No' } },
      { type: 'debrief_completion', data: { label: 'Save Inattention Rate' } }
    ]
  },
  {
    slug: 'serial-position-2026',
    title: 'Serial-Position Memory Curve Experiment',
    category: 'Short/Long-Term Memory',
    description: 'Study a list of sequential words and recall items to model the U-shaped primacy and recency retention curve.',
    config: { trials: 10, keys: ['f', 'j'], timeLimitMs: 4000, itiMs: 600 },
    blocks: [
      { type: 'event_start', data: { label: 'Start Memory Study Phase' } },
      { type: 'flow_loop', data: { iterations: 10, label: 'Present Sequential Word Stream (1000ms each)' } },
      { type: 'stimulus_text', data: { words: ['APPLE', 'RIVER', 'CASTLE', 'GARDEN', 'SILVER', 'WINDOW', 'CANDLE', 'FOREST', 'BRIDGE', 'PLANET'], label: 'Sequential Items' } },
      { type: 'stimulus_fixation', data: { symbol: 'TEST PHASE', durationMs: 1200, label: 'Immediate Retention Test' } },
      { type: 'response_keypress', data: { allowedKeys: ['f', 'j'], label: 'Item Recognition (F=On List, J=New Word)' } },
      { type: 'logic_check_answer', data: { label: 'Plot Primacy vs Recency Curve' } },
      { type: 'debrief_completion', data: { label: 'End Memory Session' } }
    ]
  },
  {
    slug: 'spacing-effect-2026',
    title: 'Spacing Effect & Distributed Practice Task',
    category: 'Learning',
    description: 'Learn vocabulary and concepts with massed (consecutive) vs. spaced (interleaved) intervals to test long-term retention.',
    config: { trials: 12, keys: ['f', 'j'], timeLimitMs: 3000, itiMs: 500 },
    blocks: [
      { type: 'event_start', data: { label: 'Begin Spacing Study' } },
      { type: 'stimulus_text', data: { massedPairs: 4, spacedPairs: 4, label: 'Interleaved Study Schedule' } },
      { type: 'flow_wait', data: { durationMs: 1500, label: 'Retention Delay Interval' } },
      { type: 'stimulus_text', data: { label: 'Cued Recall Phase' } },
      { type: 'response_keypress', data: { allowedKeys: ['f', 'j'], label: 'F=Correct Associate, J=Incorrect' } },
      { type: 'logic_check_answer', data: { label: 'Compute Spacing Advantage Index' } },
      { type: 'debrief_completion', data: { label: 'Debrief Learning Outcomes' } }
    ]
  },
  {
    slug: 'testing-effect-2026',
    title: 'Testing Effect & Retrieval Practice Experiment',
    category: 'Memory/Learning',
    description: 'Compare memory retention between passive rereading of study materials and active testing (retrieval practice).',
    config: { trials: 12, keys: ['f', 'j'], timeLimitMs: 3500, itiMs: 400 },
    blocks: [
      { type: 'event_start', data: { label: 'Start Testing Effect Experiment' } },
      { type: 'stimulus_text', data: { conditionA: 'Study-Restudy', conditionB: 'Study-Test', label: 'Phase 1 Study Exposure' } },
      { type: 'stimulus_text', data: { label: 'Phase 2 Practice (Restudy vs Retrieval)' } },
      { type: 'stimulus_fixation', data: { symbol: 'FINAL EVALUATION', durationMs: 1000, label: 'Transition' } },
      { type: 'response_keypress', data: { allowedKeys: ['f', 'j'], label: 'Final Test Recognition' } },
      { type: 'logic_check_answer', data: { label: 'Calculate Retrieval Practice Gain' } },
      { type: 'debrief_completion', data: { label: 'Save Educational Telemetry' } }
    ]
  },
  {
    slug: 'working-memory-span-2026',
    title: 'Working-Memory Digit Span Capacity Test',
    category: 'Working Memory',
    description: 'Remember sequences of digits that progressively increase in length (3 to 8 digits) to quantify Miller 7±2 span limits.',
    config: { trials: 8, keys: ['0','1','2','3','4','5','6','7','8','9','Enter'], timeLimitMs: 8000, itiMs: 600 },
    blocks: [
      { type: 'event_start', data: { label: 'Start Digit Span' } },
      { type: 'flow_loop', data: { startLength: 3, maxLength: 8, label: 'Progressive Length Increase' } },
      { type: 'stimulus_text', data: { rateMs: 800, label: 'Flash Sequence Digits (800ms per digit)' } },
      { type: 'response_keypress', data: { label: 'Reproduce Digits in Serial Order' } },
      { type: 'logic_check_answer', data: { label: 'Score Maximum Span Capacity' } },
      { type: 'debrief_completion', data: { label: 'Debrief Working Memory' } }
    ]
  },
  {
    slug: 'n-back-2026',
    title: '2-Back Continuous Working Memory Update Task',
    category: 'Working Memory',
    description: 'Identify whether the current letter matches the one presented 2 positions earlier in a continuous stimulus stream.',
    config: { trials: 20, keys: ['m', 'n'], timeLimitMs: 2000, itiMs: 400 },
    blocks: [
      { type: 'event_start', data: { label: 'Start 2-Back Sequence' } },
      { type: 'flow_loop', data: { iterations: 20, label: 'Continuous Letter Stream (2000ms window)' } },
      { type: 'stimulus_text', data: { pool: ['A', 'B', 'C', 'D', 'E', 'H', 'K', 'M'], durationMs: 1000, label: 'Single Letter Stimulus' } },
      { type: 'response_keypress', data: { allowedKeys: ['m', 'n'], label: 'M=Match (2-Back), N=Non-Match' } },
      { type: 'logic_check_answer', data: { label: 'Compute Hit Rate, False Alarms & d-prime' } },
      { type: 'flow_wait', data: { durationMs: 400, label: 'Inter-Stimulus Interval' } },
      { type: 'debrief_completion', data: { label: 'Debrief N-Back' } }
    ]
  },
  {
    slug: 'mental-rotation-2026',
    title: 'Shepard-Metzler 3D Mental Rotation Paradigm',
    category: 'Spatial Cognition',
    description: 'Determine whether paired 3D geometric objects are identical or mirror-reflected across angular disparities from 0° to 180°.',
    config: { trials: 16, keys: ['s', 'd'], timeLimitMs: 4000, itiMs: 500 },
    blocks: [
      { type: 'event_start', data: { label: 'Start Spatial Rotation Engine' } },
      { type: 'flow_loop', data: { iterations: 16, angles: [0, 45, 90, 135, 180], label: 'Disparity Loop (0° to 180°)' } },
      { type: 'stimulus_fixation', data: { symbol: '+', durationMs: 500, label: 'Fixation' } },
      { type: 'stimulus_shape', data: { angles: [0, 45, 90, 135, 180], label: 'Paired 3D Rotated Polygons' } },
      { type: 'response_keypress', data: { allowedKeys: ['s', 'd'], label: 'S=Same (Rotated), D=Different (Mirrored)' } },
      { type: 'logic_check_answer', data: { label: 'Compute Angular Velocity Linear Fit' } },
      { type: 'debrief_completion', data: { label: 'End Spatial Paradigm' } }
    ]
  },
  {
    slug: 'lexical-decision-2026',
    title: 'Visual Lexical Decision Reaction Time Study',
    category: 'Language Processing',
    description: 'Decide whether letter strings are real English words or plausible pseudowords to study mental lexicon retrieval speed.',
    config: { trials: 16, keys: ['f', 'j'], timeLimitMs: 2000, itiMs: 400 },
    blocks: [
      { type: 'event_start', data: { label: 'Start Lexical Decision' } },
      { type: 'flow_loop', data: { iterations: 16, label: 'Words vs Pseudowords' } },
      { type: 'stimulus_fixation', data: { symbol: '+', durationMs: 400, label: 'Fixation' } },
      { type: 'stimulus_text', data: { words: ['DOCTOR', 'GARDEN', 'PLANET', 'SILVER', 'BLERK', 'FLAPTOR', 'TRONDE', 'PLURK'], label: 'Letter String' } },
      { type: 'response_keypress', data: { allowedKeys: ['f', 'j'], label: 'F=Real Word, J=Non-Word' } },
      { type: 'logic_check_answer', data: { label: 'Record Lexical Access Latency' } },
      { type: 'debrief_completion', data: { label: 'Save Linguistics Data' } }
    ]
  },
  {
    slug: 'semantic-priming-2026',
    title: 'Associative Semantic Priming Paradigm',
    category: 'Semantic Memory',
    description: 'Respond to a target word preceded by a related prime (DOCTOR -> NURSE) vs. unrelated prime (BREAD -> NURSE) to measure spreading activation.',
    config: { trials: 16, keys: ['f', 'j'], timeLimitMs: 2500, itiMs: 400 },
    blocks: [
      { type: 'event_start', data: { label: 'Start Semantic Priming' } },
      { type: 'flow_loop', data: { iterations: 16, label: 'Prime-Target Pairings' } },
      { type: 'stimulus_text', data: { primeDurationMs: 200, label: 'Brief Prime Word (200ms)' } },
      { type: 'flow_wait', data: { durationMs: 100, label: 'Blank Inter-Stimulus Interval (100ms)' } },
      { type: 'stimulus_text', data: { label: 'Target Word' } },
      { type: 'response_keypress', data: { allowedKeys: ['f', 'j'], label: 'F=Real Word, J=Non-Word' } },
      { type: 'logic_check_answer', data: { label: 'Calculate Semantic Facilitation Effect' } },
      { type: 'debrief_completion', data: { label: 'Debrief Semantic Memory' } }
    ]
  },
  {
    slug: 'emotional-stroop-2026',
    title: 'Emotional Stroop Affective Interference Task',
    category: 'Attention/Emotion',
    description: 'Name the font color of threat/negative words (DANGER, PANIC) vs. neutral words (TABLE, CLOCK) to assess emotional attentional capture.',
    config: { trials: 16, keys: ['r', 'g', 'b'], timeLimitMs: 2500, itiMs: 400 },
    blocks: [
      { type: 'event_start', data: { label: 'Start Emotional Stroop' } },
      { type: 'flow_loop', data: { iterations: 16, label: 'Threat Words vs Neutral Words' } },
      { type: 'stimulus_fixation', data: { symbol: '+', durationMs: 500, label: 'Fixation' } },
      { type: 'stimulus_text', data: { threat: ['PANIC', 'DANGER', 'AGONY', 'GRIEF'], neutral: ['TABLE', 'CLOCK', 'STONE', 'CHAIR'], label: 'Emotional Stimulus' } },
      { type: 'response_keypress', data: { allowedKeys: ['r', 'g', 'b'], label: 'Color Keypress (R=Red, G=Green, B=Blue)' } },
      { type: 'logic_check_answer', data: { label: 'Compute Emotional Slowing Effect' } },
      { type: 'debrief_completion', data: { label: 'Debrief Affective Data' } }
    ]
  },
  {
    slug: 'risk-taking-2026',
    title: 'Behavioral Risk-Taking & Lottery Choice Task',
    category: 'Decision-Making',
    description: 'Make repeated choices between guaranteed safe outcomes and probabilistically uncertain high-stakes rewards to measure risk preference.',
    config: { trials: 12, keys: ['1', '2'], timeLimitMs: 5000, itiMs: 500 },
    blocks: [
      { type: 'event_start', data: { label: 'Start Decision Task' } },
      { type: 'flow_loop', data: { iterations: 12, label: '12 Repeated Lottery Dilemmas' } },
      { type: 'stimulus_text', data: { optionA: 'Safe: 100% win $10', optionB: 'Risky: 50% win $30, 50% win $0', label: 'Present Lottery Choice' } },
      { type: 'response_keypress', data: { allowedKeys: ['1', '2'], label: 'Press [1] Safe Choice or [2] Risky Choice' } },
      { type: 'logic_check_answer', data: { label: 'Calculate Cumulative Earnings & Risk Propensity' } },
      { type: 'debrief_completion', data: { label: 'Debrief Economic Preferences' } }
    ]
  },
  {
    slug: 'delay-discounting-2026',
    title: 'Intertemporal Delay Discounting Experiment',
    category: 'Temporal Decision-Making',
    description: 'Choose between smaller-sooner monetary rewards ($18 today) and larger-later rewards ($40 in 30 days) to calculate temporal discount rate k.',
    config: { trials: 12, keys: ['1', '2'], timeLimitMs: 6000, itiMs: 500 },
    blocks: [
      { type: 'event_start', data: { label: 'Start Delay Discounting' } },
      { type: 'flow_loop', data: { iterations: 12, label: 'Intertemporal Choices' } },
      { type: 'stimulus_text', data: { label: 'Option 1: Smaller Today vs Option 2: Larger Delayed' } },
      { type: 'response_keypress', data: { allowedKeys: ['1', '2'], label: 'Press [1] Immediate or [2] Delayed' } },
      { type: 'logic_check_answer', data: { label: 'Fit Hyperbolic Discount Curve V = A / (1 + kD)' } },
      { type: 'debrief_completion', data: { label: 'Debrief Discounting Parameter' } }
    ]
  },
  {
    slug: 'ultimatum-game-2026',
    title: 'Ultimatum Game Social Fairness Paradigm',
    category: 'Social Decision-Making',
    description: 'Accept or reject monetary split offers ($5/$5, $7/$3, $8/$2, $9/$1) from a proposer to investigate fairness thresholds and costly punishment.',
    config: { trials: 10, keys: ['a', 'r'], timeLimitMs: 6000, itiMs: 600 },
    blocks: [
      { type: 'event_start', data: { label: 'Initialize Ultimatum Protocol' } },
      { type: 'flow_loop', data: { iterations: 10, label: 'Offers from 10 Anonymous Proposers' } },
      { type: 'stimulus_text', data: { label: 'Proposer Split: $X for you, $Y for proposer' } },
      { type: 'response_keypress', data: { allowedKeys: ['a', 'r'], label: 'Press [A] Accept or [R] Reject' } },
      { type: 'logic_check_answer', data: { label: 'Compute Minimum Acceptable Offer (MAO)' } },
      { type: 'debrief_completion', data: { label: 'Debrief Social Preferences' } }
    ]
  },
  {
    slug: 'dictator-game-2026',
    title: 'Dictator Game Prosocial Resource Allocation',
    category: 'Prosocial Behavior',
    description: 'Allocate an endowment of $10 between yourself and an anonymous partner with no threat of rejection to measure altruism and generosity.',
    config: { trials: 4, keys: ['0','1','2','3','4','5','6','7','8','9'], timeLimitMs: 8000, itiMs: 600 },
    blocks: [
      { type: 'event_start', data: { label: 'Initialize Dictator Endowment' } },
      { type: 'stimulus_text', data: { endowment: 10, label: 'Endowment of $10 to Distribute' } },
      { type: 'response_keypress', data: { allowedKeys: ['0','1','2','3','4','5','6','7','8','9'], label: 'Select Amount to Share ($0 to $10)' } },
      { type: 'logic_check_answer', data: { label: 'Record Prosocial Allocation Ratio' } },
      { type: 'debrief_completion', data: { label: 'Debrief Altruism Metrics' } }
    ]
  },
  {
    slug: 'confidence-calibration-2026',
    title: 'Metacognitive Confidence Calibration Study',
    category: 'Metacognition',
    description: 'Answer two-alternative factual questions and rate your subjective confidence (50% to 100%) to assess overconfidence and calibration curves.',
    config: { trials: 10, keys: ['1', '2', '5', '6', '7', '8', '9', '0'], timeLimitMs: 8000, itiMs: 600 },
    blocks: [
      { type: 'event_start', data: { label: 'Start Calibration Assessment' } },
      { type: 'flow_loop', data: { iterations: 10, label: '10 General Knowledge Questions' } },
      { type: 'stimulus_text', data: { label: 'Question with 2 Mutually Exclusive Options' } },
      { type: 'response_keypress', data: { allowedKeys: ['1', '2'], label: 'Select Answer [1] or [2]' } },
      { type: 'stimulus_text', data: { label: 'Rate Confidence: 50% to 100%' } },
      { type: 'response_keypress', data: { allowedKeys: ['5', '6', '7', '8', '9', '0'], label: '5=50%, 6=60%, 7=70%, 8=80%, 9=90%, 0=100%' } },
      { type: 'logic_check_answer', data: { label: 'Compute Brier Calibration Score & Overconfidence Index' } },
      { type: 'debrief_completion', data: { label: 'Debrief Metacognitive Curve' } }
    ]
  },
  {
    slug: 'probability-estimation-2026',
    title: 'Bayesian Probability Updating & Urn Sampling',
    category: 'Statistical Reasoning',
    description: 'Observe sequential bead draws from an ambiguous urn and estimate the posterior probability that the predominantly red urn was chosen.',
    config: { trials: 8, keys: ['1', '2', '3', '4', '5', '6', '7', '8', '9'], timeLimitMs: 8000, itiMs: 600 },
    blocks: [
      { type: 'event_start', data: { label: 'Start Bayesian Urn Paradigm' } },
      { type: 'flow_loop', data: { iterations: 8, label: 'Sequential Bead Evidence Draws' } },
      { type: 'stimulus_shape', data: { urnA: '70% Red, 30% Blue', urnB: '30% Red, 70% Blue', label: 'Draw Sequence: Red, Red, Blue, Red...' } },
      { type: 'response_keypress', data: { allowedKeys: ['1','2','3','4','5','6','7','8','9'], label: 'Estimate Posterior Probability (1=10% to 9=90%)' } },
      { type: 'logic_check_answer', data: { label: 'Compare Participant Estimates to True Bayes Theorem Value' } },
      { type: 'debrief_completion', data: { label: 'Debrief Statistical Biases' } }
    ]
  },
  {
    slug: 'cognitive-reflection-2026',
    title: 'Frederick Cognitive Reflection Task (CRT)',
    category: 'Reasoning',
    description: 'Solve mathematical reasoning problems that trigger an immediate intuitive (heuristic) but incorrect answer vs. deliberate reflective computation.',
    config: { trials: 6, keys: ['0','1','2','3','4','5','6','7','8','9','Enter'], timeLimitMs: 12000, itiMs: 800 },
    blocks: [
      { type: 'event_start', data: { label: 'Start CRT Reasoning Test' } },
      { type: 'flow_loop', data: { iterations: 6, label: 'Classic Cognitive Reflection Items' } },
      { type: 'stimulus_text', data: { items: ['Bat & Ball ($1.10)', '5 Machines 5 Minutes', 'Lily Pad Doubling (48 Days)'], label: 'Display Reflection Dilemma' } },
      { type: 'response_keypress', data: { label: 'Submit Numeric Solution' } },
      { type: 'logic_check_answer', data: { label: 'Classify Intuitive Error vs Reflective Correct' } },
      { type: 'debrief_completion', data: { label: 'Debrief Dual-Process Reasoning' } }
    ]
  }
];

function seed() {
  console.log('[Seed] Seeding initial database data...');

  // 1. Researcher account
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

  // 2. Default student account
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

  // 3. Seed ALL 22 Cognitive & Behavioral Paradigms
  const insertExpStmt = db.prepare(`
    INSERT INTO experiments (id, user_id, title, description, status, config, share_slug)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertBlockStmt = db.prepare(`
    INSERT INTO experiment_blocks (id, experiment_id, block_type, block_data, sequence_order)
    VALUES (?, ?, ?, ?, ?)
  `);

  let addedExpCount = 0;

  for (const exp of EXPERIMENTS_SPEC) {
    const existing = db.prepare('SELECT id FROM experiments WHERE share_slug = ?').get(exp.slug);
    let expId;

    if (!existing) {
      expId = crypto.randomUUID();
      insertExpStmt.run(
        expId,
        researcherId,
        exp.title,
        exp.description,
        'active',
        JSON.stringify(exp.config),
        exp.slug
      );

      // Insert AST Scratch blocks
      let seq = 1;
      for (const b of exp.blocks) {
        insertBlockStmt.run(
          crypto.randomUUID(),
          expId,
          b.type,
          JSON.stringify(b.data),
          seq++
        );
      }
      addedExpCount++;
    } else {
      expId = existing.id;
    }
  }

  console.log(`[Seed] Synced all 22 experiments (added ${addedExpCount} new paradigms).`);

  // 4. Seed sample completed sessions for STUDENT_001 if none exist
  const existingStudentSessions = db.prepare('SELECT id FROM sessions WHERE user_id = ?').all(studentId);
  if (existingStudentSessions.length < 5) {
    const sampleStudies = [
      { slug: 'stroop-task-2026', code: 'NX-STR89B', acc: 94.5, rt: 524.0, hz: 60.0 },
      { slug: 'flanker-task-2026', code: 'NX-FLK32C', acc: 91.0, rt: 488.0, hz: 120.0 },
      { slug: 'simon-task-2026', code: 'NX-SMN17D', acc: 93.2, rt: 512.5, hz: 60.0 },
      { slug: 'n-back-2026', code: 'NX-NBK76E', acc: 86.5, rt: 640.0, hz: 144.0 },
      { slug: 'mental-rotation-2026', code: 'NX-ROT41A', acc: 88.0, rt: 680.5, hz: 120.0 },
      { slug: 'cognitive-reflection-2026', code: 'NX-CRT90F', acc: 83.3, rt: 4210.0, hz: 60.0 }
    ];

    for (const s of sampleStudies) {
      const expRow = db.prepare('SELECT id FROM experiments WHERE share_slug = ?').get(s.slug);
      if (expRow) {
        const hasSession = db.prepare('SELECT id FROM sessions WHERE user_id = ? AND experiment_id = ?').get(studentId, expRow.id);
        if (!hasSession) {
          const uniqueToken = 'STU_' + crypto.randomUUID().slice(0, 8).toUpperCase();
          db.prepare(`
            INSERT INTO sessions (id, experiment_id, user_id, participant_token, screen_refresh_rate, user_agent, viewport_resolution, started_at, completed_at, status, completion_code, score_accuracy, mean_rt_ms)
            VALUES (?, ?, ?, ?, ?, 'Chrome/128.0 (Student Laptop)', '1920x1080', datetime('now', '-2 days'), datetime('now', '-2 days', '+10 minutes'), 'completed', ?, ?, ?)
          `).run(crypto.randomUUID(), expRow.id, studentId, uniqueToken, s.hz, s.code, s.acc, s.rt);
        }
      }
    }
    console.log('[Seed] Seeded enriched student test history across diverse paradigms.');
  }

  // 5. Pre-loaded Synthetic Datasets for Analytics & Graphing
  const existingDummy = db.prepare('SELECT id FROM dummy_datasets WHERE slug = ?').get('stroop-dataset');
  if (!existingDummy) {
    // 1. Stroop Synthetic Dataset
    const stroopTrials = [];
    for (let p = 1; p <= 120; p++) {
      const subjectId = `SUBJ_${String(p).padStart(3, '0')}`;
      const baselineRT = generateGaussian(470, 35);
      for (let t = 1; t <= 18; t++) {
        const cond = ['Congruent', 'Incongruent', 'Neutral'][t % 3];
        let rt = cond === 'Incongruent' ? generateExGaussian(baselineRT + 175, 45, 80) : generateExGaussian(baselineRT + 30, 30, 45);
        stroopTrials.push({ subjectId, trialNumber: t, condition: cond, responseTimeMs: Math.max(220, rt), isCorrect: Math.random() < 0.94 ? 1 : 0 });
      }
    }
    db.prepare(`
      INSERT INTO dummy_datasets (id, slug, name, description, experiment_type, participant_count, dataset_payload)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(crypto.randomUUID(), 'stroop-dataset', 'Stroop Color-Word Cognitive Interference (N=120)', '120 participants, 2,160 trials comparing Congruent vs. Incongruent RT distributions.', 'stroop', 120, JSON.stringify(stroopTrials));

    // 2. Mental Rotation Synthetic Dataset
    const rotTrials = [];
    const angles = [0, 45, 90, 135, 180];
    for (let p = 1; p <= 85; p++) {
      const subjectId = `ROT_${String(p).padStart(3, '0')}`;
      const baseSpeed = generateGaussian(420, 40);
      for (const angle of angles) {
        for (let rep = 1; rep <= 4; rep++) {
          const rt = generateExGaussian(baseSpeed + (angle * 3.8), 45, 60);
          rotTrials.push({ subjectId, angle, condition: `${angle}° Disparity`, responseTimeMs: Math.max(260, rt), isCorrect: Math.random() < (0.98 - (angle / 180) * 0.10) ? 1 : 0 });
        }
      }
    }
    db.prepare(`
      INSERT INTO dummy_datasets (id, slug, name, description, experiment_type, participant_count, dataset_payload)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(crypto.randomUUID(), 'mental-rotation-dataset', 'Shepard-Metzler Mental Rotation (N=85)', '85 participants, 1,700 trials modeling linear reaction time scaling as a function of angular 3D disparity.', 'mental_rotation', 85, JSON.stringify(rotTrials));

    // 3. Psychometric Contrast Sensitivity
    const psychoData = [];
    for (const c of [0.01, 0.02, 0.04, 0.08, 0.16, 0.32, 0.64]) {
      const pDetect = 0.5 + (0.5 / (1.0 + Math.exp(-35.0 * (c - 0.065))));
      psychoData.push({ contrast: c, hitRate: parseFloat(pDetect.toFixed(4)), meanRt: Math.round(300 + (1 / Math.sqrt(c + 0.01)) * 35), totalTrials: 1200 });
    }
    db.prepare(`
      INSERT INTO dummy_datasets (id, slug, name, description, experiment_type, participant_count, dataset_payload)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(crypto.randomUUID(), 'psychometric-dataset', '2-AFC Psychometric Contrast Thresholds (N=60)', '60 participants, 8,400 trials fitting a 4-parameter logistic sigmoid psychometric detection curve.', 'psychometrics', 60, JSON.stringify(psychoData));
  }
}

module.exports = { seed, EXPERIMENTS_SPEC };

if (require.main === module) {
  seed();
}
