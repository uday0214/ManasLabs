// Main Application Controller & View Router
const App = {
  activeView: 'view-home',

  async init() {
    console.log('[Nexora] Initializing Web Platform...');

    // Initialize Auth state
    await Auth.init();

    // Initialize Scratch Builder palette
    ScratchBuilder.initPalette();

    // Initialize Analytics engine
    await Analytics.init();

    // Attach navigation listeners
    this.attachNavListeners();

    // Set up modal closures
    document.querySelectorAll('.modal-close').forEach(btn => {
      btn.addEventListener('click', () => {
        const modal = btn.closest('.modal-overlay');
        if (modal) modal.style.display = 'none';
      });
    });

    // Close modals when clicking overlay background
    document.querySelectorAll('.modal-overlay').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
      });
    });

    // Auth forms
    this.setupAuthForms();

    // Student Profile Form
    const studentProfileForm = document.getElementById('form-student-profile');
    if (studentProfileForm) {
      studentProfileForm.addEventListener('submit', (e) => StudentPortal.handleProfileUpdate(e));
    }

    // Create experiment form
    this.setupExperimentForms();

    // If logged in as student on load, initialize student portal
    if (Auth.isStudent()) {
      this.switchView('view-student-portal');
      StudentPortal.init();
    }

    // Check if participant URL hash is present (e.g., #run/stroop-task-2026)
    this.handleRoute();
    window.addEventListener('hashchange', () => this.handleRoute());
  },

  attachNavListeners() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.onclick = () => {
        const viewId = btn.dataset.view;

        // Role guards
        if (Auth.isStudent()) {
          if (['view-researcher', 'view-builder', 'view-analytics'].includes(viewId)) {
            this.showToast('Participant accounts have access only to tests, test history, and personal details.', 'info');
            this.switchView('view-student-portal');
            return;
          }

          if (viewId === 'view-student-tests') {
            this.switchView('view-student-portal');
            document.getElementById('student-available-tests-section')?.scrollIntoView({ behavior: 'smooth' });
            return;
          }

          if (viewId === 'view-student-history') {
            this.switchView('view-student-portal');
            document.getElementById('student-history-section')?.scrollIntoView({ behavior: 'smooth' });
            return;
          }

          if (viewId === 'view-student-profile') {
            this.switchView('view-student-portal');
            document.getElementById('student-profile-section')?.scrollIntoView({ behavior: 'smooth' });
            return;
          }
        }

        if (viewId === 'view-researcher' && !Auth.isLoggedIn()) {
          this.showToast('Please sign in or use Demo Scientist to enter researcher portal', 'info');
          this.openModal('auth-modal');
          return;
        }

        this.switchView(viewId);
      };
    });
  },

  handleRoute() {
    const hash = window.location.hash;
    if (hash.startsWith('#run/')) {
      const slug = hash.replace('#run/', '');
      this.switchView('view-participant');
      PsychoJSRunner.startParticipantSession(slug);
    }
  },

  switchView(viewId) {
    document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

    const targetSec = document.getElementById(viewId);
    if (targetSec) targetSec.classList.add('active');

    const targetBtn = document.querySelector(`.nav-btn[dataset-view="${viewId}"], .nav-btn[data-view="${viewId}"]`);
    if (targetBtn) targetBtn.classList.add('active');

    this.activeView = viewId;
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // View specific activations
    if (viewId === 'view-researcher') {
      this.loadResearcherDashboard();
    } else if (viewId === 'view-participant' && !window.location.hash.startsWith('#run/')) {
      this.loadParticipantHome();
    } else if (viewId === 'view-student-portal') {
      StudentPortal.init();
    }
  },

  async loadResearcherDashboard() {
    const tableBody = document.getElementById('experiments-table-body');
    if (!tableBody) return;

    tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 2rem;">Loading studies...</td></tr>`;

    try {
      const res = await API.getExperiments();
      const exps = res.experiments;

      document.getElementById('stat-total-studies').textContent = exps.length;
      const totalParticipants = exps.reduce((acc, e) => acc + (e.completed_participants || 0), 0);
      document.getElementById('stat-total-subjects').textContent = totalParticipants;

      if (exps.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 2rem; color: var(--text-muted);">No studies created yet. Click "+ Create Experiment" above.</td></tr>`;
        return;
      }

      tableBody.innerHTML = '';
      exps.forEach(e => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>
            <div style="font-weight: 800; color: var(--text-primary); font-size: 1.05rem;">${this.escape(e.title)}</div>
            <div style="font-size: 0.82rem; color: var(--text-secondary); margin-top: 2px;">${e.description ? this.escape(e.description.slice(0, 90)) + '...' : 'No description'}</div>
          </td>
          <td>
            <span class="badge ${e.status === 'active' ? 'badge-active' : 'badge-draft'}">
              ${e.status.toUpperCase()}
            </span>
          </td>
          <td>
            <strong>${e.completed_participants || 0}</strong> completed
          </td>
          <td>
            <span style="font-family: var(--font-mono); font-size: 0.8rem; color: var(--accent-cyan);">
              /run/${e.share_slug}
            </span>
            <button class="btn btn-secondary btn-sm" style="margin-left: 0.4rem; padding: 0.15rem 0.4rem;" onclick="App.copyShareLink('${e.share_slug}')" title="Copy Participant Link">📋</button>
          </td>
          <td style="text-align: right;">
            <button class="btn btn-secondary btn-sm" onclick="App.openInBuilder('${e.id}')">🧩 Blocks</button>
            <button class="btn btn-accent btn-sm" onclick="App.launchParticipantStudy('${e.share_slug}')">▶ Run</button>
            <button class="btn btn-secondary btn-sm" onclick="App.viewExperimentAnalytics('${e.id}')">📊 Data</button>
            <button class="btn btn-danger btn-sm" onclick="App.deleteExperiment('${e.id}')">🗑</button>
          </td>
        `;
        tableBody.appendChild(tr);
      });
    } catch (err) {
      tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color: var(--accent-rose); padding: 2rem;">Error: ${err.message}</td></tr>`;
    }
  },

  async loadParticipantHome() {
    const container = document.getElementById('participant-portal-card');
    if (!container) return;

    container.innerHTML = `
      <div style="max-width: 820px; margin: 0 auto; text-align: center; padding: 1.5rem 0;">
        <span class="hero-pill">Cognitive Science Volunteer Portal</span>
        <h2 style="font-size: 2.2rem; font-weight: 800; margin: 0.5rem 0 1rem; color: var(--text-primary); letter-spacing: -0.02em;">
          Participate in Behavioral Research
        </h2>
        <p style="color: var(--text-secondary); margin-bottom: 2rem; line-height: 1.6; max-width: 680px; margin-left: auto; margin-right: auto; font-size: 1.05rem;">
          Contribute to cutting-edge cognitive psychology studies from your web browser. 
          All experiments adhere to rigorous IRB ethical guidelines and run on our high-precision PsychoJS engine.
        </p>

        <div class="liquid-glass" style="padding: 1.75rem 2rem; text-align: left; margin-bottom: 2rem; border-radius: var(--radius-xl);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 0.75rem;">
            <div>
              <h4 style="margin: 0; color: var(--text-primary); font-size: 1.25rem; font-weight: 800;">
                All Available Cognitive Science Experiments
              </h4>
              <p style="margin: 0.2rem 0 0 0; font-size: 0.85rem; color: var(--text-secondary);">
                22 standardized paradigms calibrated for millisecond V-Sync execution
              </p>
            </div>
            <span class="badge badge-active" style="padding: 0.4rem 0.85rem; font-size: 0.75rem;">
              ⚡ 22 ACTIVE STUDIES
            </span>
          </div>
          
          <div id="participant-studies-list" style="display: flex; flex-direction: column; gap: 0.85rem; max-height: 540px; overflow-y: auto; padding-right: 0.5rem;">
            <div style="text-align: center; padding: 3rem; color: var(--text-muted);">
              Loading experimental paradigms...
            </div>
          </div>
        </div>

        <div style="font-size: 0.85rem; color: var(--text-muted);">
          🔒 Anonymous & Encrypted &bull; No tracking cookies &bull; Sub-millisecond V-Sync precision &bull; Instant Prolific / MTurk credit tokens
        </div>
      </div>
    `;

    try {
      const res = await API.getAvailableTests();
      const listEl = document.getElementById('participant-studies-list');
      if (!listEl) return;

      if (!res.experiments || res.experiments.length === 0) {
        listEl.innerHTML = `<div style="text-align: center; padding: 2rem; color: var(--text-muted);">No active studies found.</div>`;
        return;
      }

      listEl.innerHTML = '';
      res.experiments.forEach((e, idx) => {
        const item = document.createElement('div');
        item.style.cssText = 'background: rgba(255, 255, 255, 0.75); border: 1px solid rgba(226, 232, 240, 0.9); border-radius: var(--radius-md); padding: 1.1rem 1.35rem; display: flex; justify-content: space-between; align-items: center; gap: 1.25rem; transition: transform 0.15s, box-shadow 0.15s, border-color 0.15s;';
        item.onmouseenter = () => {
          item.style.transform = 'translateY(-1px)';
          item.style.borderColor = 'var(--primary)';
          item.style.boxShadow = '0 6px 16px -4px rgba(15, 23, 42, 0.08)';
        };
        item.onmouseleave = () => {
          item.style.transform = 'translateY(0)';
          item.style.borderColor = 'rgba(226, 232, 240, 0.9)';
          item.style.boxShadow = 'none';
        };

        item.innerHTML = `
          <div style="flex-grow: 1;">
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.35rem;">
              <span class="badge" style="background: rgba(99, 102, 241, 0.12); color: var(--primary); font-size: 0.7rem; font-weight: 800;">
                #${idx + 1}
              </span>
              <span style="font-size: 0.78rem; font-weight: 600; color: var(--text-muted);">
                Est. 2-4 mins
              </span>
            </div>
            <div style="font-weight: 800; color: var(--text-primary); font-size: 1.05rem;">
              ${this.escape(e.title)}
            </div>
            <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.3rem; line-height: 1.5;">
              ${this.escape(e.description || '')}
            </div>
          </div>
          <div>
            <button class="btn btn-primary" onclick="App.launchParticipantStudy('${e.share_slug}')" style="white-space: nowrap; font-weight: 700; padding: 0.65rem 1.1rem;">
              ▶ Run Test &rarr;
            </button>
          </div>
        `;
        listEl.appendChild(item);
      });
    } catch (err) {
      console.warn('Error loading participant studies:', err);
    }
  },

  launchParticipantStudy(slug) {
    window.location.hash = `#run/${slug}`;
    this.switchView('view-participant');
    PsychoJSRunner.startParticipantSession(slug);
  },

  openInBuilder(expId) {
    this.switchView('view-builder');
    ScratchBuilder.loadExperiment(expId);
  },

  copyShareLink(slug) {
    const url = `${window.location.origin}/#run/${slug}`;
    navigator.clipboard.writeText(url).then(() => {
      this.showToast('Copied participant study URL to clipboard!', 'success');
    }).catch(() => {
      prompt('Copy study URL:', url);
    });
  },

  async deleteExperiment(id) {
    if (!confirm('Are you sure you want to delete this study and its data?')) return;
    try {
      await API.deleteExperiment(id);
      this.showToast('Study deleted', 'info');
      this.loadResearcherDashboard();
    } catch (err) {
      this.showToast('Delete failed: ' + err.message, 'error');
    }
  },

  viewExperimentAnalytics(id) {
    this.switchView('view-analytics');
    API.getExperimentAnalytics(id).then(res => {
      if (res.hasData) {
        Analytics.renderMetricCards({
          meanRt: `${res.stats.meanRt} ms`,
          medianRt: `${res.stats.medianRt} ms`,
          trimmedMean: `${res.stats.trimmedMean} ms`,
          stdev: `±${res.stats.stdev} ms`,
          accuracy: `${res.stats.accuracy}%`,
          effectSize: `Live Sample`
        });
        const rts = res.rawTrials.map(t => t.response_time_ms);
        Analytics.renderHistogram('chart-rt-dist', rts, `Live Experiment RTs (N=${res.participants})`);
      } else {
        this.showToast(res.message, 'info');
      }
    });
  },

  setupAuthForms() {
    const tabs = ['tab-auth-student-login', 'tab-auth-scientist-login', 'tab-auth-student-register', 'tab-auth-scientist-register'];
    const forms = ['form-student-login', 'form-login', 'form-student-register', 'form-register'];

    tabs.forEach((tabId, idx) => {
      const tabEl = document.getElementById(tabId);
      tabEl?.addEventListener('click', () => {
        tabs.forEach(t => document.getElementById(t)?.classList.remove('active'));
        forms.forEach(f => {
          const formEl = document.getElementById(f);
          if (formEl) formEl.style.display = 'none';
        });

        tabEl.classList.add('active');
        const activeForm = document.getElementById(forms[idx]);
        if (activeForm) activeForm.style.display = 'block';
      });
    });

    // 1. Student / Participant Login
    const formStudentLogin = document.getElementById('form-student-login');
    formStudentLogin?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const participantId = document.getElementById('student-login-id').value;
      const pass = document.getElementById('student-login-password').value;

      try {
        const res = await API.studentLogin(participantId, pass);
        Auth.currentUser = res.user;
        Auth.renderNav();
        this.closeModal('auth-modal');
        this.showToast(`Welcome back, ${res.user.full_name}! (ID: ${res.user.participant_id})`, 'success');
        this.switchView('view-student-portal');
        StudentPortal.init();
      } catch (err) {
        this.showToast(err.message, 'error');
      }
    });

    // 2. Student / Participant Register
    const formStudentRegister = document.getElementById('form-student-register');
    formStudentRegister?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fullName = document.getElementById('student-reg-name').value;
      const participantId = document.getElementById('student-reg-id').value;
      const pass = document.getElementById('student-reg-password').value;
      const institution = document.getElementById('student-reg-institution').value;
      const age = document.getElementById('student-reg-age').value;
      const gender = document.getElementById('student-reg-gender').value;
      const handedness = document.getElementById('student-reg-handedness').value;
      const vision = document.getElementById('student-reg-vision').value;

      try {
        const res = await API.studentRegister({
          full_name: fullName,
          participant_id: participantId,
          password: pass,
          institution,
          age,
          gender,
          handedness,
          vision_correction: vision
        });
        Auth.currentUser = res.user;
        Auth.renderNav();
        this.closeModal('auth-modal');
        this.showToast(`Participant account registered! ID: ${res.user.participant_id}`, 'success');
        this.switchView('view-student-portal');
        StudentPortal.init();
      } catch (err) {
        this.showToast(err.message, 'error');
      }
    });

    // 3. Scientist Login
    const formLogin = document.getElementById('form-login');
    formLogin?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value;
      const pass = document.getElementById('login-password').value;

      try {
        const res = await API.login(email, pass);
        Auth.currentUser = res.user;
        Auth.renderNav();
        this.closeModal('auth-modal');
        this.showToast(`Welcome back, ${res.user.full_name}!`, 'success');
        this.switchView('view-researcher');
      } catch (err) {
        this.showToast(err.message, 'error');
      }
    });

    // 4. Scientist Register
    const formRegister = document.getElementById('form-register');
    formRegister?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('reg-name').value;
      const email = document.getElementById('reg-email').value;
      const pass = document.getElementById('reg-password').value;
      const inst = document.getElementById('reg-institution').value;

      try {
        const res = await API.register(name, email, pass, inst);
        Auth.currentUser = res.user;
        Auth.renderNav();
        this.closeModal('auth-modal');
        this.showToast('Scientist account registered successfully!', 'success');
        this.switchView('view-researcher');
      } catch (err) {
        this.showToast(err.message, 'error');
      }
    });

    // Portal Gateway Dedicated Forms (view-auth)
    const portalStudentLogin = document.getElementById('portal-form-student-login');
    portalStudentLogin?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('portal-student-id').value;
      const pass = document.getElementById('portal-student-pass').value;
      try {
        const res = await API.studentLogin(id, pass);
        Auth.currentUser = res.user;
        Auth.renderNav();
        this.showToast(`Welcome back, ${res.user.full_name}! (ID: ${res.user.participant_id})`, 'success');
        this.switchView('view-student-portal');
        StudentPortal.init();
      } catch (err) {
        this.showToast(err.message, 'error');
      }
    });

    const portalScientistLogin = document.getElementById('portal-form-scientist-login');
    portalScientistLogin?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('portal-scientist-email').value;
      const pass = document.getElementById('portal-scientist-pass').value;
      try {
        const res = await API.login(email, pass);
        Auth.currentUser = res.user;
        Auth.renderNav();
        this.showToast(`Welcome back, ${res.user.full_name}!`, 'success');
        this.switchView('view-researcher');
      } catch (err) {
        this.showToast(err.message, 'error');
      }
    });

    const portalStudentReg = document.getElementById('portal-form-student-register');
    portalStudentReg?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('portal-reg-student-name').value;
      const id = document.getElementById('portal-reg-student-id').value;
      const pass = document.getElementById('portal-reg-student-pass').value;
      const inst = document.getElementById('portal-reg-student-inst').value;
      const age = document.getElementById('portal-reg-student-age').value;
      const gender = document.getElementById('portal-reg-student-gender').value;
      const hand = document.getElementById('portal-reg-student-hand').value;
      const vision = document.getElementById('portal-reg-student-vision').value;

      try {
        const res = await API.studentRegister({
          full_name: name,
          participant_id: id,
          password: pass,
          institution: inst,
          age,
          gender,
          handedness: hand,
          vision_correction: vision
        });
        Auth.currentUser = res.user;
        Auth.renderNav();
        this.showToast(`Participant account created! ID: ${res.user.participant_id}`, 'success');
        this.switchView('view-student-portal');
        StudentPortal.init();
      } catch (err) {
        this.showToast(err.message, 'error');
      }
    });

    const portalScientistReg = document.getElementById('portal-form-scientist-register');
    portalScientistReg?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('portal-reg-sci-name').value;
      const email = document.getElementById('portal-reg-sci-email').value;
      const pass = document.getElementById('portal-reg-sci-pass').value;
      const inst = document.getElementById('portal-reg-sci-inst').value;

      try {
        const res = await API.register(name, email, pass, inst);
        Auth.currentUser = res.user;
        Auth.renderNav();
        this.showToast('Scientist account registered successfully!', 'success');
        this.switchView('view-researcher');
      } catch (err) {
        this.showToast(err.message, 'error');
      }
    });
  },

  async quickDemoScientist() {
    try {
      const res = await API.login('researcher@nexora.edu', 'password123');
      Auth.currentUser = res.user;
      Auth.renderNav();
      this.showToast(`Logged in as ${res.user.full_name} (Research Scientist)!`, 'success');
      this.switchView('view-researcher');
    } catch (err) {
      this.showToast('Demo login error: ' + err.message, 'error');
    }
  },

  async quickDemoStudent() {
    try {
      const res = await API.studentLogin('STUDENT_001', 'password123');
      Auth.currentUser = res.user;
      Auth.renderNav();
      this.showToast(`Welcome back, ${res.user.full_name}! (ID: ${res.user.participant_id})`, 'success');
      this.switchView('view-student-portal');
      StudentPortal.init();
    } catch (err) {
      this.showToast('Demo student login error: ' + err.message, 'error');
    }
  },

  showAuthTab(type) {
    const selector = document.getElementById('auth-portal-selection');
    const formContainer = document.getElementById('auth-forms-container');
    const headerTitle = document.getElementById('auth-gateway-title');
    const headerSubtitle = document.getElementById('auth-gateway-subtitle');

    if (selector) selector.style.display = 'none';
    if (formContainer) formContainer.style.display = 'block';

    const forms = ['portal-form-student-login', 'portal-form-scientist-login', 'portal-form-student-register', 'portal-form-scientist-register'];
    forms.forEach(f => {
      const el = document.getElementById(f);
      if (el) el.style.display = 'none';
    });

    if (type === 'student-login') {
      document.getElementById('portal-form-student-login').style.display = 'block';
      if (headerTitle) headerTitle.textContent = 'Participant / Student Sign In';
      if (headerSubtitle) headerSubtitle.textContent = 'Enter your Participant ID and password to access tests and your record history';
    } else if (type === 'scientist-login') {
      document.getElementById('portal-form-scientist-login').style.display = 'block';
      if (headerTitle) headerTitle.textContent = 'Research Scientist Sign In';
      if (headerSubtitle) headerSubtitle.textContent = 'Sign in with your academic credentials to manage studies and view analytics';
    } else if (type === 'student-register') {
      document.getElementById('portal-form-student-register').style.display = 'block';
      if (headerTitle) headerTitle.textContent = 'Register Participant Account';
      if (headerSubtitle) headerSubtitle.textContent = 'Create a secure anonymous participant ID for behavioral studies';
    } else if (type === 'scientist-register') {
      document.getElementById('portal-form-scientist-register').style.display = 'block';
      if (headerTitle) headerTitle.textContent = 'Register New Research Lab';
      if (headerSubtitle) headerSubtitle.textContent = 'Join the platform to deploy online experiments and analyze cognitive data';
    }

    formContainer?.scrollIntoView({ behavior: 'smooth' });
  },

  resetAuthPortal() {
    const selector = document.getElementById('auth-portal-selection');
    const formContainer = document.getElementById('auth-forms-container');
    const headerTitle = document.getElementById('auth-gateway-title');
    const headerSubtitle = document.getElementById('auth-gateway-subtitle');

    if (selector) selector.style.display = 'grid';
    if (formContainer) formContainer.style.display = 'none';
    if (headerTitle) headerTitle.textContent = 'Choose Your Workspace';
    if (headerSubtitle) headerSubtitle.textContent = 'Select whether you are conducting experiments or participating in studies';
  },

  setupExperimentForms() {
    const btnCreate = document.getElementById('btn-open-create-modal');
    btnCreate?.addEventListener('click', () => {
      this.openModal('create-experiment-modal');
    });

    const formCreate = document.getElementById('form-create-experiment');
    formCreate?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = document.getElementById('exp-title').value;
      const desc = document.getElementById('exp-desc').value;

      try {
        const res = await API.createExperiment({
          title,
          description: desc,
          blocks: [
            { type: 'event_start', data: { label: 'Start Trial' } },
            { type: 'stimulus_fixation', data: { durationMs: 500, symbol: '+' } },
            { type: 'stimulus_text', data: { text: 'TARGET', durationMs: 1500 } },
            { type: 'response_keypress', data: { allowedKeys: 'f, j', timeoutMs: 2500 } },
            { type: 'debrief_completion', data: { message: 'Complete!' } }
          ]
        });

        this.closeModal('create-experiment-modal');
        this.showToast('Study created!', 'success');
        this.openInBuilder(res.id);
      } catch (err) {
        this.showToast('Creation error: ' + err.message, 'error');
      }
    });
  },

  openModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = 'flex';
  },

  closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = 'none';
  },

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 250);
    }, 3500);
  },

  escape(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
};

window.addEventListener('DOMContentLoaded', () => {
  App.init();
});
