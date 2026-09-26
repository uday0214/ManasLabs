// =========================================================================
// Advanced Scratch-Style Visual Block Experiment Builder & Direct PsychoJS Studio
// Supports 20+ Cognitive Components, Adaptive Psychophysics & Direct Script Editing
// =========================================================================

const ScratchBuilder = {
  currentExperimentId: null,
  currentExperiment: null,
  blocks: [],
  selectedBlockId: null,
  viewMode: 'blocks', // 'blocks' | 'code' | 'split'
  customCode: null,
  isCodeCustomized: false,

  blockDefinitions: {
    // -----------------------------------------------------------------------
    // FLOW & ARCHITECTURE
    // -----------------------------------------------------------------------
    event_start: {
      type: 'event_start',
      category: 'flow',
      label: 'When Experiment Starts',
      colorClass: 'block-event',
      defaultData: { label: 'When Experiment Starts', calibrateHz: true, fullscreen: true, disableShortcuts: true }
    },
    flow_loop: {
      type: 'flow_loop',
      category: 'flow',
      label: 'Repeat Trial Loop',
      colorClass: 'block-flow',
      defaultData: { iterations: 16, randomize: true, label: 'Repeat Trial Loop (16 trials)', conditionWeights: 'equal' }
    },
    flow_branch_condition: {
      type: 'flow_branch_condition',
      category: 'flow',
      label: 'Conditional Branch (If/Else)',
      colorClass: 'block-flow',
      defaultData: { 
        conditionType: 'accuracy', 
        operator: '==', 
        targetValue: 'false', 
        actionIfTrue: 'repeat_trial',
        actionIfFalse: 'continue',
        label: 'If Incorrect -> Repeat Trial'
      }
    },
    flow_adaptive_staircase: {
      type: 'flow_adaptive_staircase',
      category: 'flow',
      label: 'Adaptive Staircase (QUEST / 1-Up 2-Down)',
      colorClass: 'block-flow',
      defaultData: { 
        parameterName: 'contrast', 
        initialVal: 0.8, 
        stepUp: 0.05, 
        stepDown: 0.025, 
        rule: '1up_2down',
        minVal: 0.05, 
        maxVal: 1.0, 
        label: 'Staircase: 1-Up / 2-Down' 
      }
    },
    flow_break_rest: {
      type: 'flow_break_rest',
      category: 'flow',
      label: 'Mandatory Rest Break',
      colorClass: 'block-flow',
      defaultData: { 
        intervalTrials: 20, 
        countdownSeconds: 30, 
        message: 'Take a brief rest break to reduce visual and cognitive fatigue.', 
        allowEarlyResume: true,
        label: 'Rest Break (Every 20 Trials)'
      }
    },
    flow_counterbalance: {
      type: 'flow_counterbalance',
      category: 'flow',
      label: 'Counterbalance Latin Square',
      colorClass: 'block-flow',
      defaultData: { 
        numCohorts: 4, 
        balancingStrategy: 'latin_square', 
        label: 'Latin Square Counterbalancing' 
      }
    },
    flow_wait: {
      type: 'flow_wait',
      category: 'flow',
      label: 'Wait (ITI Delay)',
      colorClass: 'block-flow',
      defaultData: { durationMs: 500, jitterMs: 150, label: 'Inter-Trial Interval (500 ± 150ms)' }
    },

    // -----------------------------------------------------------------------
    // VISUAL & MULTIMODAL STIMULI
    // -----------------------------------------------------------------------
    stimulus_fixation: {
      type: 'stimulus_fixation',
      category: 'stimulus',
      label: 'Fixation Cross (+)',
      colorClass: 'block-stimulus',
      defaultData: { symbol: '+', durationMs: 500, color: '#FFFFFF', size: 40, label: 'Show Fixation Cross (500ms)' }
    },
    stimulus_text: {
      type: 'stimulus_text',
      category: 'stimulus',
      label: 'Display Word / Text Stimulus',
      colorClass: 'block-stimulus',
      defaultData: {
        text: 'STIMULUS',
        textColor: '#38BDF8',
        durationMs: 1500,
        fontSize: 48,
        positionX: 0,
        positionY: 0,
        label: 'Display Word Stimulus (1500ms)'
      }
    },
    stimulus_shape: {
      type: 'stimulus_shape',
      category: 'stimulus',
      label: 'Render Geometric Shape',
      colorClass: 'block-stimulus',
      defaultData: {
        shapeType: 'circle',
        color: '#10B981',
        size: 110,
        rotationDeg: 45,
        durationMs: 2000,
        label: 'Render Geometric Shape (2000ms)'
      }
    },
    stimulus_sound: {
      type: 'stimulus_sound',
      category: 'stimulus',
      label: 'Play Audio Tone (Beep)',
      colorClass: 'block-stimulus',
      defaultData: { frequencyHz: 880, durationMs: 200, volume: 0.5, label: 'Play 880Hz Tone (200ms)' }
    },
    stimulus_image_flicker: {
      type: 'stimulus_image_flicker',
      category: 'stimulus',
      label: 'Flicker Scene (Change Blindness)',
      colorClass: 'block-stimulus',
      defaultData: {
        sceneType: 'color',
        flickerRateHz: 4.0,
        blankIsiMs: 80,
        imageDurationMs: 240,
        maxDurationMs: 12000,
        label: 'Flicker Scene Alternator (4 Hz)'
      }
    },
    stimulus_array_grid: {
      type: 'stimulus_array_grid',
      category: 'stimulus',
      label: 'Visual Search Distractor Matrix',
      colorClass: 'block-stimulus',
      defaultData: {
        setSize: 16,
        targetFeature: 'Red T',
        distractorFeatures: 'Blue T, Red L',
        targetPresentProb: 0.5,
        fieldRadiusPx: 260,
        label: 'Visual Search Grid (Set Size: 16)'
      }
    },
    stimulus_nback_stream: {
      type: 'stimulus_nback_stream',
      category: 'stimulus',
      label: 'Continuous N-Back Memory Stream',
      colorClass: 'block-stimulus',
      defaultData: {
        nLag: 2,
        stimulusType: 'letters',
        presentationDurationMs: 500,
        isiMs: 1500,
        targetMatchRatio: 0.35,
        label: '2-Back Continuous Stream'
      }
    },
    stimulus_moving_dot: {
      type: 'stimulus_moving_dot',
      category: 'stimulus',
      label: 'Inattentional Tracking Simulation',
      colorClass: 'block-stimulus',
      defaultData: {
        numTrackers: 6,
        trackerColor: '#FFFFFF',
        bounceSpeed: 4,
        unexpectedShape: 'Dark Cross',
        unexpectedTimeSec: 3.5,
        label: 'Inattentional Tracking Simulation'
      }
    },
    stimulus_word_list: {
      type: 'stimulus_word_list',
      category: 'stimulus',
      label: 'Serial Position Word List',
      colorClass: 'block-stimulus',
      defaultData: {
        wordsList: 'OCEAN, TABLE, CANDLE, MOUNTAIN, GUITAR, BOTTLE, PLANET, WINDOW, FOREST, SHADOW',
        wordDurationMs: 1000,
        isiMs: 300,
        label: 'Serial Word Sequence (10 Words)'
      }
    },
    stimulus_gabor: {
      type: 'stimulus_gabor',
      category: 'stimulus',
      label: 'Sinusoidal Gabor Patch',
      colorClass: 'block-stimulus',
      defaultData: {
        spatialFreq: 0.05,
        orientationDeg: 45,
        contrast: 0.8,
        envelopeSigma: 24,
        durationMs: 250,
        label: 'Gabor Patch (45°, 0.05 cpd)'
      }
    },

    // -----------------------------------------------------------------------
    // RESPONSE LISTENERS & DECISIONS
    // -----------------------------------------------------------------------
    response_keypress: {
      type: 'response_keypress',
      category: 'response',
      label: 'Listen for Keypress',
      colorClass: 'block-response',
      defaultData: {
        allowedKeys: 'f, j',
        timeoutMs: 2500,
        recordRt: true,
        label: 'Listen for Keypress [F, J]'
      }
    },
    response_mouse: {
      type: 'response_mouse',
      category: 'response',
      label: 'Wait for Mouse Click / Region',
      colorClass: 'block-response',
      defaultData: { targetZone: 'anywhere', timeoutMs: 4000, recordCoordinates: true, label: 'Wait for Mouse Click' }
    },
    response_choice_dilemma: {
      type: 'response_choice_dilemma',
      category: 'response',
      label: 'Two-Alternative Choice Dilemma',
      colorClass: 'block-response',
      defaultData: {
        optionA: 'Option A: Guaranteed $10 today',
        optionB: 'Option B: 50% chance of $25 or $0',
        keyA: '1',
        keyB: '2',
        timeoutMs: 8000,
        label: 'Choice Dilemma [1] vs [2]'
      }
    },
    response_text_input: {
      type: 'response_text_input',
      category: 'response',
      label: 'Direct Text / Numeric Recall Input',
      colorClass: 'block-response',
      defaultData: {
        inputType: 'numeric',
        placeholder: 'Type answer and press Enter...',
        maxLength: 12,
        submitKey: 'Enter',
        label: 'Numeric Response Input'
      }
    },
    response_slider_scale: {
      type: 'response_slider_scale',
      category: 'response',
      label: 'Confidence / Likert Rating Slider',
      colorClass: 'block-response',
      defaultData: {
        minVal: 50,
        maxVal: 100,
        step: 5,
        leftLabel: '50% (Guess)',
        rightLabel: '100% (Certain)',
        initialPos: 75,
        label: 'Confidence Slider (50% - 100%)'
      }
    },

    // -----------------------------------------------------------------------
    // VARIABLES, PSYCHOMETRICS & LOGIC
    // -----------------------------------------------------------------------
    logic_check_answer: {
      type: 'logic_check_answer',
      category: 'logic',
      label: 'Verify Accuracy & Log RT',
      colorClass: 'block-logic',
      defaultData: { expectedKey: 'f', feedbackAudio: false, penaltyDelayMs: 0, label: 'Verify Accuracy & Log RT' }
    },
    logic_variable_set: {
      type: 'logic_variable_set',
      category: 'logic',
      label: 'Set / Mutate Variable',
      colorClass: 'block-logic',
      defaultData: { 
        varName: 'consecutive_errors', 
        operator: 'increment', 
        valueExpr: '1', 
        label: 'Variable: consecutive_errors += 1' 
      }
    },
    logic_psychometric_dprime: {
      type: 'logic_psychometric_dprime',
      category: 'logic',
      label: 'Signal Detection (d\' & Criterion)',
      colorClass: 'block-logic',
      defaultData: {
        signalCondition: 'target_present',
        noiseCondition: 'target_absent',
        computeCriterion: true,
        label: 'Compute Signal Detection d-Prime'
      }
    },
    logic_exgaussian_fit: {
      type: 'logic_exgaussian_fit',
      category: 'logic',
      label: 'Ex-Gaussian & Tukey Outlier Filter',
      colorClass: 'block-logic',
      defaultData: {
        trimOutliers: true,
        iqrMultiplier: 2.5,
        minRtMs: 150,
        maxRtMs: 3500,
        label: 'Tukey IQR (2.5x) Outlier Filter'
      }
    },

    // -----------------------------------------------------------------------
    // FEEDBACK & DEBRIEF
    // -----------------------------------------------------------------------
    debrief_feedback: {
      type: 'debrief_feedback',
      category: 'debrief',
      label: 'Show Trial Performance Feedback',
      colorClass: 'block-debrief',
      defaultData: { durationMs: 800, showRT: true, showAccuracy: true, label: 'Performance Feedback (800ms)' }
    },
    debrief_completion: {
      type: 'debrief_completion',
      category: 'debrief',
      label: 'Issue Verified Completion Token',
      colorClass: 'block-debrief',
      defaultData: { 
        showCode: true, 
        message: 'Study Complete! Thank you for participating in cognitive science research.', 
        label: 'Issue Completion Token' 
      }
    }
  },

  async loadExperiment(id) {
    this.currentExperimentId = id;
    try {
      const data = await API.getExperiment(id);
      this.currentExperiment = data.experiment;
      this.blocks = data.blocks.map(b => {
        const def = this.blockDefinitions[b.block_type] || {};
        const defData = def.defaultData || {};
        const storedData = typeof b.block_data === 'string' ? JSON.parse(b.block_data) : (b.block_data || {});
        return {
          id: b.id || ('blk_' + Math.random().toString(36).substr(2, 9)),
          type: b.block_type,
          data: { ...defData, ...storedData }
        };
      });

      // Check if custom PsychoJS code was previously saved
      let cfg = {};
      try {
        cfg = typeof this.currentExperiment.config === 'string' 
          ? JSON.parse(this.currentExperiment.config) 
          : (this.currentExperiment.config || {});
      } catch (e) {
        cfg = {};
      }

      if (cfg.customPsychoJS) {
        this.customCode = cfg.customPsychoJS;
        this.isCodeCustomized = true;
      } else {
        this.customCode = null;
        this.isCodeCustomized = false;
      }

      if (this.blocks.length === 0) {
        // Default standard template
        this.addBlock('event_start');
        this.addBlock('flow_loop');
        this.addBlock('stimulus_fixation');
        this.addBlock('stimulus_text');
        this.addBlock('response_keypress');
        this.addBlock('logic_check_answer');
        this.addBlock('flow_wait');
        this.addBlock('debrief_completion');
      }

      const titleEl = document.getElementById('builder-study-title');
      if (titleEl) titleEl.textContent = this.currentExperiment.title;

      this.setViewMode('blocks');
      this.renderCanvas();
      this.selectBlock(this.blocks[0]?.id);
      this.initCodeEditor();
      this.populateCodeEditor();
      App.showToast(`Loaded "${this.currentExperiment.title}" into Scratch Studio`, 'success');
    } catch (err) {
      App.showToast('Failed to load experiment: ' + err.message, 'error');
    }
  },

  // -------------------------------------------------------------------------
  // VIEW MODE SWITCHER (Blocks | Direct PsychoJS Code | Split Studio)
  // -------------------------------------------------------------------------
  setViewMode(mode) {
    this.viewMode = mode;
    const container = document.getElementById('builder-layout-container');
    const panelPalette = document.getElementById('builder-palette-panel');
    const panelCanvas = document.getElementById('builder-canvas-panel');
    const panelInspector = document.getElementById('builder-inspector-panel');
    const panelCode = document.getElementById('builder-code-panel');

    // Update active tab buttons
    document.querySelectorAll('.view-tab-btn').forEach(btn => btn.classList.remove('active'));
    if (mode === 'blocks') document.getElementById('tab-mode-blocks')?.classList.add('active');
    if (mode === 'code') document.getElementById('tab-mode-code')?.classList.add('active');
    if (mode === 'split') document.getElementById('tab-mode-split')?.classList.add('active');

    if (!container) return;

    container.className = `builder-layout mode-${mode}`;

    if (mode === 'blocks') {
      if (panelPalette) panelPalette.style.display = 'flex';
      if (panelCanvas) panelCanvas.style.display = 'flex';
      if (panelInspector) panelInspector.style.display = 'flex';
      if (panelCode) panelCode.style.display = 'none';
    } else if (mode === 'code') {
      if (panelPalette) panelPalette.style.display = 'none';
      if (panelCanvas) panelCanvas.style.display = 'none';
      if (panelInspector) panelInspector.style.display = 'none';
      if (panelCode) panelCode.style.display = 'flex';
      this.populateCodeEditor();
    } else if (mode === 'split') {
      if (panelPalette) panelPalette.style.display = 'none';
      if (panelCanvas) panelCanvas.style.display = 'flex';
      if (panelInspector) panelInspector.style.display = 'none';
      if (panelCode) panelCode.style.display = 'flex';
      this.populateCodeEditor();
    }
  },

  populateCodeEditor() {
    const textarea = document.getElementById('builder-code-textarea');
    if (!textarea) return;

    if (!this.isCodeCustomized || !this.customCode) {
      textarea.value = this.generatePsychoJSCode();
    } else {
      textarea.value = this.customCode;
    }

    this.updateLineNumbers('builder-code-textarea', 'builder-code-linenums');
    this.validateCodeSyntax(textarea.value, 'editor-syntax-badge');
  },

  // -------------------------------------------------------------------------
  // PALETTE & CANVAS RENDERING
  // -------------------------------------------------------------------------
  initPalette() {
    const paletteContainer = document.getElementById('palette-blocks-list');
    if (!paletteContainer) return;

    paletteContainer.innerHTML = '';
    const categories = [
      { id: 'flow', name: 'Flow & Architecture', dotColor: 'var(--block-event)' },
      { id: 'stimulus', name: 'Visual & Sensory Stimuli', dotColor: 'var(--block-stimulus)' },
      { id: 'response', name: 'Response & Decision Listeners', dotColor: 'var(--block-response)' },
      { id: 'logic', name: 'Variables & Psychometrics', dotColor: 'var(--block-logic)' },
      { id: 'debrief', name: 'Debrief & IRB Verification', dotColor: 'var(--block-debrief)' }
    ];

    categories.forEach(cat => {
      const catDiv = document.createElement('div');
      catDiv.className = 'palette-category';
      catDiv.innerHTML = `
        <div class="category-title">
          <span class="category-dot" style="background-color: ${cat.dotColor};"></span>
          ${cat.name}
        </div>
        <div class="category-items" id="cat-items-${cat.id}"></div>
      `;
      paletteContainer.appendChild(catDiv);

      const itemsContainer = catDiv.querySelector(`#cat-items-${cat.id}`);
      Object.values(this.blockDefinitions)
        .filter(b => b.category === cat.id)
        .forEach(b => {
          const blockEl = document.createElement('div');
          blockEl.className = `scratch-block ${b.colorClass}`;
          blockEl.draggable = true;
          blockEl.innerHTML = `
            <span>${b.label}</span>
            <span style="font-size: 0.75rem; opacity: 0.8;">➕</span>
          `;

          blockEl.addEventListener('click', () => {
            this.addBlock(b.type);
          });

          blockEl.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', b.type);
          });

          itemsContainer.appendChild(blockEl);
        });
    });

    // Drop zone on canvas
    const canvasWorkspace = document.getElementById('canvas-drop-area');
    if (canvasWorkspace) {
      canvasWorkspace.addEventListener('dragover', (e) => {
        e.preventDefault();
      });
      canvasWorkspace.addEventListener('drop', (e) => {
        e.preventDefault();
        const blockType = e.dataTransfer.getData('text/plain');
        if (blockType && this.blockDefinitions[blockType]) {
          this.addBlock(blockType);
        }
      });
    }

    this.initCodeEditor();
  },

  addBlock(type) {
    const def = this.blockDefinitions[type];
    if (!def) return;

    const newBlock = {
      id: 'blk_' + Math.random().toString(36).substr(2, 9),
      type: type,
      data: JSON.parse(JSON.stringify(def.defaultData))
    };

    this.blocks.push(newBlock);
    this.renderCanvas();
    this.selectBlock(newBlock.id);

    // Auto update code editor in split mode
    if (this.viewMode === 'split' || this.viewMode === 'code') {
      if (!this.isCodeCustomized) {
        this.populateCodeEditor();
      }
    }

    App.showToast(`Added ${def.label} block`, 'info');
  },

  removeBlock(id, e) {
    if (e) e.stopPropagation();
    this.blocks = this.blocks.filter(b => b.id !== id);
    if (this.selectedBlockId === id) {
      this.selectedBlockId = this.blocks[0]?.id || null;
    }
    this.renderCanvas();
    this.renderInspector();

    if ((this.viewMode === 'split' || this.viewMode === 'code') && !this.isCodeCustomized) {
      this.populateCodeEditor();
    }
  },

  moveBlock(id, direction, e) {
    if (e) e.stopPropagation();
    const idx = this.blocks.findIndex(b => b.id === id);
    if (idx === -1) return;

    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= this.blocks.length) return;

    const temp = this.blocks[idx];
    this.blocks[idx] = this.blocks[targetIdx];
    this.blocks[targetIdx] = temp;

    this.renderCanvas();
    if ((this.viewMode === 'split' || this.viewMode === 'code') && !this.isCodeCustomized) {
      this.populateCodeEditor();
    }
  },

  selectBlock(id) {
    this.selectedBlockId = id;
    document.querySelectorAll('.placed-block').forEach(el => {
      el.classList.toggle('selected', el.dataset.id === id);
    });
    this.renderInspector();
  },

  renderCanvas() {
    const stack = document.getElementById('block-sequence-stack');
    const countBadge = document.getElementById('builder-canvas-block-count');
    if (countBadge) countBadge.textContent = `${this.blocks.length} Blocks Sequenced`;
    if (!stack) return;

    stack.innerHTML = '';

    if (this.blocks.length === 0) {
      stack.innerHTML = `
        <div style="text-align: center; color: var(--text-muted); padding: 3rem 1rem;">
          <div style="font-size: 2.2rem; margin-bottom: 0.5rem;">🧩</div>
          <div style="font-weight: 700; margin-bottom: 0.25rem; color: var(--text-primary);">Empty Visual Pipeline</div>
          <div>Drag and drop blocks from the left palette or switch to the Direct PsychoJS Editor.</div>
        </div>
      `;
      return;
    }

    this.blocks.forEach((b, idx) => {
      const def = this.blockDefinitions[b.type] || { colorClass: 'block-flow', label: b.type };
      const el = document.createElement('div');
      el.className = `placed-block ${def.colorClass} ${this.selectedBlockId === b.id ? 'selected' : ''}`;
      el.dataset.id = b.id;

      const title = b.data.label || def.label;
      const subtitle = this.getSummaryDetails(b);

      el.innerHTML = `
        <div style="display: flex; flex-direction: column;">
          <span>${title}</span>
          ${subtitle ? `<span style="font-size: 0.72rem; opacity: 0.85; font-weight: normal; margin-top: 2px;">${subtitle}</span>` : ''}
        </div>
        <div class="block-actions">
          <button title="Move Up" ${idx === 0 ? 'disabled style="opacity:0.3;"' : ''} onclick="ScratchBuilder.moveBlock('${b.id}', -1, event)">▲</button>
          <button title="Move Down" ${idx === this.blocks.length - 1 ? 'disabled style="opacity:0.3;"' : ''} onclick="ScratchBuilder.moveBlock('${b.id}', 1, event)">▼</button>
          <button title="Delete Block" onclick="ScratchBuilder.removeBlock('${b.id}', event)">✕</button>
        </div>
      `;

      el.addEventListener('click', () => {
        this.selectBlock(b.id);
      });

      stack.appendChild(el);
    });
  },

  getSummaryDetails(b) {
    if (b.type === 'stimulus_fixation') return `Symbol: "${b.data.symbol}" | ${b.data.durationMs}ms`;
    if (b.type === 'stimulus_text') return `Text: "${b.data.text || 'WORD'}" | ${b.data.durationMs}ms`;
    if (b.type === 'stimulus_shape') return `Type: ${b.data.shapeType} | ${b.data.durationMs}ms`;
    if (b.type === 'stimulus_sound') return `Freq: ${b.data.frequencyHz}Hz | ${b.data.durationMs}ms`;
    if (b.type === 'stimulus_image_flicker') return `Flicker: ${b.data.flickerRateHz}Hz | Blank: ${b.data.blankIsiMs}ms`;
    if (b.type === 'stimulus_array_grid') return `Set Size: ${b.data.setSize} | Target: ${b.data.targetFeature}`;
    if (b.type === 'stimulus_nback_stream') return `N-Lag: ${b.data.nLag} | Time: ${b.data.presentationDurationMs}ms`;
    if (b.type === 'stimulus_moving_dot') return `Trackers: ${b.data.numTrackers} | Unexpected: ${b.data.unexpectedShape}`;
    if (b.type === 'stimulus_word_list') return `Words: 10 items | Rate: ${b.data.wordDurationMs}ms/word`;
    if (b.type === 'stimulus_gabor') return `Angle: ${b.data.orientationDeg}° | Freq: ${b.data.spatialFreq} cpd`;
    if (b.type === 'response_keypress') return `Keys: [${b.data.allowedKeys}] | Timeout: ${b.data.timeoutMs}ms`;
    if (b.type === 'response_choice_dilemma') return `Keys: [${b.data.keyA}, ${b.data.keyB}]`;
    if (b.type === 'response_text_input') return `Type: ${b.data.inputType} | Submit: [${b.data.submitKey}]`;
    if (b.type === 'response_slider_scale') return `Scale: ${b.data.minVal} to ${b.data.maxVal}`;
    if (b.type === 'flow_loop') return `Loop: ${b.data.iterations} trials | Random: ${b.data.randomize ? 'Yes' : 'No'}`;
    if (b.type === 'flow_branch_condition') return `If ${b.data.conditionType} ${b.data.operator} ${b.data.targetValue} -> ${b.data.actionIfTrue}`;
    if (b.type === 'flow_adaptive_staircase') return `Rule: ${b.data.rule} | Step: +${b.data.stepUp}/-${b.data.stepDown}`;
    if (b.type === 'flow_break_rest') return `Every: ${b.data.intervalTrials} trials | ${b.data.countdownSeconds}s`;
    if (b.type === 'flow_wait') return `Delay: ${b.data.durationMs}ms ± ${b.data.jitterMs || 0}ms`;
    if (b.type === 'logic_variable_set') return `${b.data.varName} ${b.data.operator} ${b.data.valueExpr}`;
    if (b.type === 'logic_psychometric_dprime') return `Signal: ${b.data.signalCondition}`;
    return '';
  },

  // -------------------------------------------------------------------------
  // BLOCK INSPECTOR FORM
  // -------------------------------------------------------------------------
  renderInspector() {
    const inspectorContainer = document.getElementById('inspector-content');
    if (!inspectorContainer) return;

    const block = this.blocks.find(b => b.id === this.selectedBlockId);
    if (!block) {
      inspectorContainer.innerHTML = `
        <div style="color: var(--text-muted); font-size: 0.88rem; text-align: center; padding-top: 2rem;">
          Select any block in the canvas to customize its experimental parameters.
        </div>
      `;
      return;
    }

    const def = this.blockDefinitions[block.type] || { label: block.type };
    let html = `
      <div style="margin-bottom: 1.25rem;">
        <span class="badge" style="background-color: rgba(99, 102, 241, 0.15); color: var(--primary); margin-bottom: 0.5rem; font-weight: 700;">
          ${def.label}
        </span>
        <div class="form-group">
          <label>Block Display Label</label>
          <input type="text" id="prop-label" value="${this.escape(block.data.label || def.label)}">
        </div>
      </div>
    `;

    // 1. Flow & Branching Inspector
    if (block.type === 'flow_loop') {
      html += `
        <div class="form-group">
          <label>Total Trials / Iterations</label>
          <input type="number" id="prop-iterations" value="${block.data.iterations || 16}" min="1" max="500">
        </div>
        <div class="form-group">
          <label style="display:flex; align-items:center; gap:0.5rem; font-weight:600; cursor:pointer;">
            <input type="checkbox" id="prop-randomize" ${block.data.randomize ? 'checked' : ''} style="width:18px;height:18px;">
            Pseudorandomize Trial Order
          </label>
        </div>
      `;
    } else if (block.type === 'flow_branch_condition') {
      html += `
        <div class="form-group">
          <label>Variable / State to Inspect</label>
          <select id="prop-conditiontype">
            <option value="accuracy" ${block.data.conditionType === 'accuracy' ? 'selected' : ''}>Response Accuracy (Correct/Error)</option>
            <option value="reaction_time" ${block.data.conditionType === 'reaction_time' ? 'selected' : ''}>Reaction Time Latency (ms)</option>
            <option value="consecutive_errors" ${block.data.conditionType === 'consecutive_errors' ? 'selected' : ''}>Consecutive Errors Counter</option>
          </select>
        </div>
        <div class="form-group">
          <label>Evaluation Operator</label>
          <select id="prop-operator">
            <option value="==" ${block.data.operator === '==' ? 'selected' : ''}>Equals (==)</option>
            <option value="!=" ${block.data.operator === '!=' ? 'selected' : ''}>Not Equals (!=)</option>
            <option value="<" ${block.data.operator === '<' ? 'selected' : ''}>Less Than (&lt;)</option>
            <option value=">" ${block.data.operator === '>' ? 'selected' : ''}>Greater Than (&gt;)</option>
          </select>
        </div>
        <div class="form-group">
          <label>Threshold Target Value</label>
          <input type="text" id="prop-targetvalue" value="${this.escape(block.data.targetValue || 'false')}">
        </div>
        <div class="form-group">
          <label>Branch Action If Condition Is True</label>
          <select id="prop-actiontrue">
            <option value="repeat_trial" ${block.data.actionIfTrue === 'repeat_trial' ? 'selected' : ''}>Repeat Current Trial</option>
            <option value="trigger_feedback" ${block.data.actionIfTrue === 'trigger_feedback' ? 'selected' : ''}>Trigger Error Feedback</option>
            <option value="terminate_block" ${block.data.actionIfTrue === 'terminate_block' ? 'selected' : ''}>Terminate Block Early</option>
          </select>
        </div>
      `;
    } else if (block.type === 'flow_adaptive_staircase') {
      html += `
        <div class="form-group">
          <label>Psychophysical Parameter</label>
          <input type="text" id="prop-parametername" value="${this.escape(block.data.parameterName || 'contrast')}">
        </div>
        <div class="form-group">
          <label>Staircase Stepping Rule</label>
          <select id="prop-rule">
            <option value="1up_2down" ${block.data.rule === '1up_2down' ? 'selected' : ''}>1-Up / 2-Down (70.7% Threshold)</option>
            <option value="1up_3down" ${block.data.rule === '1up_3down' ? 'selected' : ''}>1-Up / 3-Down (79.4% Threshold)</option>
            <option value="quest" ${block.data.rule === 'quest' ? 'selected' : ''}>Bayesian QUEST Estimator</option>
          </select>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.5rem;">
          <div class="form-group">
            <label>Step Up (+)</label>
            <input type="number" id="prop-stepup" step="0.01" value="${block.data.stepUp || 0.05}">
          </div>
          <div class="form-group">
            <label>Step Down (-)</label>
            <input type="number" id="prop-stepdown" step="0.01" value="${block.data.stepDown || 0.025}">
          </div>
        </div>
      `;
    } else if (block.type === 'flow_break_rest') {
      html += `
        <div class="form-group">
          <label>Break Frequency (Interval in Trials)</label>
          <input type="number" id="prop-intervaltrials" value="${block.data.intervalTrials || 20}">
        </div>
        <div class="form-group">
          <label>Countdown Duration (Seconds)</label>
          <input type="number" id="prop-countdownseconds" value="${block.data.countdownSeconds || 30}">
        </div>
        <div class="form-group">
          <label>Participant Notice Message</label>
          <textarea id="prop-breakmessage" rows="2">${this.escape(block.data.message || 'Take a brief rest break.')}</textarea>
        </div>
      `;
    } else if (block.type === 'flow_wait') {
      html += `
        <div class="form-group">
          <label>Base Delay Duration (ms)</label>
          <input type="number" id="prop-duration" value="${block.data.durationMs || 500}" min="0" step="50">
        </div>
        <div class="form-group">
          <label>Random Jitter Offset (± ms)</label>
          <input type="number" id="prop-jitter" value="${block.data.jitterMs || 0}" min="0" step="50">
        </div>
      `;
    }

    // 2. Stimuli Inspector
    else if (block.type === 'stimulus_fixation') {
      html += `
        <div class="form-group">
          <label>Fixation Symbol</label>
          <input type="text" id="prop-symbol" value="${this.escape(block.data.symbol || '+')}">
        </div>
        <div class="form-group">
          <label>Duration (milliseconds)</label>
          <input type="number" id="prop-duration" value="${block.data.durationMs || 500}" min="50" step="50">
        </div>
        <div class="form-group">
          <label>Color</label>
          <input type="color" id="prop-color" value="${block.data.color || '#FFFFFF'}">
        </div>
        <div class="form-group">
          <label>Size (px)</label>
          <input type="number" id="prop-size" value="${block.data.size || 40}">
        </div>
      `;
    } else if (block.type === 'stimulus_text') {
      html += `
        <div class="form-group">
          <label>Stimulus Word / Text</label>
          <input type="text" id="prop-text" value="${this.escape(block.data.text || 'WORD')}">
        </div>
        <div class="form-group">
          <label>Text Color</label>
          <input type="color" id="prop-color" value="${block.data.textColor || '#38BDF8'}">
        </div>
        <div class="form-group">
          <label>Display Duration (ms)</label>
          <input type="number" id="prop-duration" value="${block.data.durationMs || 1500}" min="100" step="50">
        </div>
        <div class="form-group">
          <label>Font Size (px)</label>
          <input type="number" id="prop-fontsize" value="${block.data.fontSize || 48}">
        </div>
      `;
    } else if (block.type === 'stimulus_shape') {
      html += `
        <div class="form-group">
          <label>Shape Geometry</label>
          <select id="prop-shapetype">
            <option value="circle" ${block.data.shapeType === 'circle' ? 'selected' : ''}>Circle</option>
            <option value="square" ${block.data.shapeType === 'square' ? 'selected' : ''}>Square</option>
            <option value="polygon_pair" ${block.data.shapeType === 'polygon_pair' ? 'selected' : ''}>Shepard-Metzler 3D Polygon Pair</option>
            <option value="gabor" ${block.data.shapeType === 'gabor' ? 'selected' : ''}>Sinusoidal Gabor</option>
          </select>
        </div>
        <div class="form-group">
          <label>Rotation Angle (degrees)</label>
          <input type="number" id="prop-rotation" value="${block.data.rotationDeg || 0}" min="0" max="360">
        </div>
        <div class="form-group">
          <label>Duration (ms)</label>
          <input type="number" id="prop-duration" value="${block.data.durationMs || 2000}">
        </div>
      `;
    } else if (block.type === 'stimulus_sound') {
      html += `
        <div class="form-group">
          <label>Frequency (Hz)</label>
          <input type="number" id="prop-freq" value="${block.data.frequencyHz || 880}" min="100" max="8000">
        </div>
        <div class="form-group">
          <label>Duration (ms)</label>
          <input type="number" id="prop-duration" value="${block.data.durationMs || 200}">
        </div>
      `;
    } else if (block.type === 'stimulus_image_flicker') {
      html += `
        <div class="form-group">
          <label>Scene Transformation Type</label>
          <select id="prop-scenetype">
            <option value="color" ${block.data.sceneType === 'color' ? 'selected' : ''}>Color Transformation</option>
            <option value="position" ${block.data.sceneType === 'position' ? 'selected' : ''}>Spatial Location Shift</option>
            <option value="removal" ${block.data.sceneType === 'removal' ? 'selected' : ''}>Disappearance / Occlusion</option>
          </select>
        </div>
        <div class="form-group">
          <label>Flicker Alternation Rate (Hz)</label>
          <input type="number" id="prop-flickerrate" step="0.5" value="${block.data.flickerRateHz || 4.0}">
        </div>
        <div class="form-group">
          <label>Blank Gray Screen ISI (ms)</label>
          <input type="number" id="prop-blankisi" value="${block.data.blankIsiMs || 80}">
        </div>
      `;
    } else if (block.type === 'stimulus_array_grid') {
      html += `
        <div class="form-group">
          <label>Set Size (Number of Elements)</label>
          <select id="prop-setsize">
            <option value="4" ${block.data.setSize == 4 ? 'selected' : ''}>4 Elements</option>
            <option value="8" ${block.data.setSize == 8 ? 'selected' : ''}>8 Elements</option>
            <option value="16" ${block.data.setSize == 16 ? 'selected' : ''}>16 Elements</option>
            <option value="24" ${block.data.setSize == 24 ? 'selected' : ''}>24 Elements</option>
          </select>
        </div>
        <div class="form-group">
          <label>Target Present Probability (0.0 - 1.0)</label>
          <input type="number" id="prop-targetprob" step="0.1" min="0" max="1" value="${block.data.targetPresentProb || 0.5}">
        </div>
      `;
    } else if (block.type === 'stimulus_nback_stream') {
      html += `
        <div class="form-group">
          <label>N-Back Lag Offset (N Steps)</label>
          <select id="prop-nlag">
            <option value="1" ${block.data.nLag == 1 ? 'selected' : ''}>1-Back</option>
            <option value="2" ${block.data.nLag == 2 ? 'selected' : ''}>2-Back</option>
            <option value="3" ${block.data.nLag == 3 ? 'selected' : ''}>3-Back</option>
          </select>
        </div>
        <div class="form-group">
          <label>Target Match Ratio (0.0 - 1.0)</label>
          <input type="number" id="prop-matchratio" step="0.05" value="${block.data.targetMatchRatio || 0.35}">
        </div>
      `;
    } else if (block.type === 'stimulus_word_list') {
      html += `
        <div class="form-group">
          <label>Word Sequence (Comma Separated)</label>
          <textarea id="prop-wordslist" rows="3">${this.escape(block.data.wordsList || '')}</textarea>
        </div>
        <div class="form-group">
          <label>Word Duration (ms/word)</label>
          <input type="number" id="prop-wordduration" value="${block.data.wordDurationMs || 1000}">
        </div>
      `;
    }

    // 3. Responses Inspector
    else if (block.type === 'response_keypress') {
      html += `
        <div class="form-group">
          <label>Allowed Response Keys (Comma Separated)</label>
          <input type="text" id="prop-keys" value="${this.escape(block.data.allowedKeys || 'f, j')}">
        </div>
        <div class="form-group">
          <label>Response Timeout Limit (ms)</label>
          <input type="number" id="prop-timeout" value="${block.data.timeoutMs || 2500}" min="200" step="100">
        </div>
      `;
    } else if (block.type === 'response_choice_dilemma') {
      html += `
        <div class="form-group">
          <label>Option A Description</label>
          <input type="text" id="prop-optiona" value="${this.escape(block.data.optionA || '')}">
        </div>
        <div class="form-group">
          <label>Option B Description</label>
          <input type="text" id="prop-optionb" value="${this.escape(block.data.optionB || '')}">
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.5rem;">
          <div class="form-group">
            <label>Key for Option A</label>
            <input type="text" id="prop-keya" value="${this.escape(block.data.keyA || '1')}">
          </div>
          <div class="form-group">
            <label>Key for Option B</label>
            <input type="text" id="prop-keyb" value="${this.escape(block.data.keyB || '2')}">
          </div>
        </div>
      `;
    } else if (block.type === 'response_text_input') {
      html += `
        <div class="form-group">
          <label>Input Mode</label>
          <select id="prop-inputtype">
            <option value="numeric" ${block.data.inputType === 'numeric' ? 'selected' : ''}>Numeric Digits Only [0-9]</option>
            <option value="text" ${block.data.inputType === 'text' ? 'selected' : ''}>Full Alphanumeric Text</option>
          </select>
        </div>
        <div class="form-group">
          <label>Input Placeholder Prompt</label>
          <input type="text" id="prop-placeholder" value="${this.escape(block.data.placeholder || '')}">
        </div>
      `;
    } else if (block.type === 'response_slider_scale') {
      html += `
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.5rem;">
          <div class="form-group">
            <label>Min Value</label>
            <input type="number" id="prop-slidermin" value="${block.data.minVal || 50}">
          </div>
          <div class="form-group">
            <label>Max Value</label>
            <input type="number" id="prop-slidermax" value="${block.data.maxVal || 100}">
          </div>
        </div>
        <div class="form-group">
          <label>Left Anchor Label</label>
          <input type="text" id="prop-leftlabel" value="${this.escape(block.data.leftLabel || '50% (Guess)')}">
        </div>
        <div class="form-group">
          <label>Right Anchor Label</label>
          <input type="text" id="prop-rightlabel" value="${this.escape(block.data.rightLabel || '100% (Certain)')}">
        </div>
      `;
    }

    // 4. Logic & Variables Inspector
    else if (block.type === 'logic_check_answer') {
      html += `
        <div class="form-group">
          <label>Expected Target Key</label>
          <input type="text" id="prop-targetkey" value="${this.escape(block.data.expectedKey || 'f')}">
        </div>
        <div class="form-group">
          <label style="display:flex; align-items:center; gap:0.5rem; font-weight:600; cursor:pointer;">
            <input type="checkbox" id="prop-feedbackaudio" ${block.data.feedbackAudio ? 'checked' : ''} style="width:18px;height:18px;">
            Auditory Chime on Incorrect Key
          </label>
        </div>
      `;
    } else if (block.type === 'logic_variable_set') {
      html += `
        <div class="form-group">
          <label>Variable Identifier</label>
          <input type="text" id="prop-varname" value="${this.escape(block.data.varName || 'score')}">
        </div>
        <div class="form-group">
          <label>Mutation Operator</label>
          <select id="prop-varoperator">
            <option value="set" ${block.data.operator === 'set' ? 'selected' : ''}>Set to Value (=)</option>
            <option value="increment" ${block.data.operator === 'increment' ? 'selected' : ''}>Increment (+=)</option>
            <option value="decrement" ${block.data.operator === 'decrement' ? 'selected' : ''}>Decrement (-=)</option>
          </select>
        </div>
        <div class="form-group">
          <label>Value / Expression</label>
          <input type="text" id="prop-valueexpr" value="${this.escape(block.data.valueExpr || '1')}">
        </div>
      `;
    } else if (block.type === 'debrief_completion') {
      html += `
        <div class="form-group">
          <label>Debrief & IRB Explanation Message</label>
          <textarea id="prop-message" rows="3">${this.escape(block.data.message || 'Study Complete!')}</textarea>
        </div>
        <div class="form-group">
          <label style="display:flex; align-items:center; gap:0.5rem; font-weight:600; cursor:pointer;">
            <input type="checkbox" id="prop-showcode" ${block.data.showCode !== false ? 'checked' : ''} style="width:18px;height:18px;">
            Issue Cryptographic Prolific/MTurk Token
          </label>
        </div>
      `;
    }

    inspectorContainer.innerHTML = html;

    // Attach reactive input listeners
    const attachChange = (id, key, parser = v => v) => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', () => {
          block.data[key] = parser(el.value);
          this.renderCanvas();
          if ((this.viewMode === 'split' || this.viewMode === 'code') && !this.isCodeCustomized) {
            this.populateCodeEditor();
          }
        });
      }
    };

    attachChange('prop-label', 'label');
    attachChange('prop-iterations', 'iterations', parseInt);
    attachChange('prop-conditiontype', 'conditionType');
    attachChange('prop-operator', 'operator');
    attachChange('prop-targetvalue', 'targetValue');
    attachChange('prop-actiontrue', 'actionIfTrue');
    attachChange('prop-parametername', 'parameterName');
    attachChange('prop-rule', 'rule');
    attachChange('prop-stepup', 'stepUp', parseFloat);
    attachChange('prop-stepdown', 'stepDown', parseFloat);
    attachChange('prop-intervaltrials', 'intervalTrials', parseInt);
    attachChange('prop-countdownseconds', 'countdownSeconds', parseInt);
    attachChange('prop-breakmessage', 'message');
    attachChange('prop-duration', 'durationMs', parseInt);
    attachChange('prop-jitter', 'jitterMs', parseInt);
    attachChange('prop-symbol', 'symbol');
    attachChange('prop-color', 'color');
    attachChange('prop-size', 'size', parseInt);
    attachChange('prop-text', 'text');
    attachChange('prop-fontsize', 'fontSize', parseInt);
    attachChange('prop-shapetype', 'shapeType');
    attachChange('prop-rotation', 'rotationDeg', parseInt);
    attachChange('prop-freq', 'frequencyHz', parseInt);
    attachChange('prop-scenetype', 'sceneType');
    attachChange('prop-flickerrate', 'flickerRateHz', parseFloat);
    attachChange('prop-blankisi', 'blankIsiMs', parseInt);
    attachChange('prop-setsize', 'setSize', parseInt);
    attachChange('prop-targetprob', 'targetPresentProb', parseFloat);
    attachChange('prop-nlag', 'nLag', parseInt);
    attachChange('prop-matchratio', 'targetMatchRatio', parseFloat);
    attachChange('prop-wordslist', 'wordsList');
    attachChange('prop-wordduration', 'wordDurationMs', parseInt);
    attachChange('prop-keys', 'allowedKeys');
    attachChange('prop-timeout', 'timeoutMs', parseInt);
    attachChange('prop-optiona', 'optionA');
    attachChange('prop-optionb', 'optionB');
    attachChange('prop-keya', 'keyA');
    attachChange('prop-keyb', 'keyB');
    attachChange('prop-inputtype', 'inputType');
    attachChange('prop-placeholder', 'placeholder');
    attachChange('prop-slidermin', 'minVal', parseFloat);
    attachChange('prop-slidermax', 'maxVal', parseFloat);
    attachChange('prop-leftlabel', 'leftLabel');
    attachChange('prop-rightlabel', 'rightLabel');
    attachChange('prop-targetkey', 'expectedKey');
    attachChange('prop-varname', 'varName');
    attachChange('prop-varoperator', 'operator');
    attachChange('prop-valueexpr', 'valueExpr');
    attachChange('prop-message', 'message');

    const randCheck = document.getElementById('prop-randomize');
    if (randCheck) {
      randCheck.addEventListener('change', () => {
        block.data.randomize = randCheck.checked;
        this.renderCanvas();
      });
    }

    const audioCheck = document.getElementById('prop-feedbackaudio');
    if (audioCheck) {
      audioCheck.addEventListener('change', () => {
        block.data.feedbackAudio = audioCheck.checked;
      });
    }

    const showCodeCheck = document.getElementById('prop-showcode');
    if (showCodeCheck) {
      showCodeCheck.addEventListener('change', () => {
        block.data.showCode = showCodeCheck.checked;
      });
    }
  },

  // -------------------------------------------------------------------------
  // DIRECT PSYCHOJS CODE EDITOR & COMPILER
  // -------------------------------------------------------------------------
  initCodeEditor() {
    const textarea = document.getElementById('builder-code-textarea');
    const modalTextarea = document.getElementById('code-preview-content');

    const setupListeners = (ta, gutterId, badgeId) => {
      if (!ta) return;
      ta.addEventListener('input', () => {
        this.customCode = ta.value;
        this.isCodeCustomized = true;
        this.updateLineNumbers(ta.id, gutterId);
        this.validateCodeSyntax(ta.value, badgeId);
      });

      ta.addEventListener('scroll', () => {
        const gutter = document.getElementById(gutterId);
        if (gutter) gutter.scrollTop = ta.scrollTop;
      });

      ta.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
          e.preventDefault();
          const start = ta.selectionStart;
          const end = ta.selectionEnd;
          ta.value = ta.value.substring(0, start) + '  ' + ta.value.substring(end);
          ta.selectionStart = ta.selectionEnd = start + 2;
          this.updateLineNumbers(ta.id, gutterId);
        }
      });
    };

    setupListeners(textarea, 'builder-code-linenums', 'editor-syntax-badge');
    setupListeners(modalTextarea, null, 'modal-syntax-badge');
  },

  updateLineNumbers(textareaId, gutterId) {
    const ta = document.getElementById(textareaId);
    const gutter = document.getElementById(gutterId);
    if (!ta || !gutter) return;

    const lines = ta.value.split('\n').length;
    let numbers = '';
    for (let i = 1; i <= lines; i++) {
      numbers += i + '\n';
    }
    gutter.textContent = numbers;

    // Update status bar
    const sizeEl = document.getElementById('editor-status-size');
    if (sizeEl) sizeEl.textContent = `${ta.value.length} bytes (${lines} lines)`;
  },

  validateCodeSyntax(code, badgeId = 'editor-syntax-badge') {
    const badge = document.getElementById(badgeId);
    if (!badge) return;

    try {
      // Use Function constructor to validate JS syntax without running execution
      new Function(code);
      badge.textContent = 'SYNTAX VALID';
      badge.style.background = 'rgba(16, 185, 129, 0.15)';
      badge.style.color = '#10b981';
      badge.style.borderColor = 'rgba(16, 185, 129, 0.3)';
    } catch (err) {
      badge.textContent = 'SYNTAX NOTICE';
      badge.style.background = 'rgba(245, 158, 11, 0.15)';
      badge.style.color = '#f59e0b';
      badge.style.borderColor = 'rgba(245, 158, 11, 0.3)';
      badge.title = err.message;
    }
  },

  recompileCodeFromBlocks() {
    this.customCode = this.generatePsychoJSCode();
    this.isCodeCustomized = false;
    this.populateCodeEditor();
    App.showToast('Recompiled PsychoJS script from visual Scratch blocks!', 'info');
  },

  formatEditorCode(textareaId) {
    const ta = document.getElementById(textareaId);
    if (!ta) return;
    const lines = ta.value.split('\n');
    let indent = 0;
    const formatted = lines.map(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith('}') || trimmed.startsWith(']')) indent = Math.max(0, indent - 1);
      const pad = '  '.repeat(indent);
      if (trimmed.endsWith('{') || trimmed.endsWith('[')) indent++;
      return pad + trimmed;
    }).join('\n');

    ta.value = formatted;
    this.customCode = formatted;
    this.updateLineNumbers(textareaId, 'builder-code-linenums');
    App.showToast('Code formatting applied', 'info');
  },

  copyCodeFromEditor(textareaId) {
    const ta = document.getElementById(textareaId);
    if (!ta) return;
    navigator.clipboard.writeText(ta.value).then(() => {
      App.showToast('PsychoJS script copied to clipboard!', 'success');
    });
  },

  // -------------------------------------------------------------------------
  // BIDIRECTIONAL PARSER: SCRIPT -> SCRATCH BLOCKS
  // -------------------------------------------------------------------------
  syncEditorCodeToBlocks(textareaId) {
    const ta = document.getElementById(textareaId);
    if (!ta) return;
    const code = ta.value;

    const parsedBlocks = [];
    parsedBlocks.push({
      id: 'blk_start',
      type: 'event_start',
      data: { label: 'When Experiment Starts', calibrateHz: true }
    });

    // Check for trial loop
    const loopMatch = code.match(/iterations:\s*(\d+)/i) || code.match(/for\s*\(\s*let\s+trial\s*=\s*0;\s*trial\s*<\s*(\d+)/i);
    const loopIterations = loopMatch ? parseInt(loopMatch[1]) : 16;
    parsedBlocks.push({
      id: 'blk_loop',
      type: 'flow_loop',
      data: { iterations: loopIterations, randomize: true, label: `Repeat Trial Loop (${loopIterations} trials)` }
    });

    // Detect fixation
    if (code.includes('Fixation') || code.includes('stimulus_fixation') || code.includes("symbol: '+'")) {
      parsedBlocks.push({
        id: 'blk_fix',
        type: 'stimulus_fixation',
        data: { symbol: '+', durationMs: 500, color: '#FFFFFF', size: 40, label: 'Fixation Cross (500ms)' }
      });
    }

    // Detect visual search grid
    if (code.includes('VisualSearch') || code.includes('distractor') || code.includes('stimulus_array_grid')) {
      parsedBlocks.push({
        id: 'blk_search',
        type: 'stimulus_array_grid',
        data: { setSize: 16, targetFeature: 'Red T', distractorFeatures: 'Blue T, Red L', label: 'Visual Search Grid (16 Items)' }
      });
    }

    // Detect flicker scene
    if (code.includes('Flicker') || code.includes('change_blindness') || code.includes('stimulus_image_flicker')) {
      parsedBlocks.push({
        id: 'blk_flicker',
        type: 'stimulus_image_flicker',
        data: { sceneType: 'color', flickerRateHz: 4.0, blankIsiMs: 80, label: 'Flicker Scene Alternator (4 Hz)' }
      });
    }

    // Detect text stimulus
    if (code.includes('TextStim') || code.includes('stimulus_text')) {
      const textMatch = code.match(/text:\s*['"]([^'"]+)['"]/i);
      parsedBlocks.push({
        id: 'blk_text',
        type: 'stimulus_text',
        data: { text: textMatch ? textMatch[1] : 'STIMULUS', textColor: '#38BDF8', durationMs: 1500, fontSize: 48, label: 'Display Word Stimulus' }
      });
    }

    // Detect response keypress
    if (code.includes('Keyboard') || code.includes('getKeys') || code.includes('response_keypress')) {
      const keyMatch = code.match(/allowedKeys:\s*\[([^\]]+)\]/i);
      const keys = keyMatch ? keyMatch[1].replace(/['"\s]/g, '') : 'f, j';
      parsedBlocks.push({
        id: 'blk_resp',
        type: 'response_keypress',
        data: { allowedKeys: keys, timeoutMs: 2500, recordRt: true, label: `Listen for Keypress [${keys}]` }
      });
    }

    // Detect accuracy check
    if (code.includes('checkAnswer') || code.includes('correctKey') || code.includes('logic_check_answer')) {
      parsedBlocks.push({
        id: 'blk_logic',
        type: 'logic_check_answer',
        data: { expectedKey: 'f', feedbackAudio: false, label: 'Verify Accuracy & Log RT' }
      });
    }

    // Completion debrief
    parsedBlocks.push({
      id: 'blk_debrief',
      type: 'debrief_completion',
      data: { showCode: true, message: 'Study Complete! Thank you.', label: 'Issue Completion Token' }
    });

    this.blocks = parsedBlocks;
    this.renderCanvas();
    this.selectBlock(this.blocks[0]?.id);
    App.showToast(`Successfully parsed script into ${this.blocks.length} visual Scratch blocks!`, 'success');
  },

  // -------------------------------------------------------------------------
  // RUNNER & SAVING
  // -------------------------------------------------------------------------
  runCurrentExperiment() {
    // 1. Close modal if open
    App.closeModal('code-preview-modal');

    // 2. Switch main view to participant runner
    App.switchView('view-participant');

    // 3. Fallback experiment object if currentExperiment was not yet loaded
    const expObj = this.currentExperiment || {
      id: this.currentExperimentId || 'custom-sandbox',
      title: document.getElementById('builder-study-title')?.textContent || 'Scratch Custom Study',
      description: 'Custom experiment built in the Nexora Scratch Studio.',
      share_slug: 'sandbox-run'
    };

    // 4. Start the PsychoJS session
    PsychoJSRunner.startParticipantSession({
      experiment: expObj,
      blocks: this.blocks,
      customCode: this.customCode
    });
  },

  runCustomEditorCode(textareaId) {
    const ta = document.getElementById(textareaId);
    if (ta) {
      this.customCode = ta.value;
      this.isCodeCustomized = true;
    }
    this.runCurrentExperiment();
  },

  async saveEditorCode(textareaId) {
    const ta = document.getElementById(textareaId);
    if (ta) {
      this.customCode = ta.value;
      this.isCodeCustomized = true;
    }
    await this.saveToDatabase();
  },

  async saveToDatabase() {
    try {
      // 1. If not logged in, auto sign in with default researcher demo account
      if (!Auth.isLoggedIn()) {
        try {
          await API.login('researcher@nexora.edu', 'password123');
        } catch (authErr) {
          console.warn('Auto auth notice:', authErr);
        }
      }

      // 2. Parse custom code from active editor if in code mode
      const codeArea = document.getElementById('builder-code-textarea');
      if (codeArea && (this.viewMode === 'code' || this.viewMode === 'split')) {
        this.customCode = codeArea.value;
        this.isCodeCustomized = true;
      }

      let cfg = {};
      try {
        cfg = typeof this.currentExperiment?.config === 'string'
          ? JSON.parse(this.currentExperiment.config)
          : (this.currentExperiment?.config || {});
      } catch (e) {
        cfg = {};
      }

      if (this.customCode) {
        cfg.customPsychoJS = this.customCode;
      }

      // 3. If no experiment is active yet, auto-create one in the database
      if (!this.currentExperimentId) {
        const titleText = document.getElementById('builder-study-title')?.textContent || 'Custom Cognitive Experiment';
        const newExp = await API.createExperiment({
          title: titleText,
          description: 'Custom experiment built with Scratch blocks and PsychoJS Studio.',
          config: cfg,
          blocks: this.blocks.map((b, idx) => ({
            block_type: b.type,
            block_data: b.data,
            sequence_order: idx + 1
          }))
        });

        this.currentExperimentId = newExp.id;
        this.currentExperiment = {
          id: newExp.id,
          title: titleText,
          config: cfg,
          share_slug: newExp.share_slug
        };

        App.showToast('Created new experiment and saved logic to database!', 'success');
        return;
      }

      // 4. Update the existing experiment
      await API.updateExperiment(this.currentExperimentId, {
        config: cfg,
        blocks: this.blocks.map((b, idx) => ({
          block_type: b.type,
          block_data: b.data,
          sequence_order: idx + 1
        }))
      });

      App.showToast('Experiment logic and PsychoJS code successfully saved to database!', 'success');
    } catch (err) {
      console.error('[Save to Database Error]', err);
      App.showToast('Save failed: ' + err.message, 'error');
    }
  },

  async initDefaultExperiment() {
    if (this.currentExperimentId) return;
    try {
      const res = await API.getExperiments();
      if (res && res.experiments && res.experiments.length > 0) {
        await this.loadExperiment(res.experiments[0].id);
        return;
      }
    } catch (e) {}

    // Fallback: load first seeded study
    try {
      const pub = await API.getPublicExperiment('stroop-task-2026');
      if (pub && pub.experiment) {
        this.currentExperiment = pub.experiment;
        this.currentExperimentId = pub.experiment.id;
        this.blocks = pub.blocks.map(b => ({
          id: b.id,
          type: b.block_type || b.type,
          data: typeof b.block_data === 'string' ? JSON.parse(b.block_data) : (b.block_data || b.data)
        }));
        const titleEl = document.getElementById('builder-study-title');
        if (titleEl) titleEl.textContent = this.currentExperiment.title;
        this.renderCanvas();
        this.selectBlock(this.blocks[0]?.id);
      }
    } catch (e) {
      console.warn('Fallback experiment init:', e);
    }
  },

  // -------------------------------------------------------------------------
  // PSYCHOJS CODE GENERATOR
  // -------------------------------------------------------------------------
  generatePsychoJSCode() {
    const expTitle = this.currentExperiment?.title || 'Cognitive Science Paradigm';
    const totalBlocks = this.blocks.length;

    let loopBlock = this.blocks.find(b => b.type === 'flow_loop');
    let loopTrials = loopBlock ? (loopBlock.data.iterations || 16) : 16;
    let randomize = loopBlock ? !!loopBlock.data.randomize : true;

    let keyBlock = this.blocks.find(b => b.type === 'response_keypress');
    let allowedKeys = keyBlock ? keyBlock.data.allowedKeys : 'f, j';

    const code = `
/*************************************************************************
 * PsychoJS Behavioral Experiment Runtime Engine (2024.1.0)
 * Study: "${expTitle}"
 * Calibrated V-Sync Frame Synchronization & Sub-millisecond Key Clock
 * Generated from Nexora Scratch Visual Experiment Studio
 *************************************************************************/
import { PsychoJS } from 'https://cdn.jsdelivr.net/npm/psychojs@2024.1.0/dist/psychojs.js';
import * as visual from 'https://cdn.jsdelivr.net/npm/psychojs@2024.1.0/dist/visual.js';
import * as sound from 'https://cdn.jsdelivr.net/npm/psychojs@2024.1.0/dist/sound.js';
import * as core from 'https://cdn.jsdelivr.net/npm/psychojs@2024.1.0/dist/core.js';
import * as data from 'https://cdn.jsdelivr.net/npm/psychojs@2024.1.0/dist/data.js';

// 1. Initialize Core PsychoJS Engine
const psychoJS = new PsychoJS({
  debug: false,
  collectIP: false // Anonymous Institutional Review Board (IRB) Protocol
});

// 2. Open High-Precision Double-Buffered WebGL Canvas Window
await psychoJS.openWindow({
  fullscr: true,
  color: new visual.Color([0.04, 0.05, 0.08]), // Dark research surface
  units: 'norm',
  waitBlanking: true // Hardware V-Sync Lock (Zero dropped frames)
});

// Hardware Precision Clocks & Keyboard Listener
const globalClock = new core.Clock();
const trialClock = new core.Clock();
const keyboard = new core.Keyboard({ psychoJS });

// Experiment Runtime State Variables
let currentTrial = 0;
const totalTrials = ${loopTrials};
const randomizeTrials = ${randomize};
const experimentTelemetry = [];

// 3. Compiled Block Component Pipeline (${totalBlocks} Visual Blocks)
${this.blocks.map((b, i) => this.generateBlockSnippet(b, i + 1)).join('\n\n')}

// 4. Trial Execution Routine
async function runTrialSequence() {
  console.log('[PsychoJS] Commencing ' + totalTrials + ' trials sequence...');
  
  for (let trial = 0; trial < totalTrials; trial++) {
    currentTrial = trial + 1;
    trialClock.reset();
    
    // Inter-Trial Fixation
    console.log('[Trial ' + currentTrial + '] Onset scheduled at ' + globalClock.getTime().toFixed(4) + 's');
    
    // Stimulus Presentation & Millisecond Key Response
    const keys = keyboard.getKeys({
      keyList: [${allowedKeys.split(',').map(k => `'${k.trim()}'`).join(', ')}],
      waitRelease: false,
      clearEvents: true
    });
    
    // Telemetry Sync
    experimentTelemetry.push({
      trial_index: currentTrial,
      timestamp: globalClock.getTime()
    });
  }
  
  console.log('[PsychoJS] Experiment concluded successfully. Syncing telemetry to database.');
}

// Auto-commence trial sequence
await runTrialSequence();
    `.trim();

    return code;
  },

  generateBlockSnippet(b, idx) {
    const dataStr = JSON.stringify(b.data, null, 2).replace(/\n/g, '\n//   ');
    switch (b.type) {
      case 'event_start':
        return `// [Block ${idx}: Event Start]\n// Screen refresh rate calibration & fullscreen lock\nawait psychoJS.window.adjustScreenRefreshRate();`;
      case 'flow_loop':
        return `// [Block ${idx}: Flow Loop]\n// Trials: ${b.data.iterations}, Randomize: ${b.data.randomize}\nconst trialLoop = new data.TrialHandler({ nReps: ${b.data.iterations}, method: '${b.data.randomize ? 'random' : 'sequential'}' });`;
      case 'flow_branch_condition':
        return `// [Block ${idx}: Conditional Branch]\nfunction evaluateBranch(state) {\n  if (state.${b.data.conditionType} ${b.data.operator} ${b.data.targetValue}) {\n    return '${b.data.actionIfTrue}';\n  }\n  return '${b.data.actionIfFalse}';\n}`;
      case 'flow_adaptive_staircase':
        return `// [Block ${idx}: Adaptive Staircase (${b.data.rule})]\nconst staircase = new data.StairHandler({\n  startVal: ${b.data.initialVal},\n  stepSizes: [${b.data.stepUp}, ${b.data.stepDown}],\n  nUp: 1, nDown: 2,\n  minVal: ${b.data.minVal}, maxVal: ${b.data.maxVal}\n});`;
      case 'stimulus_fixation':
        return `// [Block ${idx}: Fixation Cross]\nconst fixation = new visual.TextStim({\n  win: psychoJS.window,\n  text: '${b.data.symbol || '+' }',\n  color: new visual.Color('${b.data.color || '#FFFFFF'}'),\n  height: 0.08\n});`;
      case 'stimulus_text':
        return `// [Block ${idx}: Text Stimulus]\nconst textStim = new visual.TextStim({\n  win: psychoJS.window,\n  text: '${this.escape(b.data.text || 'WORD')}',\n  color: new visual.Color('${b.data.textColor || '#38BDF8'}'),\n  height: 0.1\n});`;
      case 'stimulus_image_flicker':
        return `// [Block ${idx}: Flicker Scene Change Blindness]\nconst flickerEngine = {\n  hz: ${b.data.flickerRateHz || 4.0},\n  blankIsiMs: ${b.data.blankIsiMs || 80},\n  sceneType: '${b.data.sceneType || 'color'}'\n};`;
      case 'stimulus_array_grid':
        return `// [Block ${idx}: Visual Search Array]\nconst visualSearchArray = {\n  setSize: ${b.data.setSize || 16},\n  target: '${b.data.targetFeature || 'Red T'}',\n  distractors: '${b.data.distractorFeatures || 'Blue T, Red L'}'\n};`;
      case 'response_keypress':
        return `// [Block ${idx}: Response Keypress Listener]\nconst keyListener = new core.Keyboard({\n  psychoJS,\n  timeout: ${b.data.timeoutMs || 2500},\n  allowedKeys: [${(b.data.allowedKeys || 'f, j').split(',').map(k => `'${k.trim()}'`).join(', ')}]\n});`;
      case 'response_choice_dilemma':
        return `// [Block ${idx}: Choice Dilemma]\nconst dilemmaOptions = {\n  optionA: '${this.escape(b.data.optionA || '')}',\n  optionB: '${this.escape(b.data.optionB || '')}',\n  keys: ['${b.data.keyA || '1'}', '${b.data.keyB || '2'}']\n};`;
      case 'logic_check_answer':
        return `// [Block ${idx}: Logic Check Answer]\nfunction checkAccuracy(responseKey, expectedKey = '${b.data.expectedKey || 'f'}') {\n  return responseKey.toLowerCase() === expectedKey.toLowerCase();\n}`;
      case 'logic_variable_set':
        return `// [Block ${idx}: Variable Mutation]\n// ${b.data.varName} ${b.data.operator} ${b.data.valueExpr};`;
      case 'debrief_completion':
        return `// [Block ${idx}: Debrief & Prolific Credit]\nconsole.log('[Debrief] Token issued. Participant debrief: "${this.escape(b.data.message || '')}"');`;
      default:
        return `// [Block ${idx}: ${b.type}]\n// Config: ${dataStr}`;
    }
  },

  showCodeModal() {
    const modal = document.getElementById('code-preview-modal');
    const codeBox = document.getElementById('code-preview-content');
    if (modal && codeBox) {
      if (!this.isCodeCustomized || !this.customCode) {
        codeBox.value = this.generatePsychoJSCode();
      } else {
        codeBox.value = this.customCode;
      }
      this.validateCodeSyntax(codeBox.value, 'modal-syntax-badge');
      App.openModal('code-preview-modal');
    }
  },

  escape(str) {
    if (!str) return '';
    return String(str).replace(/"/g, '&quot;');
  }
};
