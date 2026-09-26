// Centralized API Client for Nexora
const API = {
  getToken() {
    return localStorage.getItem('nexora_token');
  },

  setToken(token) {
    if (token) localStorage.setItem('nexora_token', token);
    else localStorage.removeItem('nexora_token');
  },

  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(endpoint, { ...options, headers });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      return data;
    } catch (err) {
      console.error(`[API Error] ${endpoint}:`, err);
      throw err;
    }
  },

  // Auth
  async login(email, password) {
    const data = await this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (data.token) this.setToken(data.token);
    return data;
  },

  async register(full_name, email, password, institution) {
    const data = await this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ full_name, email, password, institution }),
    });
    if (data.token) this.setToken(data.token);
    return data;
  },

  // Student Auth
  async studentLogin(participant_id, password) {
    const data = await this.request('/api/auth/student/login', {
      method: 'POST',
      body: JSON.stringify({ participant_id, password }),
    });
    if (data.token) this.setToken(data.token);
    return data;
  },

  async studentRegister(payload) {
    const data = await this.request('/api/auth/student/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (data.token) this.setToken(data.token);
    return data;
  },

  async getStudentProfile() {
    return this.request('/api/student/profile');
  },

  async updateStudentProfile(payload) {
    return this.request('/api/student/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async getStudentHistory() {
    return this.request('/api/student/history');
  },

  async getAvailableTests() {
    return this.request('/api/student/available-tests');
  },

  async getMe() {
    return this.request('/api/auth/me');
  },

  logout() {
    this.setToken(null);
  },

  // Experiments
  async getExperiments() {
    return this.request('/api/experiments');
  },

  async getExperiment(id) {
    return this.request(`/api/experiments/${id}`);
  },

  async createExperiment(payload) {
    return this.request('/api/experiments', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateExperiment(id, payload) {
    return this.request(`/api/experiments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async deleteExperiment(id) {
    return this.request(`/api/experiments/${id}`, {
      method: 'DELETE',
    });
  },

  async getPublicExperiment(slug) {
    return this.request(`/api/experiments/share/${slug}`);
  },

  // Sessions & Telemetry
  async startSession(experimentId, calibration) {
    return this.request('/api/sessions/start', {
      method: 'POST',
      body: JSON.stringify({
        experiment_id: experimentId,
        screen_refresh_rate: calibration.screen_refresh_rate,
        user_agent: navigator.userAgent,
        viewport_resolution: `${window.innerWidth}x${window.innerHeight}`,
      }),
    });
  },

  async recordTrials(sessionId, trials) {
    return this.request(`/api/sessions/${sessionId}/trials`, {
      method: 'POST',
      body: JSON.stringify({ trials }),
    });
  },

  async completeSession(sessionId) {
    return this.request(`/api/sessions/${sessionId}/complete`, {
      method: 'POST',
    });
  },

  // Analytics
  async getDatasets() {
    return this.request('/api/analytics/datasets');
  },

  async getDataset(slug) {
    return this.request(`/api/analytics/dataset/${slug}`);
  },

  async getExperimentAnalytics(id) {
    return this.request(`/api/analytics/experiment/${id}`);
  },

  async getSessionTrials(sessionId) {
    return this.request(`/api/sessions/${sessionId}/trials`);
  },
};

