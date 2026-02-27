/* SIMPRO Page: sprint — Sprint Active View v0.8.0 */
const Page = (() => {
  let _session = null;
  let _project = null;
  let _sprint = null;
  let _tasks = [];
  let _users = [];
  let _activeTab = 'board'; // board | list | stats
  let _filterAssignee = '';
  let _filterPriority = '';

  // ── Helpers ──────────────────────────────────────────────────────────────
  function _getUsers() { return _users; }
  function _getUserById(id) { return _users.find(u => u.id === id) || null; }

  function _canManage() {
    return _session && (_session.role === 'admin' || _session.role === 'pm');
  }

  function _getVisibleProjects() {
    const projects = Storage.get('sp_projects') || [];
    if (_session.role === 'admin' || _session.role === 'pm') {
      return projects.filter(p => p.status !== 'archived');
    }
    return projects.filter(p =>
      p.memberIds && p.memberIds.includes(_session.userId) && p.status !== 'archived'
    );
  }

  function _avatarHtml(userId, size = 20) {
    const user = _getUserById(userId);
    if (!user) return '';
    const [bg, fg] = Utils.getAvatarColor(userId);
    const initials = Utils.getInitials(user.name);
    if (user.avatar) {
      return `<img class="mini-avatar" src="${user.avatar}" title="${user.name}" style="width:${size}px;height:${size}px;object-fit:cover;border-radius:50%;">`;
    }
    return `<span class="mini-avatar" title="${user.name}" style="background:${bg};color:${fg};width:${size}px;height:${size}px;font-size:${size <= 20 ? '10' : '12'}px;">${initials}</span>`;
  }

  function _priorityDot(priority) {
    const map = { critical: 'var(--color-critical)', high: 'var(--color-high)', medium: 'var(--color-medium)', low: 'var(--color-low)' };
    return `<span style="width:8px;height:8px;border-radius:50%;background:${map[priority] || 'var(--color-low)'};flex-shrink:0;display:inline-block;"></span>`;
  }

  function _typeIcon(type) {
    const icons = {
      story: `<i data-lucide="bookmark" style="width:12px;height:12px;color:var(--color-story)"></i>`,
      bug:   `<i data-lucide="bug"      style="width:12px;height:12px;color:var(--color-bug)"></i>`,
      task:  `<i data-lucide="check-square" style="width:12px;height:12px;color:var(--color-task)"></i>`,
      epic:  `<i data-lucide="zap"      style="width:12px;height:12px;color:var(--color-epic)"></i>`,
    };
    return icons[type] || icons.task;
  }

  function _statusBadgeHtml(status) {
    const labels = { todo: 'To Do', 'in-progress': 'In Progress', review: 'In Review', done: 'Done' };
    const colors = { todo: 'var(--color-text-2)', 'in-progress': 'var(--color-info)', review: 'var(--color-warning)', done: 'var(--color-success)' };
    const bgs = { todo: 'var(--color-surface-2)', 'in-progress': 'var(--color-info-bg)', review: 'var(--color-warning-bg)', done: 'var(--color-success-bg)' };
    return `<span style="padding:2px 7px;border-radius:var(--radius-full);font-size:var(--text-xs);font-weight:500;background:${bgs[status]||bgs.todo};color:${colors[status]||colors.todo};">${labels[status] || status}</span>`;
  }

  function _daysRemaining(sprint) {
    if (!sprint.endDate) return null;
    return Utils.daysUntil(sprint.endDate + 'T23:59:59');
  }

  function _getFilteredTasks() {
    return _tasks.filter(t => {
      if (_filterAssignee && !(t.assigneeIds || []).includes(_filterAssignee)) return false;
      if (_filterPriority && t.priority !== _filterPriority) return false;
      return true;
    });
  }

  // ── Burndown SVG ─────────────────────────────────────────────────────────
  function _buildBurndown(sprint, tasks) {
    const W = 280, H = 80;
    if (!sprint.startDate || !sprint.endDate) {
      return `<svg width="${W}" height="${H}"><text x="10" y="48" fill="var(--color-text-3)" font-size="11">Tanggal sprint belum diset</text></svg>`;
    }

    const start = new Date(sprint.startDate);
    const end   = new Date(sprint.endDate);
    const totalDays = Math.max(1, Math.round((end - start) / 86400000));
    const today = new Date();
    const elapsed = Math.min(totalDays, Math.max(0, Math.round((today - start) / 86400000)));

    const total = tasks.reduce((s, t) => s + (t.storyPoints || 0), 0);
    if (total === 0) {
      return `<svg width="${W}" height="${H}"><text x="10" y="48" fill="var(--color-text-3)" font-size="11">Belum ada story points</text></svg>`;
    }

    const donePts = tasks.filter(t => t.status === 'done').reduce((s, t) => s + (t.storyPoints || 0), 0);
    const remaining = total - donePts;

    const pad = { l: 8, r: 8, t: 8, b: 8 };
    const gW = W - pad.l - pad.r;
    const gH = H - pad.t - pad.b;

    function xOf(day) { return pad.l + (day / totalDays) * gW; }
    function yOf(pts) { return pad.t + (1 - pts / total) * gH; }

    const plannedPath = `M ${xOf(0)} ${yOf(total)} L ${xOf(totalDays)} ${yOf(0)}`;
    const actualPath = `M ${xOf(0)} ${yOf(total)} L ${xOf(elapsed)} ${yOf(remaining)}`;
    const tx = xOf(elapsed);

    return `<svg width="${W}" height="${H}" style="display:block;">
      <rect x="${pad.l}" y="${pad.t}" width="${gW}" height="${gH}" fill="none" stroke="var(--color-border)" stroke-width="1" rx="2"/>
      <path d="${plannedPath}" fill="none" stroke="var(--color-border-strong)" stroke-width="1.5" stroke-dasharray="4 3"/>
      <path d="${actualPath}" fill="none" stroke="var(--color-accent)" stroke-width="2"/>
      <line x1="${tx}" y1="${pad.t}" x2="${tx}" y2="${H - pad.b}" stroke="var(--color-danger)" stroke-width="1" stroke-dasharray="3 2"/>
      <text x="${pad.l + 2}" y="${H - pad.b - 2}" font-size="9" fill="var(--color-text-3)">Planned</text>
      <text x="${pad.l + 2}" y="${pad.t + 10}" font-size="9" fill="var(--color-accent)">Actual</text>
    </svg>`;
  }

  // ── Header ────────────────────────────────────────────────────────────────
  function _renderHeader() {
    const sprint = _sprint;
    const tasks = _tasks;
    const doneCount = tasks.filter(t => t.status === 'done').length;
    const totalCount = tasks.length;
    const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
    const days = _daysRemaining(sprint);
    const daysLabel = days === null ? '' : days < 0
      ? `<span class="sprint-overdue-badge">Terlambat ${Math.abs(days)}h</span>`
      : days === 0
      ? `<span class="sprint-overdue-badge" style="background:var(--color-warning-bg);color:var(--color-warning);">Hari ini berakhir</span>`
      : `<span class="sprint-days-badge">${days} hari tersisa</span>`;

    const dateRange = sprint.startDate && sprint.endDate
      ? `${Utils.formatDateShort(sprint.startDate)} – ${Utils.formatDateShort(sprint.endDate)}`
      : sprint.startDate ? `Mulai ${Utils.formatDateShort(sprint.startDate)}` : '';

    const burndown = _buildBurndown(sprint, tasks);

    return `
      <div class="sa-header">
        <div class="sa-header-left">
          <div class="sa-breadcrumb">
            <a href="/pages/backlog.html?project=${_project.id}" class="sa-breadcrumb-link">
              <i data-lucide="layers" style="width:13px;height:13px;"></i> Backlog
            </a>
            <span class="sa-breadcrumb-sep">/</span>
            <span class="sa-breadcrumb-cur">${Utils.escapeHtml(sprint.name)}</span>
          </div>
          <div class="sa-title-row">
            <h1 class="sa-sprint-name">${Utils.escapeHtml(sprint.name)}</h1>
            ${sprint.status === 'completed'
              ? '<span class="badge badge-success">Completed</span>'
              : '<span class="badge badge-info">Active</span>'}
            ${daysLabel}
          </div>
          ${sprint.goal ? `<p class="sa-goal">${Utils.escapeHtml(sprint.goal)}</p>` : ''}
          ${dateRange ? `<div class="sa-daterange"><i data-lucide="calendar" style="width:12px;height:12px;"></i> ${dateRange}</div>` : ''}
          <div class="sa-progress-row">
            <div class="sa-progress-bar-wrap">
              <div class="sa-progress-bar-fill" style="width:${pct}%"></div>
            </div>
            <span class="sa-progress-label">${doneCount}/${totalCount} task selesai (${pct}%)</span>
          </div>
        </div>
        <div class="sa-header-right">
          <div class="sa-burndown-wrap">
            <div class="sa-burndown-label">Burndown</div>
            ${burndown}
            <div class="sa-burndown-legend">
              <span class="sa-legend-dot" style="background:var(--color-border-strong);"></span> Planned &nbsp;
              <span class="sa-legend-dot" style="background:var(--color-accent);"></span> Actual
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // ── BOARD TAB ─────────────────────────────────────────────────────────────
  function _renderBoardTab() {
    const statuses = ['todo', 'in-progress', 'review', 'done'];
    const labels = { todo: 'To Do', 'in-progress': 'In Progress', review: 'In Review', done: 'Done' };
    const dotColors = { todo: 'var(--color-text-3)', 'in-progress': 'var(--color-info)', review: 'var(--color-warning)', done: 'var(--color-success)' };

    const cols = statuses.map(status => {
      const tasks = _tasks.filter(t => t.status === status);
      const cards = tasks.length === 0
        ? `<div class="sa-board-empty">Tidak ada task</div>`
        : tasks.map(t => {
          const assignees = (t.assigneeIds || []).map(id => _avatarHtml(id, 18)).join('');
          const isOverdue = t.dueDate && Utils.isOverdue(t.dueDate) && t.status !== 'done';
          return `
            <a href="/pages/task-detail.html?id=${t.id}" class="sa-card">
              <div class="sa-card-top">
                ${_typeIcon(t.type)}
                <span class="sa-card-key">${Utils.escapeHtml(t.key)}</span>
                ${_priorityDot(t.priority)}
              </div>
              <div class="sa-card-title">${Utils.escapeHtml(t.title)}</div>
              <div class="sa-card-meta">
                <div class="sa-card-avatars">${assignees}</div>
                ${t.storyPoints != null ? `<span class="sa-card-sp">${t.storyPoints}</span>` : ''}
                ${t.dueDate ? `<span class="sa-card-due ${isOverdue ? 'overdue' : ''}">${Utils.formatDateShort(t.dueDate)}</span>` : ''}
              </div>
            </a>`;
        }).join('');

      return `
        <div class="sa-board-col">
          <div class="sa-board-col-header">
            <span class="sa-col-dot" style="background:${dotColors[status]}"></span>
            <span class="sa-col-name">${labels[status]}</span>
            <span class="sa-col-count">${tasks.length}</span>
          </div>
          <div class="sa-board-cards">${cards}</div>
        </div>`;
    }).join('');

    return `
      <div class="sa-board-view">
        <div class="sa-board-quicknav">
          <a href="/pages/board.html?project=${_project.id}" class="btn btn-sm btn-secondary">
            <i data-lucide="layout-dashboard" style="width:14px;height:14px;"></i>
            Buka Board Penuh
          </a>
          <a href="/pages/backlog.html?project=${_project.id}" class="btn btn-sm btn-secondary">
            <i data-lucide="layers" style="width:14px;height:14px;"></i>
            Kelola Backlog
          </a>
        </div>
        <div class="sa-board-grid">${cols}</div>
      </div>`;
  }

  // ── LIST TAB ──────────────────────────────────────────────────────────────
  function _renderFilters() {
    const memberIds = [...new Set(_tasks.flatMap(t => t.assigneeIds || []))];
    const members = memberIds.map(id => _getUserById(id)).filter(Boolean);
    const priorities = ['critical', 'high', 'medium', 'low'];
    const prioLabels = { critical: 'Kritis', high: 'Tinggi', medium: 'Sedang', low: 'Rendah' };

    return `
      <div class="sa-filters">
        <select class="sa-filter-select" id="sa-filter-assignee">
          <option value="">Semua assignee</option>
          ${members.map(u => `<option value="${u.id}" ${_filterAssignee === u.id ? 'selected' : ''}>${Utils.escapeHtml(u.name)}</option>`).join('')}
        </select>
        <select class="sa-filter-select" id="sa-filter-priority">
          <option value="">Semua prioritas</option>
          ${priorities.map(p => `<option value="${p}" ${_filterPriority === p ? 'selected' : ''}>${prioLabels[p]}</option>`).join('')}
        </select>
        ${(_filterAssignee || _filterPriority)
          ? `<button class="btn btn-sm btn-ghost" id="sa-filter-clear">
               <i data-lucide="x" style="width:13px;height:13px;"></i> Reset
             </button>`
          : ''}
      </div>`;
  }

  function _renderListTab() {
    const filtered = _getFilteredTasks();

    const rows = filtered.length === 0
      ? `<tr><td colspan="6" style="text-align:center;color:var(--color-text-3);padding:var(--sp-8);">Tidak ada task yang cocok dengan filter.</td></tr>`
      : filtered.map(t => {
        const assignees = (t.assigneeIds || []).map(id => _avatarHtml(id, 20)).join('');
        const isOverdue = t.dueDate && Utils.isOverdue(t.dueDate) && t.status !== 'done';
        return `
          <tr class="sa-list-row">
            <td class="sa-list-key">
              <div style="display:flex;align-items:center;gap:var(--sp-2);">
                ${_typeIcon(t.type)}
                <a href="/pages/task-detail.html?id=${t.id}" class="sa-key-link">${Utils.escapeHtml(t.key)}</a>
              </div>
            </td>
            <td class="sa-list-title">
              <a href="/pages/task-detail.html?id=${t.id}" class="sa-title-link">${Utils.escapeHtml(t.title)}</a>
            </td>
            <td>${_statusBadgeHtml(t.status)}</td>
            <td>
              <div style="display:flex;align-items:center;gap:4px;">
                ${_priorityDot(t.priority)}
                <span style="font-size:var(--text-xs);color:var(--color-text-2);">${t.priority}</span>
              </div>
            </td>
            <td><div style="display:flex;gap:2px;">${assignees || '<span style="color:var(--color-text-3);font-size:var(--text-xs);">—</span>'}</div></td>
            <td>
              ${t.dueDate
                ? `<span style="font-size:var(--text-xs);color:${isOverdue ? 'var(--color-danger)' : 'var(--color-text-2)'};">${Utils.formatDateShort(t.dueDate)}</span>`
                : '<span style="color:var(--color-text-3);font-size:var(--text-xs);">—</span>'}
            </td>
          </tr>`;
      }).join('');

    return `
      ${_renderFilters()}
      <div class="sa-list-wrap">
        <table class="sa-list-table">
          <thead>
            <tr>
              <th>Key</th>
              <th>Judul</th>
              <th>Status</th>
              <th>Prioritas</th>
              <th>Assignee</th>
              <th>Due Date</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }

  // ── STATS TAB ─────────────────────────────────────────────────────────────
  function _renderStatsTab() {
    const tasks = _tasks;
    const total = tasks.length;
    const done = tasks.filter(t => t.status === 'done').length;
    const inProgress = tasks.filter(t => t.status === 'in-progress').length;
    const inReview = tasks.filter(t => t.status === 'review').length;
    const todo = tasks.filter(t => t.status === 'todo').length;

    const totalSP = tasks.reduce((s, t) => s + (t.storyPoints || 0), 0);
    const doneSP = tasks.filter(t => t.status === 'done').reduce((s, t) => s + (t.storyPoints || 0), 0);
    const remainingSP = totalSP - doneSP;

    const memberIds = [...new Set(tasks.flatMap(t => t.assigneeIds || []))];
    const assigneeBreakdown = memberIds.map(uid => {
      const user = _getUserById(uid);
      const myTasks = tasks.filter(t => (t.assigneeIds || []).includes(uid));
      const myDone = myTasks.filter(t => t.status === 'done').length;
      return { user, total: myTasks.length, done: myDone, sp: myTasks.reduce((s, t) => s + (t.storyPoints || 0), 0) };
    }).filter(r => r.user);

    const statCards = `
      <div class="sa-stats-grid">
        <div class="sa-stat-card">
          <div class="sa-stat-num">${total}</div>
          <div class="sa-stat-label">Total Task</div>
        </div>
        <div class="sa-stat-card sa-stat-done">
          <div class="sa-stat-num">${done}</div>
          <div class="sa-stat-label">Selesai</div>
        </div>
        <div class="sa-stat-card sa-stat-progress">
          <div class="sa-stat-num">${inProgress}</div>
          <div class="sa-stat-label">In Progress</div>
        </div>
        <div class="sa-stat-card sa-stat-review">
          <div class="sa-stat-num">${inReview}</div>
          <div class="sa-stat-label">In Review</div>
        </div>
        <div class="sa-stat-card">
          <div class="sa-stat-num">${todo}</div>
          <div class="sa-stat-label">To Do</div>
        </div>
      </div>`;

    const spSection = `
      <div class="sa-section">
        <h3 class="sa-section-title">Story Points</h3>
        <div class="sa-stats-grid" style="grid-template-columns:repeat(3,1fr);">
          <div class="sa-stat-card">
            <div class="sa-stat-num">${totalSP}</div>
            <div class="sa-stat-label">Total SP</div>
          </div>
          <div class="sa-stat-card sa-stat-done">
            <div class="sa-stat-num">${doneSP}</div>
            <div class="sa-stat-label">Done SP</div>
          </div>
          <div class="sa-stat-card">
            <div class="sa-stat-num">${remainingSP}</div>
            <div class="sa-stat-label">Remaining SP</div>
          </div>
        </div>
        ${totalSP > 0 ? `
          <div class="sa-sp-bar-wrap" title="${doneSP}/${totalSP} SP">
            <div class="sa-sp-bar-fill" style="width:${Math.round((doneSP/totalSP)*100)}%"></div>
          </div>
          <div style="font-size:var(--text-xs);color:var(--color-text-3);margin-top:var(--sp-1);">
            ${Math.round((doneSP/totalSP)*100)}% velocity
          </div>` : ''}
      </div>`;

    const assigneeSection = assigneeBreakdown.length === 0 ? '' : `
      <div class="sa-section">
        <h3 class="sa-section-title">Breakdown per Assignee</h3>
        <div class="sa-assignee-table-wrap">
          <table class="sa-assignee-table">
            <thead><tr><th>Member</th><th>Task</th><th>Selesai</th><th>SP</th><th>Progress</th></tr></thead>
            <tbody>
              ${assigneeBreakdown.map(r => {
                const pct = r.total > 0 ? Math.round((r.done / r.total) * 100) : 0;
                return `
                  <tr>
                    <td>
                      <div style="display:flex;align-items:center;gap:var(--sp-2);">
                        ${_avatarHtml(r.user.id, 22)}
                        <span style="font-size:var(--text-sm);">${Utils.escapeHtml(r.user.name)}</span>
                      </div>
                    </td>
                    <td class="sa-tbl-num">${r.total}</td>
                    <td class="sa-tbl-num">${r.done}</td>
                    <td class="sa-tbl-num">${r.sp}</td>
                    <td>
                      <div style="display:flex;align-items:center;gap:var(--sp-2);">
                        <div class="sa-mini-bar-wrap"><div class="sa-mini-bar-fill" style="width:${pct}%"></div></div>
                        <span style="font-size:var(--text-xs);color:var(--color-text-2);">${pct}%</span>
                      </div>
                    </td>
                  </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>`;

    return `
      <div class="sa-stats-view">
        ${statCards}
        ${spSection}
        ${assigneeSection}
      </div>`;
  }

  // ── Completed State ───────────────────────────────────────────────────────
  function _renderCompletedState() {
    const sprint = _sprint;
    const tasks = _tasks;
    const done = tasks.filter(t => t.status === 'done').length;
    const total = tasks.length;
    const sp = tasks.filter(t => t.status === 'done').reduce((s, t) => s + (t.storyPoints || 0), 0);

    const allSprints = Sprint.getByProject(_project.id);
    const nextSprint = allSprints.find(s => s.status === 'planned');

    return `
      <div class="sa-completed-state">
        <div class="sa-completed-icon">
          <i data-lucide="check-circle-2" style="width:48px;height:48px;color:var(--color-success);"></i>
        </div>
        <h2 class="sa-completed-title">Sprint Selesai</h2>
        <p class="sa-completed-sub">${Utils.escapeHtml(sprint.name)} telah diselesaikan${sprint.completedAt ? ' pada ' + Utils.formatDate(sprint.completedAt) : ''}.
        </p>
        <div class="sa-completed-stats">
          <div class="sa-completed-stat">
            <div class="sa-stat-num">${done}/${total}</div>
            <div class="sa-stat-label">Task Selesai</div>
          </div>
          <div class="sa-completed-stat">
            <div class="sa-stat-num">${sp}</div>
            <div class="sa-stat-label">Velocity (SP)</div>
          </div>
        </div>
        <div class="sa-completed-actions">
          <a href="/pages/backlog.html?project=${_project.id}" class="btn btn-primary">
            <i data-lucide="layers" style="width:14px;height:14px;"></i>
            Kembali ke Backlog
          </a>
          ${nextSprint
            ? `<a href="/pages/sprint.html?project=${_project.id}&sprint=${nextSprint.id}" class="btn btn-secondary">
                 <i data-lucide="arrow-right" style="width:14px;height:14px;"></i>
                 Sprint Berikutnya: ${Utils.escapeHtml(nextSprint.name)}
               </a>`
            : ''}
        </div>
      </div>`;
  }

  function _renderNoSprint() {
    return `
      <div class="sa-empty-state">
        <i data-lucide="calendar-x" style="width:40px;height:40px;color:var(--color-text-3);"></i>
        <h3>Tidak ada sprint aktif</h3>
        <p>Tidak ditemukan sprint aktif untuk project ini. Mulai sprint dari halaman Backlog.</p>
        <a href="/pages/backlog.html?project=${_project ? _project.id : ''}" class="btn btn-primary">
          <i data-lucide="layers" style="width:14px;height:14px;"></i>
          Kelola Backlog
        </a>
      </div>`;
  }

  function _renderTabs() {
    const tabs = [
      { id: 'board', label: 'Board View', icon: 'layout-dashboard' },
      { id: 'list',  label: 'List View',  icon: 'list' },
      { id: 'stats', label: 'Statistik',  icon: 'bar-chart-2' },
    ];
    return `
      <div class="sa-tabs">
        ${tabs.map(t => `
          <button class="sa-tab${_activeTab === t.id ? ' active' : ''}" data-tab="${t.id}">
            <i data-lucide="${t.icon}" style="width:14px;height:14px;"></i>
            ${t.label}
          </button>`).join('')}
      </div>`;
  }

  function _renderToolbar() {
    const projects = _getVisibleProjects();
    return `
      <div class="sa-toolbar">
        <select class="sa-project-select" id="sa-project-select">
          ${projects.map(p => `<option value="${p.id}" ${_project && _project.id === p.id ? 'selected' : ''}>${Utils.escapeHtml(p.name)}</option>`).join('')}
        </select>
        ${_sprint ? `<span class="sa-sprint-selector-label">Sprint: <strong>${Utils.escapeHtml(_sprint.name)}</strong></span>` : ''}
      </div>`;
  }

  function _render() {
    const mc = document.getElementById('main-content');
    if (!_project) {
      mc.innerHTML = _renderNoSprint();
      lucide.createIcons();
      return;
    }

    if (!_sprint) {
      mc.innerHTML = _renderToolbar() + _renderNoSprint();
      _bindToolbar();
      lucide.createIcons();
      return;
    }

    if (_sprint.status === 'completed') {
      mc.innerHTML = _renderToolbar() + _renderHeader() + _renderCompletedState();
      _bindToolbar();
      lucide.createIcons();
      return;
    }

    let tabContent = '';
    if (_activeTab === 'board')       tabContent = _renderBoardTab();
    else if (_activeTab === 'list')   tabContent = _renderListTab();
    else                              tabContent = _renderStatsTab();

    mc.innerHTML = `
      ${_renderToolbar()}
      ${_renderHeader()}
      <div class="sa-tabs-area">
        ${_renderTabs()}
        <div class="sa-tab-content">
          ${tabContent}
        </div>
      </div>`;

    _bindToolbar();
    _bindTabs();
    _bindFilters();
    lucide.createIcons();
  }

  function _bindToolbar() {
    const sel = document.getElementById('sa-project-select');
    if (sel) {
      sel.addEventListener('change', () => {
        const newProject = (Storage.get('sp_projects') || []).find(p => p.id === sel.value);
        if (newProject) {
          _project = newProject;
          _sprint = Sprint.getActive(_project.id) || null;
          if (!_sprint) {
            const completed = Sprint.getByProject(_project.id).filter(s => s.status === 'completed');
            _sprint = completed.length > 0 ? completed[completed.length - 1] : null;
          }
          _tasks = _sprint ? Storage.query('sp_tasks', t => t.sprintId === _sprint.id && !t.parentId) : [];
          _filterAssignee = '';
          _filterPriority = '';
          _render();
        }
      });
    }
  }

  function _bindTabs() {
    document.querySelectorAll('.sa-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        _activeTab = btn.dataset.tab;
        _render();
      });
    });
  }

  function _bindFilters() {
    const fa = document.getElementById('sa-filter-assignee');
    const fp = document.getElementById('sa-filter-priority');
    const fc = document.getElementById('sa-filter-clear');
    if (fa) fa.addEventListener('change', () => { _filterAssignee = fa.value; _render(); });
    if (fp) fp.addEventListener('change', () => { _filterPriority = fp.value; _render(); });
    if (fc) fc.addEventListener('click', () => { _filterAssignee = ''; _filterPriority = ''; _render(); });
  }

  function init() {
    _session = Storage.get('sp_session');
    _users = Storage.get('sp_users') || [];

    const params = Utils.parseQueryParams(window.location.search);
    const projects = _getVisibleProjects();

    if (params.project) {
      _project = projects.find(p => p.id === params.project) || null;
    }
    if (!_project && projects.length > 0) {
      _project = projects[0];
    }

    if (_project) {
      if (params.sprint) {
        _sprint = Sprint.getById(params.sprint) || Sprint.getActive(_project.id) || null;
      } else {
        _sprint = Sprint.getActive(_project.id) || null;
        if (!_sprint) {
          const completed = Sprint.getByProject(_project.id).filter(s => s.status === 'completed');
          _sprint = completed.length > 0 ? completed[completed.length - 1] : null;
        }
      }
      _tasks = _sprint
        ? Storage.query('sp_tasks', t => t.sprintId === _sprint.id && !t.parentId)
        : [];
    }

    _render();

    App.events.on('task:updated', () => {
      if (_sprint) {
        _tasks = Storage.query('sp_tasks', t => t.sprintId === _sprint.id && !t.parentId);
        _render();
      }
    });
  }

  return { init };
})();
