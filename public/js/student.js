// Student / Participant Portal Controller
const StudentPortal = {
  profile: null,
  history: [],
  availableTests: [],

  async init() {
    if (!Auth.isLoggedIn() || Auth.currentUser?.role !== "student") {
      return;
    }
    await this.loadAll();
  },

  async loadAll() {
    try {
      await Promise.all([
        this.loadProfile(),
        this.loadHistory(),
        this.loadAvailableTests(),
      ]);
      this.renderDashboard();
    } catch (err) {
      console.error("[StudentPortal Load Error]", err);
      App.showToast(
        "Failed to load student dashboard: " + err.message,
        "error",
      );
    }
  },

  async loadProfile() {
    const data = await API.getStudentProfile();
    this.profile = data.profile;
  },

  async loadHistory() {
    const data = await API.getStudentHistory();
    this.history = data.history || [];
  },

  async loadAvailableTests() {
    const data = await API.getAvailableTests();
    this.availableTests = data.experiments || [];
  },

  renderDashboard() {
    if (!this.profile) return;

    // Header & Badge
    const nameEl = document.getElementById("student-greeting-name");
    const idEl = document.getElementById("student-participant-id-badge");
    if (nameEl) nameEl.textContent = this.profile.full_name || "Participant";
    if (idEl) idEl.textContent = `ID: ${this.profile.participant_id}`;

    // Compute Summary KPIs
    const completedSessions = this.history.filter(
      (s) => s.status === "completed",
    );
    const totalCompleted = completedSessions.length;

    let avgAcc = 0;
    let avgRt = 0;
    if (totalCompleted > 0) {
      const accValues = completedSessions
        .map((s) => s.score_accuracy || 0)
        .filter((v) => v > 0);
      avgAcc =
        accValues.length > 0
          ? (accValues.reduce((a, b) => a + b, 0) / accValues.length).toFixed(1)
          : "100.0";

      const rtValues = completedSessions
        .map((s) => s.mean_rt_ms || 0)
        .filter((v) => v > 0);
      avgRt =
        rtValues.length > 0
          ? Math.round(rtValues.reduce((a, b) => a + b, 0) / rtValues.length)
          : "520";
    }

    const statTests = document.getElementById("student-stat-tests-completed");
    const statAcc = document.getElementById("student-stat-avg-accuracy");
    const statRt = document.getElementById("student-stat-avg-rt");

    if (statTests) statTests.textContent = totalCompleted;
    if (statAcc) statAcc.textContent = totalCompleted > 0 ? `${avgAcc}%` : "--";
    if (statRt) statRt.textContent = totalCompleted > 0 ? `${avgRt} ms` : "--";

    // Render Subsections
    this.renderAvailableTests();
    this.renderHistoryTable();
    this.populateProfileForm();
  },

  renderAvailableTests() {
    const container = document.getElementById("student-available-tests-list");
    if (!container) return;

    if (this.availableTests.length === 0) {
      container.innerHTML = `
        <div style="color: var(--text-muted); padding: 1.5rem; text-align: center;">
          No active tests currently assigned. Please check back later.
        </div>
      `;
      return;
    }

    container.innerHTML = "";
    this.availableTests.forEach((exp) => {
      const card = document.createElement("div");
      card.className = "feature-card";
      card.style.padding = "1.25rem 1.5rem";
      card.style.display = "flex";
      card.style.justifyContent = "space-between";
      card.style.alignItems = "center";
      card.style.marginBottom = "1rem";
      card.style.background = "var(--grad-gray-card)";
      card.style.border = "1px solid var(--border-distinct)";
      card.style.boxShadow = "var(--shadow-sm)";
      card.style.borderRadius = "var(--radius-lg)";

      card.innerHTML = `
        <div style="max-width: 65%;">
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
            <span class="badge badge-active">OPEN FOR PARTICIPATION</span>
            <span style="font-size: 0.78rem; color: var(--text-muted);">Est. 3-5 mins</span>
          </div>
          <h4 style="font-size: 1.15rem; font-weight: 800; color: var(--text-primary); margin-bottom: 0.35rem;">
            ${this.escape(exp.title)}
          </h4>
          <p style="font-size: 0.88rem; color: var(--text-secondary); line-height: 1.45;">
            ${exp.description ? this.escape(exp.description.slice(0, 110)) + "..." : "Millisecond-calibrated behavioral study."}
          </p>
          <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 0.4rem;">
            Investigator: <strong>${this.escape(exp.researcher_name || "Research Lab")}</strong> (${this.escape(exp.institution || "Cognitive Science")})
          </div>
        </div>

        <div>
          <button class="btn btn-primary" onclick="StudentPortal.takeTest('${exp.share_slug}')">
            ▶ Take Test
          </button>
        </div>
      `;

      container.appendChild(card);
    });
  },

  renderHistoryTable() {
    const tableBody = document.getElementById("student-history-table-body");
    if (!tableBody) return;

    if (this.history.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-muted);">
            You haven't completed any tests yet. Click "Take Test" above to participate!
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = "";
    this.history.forEach((item) => {
      const tr = document.createElement("tr");
      const dateFormatted = item.started_at
        ? new Date(item.started_at).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "--";

      const isCompleted = item.status === "completed";
      const statusBadge = isCompleted
        ? `<span class="badge badge-active">COMPLETED</span>`
        : `<span class="badge badge-draft">IN PROGRESS</span>`;

      tr.innerHTML = `
        <td>
          <div style="font-weight: 700; color: var(--text-primary); font-size: 0.95rem;">${this.escape(item.experiment_title)}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted); font-family: var(--font-mono);">${item.participant_token}</div>
        </td>
        <td style="font-size: 0.85rem; color: var(--text-secondary);">
          ${dateFormatted}
        </td>
        <td>
          ${statusBadge}
        </td>
        <td>
          <span style="font-family: var(--font-mono); font-size: 0.85rem; color: var(--accent-green); background: rgba(16,185,129,0.1); padding: 0.2rem 0.5rem; border-radius: 4px; border: 1px dashed rgba(16,185,129,0.4);">
            ${item.completion_code || "PENDING"}
          </span>
          ${item.completion_code ? `<button class="btn btn-secondary btn-sm" style="margin-left: 4px; padding: 0.15rem 0.4rem; font-size: 0.72rem;" onclick="StudentPortal.copyCode('${item.completion_code}')" title="Copy Code">📋</button>` : ""}
        </td>
        <td>
          <span style="font-weight: 700; color: ${item.score_accuracy >= 90 ? "var(--accent-green)" : "var(--accent-amber)"};">
            ${item.score_accuracy != null ? `${item.score_accuracy}%` : "--"}
          </span>
        </td>
        <td>
          <span style="font-family: var(--font-mono); color: var(--accent-cyan);">
            ${item.mean_rt_ms != null ? `${Math.round(item.mean_rt_ms)} ms` : "--"}
          </span>
        </td>
      `;

      tableBody.appendChild(tr);
    });
  },

  populateProfileForm() {
    if (!this.profile) return;

    const elId = document.getElementById("prof-participant-id");
    const elName = document.getElementById("prof-full-name");
    const elInst = document.getElementById("prof-institution");
    const elAge = document.getElementById("prof-age");
    const elGender = document.getElementById("prof-gender");
    const elHand = document.getElementById("prof-handedness");
    const elVision = document.getElementById("prof-vision");

    if (elId) elId.value = this.profile.participant_id || "";
    if (elName) elName.value = this.profile.full_name || "";
    if (elInst) elInst.value = this.profile.institution || "";
    if (elAge) elAge.value = this.profile.age || "";
    if (elGender) elGender.value = this.profile.gender || "unspecified";
    if (elHand) elHand.value = this.profile.handedness || "right";
    if (elVision) elVision.value = this.profile.vision_correction || "normal";
  },

  async handleProfileUpdate(e) {
    e.preventDefault();

    const name = document.getElementById("prof-full-name")?.value;
    const institution = document.getElementById("prof-institution")?.value;
    const age = document.getElementById("prof-age")?.value;
    const gender = document.getElementById("prof-gender")?.value;
    const handedness = document.getElementById("prof-handedness")?.value;
    const vision = document.getElementById("prof-vision")?.value;
    const password = document.getElementById("prof-new-password")?.value;

    try {
      const res = await API.updateStudentProfile({
        full_name: name,
        institution,
        age: age ? parseInt(age) : null,
        gender,
        handedness,
        vision_correction: vision,
        password: password || undefined,
      });

      this.profile = res.profile;
      Auth.currentUser = { ...Auth.currentUser, ...res.profile };
      Auth.renderNav();
      this.renderDashboard();

      const passField = document.getElementById("prof-new-password");
      if (passField) passField.value = "";

      App.showToast(
        "Profile and participant details updated successfully!",
        "success",
      );
    } catch (err) {
      App.showToast("Failed to update profile: " + err.message, "error");
    }
  },

  takeTest(slug) {
    App.launchParticipantStudy(slug);
  },

  copyCode(code) {
    navigator.clipboard
      .writeText(code)
      .then(() => {
        App.showToast(`Copied code "${code}" to clipboard!`, "success");
      })
      .catch(() => {
        prompt("Copy your completion code:", code);
      });
  },

  escape(str) {
    if (!str) return "";
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  },
};
