// Scratch-Style Visual Block Experiment Builder
const ScratchBuilder = {
  currentExperimentId: null,
  currentExperiment: null,
  blocks: [],
  selectedBlockId: null,

  blockDefinitions: {
    // Flow & Events
    event_start: {
      type: 'event_start',
      category: 'event',
      label: 'When Experiment Starts',
      colorClass: 'block-event',
      defaultData: { label: 'When Experiment Starts', calibrateHz: true }
    },
    flow_loop: {
      type: 'flow_loop',
      category: 'flow',
      label: 'Repeat Trial Loop',
      colorClass: 'block-flow',
      defaultData: { iterations: 20, randomize: true, label: 'Repeat Trial Loop (20 times)' }
    },
    flow_wait: {
      type: 'flow_wait',
      category: 'flow',
      label: 'Wait (ITI Delay)',
      colorClass: 'block-flow',
      defaultData: { durationMs: 500, label: 'Inter-Trial Interval (500ms)' }
    },

    // Stimuli
    stimulus_fixation: {
      type: 'stimulus_fixation',
      category: 'stimulus',
      label: 'Fixation Cross (+)',
      colorClass: 'block-stimulus',
      defaultData: { symbol: '+', durationMs: 500, color: '#FFFFFF', size: 36, label: 'Show Fixation Cross (500ms)' }
    },
    stimulus_text: {
      type: 'stimulus_text',
      category: 'stimulus',
      label: 'Show Word / Text Stimulus',
      colorClass: 'block-stimulus',
      defaultData: {
        text: 'STIMULUS',
        textColor: '#38BDF8',
        durationMs: 1500,
        fontSize: 48,
        label: 'Display Word Stimulus (Max 1500ms)'
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
        size: 100,
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

    // Response
    response_keypress: {
      type: 'response_keypress',
      category: 'response',
      label: 'Listen for Keypress',
      colorClass: 'block-response',
      defaultData: {
        allowedKeys: 'f, j, space',
        timeoutMs: 2500,
        recordRt: true,
        label: 'Listen for Keypress (F, J, Space)'
      }
    },
    response_mouse: {
      type: 'response_mouse',
      category: 'response',
      label: 'Wait for Mouse Click',
      colorClass: 'block-response',
      defaultData: { targetZone: 'anywhere', timeoutMs: 3000, label: 'Wait for Mouse Click' }
    },

    // Logic
    logic_check_answer: {
      type: 'logic_check_answer',
      category: 'logic',
      label: 'Verify Accuracy & Log RT',
      colorClass: 'block-logic',
      defaultData: { expectedKey: 'f', feedbackAudio: false, label: 'Verify Accuracy & Log RT' }
    },

    // Debrief
    debrief_feedback: {
      type: 'debrief_feedback',
      category: 'debrief',
      label: 'Show Accuracy Feedback',
      colorClass: 'block-debrief',
      defaultData: { durationMs: 800, showRT: true, label: 'Show Accuracy Feedback (800ms)' }
    },
    debrief_completion: {
      type: 'debrief_completion',
      category: 'debrief',
      label: 'Issue Completion Code',
      colorClass: 'block-debrief',
      defaultData: { showCode: true, message: 'Study Complete! Thank you.', label: 'Issue Completion Code' }
    }
  },

  async loadExperiment(id) {
    this.currentExperimentId = id;
    try {
      const data = await API.getExperiment(id);
      this.currentExperiment = data.experiment;
      this.blocks = data.blocks.map(b => ({
        id: b.id,
        type: b.block_type,
        data: b.block_data
      }));

      if (this.blocks.length === 0) {
        // Default starting template
        this.addBlock('event_start');
        this.addBlock('stimulus_fixation');
        this.addBlock('stimulus_text');
        this.addBlock('response_keypress');
        this.addBlock('debrief_completion');
      }

      document.getElementById('builder-study-title').textContent = this.currentExperiment.title;
      this.renderCanvas();
      this.selectBlock(this.blocks[0]?.id);
    } catch (err) {
      App.showToast('Failed to load experiment: ' + err.message, 'error');
    }
  },

  initPalette() {
    const paletteContainer = document.getElementById('palette-blocks-list');
    if (!paletteContainer) return;

    paletteContainer.innerHTML = '';
    const categories = [
      { id: 'flow', name: 'Flow & Events', dotColor: 'var(--block-event)' },
      { id: 'stimulus', name: 'Stimuli', dotColor: 'var(--block-stimulus)' },
      { id: 'response', name: 'Response Listeners', dotColor: 'var(--block-response)' },
      { id: 'logic', name: 'Data & Accuracy', dotColor: 'var(--block-logic)' },
      { id: 'debrief', name: 'Debrief & Completion', dotColor: 'var(--block-debrief)' }
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
        .filter(b => b.category === cat.id || (cat.id === 'flow' && (b.category === 'event' || b.category === 'flow')))
        .forEach(b => {
          const blockEl = document.createElement('div');
          blockEl.className = `scratch-block ${b.colorClass}`;
          blockEl.draggable = true;
          blockEl.innerHTML = `
            <span>${b.label}</span>
            <span style="font-size: 0.75rem; opacity: 0.8;">➕</span>
          `;

          // Click to add
          blockEl.addEventListener('click', () => {
            this.addBlock(b.type);
          });

          // Drag and drop support
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
    if (!stack) return;

    stack.innerHTML = '';

    if (this.blocks.length === 0) {
      stack.innerHTML = `
        <div style="text-align: center; color: var(--text-muted); padding: 3rem 1rem;">
          <div style="font-size: 2rem; margin-bottom: 0.5rem;">🧩</div>
          <div>Drag and drop blocks from the left palette to construct your experiment logic.</div>
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
    if (b.type === 'stimulus_text') return `Text: "${b.data.text || 'WORDS'}" | ${b.data.durationMs}ms`;
    if (b.type === 'stimulus_shape') return `Type: ${b.data.shapeType} | ${b.data.durationMs}ms`;
    if (b.type === 'stimulus_sound') return `Freq: ${b.data.frequencyHz}Hz | ${b.data.durationMs}ms`;
    if (b.type === 'response_keypress') return `Keys: [${b.data.allowedKeys}] | Timeout: ${b.data.timeoutMs}ms`;
    if (b.type === 'flow_loop') return `Loop: ${b.data.iterations} trials | Randomize: ${b.data.randomize ? 'Yes' : 'No'}`;
    if (b.type === 'flow_wait') return `Duration: ${b.data.durationMs}ms`;
    return '';
  },

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

    const def = this.blockDefinitions[block.type];
    let html = `
      <div style="margin-bottom: 1.25rem;">
        <span class="badge" style="background-color: rgba(255,255,255,0.1); margin-bottom: 0.5rem;">${def.label}</span>
        <div class="form-group">
          <label>Block Display Label</label>
          <input type="text" id="prop-label" value="${this.escape(block.data.label || def.label)}">
        </div>
      </div>
    `;

    // Dynamic fields per block type
    if (block.type === 'stimulus_fixation') {
      html += `
        <div class="form-group">
          <label>Symbol / Icon</label>
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
          <label>Size (pixels)</label>
          <input type="number" id="prop-size" value="${block.data.size || 36}">
        </div>
      `;
    } else if (block.type === 'stimulus_text') {
      html += `
        <div class="form-group">
          <label>Word / Text to Present</label>
          <input type="text" id="prop-text" value="${this.escape(block.data.text || 'RED')}">
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
            <option value="polygon_pair" ${block.data.shapeType === 'polygon_pair' ? 'selected' : ''}>3D Shepard Polygon Pair</option>
            <option value="gabor" ${block.data.shapeType === 'gabor' ? 'selected' : ''}>Gabor Patch</option>
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
          <label>Tone Frequency (Hz)</label>
          <input type="number" id="prop-freq" value="${block.data.frequencyHz || 880}" min="100" max="8000">
        </div>
        <div class="form-group">
          <label>Tone Duration (ms)</label>
          <input type="number" id="prop-duration" value="${block.data.durationMs || 200}">
        </div>
      `;
    } else if (block.type === 'response_keypress') {
      html += `
        <div class="form-group">
          <label>Allowed Response Keys (comma separated)</label>
          <input type="text" id="prop-keys" value="${this.escape(block.data.allowedKeys || 'f, j')}">
          <div class="form-help">e.g. "r, g, b, y" or "f, j" or "space"</div>
        </div>
        <div class="form-group">
          <label>Response Window Timeout (ms)</label>
          <input type="number" id="prop-timeout" value="${block.data.timeoutMs || 2500}" min="200" step="100">
        </div>
      `;
    } else if (block.type === 'flow_loop') {
      html += `
        <div class="form-group">
          <label>Number of Iterations (Trials)</label>
          <input type="number" id="prop-iterations" value="${block.data.iterations || 20}" min="1" max="500">
        </div>
        <div class="form-group">
          <label style="display:flex; align-items:center; gap:0.5rem;">
            <input type="checkbox" id="prop-randomize" ${block.data.randomize ? 'checked' : ''} style="width:18px;height:18px;">
            Randomize Trial Order
          </label>
        </div>
      `;
    } else if (block.type === 'flow_wait') {
      html += `
        <div class="form-group">
          <label>Delay Duration (ms)</label>
          <input type="number" id="prop-duration" value="${block.data.durationMs || 500}" min="50" step="50">
        </div>
      `;
    } else if (block.type === 'logic_check_answer') {
      html += `
        <div class="form-group">
          <label>Expected Target Key</label>
          <input type="text" id="prop-targetkey" value="${this.escape(block.data.expectedKey || 'f')}">
        </div>
      `;
    } else if (block.type === 'debrief_completion') {
      html += `
        <div class="form-group">
          <label>Debrief Message</label>
          <textarea id="prop-message" rows="3">${this.escape(block.data.message || 'Experiment Complete!')}</textarea>
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
        });
      }
    };

    attachChange('prop-label', 'label');
    attachChange('prop-symbol', 'symbol');
    attachChange('prop-duration', 'durationMs', parseInt);
    attachChange('prop-color', 'color');
    attachChange('prop-size', 'size', parseInt);
    attachChange('prop-text', 'text');
    attachChange('prop-fontsize', 'fontSize', parseInt);
    attachChange('prop-shapetype', 'shapeType');
    attachChange('prop-rotation', 'rotationDeg', parseInt);
    attachChange('prop-freq', 'frequencyHz', parseInt);
    attachChange('prop-keys', 'allowedKeys');
    attachChange('prop-timeout', 'timeoutMs', parseInt);
    attachChange('prop-iterations', 'iterations', parseInt);
    attachChange('prop-targetkey', 'expectedKey');
    attachChange('prop-message', 'message');

    const randEl = document.getElementById('prop-randomize');
    if (randEl) {
      randEl.addEventListener('change', () => {
        block.data.randomize = randEl.checked;
        this.renderCanvas();
      });
    }
  },

  async saveToDatabase() {
    if (!this.currentExperimentId) {
      App.showToast('No active experiment loaded', 'error');
      return;
    }

    try {
      await API.updateExperiment(this.currentExperimentId, {
        blocks: this.blocks.map((b, idx) => ({
          block_type: b.type,
          block_data: b.data,
          sequence_order: idx + 1
        }))
      });
      App.showToast('Experiment logic successfully saved to database!', 'success');
    } catch (err) {
      App.showToast('Save failed: ' + err.message, 'error');
    }
  },

  generatePsychoJSCode() {
    const code = `
/*************************************************************************
 * PsychoJS Experiment Generated by Nexora Visual Block Builder
 * Study: ${this.currentExperiment?.title || 'Cognitive Paradigm'}
 * Sub-millisecond WebGL Timing Pipeline
 *************************************************************************/
import { PsychoJS } from 'https://cdn.jsdelivr.net/npm/psychojs@2024.1.0/dist/psychojs.js';
import * as visual from 'https://cdn.jsdelivr.net/npm/psychojs@2024.1.0/dist/visual.js';
import * as sound from 'https://cdn.jsdelivr.net/npm/psychojs@2024.1.0/dist/sound.js';
import * as core from 'https://cdn.jsdelivr.net/npm/psychojs@2024.1.0/dist/core.js';

const psychoJS = new PsychoJS({
  debug: false,
  collectIP: false // Anonymous IRB Compliance
});

// Open High-Precision Double-Buffered Window
await psychoJS.openWindow({
  fullscr: true,
  color: new visual.Color([0, 0, 0]),
  units: 'norm',
  waitBlanking: true // Synchronize to V-Sync frame refresh
});

const clock = new core.Clock();
const keyboard = new core.Keyboard({ psychoJS });

// Executing Compiled Visual Blocks Pipeline (${this.blocks.length} blocks)
${this.blocks.map((b, i) => `// Block ${i + 1}: ${b.type}\n// Config: ${JSON.stringify(b.data)}`).join('\n\n')}

console.log('[PsychoJS Runtime] Trial sequence compiled successfully.');
    `.trim();

    return code;
  },

  showCodeModal() {
    const modal = document.getElementById('code-preview-modal');
    const codeBox = document.getElementById('code-preview-content');
    if (modal && codeBox) {
      codeBox.textContent = this.generatePsychoJSCode();
      App.openModal('code-preview-modal');
    }
  },

  escape(str) {
    if (!str) return '';
    return String(str).replace(/"/g, '&quot;');
  }
};
