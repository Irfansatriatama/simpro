/* SIMPRO — Dashboard Page (v1.0.0) */
const Page = (() => {

  function _currentUser() { return Auth.getCurrentUser(); }

  function _getVisibleProjects(user) {
    const projects = Storage.get('sp_projects') || [];
    if (user.role === 'admin' || user.role === 'pm') return projects.filter(p => p.status !== 'archived');
    return projects.filter(p => p.memberIds && p.memberIds.includes(user.id) && p.status !== 'archived');
  }

  function _getMyTasks(user) {
    return Storage.query('sp_tasks', t => t.assigneeIds && t.assigneeIds.includes(user.id) && t.status !== 'done');
  }

  function _getActiveSprints(projects) {
    const sprints = Storage.get('sp_sprints') || [];
    const ids = projects.map(p => p.id);
    return sprints.filter(s => s.status === 'active' && ids.includes(s.projectId));
  }

  function _getUserById(id) {
    return (Storage.get('sp_users') || []).find(u => u.id === id) || null;
  }

  function _getProjectById(id) {
    return (Storage.get('sp_projects') || []).find(p => p.id === id) || null;
  }

  function _daysRemaining(endDate) {
    if (!endDate) return null;
    return Math.ceil((new Date(endDate + 'T23:59:59') - new Date()) / 86400000);
  }

  // ── Widget: My Tasks ──────────────────────────────────────────────────────
  function _renderMyTasks(user) {
    const container = document.getElementById('widget-my-tasks');
    if (!container) return;
    const tasks = _getMyTasks(user);

    if (!tasks.length) {
      container.innerHTML = `<div class="widget-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="widget-empty-icon"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
        <p>Tidak ada task aktif</p><span>Semua task sudah selesai atau belum ada yang diassign</span>
      </div>`;
      return;
    }

    const today = Utils.todayISO();
    const groups = { overdue: [], today: [], upcoming: [] };
    tasks.forEach(t => {
      if (!t.dueDate) groups.upcoming.push(t);
      else if (t.dueDate < today) groups.overdue.push(t);
      else if (t.dueDate === today) groups.today.push(t);
      else groups.upcoming.push(t);
    });
    groups.overdue.sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));
    groups.upcoming.sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate);
    });

    const taskRow = (t) => {
      const project = _getProjectById(t.projectId);
      const overdueClass = t.dueDate && t.dueDate < today ? ' overdue' : '';
      const dueDateHTML = t.dueDate ? `<span class="task-row-due${overdueClass}">${Utils.formatDateShort(t.dueDate)}</span>` : '';
      const projectDot = project ? `<span class="task-project-dot" style="background:${project.color}"></span>` : '';
      return `<div class="task-row" data-task-id="${t.id}" role="button" tabindex="0">
        <span class="priority-dot priority-${t.priority}"></span>
        <div class="task-row-info">
          <span class="task-row-key">${Utils.escapeHtml(t.key)}</span>
          <span class="task-row-title">${Utils.escapeHtml(Utils.truncate(t.title, 55))}</span>
        </div>
        <div class="task-row-meta">${projectDot}<span class="badge badge-type-${t.type}">${Utils.getTypeLabel(t.type)}</span>${dueDateHTML}</div>
      </div>`;
    };

    const groupSection = (label, icon, items, cls) => {
      if (!items.length) return '';
      return `<div class="task-group">
        <div class="task-group-header ${cls}">${icon} ${label} <span class="task-group-count">${items.length}</span></div>
        ${items.map(taskRow).join('')}
      </div>`;
    };

    const iconOverdue = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
    const iconToday   = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`;
    const iconUpcoming= `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;

    const shown = groups.upcoming.slice(0, 5);
    const more  = groups.upcoming.length - shown.length;
    let html = groupSection('Terlambat', iconOverdue, groups.overdue, 'task-group-overdue')
      + groupSection('Hari Ini', iconToday, groups.today, 'task-group-today');

    if (shown.length) {
      html += `<div class="task-group">
        <div class="task-group-header">${iconUpcoming} Upcoming <span class="task-group-count">${groups.upcoming.length}</span></div>
        ${shown.map(taskRow).join('')}
        ${more > 0 ? `<div class="task-group-more">+${more} task lainnya</div>` : ''}
      </div>`;
    }

    container.innerHTML = html;
    container.querySelectorAll('.task-row').forEach(row => {
      const nav = () => { window.location.href = `./task-detail.html?id=${row.dataset.taskId}`; };
      row.addEventListener('click', nav);
      row.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') nav(); });
    });
  }

  // ── Widget: Active Projects ───────────────────────────────────────────────
  function _renderActiveProjects(projects) {
    const container = document.getElementById('widget-active-projects');
    if (!container) return;

    if (!projects.length) {
      container.innerHTML = `<div class="widget-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="widget-empty-icon"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
        <p>Belum ada project</p>
        <a href="./projects.html" class="btn btn-primary btn-sm" style="margin-top:var(--sp-3)">Buat Project</a>
      </div>`;
      return;
    }

    const sprints = Storage.get('sp_sprints') || [];
    const users   = Storage.get('sp_users') || [];
    const tasks   = Storage.get('sp_tasks') || [];

    container.innerHTML = `<div class="project-card-grid">${projects.slice(0, 6).map(project => {
      const pTasks   = tasks.filter(t => t.projectId === project.id);
      const total    = pTasks.length;
      const done     = pTasks.filter(t => t.status === 'done').length;
      const progress = total > 0 ? Math.round((done / total) * 100) : 0;
      const activeSprint = sprints.find(s => s.projectId === project.id && s.status === 'active');
      const memberIds = project.memberIds || [];
      const memberAvatars = memberIds.slice(0, 4).map(uid => {
        const u = users.find(x => x.id === uid);
        if (!u) return '';
        const c = Utils.getAvatarColor(u.id);
        return `<div class="avatar avatar-xs" style="background:${c.bg};color:${c.text};border:2px solid var(--color-surface);" title="${Utils.escapeHtml(u.name)}">${Utils.getInitials(u.name)}</div>`;
      }).join('');
      const extra = memberIds.length > 4 ? `<div class="avatar avatar-xs avatar-extra" style="border:2px solid var(--color-surface);">+${memberIds.length - 4}</div>` : '';
      const fillColor = progress >= 70 ? 'var(--color-success)' : 'var(--color-accent)';
      return `<a class="project-card" href="./project-detail.html?id=${project.id}">
        <div class="project-card-color-bar" style="background:${project.color}"></div>
        <div class="project-card-body">
          <div class="project-card-header">
            <div>
              <div class="project-card-title">${Utils.escapeHtml(project.name)}</div>
              <span class="badge" style="background:${project.color}20;color:${project.color};font-family:var(--font-mono);font-size:var(--text-xs);">${project.key}</span>
            </div>
            <span class="badge badge-status-${project.status}">${Utils.getProjectStatusLabel ? Utils.getProjectStatusLabel(project.status) : project.status}</span>
          </div>
          <div class="project-card-progress">
            <div class="progress-bar" style="height:4px;">
              <div class="progress-fill" style="width:${progress}%;background:${fillColor};border-radius:var(--radius-full);"></div>
            </div>
            <span class="project-card-progress-text">${done}/${total} task · ${progress}%</span>
          </div>
          ${activeSprint
            ? `<div class="project-card-sprint"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> ${Utils.escapeHtml(activeSprint.name)}</div>`
            : `<div class="project-card-sprint project-card-sprint-none">Tidak ada sprint aktif</div>`}
          <div class="project-card-footer">
            <div class="avatar-stack">${memberAvatars}${extra}</div>
            <span class="project-card-member-count">${memberIds.length} member</span>
          </div>
        </div>
      </a>`;
    }).join('')}</div>`;
  }

  // ── Widget: Recent Activity ───────────────────────────────────────────────
  function _renderRecentActivity(visibleProjects) {
    const container = document.getElementById('widget-recent-activity');
    if (!container) return;

    const projectIds = visibleProjects.map(p => p.id);
    const allTasks   = Storage.get('sp_tasks') || [];
    const allComments= Storage.get('sp_comments') || [];
    const taskMap    = {};
    allTasks.forEach(t => { taskMap[t.id] = t; });

    const activities = allComments
      .filter(c => { const t = taskMap[c.taskId]; return t && projectIds.includes(t.projectId); })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 20);

    if (!activities.length) {
      container.innerHTML = `<div class="widget-empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="widget-empty-icon"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg><p>Belum ada aktivitas</p></div>`;
      return;
    }

    const html = activities.map(act => {
      const task   = taskMap[act.taskId];
      const author = _getUserById(act.authorId);
      if (!task || !author) return '';
      const project = _getProjectById(task.projectId);
      const c = Utils.getAvatarColor(author.id);
      let desc = '';
      if (act.type === 'comment') {
        desc = `berkomentar di <strong>${Utils.escapeHtml(task.key)}</strong>: "${Utils.escapeHtml(Utils.truncate(act.content, 60))}"`;
      } else if (act.activityData) {
        const d = act.activityData;
        if (d.action === 'status_changed')
          desc = `mengubah status <strong>${Utils.escapeHtml(task.key)}</strong>: <em>${Utils.getStatusLabel(d.from)}</em> → <em>${Utils.getStatusLabel(d.to)}</em>`;
        else if (d.action === 'priority_changed')
          desc = `mengubah prioritas <strong>${Utils.escapeHtml(task.key)}</strong>: <em>${d.from}</em> → <em>${d.to}</em>`;
        else
          desc = `memperbarui <strong>${Utils.escapeHtml(task.key)}</strong>`;
      }
      const projTag = project ? `<span class="activity-project" style="color:${project.color}">${project.key}</span>` : '';
      return `<div class="activity-item">
        <div class="avatar avatar-xs" style="background:${c.bg};color:${c.text};flex-shrink:0;">${Utils.getInitials(author.name)}</div>
        <div class="activity-content">
          <div class="activity-text"><strong>${Utils.escapeHtml(author.name)}</strong> ${desc} ${projTag}</div>
          <div class="activity-time">${Utils.timeAgo(act.createdAt)}</div>
        </div>
      </div>`;
    }).filter(Boolean).join('');

    container.innerHTML = html || `<div class="widget-empty"><p>Belum ada aktivitas</p></div>`;
  }

  // ── Widget: Sprint Overview ───────────────────────────────────────────────
  function _renderSprintOverview(visibleProjects) {
    const container = document.getElementById('widget-sprint-overview');
    if (!container) return;

    const activeSprints = _getActiveSprints(visibleProjects);
    if (!activeSprints.length) {
      container.innerHTML = `<div class="widget-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="widget-empty-icon"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
        <p>Tidak ada sprint aktif</p><span>Mulai sprint dari halaman Backlog</span>
      </div>`;
      return;
    }

    const tasks = Storage.get('sp_tasks') || [];
    container.innerHTML = activeSprints.map(sprint => {
      const project = _getProjectById(sprint.projectId);
      if (!project) return '';
      const spTasks   = tasks.filter(t => t.sprintId === sprint.id);
      const total     = spTasks.length;
      const done      = spTasks.filter(t => t.status === 'done').length;
      const inprog    = spTasks.filter(t => t.status === 'in-progress').length;
      const review    = spTasks.filter(t => t.status === 'review').length;
      const progress  = total > 0 ? Math.round((done / total) * 100) : 0;
      const totalSP   = spTasks.reduce((s, t) => s + (t.storyPoints || 0), 0);
      const doneSP    = spTasks.filter(t => t.status === 'done').reduce((s, t) => s + (t.storyPoints || 0), 0);
      const daysLeft  = _daysRemaining(sprint.endDate);
      const daysClass = daysLeft !== null && daysLeft <= 2 ? 'sprint-days-danger' : daysLeft !== null && daysLeft <= 5 ? 'sprint-days-warning' : 'sprint-days-ok';
      const daysText  = daysLeft === null ? '—' : daysLeft < 0 ? 'Terlambat' : daysLeft === 0 ? 'Berakhir hari ini' : `${daysLeft} hari lagi`;
      const fillColor = progress >= 80 ? 'var(--color-success)' : 'var(--color-accent)';

      return `<div class="sprint-card">
        <div class="sprint-card-header">
          <div>
            <div class="sprint-card-project" style="color:${project.color}">
              <span class="sprint-project-dot" style="background:${project.color}"></span>
              ${Utils.escapeHtml(project.name)}
            </div>
            <div class="sprint-card-name">${Utils.escapeHtml(sprint.name)}</div>
            ${sprint.goal ? `<div class="sprint-card-goal">${Utils.escapeHtml(Utils.truncate(sprint.goal, 70))}</div>` : ''}
          </div>
          <span class="sprint-days-badge ${daysClass}">${daysText}</span>
        </div>
        <div class="sprint-card-progress">
          <div class="progress-bar" style="height:6px;">
            <div class="progress-fill" style="width:${progress}%;background:${fillColor};border-radius:var(--radius-full);"></div>
          </div>
          <div class="sprint-card-stats"><span>${done}/${total} task</span><span>${progress}%</span></div>
        </div>
        <div class="sprint-card-breakdown">
          <div class="sprint-stat"><span class="sprint-stat-dot" style="background:var(--color-accent)"></span><span>${inprog} in progress</span></div>
          <div class="sprint-stat"><span class="sprint-stat-dot" style="background:var(--color-warning)"></span><span>${review} review</span></div>
          <div class="sprint-stat">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            <span>${doneSP}/${totalSP} SP</span>
          </div>
        </div>
        <a href="./sprint.html?id=${sprint.id}" class="sprint-card-link">
          Lihat Sprint <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="9 18 15 12 9 6"/></svg>
        </a>
      </div>`;
    }).join('');
  }

  // ── Stat Bar ──────────────────────────────────────────────────────────────
  function _renderStatBar(user, projects) {
    const statBar = document.getElementById('dash-stat-bar');
    if (!statBar) return;
    const tasks   = Storage.get('sp_tasks') || [];
    const sprints = Storage.get('sp_sprints') || [];
    const ids     = projects.map(p => p.id);
    const today   = Utils.todayISO();
    const myTasks = user.role !== 'viewer'
      ? tasks.filter(t => t.assigneeIds && t.assigneeIds.includes(user.id) && t.status !== 'done')
      : [];
    const overdue    = myTasks.filter(t => t.dueDate && t.dueDate < today).length;
    const activeSp   = sprints.filter(s => s.status === 'active' && ids.includes(s.projectId)).length;

    statBar.innerHTML = `
      <div class="dash-stat"><div class="dash-stat-value">${projects.length}</div><div class="dash-stat-label">Project Aktif</div></div>
      ${user.role !== 'viewer' ? `
      <div class="dash-stat"><div class="dash-stat-value">${myTasks.length}</div><div class="dash-stat-label">Task Saya</div></div>
      <div class="dash-stat ${overdue > 0 ? 'dash-stat-danger' : ''}"><div class="dash-stat-value">${overdue}</div><div class="dash-stat-label">Terlambat</div></div>` : ''}
      <div class="dash-stat"><div class="dash-stat-value">${activeSp}</div><div class="dash-stat-label">Sprint Aktif</div></div>`;
  }

  // ── Welcome State ─────────────────────────────────────────────────────────
  function _renderWelcome(user) {
    const main = document.getElementById('main-content');
    const canCreate = user.role === 'admin' || user.role === 'pm';
    main.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">Selamat datang di SIMPRO</h1>
          <p class="page-subtitle">Mulai dengan membuat project pertama Anda</p>
        </div>
      </div>
      <div class="welcome-state">
        <svg viewBox="0 0 80 80" fill="none" class="welcome-icon" width="80" height="80">
          <rect x="10" y="20" width="60" height="45" rx="4" stroke="var(--color-border-strong)" stroke-width="2"/>
          <path d="M10 30h60" stroke="var(--color-border-strong)" stroke-width="2"/>
          <rect x="20" y="40" width="18" height="14" rx="2" fill="var(--color-accent-light)" stroke="var(--color-accent)" stroke-width="1.5"/>
          <rect x="44" y="40" width="18" height="8" rx="2" fill="var(--color-surface-2)" stroke="var(--color-border)" stroke-width="1.5"/>
          <circle cx="24" cy="22" r="3" fill="var(--color-accent)"/>
          <circle cx="34" cy="22" r="3" fill="var(--color-border-strong)"/>
        </svg>
        <h2 class="welcome-title">Belum ada project</h2>
        <p class="welcome-desc">${canCreate
          ? 'Buat project baru untuk mulai mengelola task, sprint, dan tim Anda.'
          : 'Anda belum tergabung ke project manapun. Minta Project Manager untuk menambahkan Anda.'}</p>
        ${canCreate ? `<a href="./projects.html" class="btn btn-primary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Buat Project Baru</a>` : ''}
      </div>`;
  }

  // ── Build Layout HTML ─────────────────────────────────────────────────────
  function _buildLayout(user) {
    const isViewer = user.role === 'viewer';
    return `
      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title" id="dash-greeting">Dashboard</h1>
          <p class="page-subtitle" id="dash-subtitle"></p>
        </div>
        ${user.role !== 'viewer' ? `<div class="page-header-actions">
          <a href="./projects.html" class="btn btn-secondary btn-sm">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
            Semua Project</a>
        </div>` : ''}
      </div>
      <div class="dash-stat-bar" id="dash-stat-bar"></div>
      <div class="dash-grid">
        ${!isViewer ? `<div class="dash-col-main">
          <div class="widget">
            <div class="widget-header">
              <h2 class="widget-title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg> My Tasks</h2>
              <a href="./board.html" class="widget-action">Lihat Board</a>
            </div>
            <div class="widget-body" id="widget-my-tasks"><div class="widget-loading">Memuat...</div></div>
          </div>
        </div>` : ''}
        <div class="${!isViewer ? 'dash-col-side' : 'dash-col-full'}">
          <div class="widget">
            <div class="widget-header">
              <h2 class="widget-title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> Sprint Aktif</h2>
              <a href="./backlog.html" class="widget-action">Backlog</a>
            </div>
            <div class="widget-body" id="widget-sprint-overview"><div class="widget-loading">Memuat...</div></div>
          </div>
          <div class="widget" style="margin-top:var(--sp-4)">
            <div class="widget-header">
              <h2 class="widget-title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg> Aktivitas Terbaru</h2>
            </div>
            <div class="widget-body widget-body-activity" id="widget-recent-activity"><div class="widget-loading">Memuat...</div></div>
          </div>
        </div>
        <div class="dash-col-full">
          <div class="widget">
            <div class="widget-header">
              <h2 class="widget-title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg> Project Aktif</h2>
              <a href="./projects.html" class="widget-action">Lihat Semua</a>
            </div>
            <div class="widget-body" id="widget-active-projects"><div class="widget-loading">Memuat...</div></div>
          </div>
        </div>
      </div>`;
  }

  // ── Skeleton ──────────────────────────────────────────────────────────────
  function _skeletonRows(n, widths) {
    return Array.from({ length: n }, (_, i) => {
      const w = widths[i % widths.length];
      return `<div class="skeleton-row" style="margin-bottom:10px;">
        <div class="skeleton skeleton-line" style="width:40px;height:12px;flex-shrink:0;"></div>
        <div class="skeleton skeleton-line" style="width:${w};height:12px;flex:1;margin-left:8px;"></div>
        <div class="skeleton skeleton-line" style="width:60px;height:12px;flex-shrink:0;"></div>
      </div>`;
    }).join('');
  }

  function _showSkeletons() {
    const widgets = [
      { id: 'widget-my-tasks', html: `<div style="padding:var(--sp-2) 0">${_skeletonRows(5, ['70%','60%','80%','55%','65%'])}</div>` },
      { id: 'widget-sprint-overview', html: `<div style="padding:var(--sp-2) 0">${['80%','90%','70%'].map(w => `<div class="skeleton skeleton-line" style="width:${w};height:14px;margin-bottom:10px;"></div>`).join('')}<div class="skeleton skeleton-line" style="width:100%;height:6px;margin-top:8px;border-radius:4px;"></div></div>` },
      { id: 'widget-recent-activity', html: Array.from({length:4}, () => `<div class="skeleton-row" style="margin-bottom:12px;"><div class="skeleton" style="width:28px;height:28px;border-radius:50%;flex-shrink:0;"></div><div style="flex:1;margin-left:8px;"><div class="skeleton skeleton-line" style="width:80%;height:12px;margin-bottom:6px;"></div><div class="skeleton skeleton-line" style="width:40%;height:10px;"></div></div></div>`).join('') },
      { id: 'widget-active-projects', html: `<div class="project-card-grid">${Array.from({length:2}, () => `<div class="skeleton" style="height:120px;border-radius:var(--radius-lg);"></div>`).join('')}</div>` },
    ];
    widgets.forEach(({ id, html }) => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = html;
    });
    const statBar = document.getElementById('dash-stat-bar');
    if (statBar) {
      statBar.innerHTML = Array.from({length:3}, () => `<div class="dash-stat"><div class="skeleton skeleton-line" style="width:40px;height:28px;margin:0 auto 4px;"></div><div class="skeleton skeleton-line" style="width:70px;height:11px;"></div></div>`).join('');
    }
  }

  // ── Init ──────────────────────────────────────────────────────────────────
  function init() {
    const user = _currentUser();
    if (!user) return;

    try {
      const projects = _getVisibleProjects(user);
      const main = document.getElementById('main-content');
      if (!main) return;

      if (!projects.length) { _renderWelcome(user); return; }

      main.innerHTML = _buildLayout(user);
      if (window.lucide) lucide.createIcons();

      // Greeting
      const greetEl    = document.getElementById('dash-greeting');
      const subtitleEl = document.getElementById('dash-subtitle');
      if (greetEl) {
        const h = new Date().getHours();
        const g = h < 12 ? 'Selamat pagi' : h < 17 ? 'Selamat siang' : 'Selamat malam';
        greetEl.textContent = `${g}, ${user.name.split(' ')[0]}`;
      }
      if (subtitleEl) {
        subtitleEl.textContent = new Date().toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
      }

      _showSkeletons();

      // Render after brief simulated delay for skeleton visibility
      setTimeout(() => {
        try {
          _renderStatBar(user, projects);
          if (user.role !== 'viewer') _renderMyTasks(user);
          _renderSprintOverview(projects);
          _renderRecentActivity(projects);
          _renderActiveProjects(projects);
        } catch (err) {
          App.Toast.error('Gagal memuat dashboard', 'Coba refresh halaman');
        }
      }, 80);
    } catch (err) {
      App.Toast.error('Gagal memuat dashboard', 'Coba refresh halaman');
    }
  }

  return { init };
})();
