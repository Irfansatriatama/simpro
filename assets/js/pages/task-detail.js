/* SIMPRO Page: task-detail */
const Page = (() => {
  let _task = null;
  let _project = null;
  let _session = null;
  let _editingCommentId = null;
  let _descSaveTimer = null;

  function init() {
    _session = Storage.get('sp_session');
    if (!_session) return;

    const params = Utils.parseQueryParams(window.location.search);
    const taskId = params.id;
    if (!taskId) return _showNotFound();

    _task = Task.getById(taskId);
    if (!_task) return _showNotFound();

    _project = (Storage.get('sp_projects') || []).find(p => p.id === _task.projectId);

    _renderPage();
    _bindEvents();
  }

  function _canEdit() {
    if (!_session) return false;
    if (_session.role === 'admin' || _session.role === 'pm') return true;
    if (_session.role === 'developer') {
      return _task.assigneeIds.includes(_session.userId) || _task.reporterId === _session.userId;
    }
    return false;
  }

  function _showNotFound() {
    const main = document.getElementById('main-content');
    if (!main) return;
    main.innerHTML = `
      <div class="task-not-found">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <p>Task tidak ditemukan.</p>
        <a href="/pages/projects.html" class="btn btn-secondary btn-sm" style="margin-top:var(--sp-3)">Kembali ke Projects</a>
      </div>`;
  }

  function _renderPage() {
    const main = document.getElementById('main-content');
    if (!main) return;

    const sprint = _task.sprintId ? (Storage.get('sp_sprints') || []).find(s => s.id === _task.sprintId) : null;
    const canEdit = _canEdit();
    const users = Storage.get('sp_users') || [];

    main.innerHTML = `
      ${_buildBreadcrumb(sprint)}
      <div class="task-detail-layout">
        <div class="task-detail-main">
          <!-- Header: key + type + status -->
          <div>
            <div class="task-meta-header">
              <span class="task-key">${Utils.escapeHtml(_task.key)}</span>
              <span class="badge ${Utils.getTypeColor(_task.type)}">${Utils.getTypeLabel(_task.type)}</span>
              ${_task.parentId ? `<span class="badge badge-todo" style="font-size:var(--text-xs);">Subtask</span>` : ''}
            </div>
            <textarea
              id="task-title-input"
              class="task-title-input"
              rows="1"
              ${canEdit ? '' : 'readonly'}
              placeholder="Judul task..."
            >${Utils.escapeHtml(_task.title)}</textarea>
          </div>

          <!-- Description -->
          <div>
            <div class="task-section-label">Deskripsi</div>
            <textarea
              id="task-desc-input"
              class="task-description-area"
              ${canEdit ? '' : 'readonly'}
              placeholder="${canEdit ? 'Tambah deskripsi...' : 'Belum ada deskripsi.'}"
            >${Utils.escapeHtml(_task.description || '')}</textarea>
          </div>

          <!-- Subtasks (hanya untuk task non-subtask) -->
          ${!_task.parentId ? _buildSubtaskSection() : ''}

          <!-- Time Tracking -->
          <div id="time-tracker-section"></div>

          <!-- Activity & Comment Thread -->
          <div>
            <div class="task-section-label">Aktivitas</div>
            <div class="thread-container" id="thread-container"></div>
            ${_session.role !== 'viewer' ? `
              <div class="comment-form">
                <div class="thread-avatar">${_buildAvatarHTML(_session.userId, users, 'sm')}</div>
                <div class="comment-form-input-wrap">
                  <textarea id="comment-textarea" class="comment-textarea" rows="1" placeholder="Tulis komentar..."></textarea>
                  <div class="comment-form-actions" id="comment-form-actions">
                    <button class="btn btn-ghost btn-sm" id="btn-comment-cancel">Batal</button>
                    <button class="btn btn-primary btn-sm" id="btn-comment-submit">Kirim</button>
                  </div>
                </div>
              </div>` : ''}
          </div>
        </div>

        <!-- Right sidebar -->
        <div class="task-detail-sidebar">
          ${_buildSidebarCard(users, sprint, canEdit)}
        </div>
      </div>

      <!-- Modal: buat subtask / edit -->
      <div id="modal-subtask" class="modal-overlay" style="display:none">
        <div class="modal modal-sm">
          <div class="modal-header">
            <h2 class="modal-title">Tambah Subtask</h2>
            <button class="modal-close" id="modal-subtask-close"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label required">Judul Subtask</label>
              <input type="text" id="subtask-title-input" class="form-input" placeholder="Judul...">
            </div>
            <div class="form-group">
              <label class="form-label">Tipe</label>
              <select id="subtask-type-input" class="form-select">
                <option value="task">Task</option>
                <option value="story">Story</option>
                <option value="bug">Bug</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Prioritas</label>
              <select id="subtask-priority-input" class="form-select">
                <option value="medium">Medium</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost btn-sm" id="btn-subtask-cancel">Batal</button>
            <button class="btn btn-primary btn-sm" id="btn-subtask-save">Buat Subtask</button>
          </div>
        </div>
      </div>
    `;

    _renderThread();
    _renderTimeTracker();
    _autoResizeTextarea(document.getElementById('task-title-input'));
    _autoResizeTextarea(document.getElementById('task-desc-input'));

    if (window.lucide) lucide.createIcons();
  }

  function _buildBreadcrumb(sprint) {
    const projectUrl = `/pages/project-detail.html?id=${_task.projectId}`;
    const sprintLabel = sprint ? `Sprint: ${Utils.escapeHtml(sprint.name)}` : 'Backlog';
    const backUrl = sprint
      ? `/pages/sprint.html?id=${sprint.id}`
      : `/pages/backlog.html?project=${_task.projectId}`;

    return `
      <div class="breadcrumb">
        <a href="${projectUrl}">${Utils.escapeHtml(_project ? _project.name : 'Project')}</a>
        <span class="breadcrumb-sep">›</span>
        <a href="${backUrl}">${sprintLabel}</a>
        <span class="breadcrumb-sep">›</span>
        <span class="breadcrumb-current">${Utils.escapeHtml(_task.key)}</span>
      </div>`;
  }

  function _buildSubtaskSection() {
    const subtasks = Task.getSubtasks(_task.id);
    const done = subtasks.filter(t => t.status === 'done').length;
    const total = subtasks.length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;

    const canEdit = _canEdit();
    return `
      <div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--sp-2)">
          <div class="task-section-label">Subtask${total > 0 ? ` (${done}/${total})` : ''}</div>
          ${canEdit ? `<button class="btn btn-ghost btn-sm" id="btn-add-subtask"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Subtask</button>` : ''}
        </div>
        ${total > 0 ? `
          <div class="subtask-progress">
            <div class="subtask-progress-bar"><div class="subtask-progress-fill" style="width:${pct}%"></div></div>
            <span>${pct}%</span>
          </div>
          <div class="subtask-list" id="subtask-list">
            ${subtasks.map(st => _buildSubtaskItem(st)).join('')}
          </div>
        ` : `<div class="subtask-list" id="subtask-list"></div>`}
      </div>`;
  }

  function _buildSubtaskItem(st) {
    return `
      <a class="subtask-item ${st.status === 'done' ? 'done' : ''}" href="/pages/task-detail.html?id=${st.id}" data-subtask-id="${st.id}">
        <div class="subtask-checkbox">
          <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <span class="subtask-title">${Utils.escapeHtml(st.title)}</span>
        <span class="subtask-key">${Utils.escapeHtml(st.key)}</span>
        <span class="badge ${Utils.getPriorityColor(st.priority)}" style="margin-left:auto">${st.priority}</span>
      </a>`;
  }

  function _buildSidebarCard(users, sprint, canEdit) {
    const projectMembers = _project ? users.filter(u => (_project.memberIds || []).includes(u.id)) : [];
    const sprints = _project ? (Storage.get('sp_sprints') || []).filter(s => s.projectId === _project.id && s.status !== 'completed') : [];
    const labels = _project ? Label.getByProject(_project.id) : [];
    const milestones = _project ? (Storage.get('sp_milestones') || []).filter(m => m.projectId === _project.id) : [];
    const reporter = users.find(u => u.id === _task.reporterId);

    const taskLabels = labels.filter(l => (_task.labelIds || []).includes(l.id));

    return `
      <div class="task-sidebar-card">
        <!-- Status & Priority -->
        <div class="task-sidebar-section">
          <div class="task-sidebar-row">
            <div class="task-sidebar-key">Status</div>
            <div class="task-sidebar-value">
              ${canEdit
                ? `<select id="sel-status" class="form-select" style="font-size:var(--text-sm)">
                    ${['todo','in-progress','review','done'].map(s => `<option value="${s}" ${_task.status===s?'selected':''}>${Utils.getStatusLabel(s)}</option>`).join('')}
                  </select>`
                : `<span class="badge ${Utils.getStatusColor(_task.status)}">${Utils.getStatusLabel(_task.status)}</span>`}
            </div>
          </div>
          <div class="task-sidebar-row">
            <div class="task-sidebar-key">Prioritas</div>
            <div class="task-sidebar-value">
              ${canEdit
                ? `<select id="sel-priority" class="form-select" style="font-size:var(--text-sm)">
                    ${['critical','high','medium','low'].map(p => `<option value="${p}" ${_task.priority===p?'selected':''}>${p.charAt(0).toUpperCase()+p.slice(1)}</option>`).join('')}
                  </select>`
                : `<span class="badge ${Utils.getPriorityColor(_task.priority)}">${_task.priority}</span>`}
            </div>
          </div>
          <div class="task-sidebar-row">
            <div class="task-sidebar-key">Tipe</div>
            <div class="task-sidebar-value">
              ${canEdit
                ? `<select id="sel-type" class="form-select" style="font-size:var(--text-sm)">
                    ${['story','bug','task','epic'].map(t => `<option value="${t}" ${_task.type===t?'selected':''}>${Utils.getTypeLabel(t)}</option>`).join('')}
                  </select>`
                : `<span class="badge ${Utils.getTypeColor(_task.type)}">${Utils.getTypeLabel(_task.type)}</span>`}
            </div>
          </div>
        </div>

        <!-- Assignee -->
        <div class="task-sidebar-section">
          <div class="task-sidebar-key" style="margin-bottom:var(--sp-2)">Assignee</div>
          <div id="assignee-list" class="assignee-select-list">
            ${projectMembers.map(u => `
              <label class="assignee-option">
                <input type="checkbox" value="${u.id}" ${(_task.assigneeIds||[]).includes(u.id)?'checked':''} ${canEdit?'':'disabled'} class="assignee-cb">
                ${_buildAvatarHTML(u.id, users, 'sm')}
                <span class="assignee-option-name">${Utils.escapeHtml(u.name)}</span>
              </label>
            `).join('')}
          </div>
        </div>

        <!-- Sprint -->
        <div class="task-sidebar-section">
          <div class="task-sidebar-row">
            <div class="task-sidebar-key">Sprint</div>
            <div class="task-sidebar-value">
              ${canEdit
                ? `<select id="sel-sprint" class="form-select" style="font-size:var(--text-sm)">
                    <option value="">Backlog</option>
                    ${sprints.map(s => `<option value="${s.id}" ${_task.sprintId===s.id?'selected':''}>${Utils.escapeHtml(s.name)}</option>`).join('')}
                  </select>`
                : `<span>${sprint ? Utils.escapeHtml(sprint.name) : 'Backlog'}</span>`}
            </div>
          </div>
        </div>

        <!-- Dates & Points -->
        <div class="task-sidebar-section">
          <div class="task-sidebar-row">
            <div class="task-sidebar-key">Due Date</div>
            <div class="task-sidebar-value">
              ${canEdit
                ? `<input type="date" id="inp-due-date" value="${_task.dueDate || ''}">`
                : `<span class="${_task.dueDate && Utils.isOverdue(_task.dueDate) ? 'text-danger' : ''}">${Utils.formatDate(_task.dueDate)}</span>`}
            </div>
          </div>
          <div class="task-sidebar-row">
            <div class="task-sidebar-key">Story Pts</div>
            <div class="task-sidebar-value">
              ${canEdit
                ? `<input type="number" id="inp-story-points" min="0" max="100" value="${_task.storyPoints ?? ''}" placeholder="—">`
                : `<span>${_task.storyPoints ?? '—'}</span>`}
            </div>
          </div>
          <div class="task-sidebar-row">
            <div class="task-sidebar-key">Estimasi</div>
            <div class="task-sidebar-value">
              ${canEdit
                ? `<input type="number" id="inp-est-hours" min="0" step="0.5" value="${_task.estimatedHours ?? ''}" placeholder="jam">`
                : `<span>${_task.estimatedHours ? Utils.formatHours(_task.estimatedHours) : '—'}</span>`}
            </div>
          </div>
        </div>

        <!-- Labels -->
        <div class="task-sidebar-section">
          <div class="task-sidebar-key" style="margin-bottom:var(--sp-2)">Label</div>
          <div id="label-chips" class="label-chips">
            ${taskLabels.map(l => `
              <span class="label-chip" style="background:${l.color}22;color:${l.color}">
                ${Utils.escapeHtml(l.name)}
                ${canEdit ? `<button class="label-chip-remove" data-label-id="${l.id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>` : ''}
              </span>
            `).join('')}
          </div>
          ${canEdit ? `
            <div style="margin-top:var(--sp-2)">
              <select id="sel-label-add" class="form-select" style="font-size:var(--text-sm)">
                <option value="">+ Tambah label</option>
                ${labels.filter(l => !(_task.labelIds||[]).includes(l.id)).map(l => `<option value="${l.id}">${Utils.escapeHtml(l.name)}</option>`).join('')}
              </select>
            </div>` : ''}
        </div>

        <!-- Milestone -->
        <div class="task-sidebar-section">
          <div class="task-sidebar-row">
            <div class="task-sidebar-key">Milestone</div>
            <div class="task-sidebar-value">
              ${canEdit
                ? `<select id="sel-milestone" class="form-select" style="font-size:var(--text-sm)">
                    <option value="">—</option>
                    ${milestones.map(m => `<option value="${m.id}" ${_task.milestoneId===m.id?'selected':''}>${Utils.escapeHtml(m.name)}</option>`).join('')}
                  </select>`
                : `<span>${milestones.find(m => m.id === _task.milestoneId)?.name || '—'}</span>`}
            </div>
          </div>
        </div>

        <!-- Reporter + Dates -->
        <div class="task-sidebar-section">
          <div class="task-sidebar-row">
            <div class="task-sidebar-key">Reporter</div>
            <div class="task-sidebar-value">
              <span>${reporter ? Utils.escapeHtml(reporter.name) : '—'}</span>
            </div>
          </div>
          <div class="task-sidebar-row">
            <div class="task-sidebar-key">Dibuat</div>
            <div class="task-sidebar-value">
              <span title="${_task.createdAt}">${Utils.formatDate(_task.createdAt)}</span>
            </div>
          </div>
          <div class="task-sidebar-row">
            <div class="task-sidebar-key">Diupdate</div>
            <div class="task-sidebar-value">
              <span title="${_task.updatedAt}">${Utils.timeAgo(_task.updatedAt)}</span>
            </div>
          </div>
        </div>

        ${_canEdit() ? `
        <!-- Danger Zone -->
        <div class="task-sidebar-section">
          <button class="btn btn-danger btn-sm" id="btn-delete-task" style="width:100%">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
            Hapus Task
          </button>
        </div>` : ''}
      </div>`;
  }

  function _buildAvatarHTML(userId, users, size) {
    const user = users.find(u => u.id === userId);
    if (!user) return `<div class="avatar avatar-${size}">?</div>`;
    const [fg, bg] = Utils.getAvatarColor(userId);
    if (user.avatar) return `<div class="avatar avatar-${size}"><img src="${user.avatar}" alt="${Utils.escapeHtml(user.name)}"></div>`;
    return `<div class="avatar avatar-${size}" style="background:${bg};color:${fg}">${Utils.getInitials(user.name)}</div>`;
  }

  function _renderTimeTracker() {
    const section = document.getElementById('time-tracker-section');
    if (!section) return;

    const logs = typeof TimeLog !== 'undefined' ? TimeLog.getByTask(_task.id) : [];
    const logged = logs.reduce((s, l) => s + l.hours, 0);
    const estimated = _task.estimatedHours || 0;
    const pct = estimated > 0 ? Math.min(Math.round((logged / estimated) * 100), 100) : 0;
    const isOver = estimated > 0 && logged > estimated;
    const users = Storage.get('sp_users') || [];
    const canLog = _session && _session.role !== 'viewer';
    const isPM = _session && (_session.role === 'admin' || _session.role === 'pm');

    section.innerHTML = `
      <div class="time-tracker">
        <div class="time-tracker-header">
          <div class="task-section-label">Time Tracking</div>
          ${canLog ? `<button class="btn btn-ghost btn-sm" id="btn-log-time">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            Log Time
          </button>` : ''}
        </div>

        <div class="time-progress-wrap">
          <div class="time-progress-bar">
            <div class="time-progress-fill ${isOver ? 'over-estimate' : ''}" style="width:${estimated > 0 ? pct : 0}%"></div>
          </div>
          <div class="time-progress-labels">
            <span class="time-logged ${isOver ? 'text-danger' : ''}">${Utils.formatHours(logged)} dicatat</span>
            <span class="time-estimated text-muted">${estimated > 0 ? `/ ${Utils.formatHours(estimated)} estimasi` : 'Belum ada estimasi'}</span>
          </div>
        </div>

        <div id="log-time-form" class="log-time-form" style="display:none">
          <div class="log-time-form-grid">
            <div class="form-group">
              <label class="form-label required">Jam</label>
              <input type="number" id="inp-log-hours" class="form-input" min="0.25" step="0.25" placeholder="mis: 2.5">
            </div>
            <div class="form-group">
              <label class="form-label required">Tanggal</label>
              <input type="date" id="inp-log-date" class="form-input" value="${Utils.todayISO()}">
            </div>
            ${isPM ? `
            <div class="form-group log-form-user">
              <label class="form-label">Log untuk</label>
              <select id="sel-log-user" class="form-select">
                ${(Storage.query('sp_users', u => (_project?.memberIds || []).includes(u.id))).map(u =>
                  `<option value="${u.id}" ${u.id === _session.userId ? 'selected' : ''}>${Utils.escapeHtml(u.name)}</option>`
                ).join('')}
              </select>
            </div>` : ''}
          </div>
          <div class="form-group">
            <label class="form-label">Deskripsi</label>
            <input type="text" id="inp-log-desc" class="form-input" placeholder="Apa yang dikerjakan?">
          </div>
          <div class="log-form-actions">
            <button class="btn btn-ghost btn-sm" id="btn-log-cancel">Batal</button>
            <button class="btn btn-primary btn-sm" id="btn-log-submit">Simpan</button>
          </div>
        </div>

        <div class="timelog-list" id="timelog-list">
          ${logs.length === 0
            ? `<p class="text-sm text-muted" style="padding:var(--sp-2) 0;">Belum ada log waktu.</p>`
            : logs.map(log => {
                const u = users.find(u => u.id === log.userId);
                const canDelete = isPM || log.userId === _session?.userId;
                const [fg, bg] = Utils.getAvatarColor(log.userId);
                const initials = u ? Utils.getInitials(u.name) : '?';
                const avatarHtml = u?.avatar
                  ? `<img src="${u.avatar}" alt="${Utils.escapeHtml(u.name)}">`
                  : initials;
                return `
                  <div class="timelog-item" data-log-id="${log.id}">
                    <div class="timelog-avatar" style="background:${bg};color:${fg}">${avatarHtml}</div>
                    <div class="timelog-body">
                      <div class="timelog-meta">
                        <span class="timelog-user">${u ? Utils.escapeHtml(u.name) : 'Unknown'}</span>
                        <span class="timelog-hours">${Utils.formatHours(log.hours)}</span>
                        <span class="timelog-date text-muted">${Utils.formatDate(log.date)}</span>
                      </div>
                      ${log.description ? `<div class="timelog-desc text-sm text-muted">${Utils.escapeHtml(log.description)}</div>` : ''}
                    </div>
                    ${canDelete ? `<button class="timelog-delete btn-icon" data-delete-log="${log.id}" title="Hapus log">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                    </button>` : ''}
                  </div>`;
              }).join('')}
        </div>
      </div>`;

    if (window.lucide) lucide.createIcons({ scopeElement: section });
  }

  function _toggleLogForm(show) {
    const form = document.getElementById('log-time-form');
    if (!form) return;
    form.style.display = show ? 'block' : 'none';
    if (show) {
      const inp = document.getElementById('inp-log-hours');
      if (inp) inp.focus();
    }
  }

  function _submitLogTime() {
    const hours = document.getElementById('inp-log-hours')?.value;
    const date = document.getElementById('inp-log-date')?.value;
    const desc = document.getElementById('inp-log-desc')?.value || '';
    const isPM = _session && (_session.role === 'admin' || _session.role === 'pm');
    const userId = isPM
      ? (document.getElementById('sel-log-user')?.value || _session.userId)
      : _session.userId;

    if (!hours || parseFloat(hours) <= 0) {
      App.Toast.warning('Masukkan jumlah jam yang valid');
      return;
    }
    if (!date) {
      App.Toast.warning('Tanggal wajib diisi');
      return;
    }

    const result = TimeLog.add({ taskId: _task.id, userId, hours: parseFloat(hours), description: desc, date });
    if (result?.error) {
      App.Toast.error('Gagal log waktu', result.error);
      return;
    }

    // Refresh task data
    _task = Task.getById(_task.id) || _task;
    App.Toast.success('Waktu berhasil dicatat');
    _toggleLogForm(false);
    _renderTimeTracker();
  }

  function _deleteTimelog(logId) {
    if (!confirm('Hapus log waktu ini?')) return;
    const result = TimeLog.remove(logId, _session);
    if (result?.error) {
      App.Toast.error('Gagal menghapus', result.error);
      return;
    }
    _task = Task.getById(_task.id) || _task;
    _renderTimeTracker();
  }

  function _renderThread() {
    const container = document.getElementById('thread-container');
    if (!container) return;
    const entries = Comment.getByTask(_task.id);
    const users = Storage.get('sp_users') || [];

    if (entries.length === 0) {
      container.innerHTML = `<p style="font-size:var(--text-sm);color:var(--color-text-3);padding:var(--sp-2) 0;">Belum ada aktivitas.</p>`;
      return;
    }

    container.innerHTML = entries.map(entry => {
      const author = users.find(u => u.id === entry.authorId);
      const authorName = author ? Utils.escapeHtml(author.name) : 'Unknown';
      const avatarHtml = _buildAvatarHTML(entry.authorId, users, 'sm');

      if (entry.type === 'activity') {
        return _buildActivityItem(entry, authorName, avatarHtml);
      }
      return _buildCommentItem(entry, author, authorName, avatarHtml);
    }).join('');

    if (window.lucide) lucide.createIcons({ scopeElement: container });
  }

  function _buildActivityItem(entry, authorName, avatarHtml) {
    const { action, from, to } = entry.activityData || {};
    let text = '';

    if (action === 'task_created') {
      text = `membuat task ini`;
    } else if (action === 'status_changed') {
      text = `mengubah status dari <strong>${Utils.getStatusLabel(from)}</strong> ke <strong>${Utils.getStatusLabel(to)}</strong>`;
    } else if (action === 'priority_changed') {
      text = `mengubah prioritas dari <strong>${from}</strong> ke <strong>${to}</strong>`;
    } else if (action === 'assignee_changed') {
      const usersArr = Storage.get('sp_users') || [];
      const toNames = (to || []).map(id => usersArr.find(u => u.id === id)?.name || id);
      text = `mengubah assignee ke <strong>${toNames.join(', ') || 'kosong'}</strong>`;
    } else if (action === 'sprint_changed') {
      const sprints = Storage.get('sp_sprints') || [];
      const toSprint = sprints.find(s => s.id === to);
      text = `memindahkan ke <strong>${toSprint ? toSprint.name : 'Backlog'}</strong>`;
    } else {
      text = `melakukan aksi: ${action}`;
    }

    return `
      <div class="thread-item activity">
        <div class="activity-icon"><i data-lucide="activity"></i></div>
        <div class="thread-body">
          <span class="thread-author">${authorName}</span>
          <span class="thread-content">${text}</span>
          <span class="thread-time">${Utils.timeAgo(entry.createdAt)}</span>
        </div>
      </div>`;
  }

  function _buildCommentItem(entry, author, authorName, avatarHtml) {
    const canDelete = _session && (entry.authorId === _session.userId || _session.role === 'admin' || _session.role === 'pm');
    const ageMs = Date.now() - new Date(entry.createdAt).getTime();
    const canEdit = _session && entry.authorId === _session.userId && ageMs < 86400000;

    return `
      <div class="thread-item" data-comment-id="${entry.id}">
        <div class="thread-avatar">${avatarHtml}</div>
        <div class="thread-body">
          <div class="thread-header">
            <span class="thread-author">${authorName}</span>
            <span class="thread-time">${Utils.timeAgo(entry.createdAt)}</span>
            ${entry.isEdited ? '<span class="thread-edited">(diedit)</span>' : ''}
          </div>
          <div class="thread-content" id="comment-content-${entry.id}">${Utils.escapeHtml(entry.content)}</div>
          <div class="thread-actions">
            ${canEdit ? `<button class="thread-action-btn" data-edit="${entry.id}">Edit</button>` : ''}
            ${canDelete ? `<button class="thread-action-btn danger" data-delete="${entry.id}">Hapus</button>` : ''}
          </div>
        </div>
      </div>`;
  }

  function _autoResizeTextarea(el) {
    if (!el) return;
    const resize = () => {
      el.style.height = 'auto';
      el.style.height = el.scrollHeight + 'px';
    };
    el.addEventListener('input', resize);
    resize();
  }

  function _bindEvents() {
    document.addEventListener('click', _handleClick);
    document.addEventListener('change', _handleChange);

    const titleInput = document.getElementById('task-title-input');
    if (titleInput) {
      titleInput.addEventListener('blur', () => {
        const newTitle = titleInput.value.trim();
        if (newTitle && newTitle !== _task.title) {
          _saveField({ title: newTitle });
        }
      });
      titleInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); titleInput.blur(); }
      });
    }

    const descInput = document.getElementById('task-desc-input');
    if (descInput) {
      descInput.addEventListener('input', () => {
        clearTimeout(_descSaveTimer);
        _descSaveTimer = setTimeout(() => {
          _saveField({ description: descInput.value });
        }, 800);
      });
    }

    // Comment textarea expand on focus
    const commentTA = document.getElementById('comment-textarea');
    if (commentTA) {
      commentTA.addEventListener('focus', () => {
        const actions = document.getElementById('comment-form-actions');
        if (actions) actions.classList.add('visible');
        _autoResizeTextarea(commentTA);
      });
      commentTA.addEventListener('input', () => _autoResizeTextarea(commentTA));
    }
  }

  function _handleClick(e) {
    // Time log buttons
    if (e.target.id === 'btn-log-time') { _toggleLogForm(true); return; }
    if (e.target.id === 'btn-log-cancel') { _toggleLogForm(false); return; }
    if (e.target.id === 'btn-log-submit') { _submitLogTime(); return; }
    const deleteLog = e.target.closest('[data-delete-log]');
    if (deleteLog) { _deleteTimelog(deleteLog.dataset.deleteLog); return; }

    // Comment submit
    if (e.target.id === 'btn-comment-submit') {
      _submitComment();
      return;
    }
    if (e.target.id === 'btn-comment-cancel') {
      const ta = document.getElementById('comment-textarea');
      if (ta) ta.value = '';
      const actions = document.getElementById('comment-form-actions');
      if (actions) actions.classList.remove('visible');
      return;
    }

    // Edit/delete comment
    const editBtn = e.target.closest('[data-edit]');
    if (editBtn) { _startEditComment(editBtn.dataset.edit); return; }
    const deleteBtn = e.target.closest('[data-delete]');
    if (deleteBtn) { _deleteComment(deleteBtn.dataset.delete); return; }

    // Subtask toggle status (click on subtask item but not the link itself)
    const subtaskItem = e.target.closest('.subtask-item');
    if (subtaskItem && e.target.closest('.subtask-checkbox')) {
      e.preventDefault();
      const stId = subtaskItem.dataset.subtaskId;
      if (stId) _toggleSubtaskDone(stId);
      return;
    }

    // Add subtask
    if (e.target.id === 'btn-add-subtask') {
      _openSubtaskModal();
      return;
    }
    if (e.target.id === 'modal-subtask-close' || e.target.id === 'btn-subtask-cancel') {
      _closeSubtaskModal();
      return;
    }
    if (e.target.id === 'modal-subtask' || e.target.closest('#modal-subtask') === document.getElementById('modal-subtask') && e.target.id === 'modal-subtask') {
      if (e.target.id === 'modal-subtask') _closeSubtaskModal();
      return;
    }
    if (e.target.id === 'btn-subtask-save') {
      _saveSubtask();
      return;
    }

    // Delete task
    if (e.target.id === 'btn-delete-task') {
      _deleteTask();
      return;
    }

    // Label chip remove
    const labelRemove = e.target.closest('[data-label-id]');
    if (labelRemove) {
      _removeLabel(labelRemove.dataset.labelId);
      return;
    }

    // Edit comment save/cancel
    const saveEditBtn = e.target.closest('.btn-save-edit');
    if (saveEditBtn) { _saveCommentEdit(saveEditBtn.dataset.id); return; }
    const cancelEditBtn = e.target.closest('.btn-cancel-edit');
    if (cancelEditBtn) { _cancelCommentEdit(cancelEditBtn.dataset.id); return; }
  }

  function _handleChange(e) {
    const { id, value } = e.target;
    if (id === 'sel-status')    { _saveField({ status: value }); }
    if (id === 'sel-priority')  { _saveField({ priority: value }); }
    if (id === 'sel-type')      { _saveField({ type: value }); }
    if (id === 'sel-sprint')    { _saveField({ sprintId: value || null }); }
    if (id === 'inp-due-date')  { _saveField({ dueDate: value || null }); }
    if (id === 'inp-story-points') { _saveField({ storyPoints: value !== '' ? Number(value) : null }); }
    if (id === 'inp-est-hours') { _saveField({ estimatedHours: value !== '' ? Number(value) : null }); }
    if (id === 'sel-milestone') { _saveField({ milestoneId: value || null }); }
    if (id === 'sel-label-add' && value) { _addLabel(value); }
    if (e.target.classList.contains('assignee-cb')) { _saveAssignees(); }
  }

  function _saveField(data) {
    const result = Task.update(_task.id, data);
    if (!result || result.error) {
      App.Toast.error('Gagal menyimpan', result?.error || '');
      return;
    }
    _task = result;
  }

  function _saveAssignees() {
    const cbs = document.querySelectorAll('.assignee-cb:checked');
    const ids = Array.from(cbs).map(cb => cb.value);
    const prevIds = _task.assigneeIds || [];
    _saveField({ assigneeIds: ids });
    if (window.Notification) Notification.onTaskAssigned(_task, prevIds);
  }

  function _addLabel(labelId) {
    const existing = _task.labelIds || [];
    if (existing.includes(labelId)) return;
    _saveField({ labelIds: [...existing, labelId] });
    _rerenderSidebar();
  }

  function _removeLabel(labelId) {
    const existing = _task.labelIds || [];
    _saveField({ labelIds: existing.filter(id => id !== labelId) });
    _rerenderSidebar();
  }

  function _rerenderSidebar() {
    const sidebar = document.querySelector('.task-detail-sidebar');
    if (!sidebar) return;
    const users = Storage.get('sp_users') || [];
    const sprint = _task.sprintId ? (Storage.get('sp_sprints') || []).find(s => s.id === _task.sprintId) : null;
    sidebar.innerHTML = _buildSidebarCard(users, sprint, _canEdit());
    if (window.lucide) lucide.createIcons({ scopeElement: sidebar });
  }

  function _submitComment() {
    const ta = document.getElementById('comment-textarea');
    if (!ta || !ta.value.trim()) return;
    const result = Comment.addComment(_task.id, ta.value.trim());
    if (!result || result.error) {
      App.Toast.error('Gagal mengirim komentar');
      return;
    }
    if (window.Notification) Notification.onTaskCommented(_task, null);
    ta.value = '';
    ta.style.height = 'auto';
    const actions = document.getElementById('comment-form-actions');
    if (actions) actions.classList.remove('visible');
    _renderThread();
  }

  function _startEditComment(commentId) {
    _editingCommentId = commentId;
    const contentEl = document.getElementById(`comment-content-${commentId}`);
    if (!contentEl) return;
    const original = contentEl.textContent;
    const commentItem = contentEl.closest('.thread-item');
    const actionsEl = commentItem.querySelector('.thread-actions');
    actionsEl.style.display = 'none';

    contentEl.innerHTML = `
      <div class="comment-edit-wrap">
        <textarea class="comment-edit-textarea" id="edit-ta-${commentId}">${Utils.escapeHtml(original)}</textarea>
        <div class="comment-edit-actions">
          <button class="btn btn-ghost btn-sm btn-cancel-edit" data-id="${commentId}">Batal</button>
          <button class="btn btn-primary btn-sm btn-save-edit" data-id="${commentId}">Simpan</button>
        </div>
      </div>`;
    const ta = document.getElementById(`edit-ta-${commentId}`);
    if (ta) { ta.focus(); ta.select(); _autoResizeTextarea(ta); }
  }

  function _saveCommentEdit(commentId) {
    const ta = document.getElementById(`edit-ta-${commentId}`);
    if (!ta) return;
    const result = Comment.editComment(commentId, ta.value);
    if (!result || result.error) {
      App.Toast.error('Gagal menyimpan', result?.error === 'edit_expired' ? 'Komentar hanya bisa diedit dalam 24 jam' : '');
      return;
    }
    _editingCommentId = null;
    _renderThread();
  }

  function _cancelCommentEdit(commentId) {
    _editingCommentId = null;
    _renderThread();
  }

  function _deleteComment(commentId) {
    if (!confirm('Hapus komentar ini?')) return;
    Comment.deleteComment(commentId);
    _renderThread();
  }

  function _toggleSubtaskDone(subtaskId) {
    const st = Task.getById(subtaskId);
    if (!st) return;
    const newStatus = st.status === 'done' ? 'todo' : 'done';
    Task.update(subtaskId, { status: newStatus });
    // Re-render subtask section
    const subtaskSection = document.getElementById('subtask-list');
    if (!subtaskSection) return;
    const parent = subtaskSection.closest('[class]');
    if (!parent) return;
    // Full re-render of subtask section
    const subtasks = Task.getSubtasks(_task.id);
    const done = subtasks.filter(t => t.status === 'done').length;
    const total = subtasks.length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    const progressEl = parent.querySelector('.subtask-progress-fill');
    if (progressEl) progressEl.style.width = `${pct}%`;
    const progressText = parent.querySelector('.subtask-progress span');
    if (progressText) progressText.textContent = `${pct}%`;
    subtaskSection.innerHTML = subtasks.map(st => _buildSubtaskItem(Task.getById(st.id) || st)).join('');
    if (window.lucide) lucide.createIcons({ scopeElement: subtaskSection });
  }

  function _openSubtaskModal() {
    const modal = document.getElementById('modal-subtask');
    if (modal) modal.style.display = 'flex';
    const inp = document.getElementById('subtask-title-input');
    if (inp) { inp.value = ''; inp.focus(); }
  }

  function _closeSubtaskModal() {
    const modal = document.getElementById('modal-subtask');
    if (modal) modal.style.display = 'none';
  }

  function _saveSubtask() {
    const title = document.getElementById('subtask-title-input')?.value?.trim();
    if (!title) { App.Toast.warning('Judul subtask wajib diisi'); return; }
    const type = document.getElementById('subtask-type-input')?.value || 'task';
    const priority = document.getElementById('subtask-priority-input')?.value || 'medium';
    const result = Task.addSubtask(_task.id, { title, type, priority });
    if (!result || result.error) {
      App.Toast.error('Gagal membuat subtask', result?.error || '');
      return;
    }
    _closeSubtaskModal();
    App.Toast.success('Subtask dibuat');
    // Re-render subtask list
    const subtaskContainer = document.querySelector('.task-detail-main > div:nth-child(3)');
    if (subtaskContainer) {
      subtaskContainer.outerHTML = _buildSubtaskSection();
      if (window.lucide) lucide.createIcons();
    } else {
      // Fallback: full re-render
      _renderPage();
      _bindEvents();
    }
  }

  function _deleteTask() {
    if (!confirm(`Hapus task "${_task.key}: ${_task.title}"?\nTindakan ini tidak bisa dibatalkan.`)) return;
    Task.remove(_task.id);
    App.Toast.success('Task dihapus');
    setTimeout(() => {
      window.location.href = `/pages/project-detail.html?id=${_task.projectId}`;
    }, 800);
  }

  return { init };
})();
