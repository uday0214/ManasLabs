// Authentication Controller
const Auth = {
  currentUser: null,

  async init() {
    const token = API.getToken();
    if (token) {
      try {
        const data = await API.getMe();
        this.currentUser = data.user;
      } catch (err) {
        console.warn('Session expired or invalid, logging out');
        API.logout();
        this.currentUser = null;
      }
    }
    this.renderNav();
  },

  isLoggedIn() {
    return !!this.currentUser;
  },

  isStudent() {
    return this.currentUser && this.currentUser.role === 'student';
  },

  isResearcher() {
    return this.currentUser && this.currentUser.role === 'researcher';
  },

  renderNav() {
    const container = document.getElementById('auth-nav-container');
    const navLinksList = document.querySelector('.nav-links');

    // Adjust main navigation links based on user role
    if (navLinksList) {
      if (this.isStudent()) {
        // Participant / Student view: can only participate in tests, see history, update details
        navLinksList.innerHTML = `
          <li class="nav-item">
            <button class="nav-btn active" data-view="view-student-portal">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c3 3 9 3 12 0v-5"></path></svg>
              🎓 Student Portal
            </button>
          </li>
          <li class="nav-item">
            <button class="nav-btn" data-view="view-student-tests">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
              Available Tests
            </button>
          </li>
          <li class="nav-item">
            <button class="nav-btn" data-view="view-student-history">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              My Test History
            </button>
          </li>
          <li class="nav-item">
            <button class="nav-btn" data-view="view-student-profile">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              My Details
            </button>
          </li>
        `;
      } else {
        // Researcher or Guest view
        navLinksList.innerHTML = `
          <li class="nav-item">
            <button class="nav-btn active" data-view="view-home">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg>
              Overview
            </button>
          </li>
          <li class="nav-item">
            <button class="nav-btn" data-view="view-researcher">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              Scientist Lab
            </button>
          </li>
          <li class="nav-item">
            <button class="nav-btn" data-view="view-builder">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>
              Scratch Builder
            </button>
          </li>
          <li class="nav-item">
            <button class="nav-btn" data-view="view-participant">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
              Participant Runner
            </button>
          </li>
          <li class="nav-item">
            <button class="nav-btn" data-view="view-analytics">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
              Math Analytics
            </button>
          </li>
        `;
      }

      // Reattach listeners to newly rendered nav links
      App.attachNavListeners();
    }

    if (!container) return;

    if (this.currentUser) {
      const isStud = this.currentUser.role === 'student';
      const roleBadge = isStud
        ? `<span class="badge" style="background:rgba(6,182,212,0.15); color:var(--accent-cyan); border:1px solid rgba(6,182,212,0.3);">PARTICIPANT: ${this.currentUser.participant_id || 'ID'}</span>`
        : `<span class="badge" style="background:rgba(99,102,241,0.15); color:var(--primary-light); border:1px solid rgba(99,102,241,0.3);">RESEARCH SCIENTIST</span>`;

      container.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <div style="text-align: right;">
            <div style="font-size: 0.85rem; font-weight: 700; color: #fff;">${this.escape(this.currentUser.full_name)}</div>
            <div style="font-size: 0.72rem; margin-top: 2px;">${roleBadge}</div>
          </div>
          <button class="btn btn-secondary btn-sm" id="btn-logout" title="Sign Out">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            Sign Out
          </button>
        </div>
      `;

      document.getElementById('btn-logout')?.addEventListener('click', () => {
        API.logout();
        this.currentUser = null;
        this.renderNav();
        App.showToast('Signed out successfully', 'info');
        App.switchView('view-home');
      });
    } else {
      container.innerHTML = `
        <button class="btn btn-primary btn-sm" id="btn-open-portal-auth">
          Sign In / Register
        </button>
      `;

      document.getElementById('btn-open-portal-auth')?.addEventListener('click', () => {
        App.switchView('view-auth');
      });
    }
  },

  escape(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
};
