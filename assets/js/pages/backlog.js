/* SIMPRO Page: backlog — Sprint Planning & Backlog v0.8.1 */
const Page = (() => {
  let _session = null;
  let _project = null;
  let _filters = { status: '', type: '', priority: '', assignee: '' };
  // BUG-12 FIX: Preserve collapse state across renders
  let _collapseState = {}; // { sprintId: true } = collapsed; 'backlog': true = backlog collapsed

  // Drag state
  let _drag = {
    active: false, taskId: null, ghost: null,
    sourceSprintId: null, targetRow: null, dropBefore: false,
    _handle: null, _moveHandler: null,
  };

  // ── Helpers ──────────────────────────────────────────────────────────────
  function _getUsers() { return Storage.get('sp_users') || []; }
  function _getUserById(id) { return _getUsers().find(u => u.id === id) || null; }

  function _getVisibleProjects() {
    const projects = Storage.get('sp_projects') || [];
    if (_session.role === 'admin' || _session.role === 'pm') {
      return projects.filter(p => p.status !== 'archived');
    }
    // BUG-12 FIX: Guard against undefined memberIds
    return projects.filter(p => Array.isArray(p.memberIds) && p.memberIds.includes(_session.userId) && p.status !== 'archived');
  }

  function _canManage() {
    return _session && (_session.role === 'admin' || _session.role === 'pm');
  }

  function _typeIcon(type) {
    const map = {
      story: `<i data-lucide="bookmark" style="width:13px;height:13px;color:var(--color-story)"></i>`,
      bug:   `<i data-lucide="bug" style="width:13px;height:13px;color:var(--color-bug)"></i>`,
      task:  `<i data-lucide="check-square" style="width:13px;height:13px;color:var(--color-task)"></i>`,
      epic:  `<i data-lucide="zap" style="width:13px;height:13px;color:var(--color-epic)"></i>`,
    };
    return map[type] || map.task;
  }

  function _statusBadge(status) {
    const map = {
      'todo':        { label: 'To Do',       dot: '#8c93a3' },
      'in-progress': { label: 'In Progress', dot: 'var(--color-info)' },
      'review':      { label: 'Review',      dot: 'var(--color-warning)' },
      'done':        { label: 'Done',        dot: 'var(--color-success)' },
    };
    const s = map[status] || map['todo'];
    return `<span class="backlog-status-badge" style="--dot:${s.dot};" title="${s.label}">
      <span class="backlog-status-dot"></span>${s.label}
    </span>`;
  }

  function _avatarHtml(userId) {
    const user = _getUserById(userId);
    if (!user) return '';
    const [fg, bg] = Utils.getAvatarColor(userId);
    const initials = Utils.getInitials(user.name);
    if (user.avatar) {
      return `<img class="mini-avatar" src="${user.avatar}" title="${user.name}" style="width:20px;height:20px;object-fit:cover;border-radius:50%;">`;
    }
    return `<span class="mini-avatar" title="${user.name}" style="background:${bg};color:${fg};">${initials}</span>`;
  }

  function _formatDateRange(start, end) {
    if (!start && !end) return '';
    return `${start ? Utils.formatDateShort(start) : '?'} – ${end ? Utils.formatDateShort(end) : '?'}`;
  }

  function _formatDueDate(dueDate) {
    if (!dueDate) return '';
    const today = Utils.todayISO();
    const isOverdue = dueDate < today;
    const cls = isOverdue ? 'backlog-due overdue' : 'backlog-due';
    return `<span class="${cls}" title="Due date">${Utils.formatDateShort(dueDate)}</span>`;
  }

  function _applyFilters(tasks) {
    return tasks.filter(t => {
      if (_filters.status && t.status !== _filters.status) return false;
      if (_filters.type && t.type !== _filters.type) return false;
      if (_filters.priority && t.priority !== _filters.priority) return false;
      if (_filters.assignee && !(t.assigneeIds || []).includes(_filters.assignee)) return false;
      return true;
    });
  }

  // ── Render Task Row ───────────────────────────────────────────────────────
  function _renderTaskRow(task, inSprint) {
    const assigneeHtml = (task.assigneeIds || []).map(_avatarHtml).join('');
    const sp = task.storyPoints != null && task.storyPoints !== '' ? task.storyPoints : '—';
    const canDrag = _canManage();
    const dueHtml = _formatDueDate(task.dueDate);
    return `
      <li class="task-row" data-task-id="${task.id}" data-sprint-id="${task.sprintId || ''}">
        ${canDrag ? `<span class="drag-handle" title="Drag"><i data-lucide="grip-vertical" style="width:14px;height:14px;"></i></span>` : ''}
        <a class="task-key" href="task-detail.html?id=${task.id}">${task.key}</a>
        <span class="task-type-icon">${_typeIcon(task.type)}</span>
        <span class="task-row-title" data-nav-task="${task.id}">${Utils.escapeHtml(task.title)}</span>
        <span class="task-row-meta">
          ${_statusBadge(task.status)}
          ${dueHtml}
          <span class="task-priority-dot priority-${task.priority}" title="${task.priority}"></span>
          <span class="task-row-assignees">${assigneeHtml}</span>
          <span class="task-sp">${sp}</span>
          ${inSprint && canDrag ? `<button class="task-remove-btn" data-remove-task="${task.id}" title="Pindah ke Backlog"><i data-lucide="x" style="width:13px;height:13px;"></i></button>` : ''}
        </span>
      </li>
    `;
  }

  // ── Render Sprint Section ─────────────────────────────────────────────────
  function _renderSprintSection(sprint) {
    const allTasks = Storage.query('sp_tasks', t => t.sprintId === sprint.id && !t.parentId)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    const tasks = _applyFilters(allTasks);
    const stats = Sprint.getSprintStats(sprint.id);
    const canManage = _canManage();
    const isActive = sprint.status === 'active';
    const isPlanned = sprint.status === 'planned';

    const statusBadge = {
      active: `<span class="sprint-status-badge status-active">Active</span>`,
      planned: `<span class="sprint-status-badge status-planned">Planned</span>`,
      completed: `<span class="sprint-status-badge status-completed">Completed</span>`,
    }[sprint.status] || '';

    let actionBtns = '';
    if (canManage) {
      if (isPlanned) {
        actionBtns = `
          <button class="btn-start" data-sprint-action="start" data-sprint-id="${sprint.id}"><i data-lucide="play" style="width:12px;height:12px;"></i> Mulai Sprint</button>
          <button data-sprint-action="edit" data-sprint-id="${sprint.id}" title="Edit"><i data-lucide="pencil" style="width:12px;height:12px;"></i></button>
          <button class="btn-danger" data-sprint-action="delete" data-sprint-id="${sprint.id}" title="Hapus"><i data-lucide="trash-2" style="width:12px;height:12px;"></i></button>
        `;
      } else if (isActive) {
        actionBtns = `
          <button class="btn-complete" data-sprint-action="complete" data-sprint-id="${sprint.id}"><i data-lucide="check-circle" style="width:12px;height:12px;"></i> Selesaikan</button>
          <button data-sprint-action="edit" data-sprint-id="${sprint.id}" title="Edit"><i data-lucide="pencil" style="width:12px;height:12px;"></i></button>
        `;
      }
    }

    const filteredCount = tasks.length !== allTasks.length
      ? `<span class="backlog-filter-note">(${tasks.length} dari ${allTasks.length} ditampilkan)</span>` : '';

    const taskRows = tasks.length
      ? tasks.map(t => _renderTaskRow(t, true)).join('')
      : `<li class="sprint-empty-state"><i data-lucide="inbox" style="width:16px;height:16px;"></i> ${allTasks.length ? 'Tidak ada task yang cocok filter' : 'Belum ada task — drag dari backlog atau klik tambah'}</li>`;

    const addBtn = canManage
      ? `<button class="sprint-add-task-btn" data-sprint-action="add-task" data-sprint-id="${sprint.id}"><i data-lucide="plus" style="width:14px;height:14px;"></i> Tambah Task dari Backlog</button>`
      : '';

    return `
      <div class="sprint-section ${isActive ? 'is-active' : ''} ${_collapseState[sprint.id] ? 'collapsed' : ''}" data-sprint-id="${sprint.id}">
        <div class="sprint-header" data-collapse-sprint="${sprint.id}">
          <i class="sprint-collapse-icon" data-lucide="chevron-down" style="width:16px;height:16px;"></i>
          <span class="sprint-name">${Utils.escapeHtml(sprint.name)}</span>
          ${statusBadge}
          <div class="sprint-meta">
            ${sprint.goal ? `<span class="sprint-dates" style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${Utils.escapeHtml(sprint.goal)}">${Utils.escapeHtml(sprint.goal)}</span>` : ''}
            <span class="sprint-dates">${_formatDateRange(sprint.startDate, sprint.endDate)}</span>
            <span class="sprint-points">${stats.donePoints}/${stats.totalPoints} SP · ${stats.done}/${stats.total}</span>
            ${filteredCount}
            <div class="sprint-actions" onclick="event.stopPropagation()">
              ${actionBtns}
            </div>
          </div>
        </div>
        <div class="sprint-body">
          <ul class="sprint-task-list" data-list-sprint="${sprint.id}">
            ${taskRows}
          </ul>
          ${addBtn}
        </div>
      </div>
    `;
  }

  // ── Render Backlog Section ────────────────────────────────────────────────
  function _renderBacklogSection() {
    const allTasks = Storage.query('sp_tasks', t => t.projectId === _project.id && !t.sprintId && !t.parentId)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    const tasks = _applyFilters(allTasks);
    const canManage = _canManage();

    const filteredCount = tasks.length !== allTasks.length
      ? `<span class="backlog-filter-note">(${tasks.length} dari ${allTasks.length} ditampilkan)</span>` : '';

    const taskRows = tasks.length
      ? tasks.map(t => _renderTaskRow(t, false)).join('')
      : `<li class="sprint-empty-state"><i data-lucide="${allTasks.length ? 'filter-x' : 'check-circle'}" style="width:16px;height:16px;"></i> ${allTasks.length ? 'Tidak ada task yang cocok filter' : 'Backlog kosong'}</li>`;

    return `
      <div class="backlog-section ${_collapseState['backlog'] ? 'collapsed' : ''}" id="backlog-section">
        <div class="backlog-section-header" data-collapse-backlog="1">
          <i class="sprint-collapse-icon" data-lucide="chevron-down" style="width:16px;height:16px;"></i>
          <span class="backlog-section-title">Backlog</span>
          <span class="backlog-count">${allTasks.length} task</span>
          ${filteredCount}
        </div>
        <div class="sprint-body">
          <ul class="sprint-task-list" data-list-sprint="">
            ${taskRows}
          </ul>
          ${canManage ? `<button class="sprint-add-task-btn" id="backlog-new-task-btn"><i data-lucide="plus" style="width:14px;height:14px;"></i> Buat Task Baru</button>` : ''}
        </div>
      </div>
    `;
  }

  // ── Render Filter Bar ─────────────────────────────────────────────────────
  function _renderFilterBar() {
    const users = _getUsers().filter(u => {
      const proj = _project;
      // BUG-12 FIX: Guard against undefined memberIds
      return proj && Array.isArray(proj.memberIds) && proj.memberIds.includes(u.id);
    });
    const hasFilter = _filters.status || _filters.type || _filters.priority || _filters.assignee;
    return `
      <div class="backlog-filter-bar">
        <select class="backlog-filter-select" id="filter-status">
          <option value="">Semua Status</option>
          <option value="todo" ${_filters.status==='todo'?'selected':''}>To Do</option>
          <option value="in-progress" ${_filters.status==='in-progress'?'selected':''}>In Progress</option>
          <option value="review" ${_filters.status==='review'?'selected':''}>Review</option>
          <option value="done" ${_filters.status==='done'?'selected':''}>Done</option>
        </select>
        <select class="backlog-filter-select" id="filter-type">
          <option value="">Semua Tipe</option>
          <option value="task" ${_filters.type==='task'?'selected':''}>Task</option>
          <option value="story" ${_filters.type==='story'?'selected':''}>Story</option>
          <option value="bug" ${_filters.type==='bug'?'selected':''}>Bug</option>
          <option value="epic" ${_filters.type==='epic'?'selected':''}>Epic</option>
        </select>
        <select class="backlog-filter-select" id="filter-priority">
          <option value="">Semua Prioritas</option>
          <option value="critical" ${_filters.priority==='critical'?'selected':''}>Critical</option>
          <option value="high" ${_filters.priority==='high'?'selected':''}>High</option>
          <option value="medium" ${_filters.priority==='medium'?'selected':''}>Medium</option>
          <option value="low" ${_filters.priority==='low'?'selected':''}>Low</option>
        </select>
        <select class="backlog-filter-select" id="filter-assignee">
          <option value="">Semua Assignee</option>
          ${users.map(u => `<option value="${u.id}" ${_filters.assignee===u.id?'selected':''}>${Utils.escapeHtml(u.name)}</option>`).join('')}
        </select>
        ${hasFilter ? `<button class="backlog-filter-clear" id="filter-clear-btn" title="Reset filter">
          <i data-lucide="x" style="width:12px;height:12px;"></i> Reset
        </button>` : ''}
      </div>
    `;
  }

  // ── Render ────────────────────────────────────────────────────────────────
  function _render() {
    const main = document.getElementById('main-content');
    if (!main) return;

    const projects = _getVisibleProjects();
    if (!projects.length) {
      main.innerHTML = `<div style="padding:var(--sp-8);text-align:center;color:var(--color-text-3);">Tidak ada project tersedia.</div>`;
      return;
    }

    const projectOptions = projects.map(p =>
      `<option value="${p.id}" ${_project && p.id === _project.id ? 'selected' : ''}>${Utils.escapeHtml(p.name)}</option>`
    ).join('');

    const sprints = Sprint.getByProject(_project.id).filter(s => s.status !== 'completed');
    const canManage = _canManage();

    main.innerHTML = `
      <div class="backlog-page">
        <div class="backlog-toolbar">
          <div class="backlog-toolbar-left">
            <select class="backlog-project-select" id="project-select">${projectOptions}</select>
          </div>
          <div style="display:flex;gap:var(--sp-2);">
            ${canManage ? `<button class="btn btn-sm btn-secondary" id="create-sprint-btn"><i data-lucide="plus" style="width:14px;height:14px;"></i> Sprint Baru</button>` : ''}
            ${canManage ? `<button class="btn btn-sm btn-primary" id="toolbar-task-btn"><i data-lucide="plus" style="width:14px;height:14px;"></i> Task</button>` : ''}
          </div>
        </div>
        ${_renderFilterBar()}
        <div class="backlog-body" id="backlog-body">
          ${sprints.map(_renderSprintSection).join('')}
          ${_renderBacklogSection()}
        </div>
      </div>
    `;

    if (window.lucide) lucide.createIcons();
    _bindEvents();
    _bindDragDrop();
  }

  // ── Events ────────────────────────────────────────────────────────────────
  function _openTaskModal(opts) {
    if (typeof TaskModal !== 'undefined') {
      TaskModal.open({ ...opts, onSuccess: _render });
    }
  }

  function _bindEvents() {
    document.getElementById('project-select')?.addEventListener('change', e => {
      const projects = _getVisibleProjects();
      _project = projects.find(p => p.id === e.target.value) || _project;
      _filters = { status: '', type: '', priority: '', assignee: '' };
      // BUG-12 FIX: Reset collapse state when project changes
      _collapseState = {};
      _render();
    });

    document.getElementById('create-sprint-btn')?.addEventListener('click', _showCreateSprintModal);
    document.getElementById('toolbar-task-btn')?.addEventListener('click', () => _openTaskModal({ projectId: _project.id }));
    document.getElementById('backlog-new-task-btn')?.addEventListener('click', () => _openTaskModal({ projectId: _project.id }));

    // Filter controls
    document.getElementById('filter-status')?.addEventListener('change', e => { _filters.status = e.target.value; _render(); });
    document.getElementById('filter-type')?.addEventListener('change', e => { _filters.type = e.target.value; _render(); });
    document.getElementById('filter-priority')?.addEventListener('change', e => { _filters.priority = e.target.value; _render(); });
    document.getElementById('filter-assignee')?.addEventListener('change', e => { _filters.assignee = e.target.value; _render(); });
    document.getElementById('filter-clear-btn')?.addEventListener('click', () => {
      _filters = { status: '', type: '', priority: '', assignee: '' };
      _render();
    });

    document.getElementById('backlog-body')?.addEventListener('click', e => {
      // Sprint actions
      const actionBtn = e.target.closest('[data-sprint-action]');
      if (actionBtn) {
        e.stopPropagation();
        const action = actionBtn.dataset.sprintAction;
        const sprintId = actionBtn.dataset.sprintId;
        if (action === 'start')    _confirmStartSprint(sprintId);
        if (action === 'complete') _showCompleteModal(sprintId);
        if (action === 'edit')     _showEditSprintModal(sprintId);
        if (action === 'delete')   _confirmDeleteSprint(sprintId);
        if (action === 'add-task') _showAddTaskModal(sprintId);
        return;
      }

      // Remove task from sprint
      const removeBtn = e.target.closest('[data-remove-task]');
      if (removeBtn) {
        e.stopPropagation();
        const result = Sprint.removeTask(removeBtn.dataset.removeTask);
        if (result && result.error === 'permission_denied') {
          App.Toast.error('Tidak ada izin untuk memindahkan task');
          return;
        }
        _render();
        return;
      }

      // Collapse sprint
      const collapseEl = e.target.closest('[data-collapse-sprint]');
      if (collapseEl) {
        const s = collapseEl.closest('.sprint-section');
        if (s) {
          s.classList.toggle('collapsed');
          // BUG-12 FIX: Persist collapse state so it survives re-renders
          const sid = collapseEl.dataset.collapseSprint;
          _collapseState[sid] = s.classList.contains('collapsed');
          if (window.lucide) lucide.createIcons();
        }
        return;
      }

      // Collapse backlog
      const collapseBacklog = e.target.closest('[data-collapse-backlog]');
      if (collapseBacklog) {
        const sec = document.getElementById('backlog-section');
        if (sec) {
          sec.classList.toggle('collapsed');
          // BUG-12 FIX: Persist collapse state
          _collapseState['backlog'] = sec.classList.contains('collapsed');
          if (window.lucide) lucide.createIcons();
        }
        return;
      }

      // Navigate to task
      const navTask = e.target.closest('[data-nav-task]');
      if (navTask) {
        window.location.href = `./task-detail.html?id=${navTask.dataset.navTask}`;
      }
    });
  }

  // ── Sprint modals ─────────────────────────────────────────────────────────
  function _sprintFormBody(sprint) {
    return `
      <div class="sprint-form-grid">
        <div class="form-group" style="grid-column:1/-1">
          <label class="form-label">Nama Sprint *</label>
          <input class="form-input" id="sf-name" value="${sprint ? Utils.escapeHtml(sprint.name) : ''}" placeholder="Sprint 1">
        </div>
        <div class="form-group" style="grid-column:1/-1">
          <label class="form-label">Sprint Goal</label>
          <input class="form-input" id="sf-goal" value="${sprint ? Utils.escapeHtml(sprint.goal || '') : ''}" placeholder="Tujuan sprint ini…">
        </div>
        <div class="form-group">
          <label class="form-label">Tanggal Mulai</label>
          <input class="form-input" type="date" id="sf-start" value="${sprint?.startDate || ''}">
        </div>
        <div class="form-group">
          <label class="form-label">Tanggal Selesai</label>
          <input class="form-input" type="date" id="sf-end" value="${sprint?.endDate || ''}">
        </div>
      </div>
    `;
  }

  function _showCreateSprintModal() {
    const { overlay, close } = App.createModal({
      title: 'Sprint Baru',
      body: _sprintFormBody(null),
      footer: `<button class="btn btn-secondary btn-sm" id="m-cancel">Batal</button>
               <button class="btn btn-primary btn-sm" id="m-save">Buat Sprint</button>`,
    });
    overlay.querySelector('#m-cancel').addEventListener('click', close);
    overlay.querySelector('#m-save').addEventListener('click', () => {
      const name = document.getElementById('sf-name')?.value.trim();
      if (!name) { App.Toast.error('Nama sprint wajib diisi'); return; }
      const result = Sprint.create({
        projectId: _project.id, name,
        goal: document.getElementById('sf-goal')?.value.trim() || '',
        startDate: document.getElementById('sf-start')?.value || null,
        endDate: document.getElementById('sf-end')?.value || null,
      });
      if (result.error) { App.Toast.error('Gagal membuat sprint'); return; }
      close(); App.Toast.success('Sprint berhasil dibuat'); _render();
    });
    if (window.lucide) lucide.createIcons();
  }

  function _showEditSprintModal(sprintId) {
    const sprint = Sprint.getById(sprintId);
    if (!sprint) return;
    const { overlay, close } = App.createModal({
      title: 'Edit Sprint',
      body: _sprintFormBody(sprint),
      footer: `<button class="btn btn-secondary btn-sm" id="m-cancel">Batal</button>
               <button class="btn btn-primary btn-sm" id="m-save">Simpan</button>`,
    });
    overlay.querySelector('#m-cancel').addEventListener('click', close);
    overlay.querySelector('#m-save').addEventListener('click', () => {
      const name = document.getElementById('sf-name')?.value.trim();
      if (!name) { App.Toast.error('Nama sprint wajib diisi'); return; }
      Sprint.update(sprintId, {
        name,
        goal: document.getElementById('sf-goal')?.value.trim() || '',
        startDate: document.getElementById('sf-start')?.value || null,
        endDate: document.getElementById('sf-end')?.value || null,
      });
      close(); App.Toast.success('Sprint diperbarui'); _render();
    });
    if (window.lucide) lucide.createIcons();
  }

  function _confirmStartSprint(sprintId) {
    const sprint = Sprint.getById(sprintId);
    if (!sprint) return;
    const stats = Sprint.getSprintStats(sprintId);
    const { overlay, close } = App.createModal({
      title: `Mulai "${sprint.name}"?`,
      body: `<p style="font-size:var(--text-sm);color:var(--color-text-2);line-height:1.6;">
        Sprint ini berisi <strong>${stats.total} task</strong> (${stats.totalPoints} SP).
        ${sprint.startDate ? `Durasi: ${_formatDateRange(sprint.startDate, sprint.endDate)}.` : ''}
        Hanya satu sprint aktif per project diizinkan.</p>`,
      footer: `<button class="btn btn-secondary btn-sm" id="m-cancel">Batal</button>
               <button class="btn btn-primary btn-sm" id="m-start">Mulai Sprint</button>`,
    });
    overlay.querySelector('#m-cancel').addEventListener('click', close);
    overlay.querySelector('#m-start').addEventListener('click', () => {
      const result = Sprint.start(sprintId);
      if (result.error === 'active_exists') {
        App.Toast.error(`Sprint "${result.sprintName}" sudah aktif`);
        close();
      } else if (result.ok) {
        close();
        App.Toast.success('Sprint dimulai!');
        _render();
      } else {
        close();
      }
    });
  }

  function _showCompleteModal(sprintId) {
    const sprint = Sprint.getById(sprintId);
    if (!sprint) return;
    const tasks = Storage.query('sp_tasks', t => t.sprintId === sprintId && !t.parentId);
    const done = tasks.filter(t => t.status === 'done');
    const undone = tasks.filter(t => t.status !== 'done');
    const velocity = done.reduce((s, t) => s + (t.storyPoints || 0), 0);
    const plannedSprints = Sprint.getByProject(_project.id).filter(s => s.status === 'planned');
    const nextOptions = plannedSprints.map(s => `<option value="${s.id}">${Utils.escapeHtml(s.name)}</option>`).join('');

    const undoneSection = undone.length > 0 ? `
      <p style="font-size:var(--text-sm);color:var(--color-text-2);margin-top:var(--sp-4);margin-bottom:var(--sp-2);">
        <strong>${undone.length} task</strong> belum selesai. Pindahkan ke:
      </p>
      <div class="complete-sprint-options">
        <label>
          <input type="radio" name="undone" value="backlog" checked>
          Kembalikan ke Backlog
        </label>
        ${plannedSprints.length ? `<label>
          <input type="radio" name="undone" value="next_sprint">
          Pindah ke Sprint Lain
          <select id="next-sprint-sel" style="margin-left:var(--sp-2);">${nextOptions}</select>
        </label>` : ''}
      </div>
    ` : `<p style="font-size:var(--text-sm);color:var(--color-success);margin-top:var(--sp-4);">Semua task selesai!</p>`;

    const { overlay, close } = App.createModal({
      title: `Selesaikan "${sprint.name}"`,
      body: `
        <div class="sprint-summary-stats">
          <div class="sprint-summary-stat stat-done">
            <div class="stat-value">${done.length}</div>
            <div class="stat-label">Selesai</div>
          </div>
          <div class="sprint-summary-stat stat-carry">
            <div class="stat-value">${undone.length}</div>
            <div class="stat-label">Belum Selesai</div>
          </div>
          <div class="sprint-summary-stat">
            <div class="stat-value">${velocity}</div>
            <div class="stat-label">Velocity (SP)</div>
          </div>
        </div>
        ${undoneSection}
      `,
      footer: `<button class="btn btn-secondary btn-sm" id="m-cancel">Batal</button>
               <button class="btn btn-primary btn-sm" id="m-complete">Selesaikan Sprint</button>`,
    });
    overlay.querySelector('#m-cancel').addEventListener('click', close);
    overlay.querySelector('#m-complete').addEventListener('click', () => {
      const behaviorEl = overlay.querySelector('[name="undone"]:checked');
      const behavior = behaviorEl ? behaviorEl.value : 'backlog';
      const targetId = behavior === 'next_sprint' ? overlay.querySelector('#next-sprint-sel')?.value : null;
      const result = Sprint.complete(sprintId, behavior, targetId);
      if (result.ok) {
        close();
        App.Toast.success(
          'Sprint selesai!',
          `${result.summary.doneTasks}/${result.summary.totalTasks} task done · ${result.summary.velocity} SP velocity`
        );
        _render();
      } else if (result.error) {
        App.Toast.error('Gagal menyelesaikan sprint', result.error);
      }
    });
    if (window.lucide) lucide.createIcons();
  }

  function _confirmDeleteSprint(sprintId) {
    const sprint = Sprint.getById(sprintId);
    if (!sprint) return;
    const { overlay, close } = App.createModal({
      title: `Hapus "${sprint.name}"?`,
      body: `<p style="font-size:var(--text-sm);color:var(--color-text-2);">Semua task akan dikembalikan ke backlog. Tindakan ini tidak bisa dibatalkan.</p>`,
      footer: `<button class="btn btn-secondary btn-sm" id="m-cancel">Batal</button>
               <button class="btn btn-danger btn-sm" id="m-delete">Hapus Sprint</button>`,
    });
    overlay.querySelector('#m-cancel').addEventListener('click', close);
    overlay.querySelector('#m-delete').addEventListener('click', () => {
      const result = Sprint.remove(sprintId);
      if (result.ok) {
        App.Toast.success('Sprint dihapus');
        _render();
      } else if (result.error === 'cannot_delete_active') {
        App.Toast.error('Sprint aktif tidak bisa dihapus. Selesaikan sprint terlebih dahulu.');
      } else if (result.error === 'permission_denied') {
        App.Toast.error('Tidak ada izin untuk menghapus sprint');
      }
      close();
    });
  }

  function _showAddTaskModal(sprintId) {
    const sprint = Sprint.getById(sprintId);
    if (!sprint) return;
    const backlogTasks = Storage.query('sp_tasks', t => t.projectId === _project.id && !t.sprintId && !t.parentId)
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    if (!backlogTasks.length) {
      App.Toast.info('Backlog kosong. Buat task baru terlebih dahulu.');
      return;
    }

    const rows = backlogTasks.map(t => `
      <label style="display:flex;align-items:center;gap:var(--sp-2);padding:var(--sp-2) 0;border-bottom:1px solid var(--color-border);cursor:pointer;font-size:var(--text-sm);">
        <input type="checkbox" value="${t.id}" style="flex-shrink:0;">
        <span style="font-family:monospace;font-size:var(--text-xs);color:var(--color-text-3);min-width:52px;">${t.key}</span>
        <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${Utils.escapeHtml(t.title)}">${Utils.escapeHtml(t.title)}</span>
        <span style="font-size:var(--text-xs);color:var(--color-text-3);">${t.storyPoints || 0} SP</span>
      </label>
    `).join('');

    const { overlay, close } = App.createModal({
      title: `Tambah Task ke "${sprint.name}"`,
      body: `<div style="max-height:360px;overflow-y:auto;">${rows}</div>`,
      footer: `<button class="btn btn-secondary btn-sm" id="m-cancel">Batal</button>
               <button class="btn btn-primary btn-sm" id="m-add">Tambah</button>`,
    });
    overlay.querySelector('#m-cancel').addEventListener('click', close);
    overlay.querySelector('#m-add').addEventListener('click', () => {
      const checked = [...overlay.querySelectorAll('input[type=checkbox]:checked')];
      if (!checked.length) { App.Toast.error('Pilih minimal satu task'); return; }
      // BUG-12 FIX: Add all tasks, compute order after all added to avoid partial re-renders
      // Sprint.addTask emits task:updated which can trigger _render, so update order in same pass
      const sprintTasks = Storage.query('sp_tasks', t => t.sprintId === sprintId && !t.parentId);
      let nextOrder = sprintTasks.length > 0
        ? Math.max(...sprintTasks.map(t => t.order || 0)) + 1
        : 0;
      const taskIdsToAdd = checked.map(cb => cb.value);
      // Build order map first
      const orderMap = {};
      taskIdsToAdd.forEach(id => { orderMap[id] = nextOrder++; });
      // Update all at once in a single Storage.update call to avoid multiple renders
      Storage.update('sp_tasks', arr => arr.map(t =>
        orderMap[t.id] !== undefined ? { ...t, sprintId, order: orderMap[t.id], updatedAt: Utils.nowISO() } : t
      ));
      close();
      App.Toast.success(`${taskIdsToAdd.length} task ditambahkan ke sprint`);
      _render();
    });
  }

  // ── Drag & Drop ───────────────────────────────────────────────────────────
  function _bindDragDrop() {
    if (!_canManage()) return;
    const body = document.getElementById('backlog-body');
    if (!body) return;

    body.addEventListener('pointerdown', e => {
      const handle = e.target.closest('.drag-handle');
      if (!handle) return;
      const row = handle.closest('.task-row');
      if (!row) return;
      e.preventDefault();

      _drag.active = true;
      _drag.taskId = row.dataset.taskId;
      _drag.sourceSprintId = row.dataset.sprintId || null;

      const ghost = document.createElement('div');
      ghost.className = 'sprint-drag-ghost';
      const keyEl = row.querySelector('.task-key');
      const titleEl = row.querySelector('.task-row-title');
      ghost.innerHTML = `<span style="font-family:monospace;font-size:var(--text-xs);color:var(--color-text-3);">${keyEl?.textContent || ''}</span> ${Utils.escapeHtml(titleEl?.textContent || '')}`;
      ghost.style.left = e.clientX + 12 + 'px';
      ghost.style.top = e.clientY - 18 + 'px';
      document.body.appendChild(ghost);
      _drag.ghost = ghost;
      row.classList.add('dragging');
      handle.setPointerCapture(e.pointerId);

      // Store handlers for proper cleanup
      _drag._moveHandler = _onMove;
      handle.addEventListener('pointermove', _drag._moveHandler);
      handle.addEventListener('pointerup', _onUp, { once: true });
      // BUG-12 FIX: Also handle pointercancel (e.g. touch interrupted, browser takes control)
      handle.addEventListener('pointercancel', _onUp, { once: true });
      _drag._handle = handle;
    });
  }

  function _clearIndicators() {
    document.querySelectorAll('.task-row.drag-over-top, .task-row.drag-over-bottom').forEach(el => {
      el.classList.remove('drag-over-top', 'drag-over-bottom');
    });
  }

  function _onMove(e) {
    if (!_drag.active || !_drag.ghost) return;
    _drag.ghost.style.left = e.clientX + 12 + 'px';
    _drag.ghost.style.top = e.clientY - 18 + 'px';
    _clearIndicators();
    const target = document.elementFromPoint(e.clientX, e.clientY);
    const targetRow = target?.closest('.task-row');
    if (targetRow && targetRow.dataset.taskId !== _drag.taskId) {
      const rect = targetRow.getBoundingClientRect();
      const isTop = e.clientY < rect.top + rect.height / 2;
      targetRow.classList.add(isTop ? 'drag-over-top' : 'drag-over-bottom');
      _drag.targetRow = targetRow;
      _drag.dropBefore = isTop;
    } else {
      _drag.targetRow = null;
    }
  }

  function _onUp() {
    if (!_drag.active) return;
    _drag.active = false;
    _drag.ghost?.remove(); _drag.ghost = null;

    // Cleanup pointermove listener
    if (_drag._handle && _drag._moveHandler) {
      _drag._handle.removeEventListener('pointermove', _drag._moveHandler);
      // BUG-12 FIX: Also remove pointercancel if still pending (when pointerup fires first)
      _drag._handle.removeEventListener('pointercancel', _onUp);
    }

    document.querySelectorAll('.task-row.dragging').forEach(el => el.classList.remove('dragging'));
    _clearIndicators();

    if (_drag.targetRow) {
      const targetSprintId = _drag.targetRow.dataset.sprintId || null;
      const targetTaskId = _drag.targetRow.dataset.taskId;

      if (_drag.sourceSprintId !== targetSprintId) {
        // Moving BETWEEN sprints (or sprint ↔ backlog)
        if (targetSprintId) {
          // Compute order position at drop target (moving TO a sprint)
          const siblings = Storage.query('sp_tasks', t => t.sprintId === targetSprintId && !t.parentId)
            .sort((a, b) => (a.order || 0) - (b.order || 0));
          const targetIdx = siblings.findIndex(t => t.id === targetTaskId);
          const insertIdx = _drag.dropBefore ? targetIdx : targetIdx + 1;
          Task.reorder(_drag.taskId, Math.max(0, insertIdx), targetSprintId, null);
        } else {
          // BUG-12 FIX: Moving TO backlog — use Task.reorder to set proper order at drop position
          const backlogTasks = Storage.query('sp_tasks', t =>
            t.projectId === _project.id && !t.sprintId && !t.parentId
          ).sort((a, b) => (a.order || 0) - (b.order || 0));
          const targetIdx = backlogTasks.findIndex(t => t.id === targetTaskId);
          if (targetIdx !== -1) {
            const insertIdx = _drag.dropBefore ? targetIdx : targetIdx + 1;
            Task.reorder(_drag.taskId, Math.max(0, insertIdx), null, null);
          } else {
            // Drop on empty backlog or no matching task found — just move to backlog
            Sprint.removeTask(_drag.taskId);
          }
        }
        _render();
      } else {
        // Reorder WITHIN same sprint or within backlog
        const sameSprintTasks = Storage.query('sp_tasks', t =>
          (targetSprintId ? t.sprintId === targetSprintId : !t.sprintId) &&
          t.projectId === _project.id && !t.parentId
        ).sort((a, b) => (a.order || 0) - (b.order || 0));
        const targetIdx = sameSprintTasks.findIndex(t => t.id === targetTaskId);
        const insertIdx = _drag.dropBefore ? targetIdx : targetIdx + 1;
        if (targetIdx !== -1) {
          Task.reorder(_drag.taskId, Math.max(0, insertIdx), targetSprintId, null);
          _render();
        }
      }
    }

    _drag = { active: false, taskId: null, ghost: null, sourceSprintId: null, targetRow: null, dropBefore: false, _handle: null, _moveHandler: null };
  }

  // ── Init ──────────────────────────────────────────────────────────────────
  function init() {
    _session = Storage.get('sp_session');
    if (!_session) return;

    const params = Utils.parseQueryParams(window.location.search);
    const projects = _getVisibleProjects();
    _project = (params.project ? projects.find(p => p.id === params.project) : null) || projects[0] || null;

    _render();
    App.events.on('task:updated', _render);
    App.events.on('sprint:started', _render);
    App.events.on('sprint:completed', _render);
  }

  return { init };
})();
