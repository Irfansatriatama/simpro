/* SIMPRO Page: board — Kanban Board v0.6.0 */
const Page = (() => {
  let _session = null;
  let _project = null;
  let _sprint = null;
  let _filters = { assigneeIds: [], labelIds: [], priorities: [], types: [] };
  let _groupByAssignee = false;

  // Drag state
  let _drag = {
    active: false,
    taskId: null,
    ghost: null,
    sourceStatus: null,
    currentStatus: null,
    currentOrder: null,
    startX: 0,
    startY: 0,
    offsetX: 0,
    offsetY: 0,
  };

  // ── Helpers ──────────────────────────────────────────────────────────────
  function _getUsers() { return Storage.get('sp_users') || []; }
  function _getUserById(id) { return _getUsers().find(u => u.id === id) || null; }
  function _getLabels() { return _project ? Label.getByProject(_project.id) : []; }
  function _getProjectMembers() {
    if (!_project) return [];
    return _getUsers().filter(u => _project.memberIds && _project.memberIds.includes(u.id));
  }

  function _getActiveSprints() {
    if (!_project) return [];
    return (Storage.get('sp_sprints') || []).filter(s =>
      s.projectId === _project.id && (s.status === 'active' || s.status === 'planned')
    ).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  function _getVisibleProjects() {
    const projects = Storage.get('sp_projects') || [];
    if (_session.role === 'admin' || _session.role === 'pm') {
      return projects.filter(p => p.status !== 'archived');
    }
    return projects.filter(p => p.memberIds && p.memberIds.includes(_session.userId) && p.status !== 'archived');
  }

  function _colLabel(status) {
    const map = { 'todo': 'To Do', 'in-progress': 'In Progress', 'review': 'In Review', 'done': 'Done' };
    return map[status] || status;
  }

  function _colDotColor(status) {
    const map = {
      'todo': 'var(--color-text-3)',
      'in-progress': 'var(--color-accent)',
      'review': 'var(--color-warning)',
      'done': 'var(--color-success)',
    };
    return map[status] || 'var(--color-text-3)';
  }

  // ── Page Init ──────────────────────────────────────────────────────────
  function init() {
    _session = Storage.get('sp_session');
    if (!_session) return;

    const params = Utils.parseQueryParams(window.location.search);
    const projectId = params.project || null;
    const sprintId = params.sprint || null;

    try {
      const projects = _getVisibleProjects();
      if (!projects.length) return _renderNoProject();

      _project = projectId ? projects.find(p => p.id === projectId) : projects[0];
      if (!_project) _project = projects[0];

      const sprints = _getActiveSprints();
      if (sprintId) {
        _sprint = sprints.find(s => s.id === sprintId) || null;
      } else {
        _sprint = sprints.find(s => s.status === 'active') || sprints[0] || null;
      }

      // Show skeleton before rendering board
      _showBoardSkeleton();
      setTimeout(() => {
        try {
          _renderBoard();
          App.events.on('task:updated', _onTaskUpdated);
        } catch (err) {
          App.Toast.error('Gagal memuat board', 'Coba refresh halaman');
        }
      }, 60);
    } catch (err) {
      App.Toast.error('Gagal memuat board', 'Coba refresh halaman');
    }
  }

  function _showBoardSkeleton() {
    const main = document.getElementById('main-content');
    if (!main) return;
    const cols = ['To Do', 'In Progress', 'In Review', 'Done'];
    main.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">Board</h1>
        </div>
      </div>
      <div class="board-columns" style="display:flex;gap:var(--sp-4);padding-top:var(--sp-2);">
        ${cols.map(() => `
          <div style="flex:1;min-width:240px;">
            <div class="skeleton skeleton-line" style="width:80px;height:14px;margin-bottom:12px;"></div>
            ${Array.from({length:3}, () => `<div class="skeleton" style="height:82px;border-radius:var(--radius-lg);margin-bottom:8px;"></div>`).join('')}
          </div>`).join('')}
      </div>`;
  }

  function _onTaskUpdated(task) {
    if (!_project || !task || task.projectId !== _project.id) return;
    _renderColumns();
  }

  // ── No Project State ──────────────────────────────────────────────────
  function _renderNoProject() {
    const main = document.getElementById('main-content');
    if (!main) return;
    main.innerHTML = `
      <div class="board-empty" style="margin-top:60px;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
        <p>Belum ada project</p>
        <a href="./projects.html" class="btn btn-primary btn-sm">Buat Project</a>
      </div>`;
  }

  // ── Main Render ───────────────────────────────────────────────────────
  function _renderBoard() {
    const main = document.getElementById('main-content');
    if (!main) return;

    const projects = _getVisibleProjects();
    const sprints = _getActiveSprints();

    const projectOptions = projects.map(p =>
      `<option value="${p.id}" ${_project && p.id === _project.id ? 'selected' : ''}>${Utils.escapeHtml(p.name)}</option>`
    ).join('');

    const sprintOptions = `<option value="">Backlog</option>` + sprints.map(s =>
      `<option value="${s.id}" ${_sprint && s.id === _sprint.id ? 'selected' : ''}>${Utils.escapeHtml(s.name)}</option>`
    ).join('');

    const activeFilterCount = _filters.assigneeIds.length + _filters.labelIds.length + _filters.priorities.length + _filters.types.length;
    const filterBadge = activeFilterCount > 0 ? `<span class="filter-active-badge">${activeFilterCount}</span>` : '';

    main.innerHTML = `
      <div class="board-page">
        <div class="board-toolbar">
          <div class="board-toolbar-left">
            <select id="board-project-select" class="board-project-select">${projectOptions}</select>
            <select id="board-sprint-select" class="board-sprint-select">${sprintOptions}</select>

            <div class="filter-wrap" style="position:relative;">
              <button class="filter-chip" id="filter-assignee-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                Assignee${filterBadge.length && _filters.assigneeIds.length ? `<span class="filter-active-badge">${_filters.assigneeIds.length}</span>` : ''}
              </button>
              <div id="filter-assignee-dd" class="filter-dropdown" style="display:none;"></div>
            </div>

            <div class="filter-wrap" style="position:relative;">
              <button class="filter-chip" id="filter-priority-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M6 12h12M9 18h6"/></svg>
                Priority${_filters.priorities.length ? `<span class="filter-active-badge">${_filters.priorities.length}</span>` : ''}
              </button>
              <div id="filter-priority-dd" class="filter-dropdown" style="display:none;"></div>
            </div>

            <div class="filter-wrap" style="position:relative;">
              <button class="filter-chip" id="filter-type-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
                Type${_filters.types.length ? `<span class="filter-active-badge">${_filters.types.length}</span>` : ''}
              </button>
              <div id="filter-type-dd" class="filter-dropdown" style="display:none;"></div>
            </div>

            <div class="filter-wrap" style="position:relative;">
              <button class="filter-chip" id="filter-label-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
                Label${_filters.labelIds.length ? `<span class="filter-active-badge">${_filters.labelIds.length}</span>` : ''}
              </button>
              <div id="filter-label-dd" class="filter-dropdown" style="display:none;"></div>
            </div>

            ${activeFilterCount > 0 ? `<button class="filter-chip" id="filter-clear-btn" style="color:var(--color-danger);border-color:var(--color-danger);">Clear filters</button>` : ''}
          </div>

          <div class="board-toolbar-right">
            <button class="btn btn-sm btn-secondary btn-swimlane ${_groupByAssignee ? 'active' : ''}" id="btn-group-assignee">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
              Group by Assignee
            </button>
            ${(_session.role !== 'viewer') ? `<button class="btn btn-sm btn-primary" id="btn-create-task">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Task
            </button>` : ''}
          </div>
        </div>

        <div id="board-body" class="${_groupByAssignee ? 'swimlane-wrapper' : 'board-columns-wrapper'}">
          <!-- columns rendered here -->
        </div>
      </div>`;

    _renderColumns();
    _bindToolbarEvents();
    if (window.lucide) lucide.createIcons();
  }

  // ── Render Columns ─────────────────────────────────────────────────────
  function _renderColumns() {
    const body = document.getElementById('board-body');
    if (!body) return;

    if (!_project) { body.innerHTML = ''; return; }

    const sprintId = _sprint ? _sprint.id : null;
    const grouped = Kanban.getTasksByStatus(_project.id, sprintId, _filters);
    const stats = Kanban.getColumnStats(grouped);

    if (_groupByAssignee) {
      body.className = 'swimlane-wrapper';
      body.innerHTML = _renderSwimlanes(grouped);
    } else {
      body.className = 'board-columns-wrapper';
      body.innerHTML = `<div class="board-columns">${
        Kanban.STATUSES.map(status => _renderColumn(status, grouped[status] || [], stats[status])).join('')
      }</div>`;
    }

    _bindColumnEvents();
    if (window.lucide) lucide.createIcons();
  }

  function _renderColumn(status, tasks, stat) {
    const cardsHtml = tasks.length
      ? tasks.map(t => _renderTaskCard(t)).join('')
      : `<div class="col-empty">Tidak ada task</div>`;

    const canAdd = _session.role !== 'viewer';

    return `
      <div class="kanban-column" data-status="${status}" id="col-${status}">
        <div class="kanban-col-header">
          <span class="kanban-col-status-dot" style="background:${_colDotColor(status)}"></span>
          <span class="kanban-col-title">${_colLabel(status)}</span>
          <span class="kanban-col-count">${stat.count}</span>
          ${stat.points > 0 ? `<span class="kanban-col-points">${stat.points} SP</span>` : ''}
        </div>
        <div class="kanban-col-body" data-status="${status}" data-drop-zone="true">
          ${cardsHtml}
        </div>
        ${canAdd ? `
        <div class="kanban-col-footer">
          <button class="kanban-quick-add-btn" data-status="${status}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add task
          </button>
          <div class="kanban-quick-add-form" data-status="${status}" id="quick-add-${status}">
            <textarea class="kanban-quick-add-input" placeholder="Judul task..." rows="2" data-status="${status}" id="quick-input-${status}"></textarea>
            <div class="kanban-quick-add-actions">
              <button class="btn btn-primary btn-sm quick-add-submit" data-status="${status}">Tambah</button>
              <button class="btn btn-secondary btn-sm quick-add-cancel" data-status="${status}">Batal</button>
            </div>
          </div>
        </div>` : ''}
      </div>`;
  }

  function _renderTaskCard(task) {
    const today = Utils.todayISO();
    const isOverdue = task.dueDate && task.dueDate < today && task.status !== 'done';
    const isDueToday = task.dueDate && task.dueDate === today;
    const dueClass = isOverdue ? 'overdue' : isDueToday ? 'due-today' : '';
    const dueHtml = task.dueDate ? `<span class="task-card-due ${dueClass}">${Utils.formatDateShort(task.dueDate)}</span>` : '';

    const assigneeAvatars = (task.assigneeIds || []).slice(0, 3).map(uid => {
      const u = _getUserById(uid);
      if (!u) return '';
      const initials = Utils.getInitials(u.name);
      const [fg, bg] = Utils.getAvatarColor(u.id);
      return `<span class="avatar avatar-xs" style="background:${bg};color:${fg}" title="${Utils.escapeHtml(u.name)}">${Utils.escapeHtml(initials)}</span>`;
    }).join('');

    const spHtml = task.storyPoints != null ? `<span class="task-card-sp">${task.storyPoints}</span>` : '';

    const labels = _getLabels().filter(l => (task.labelIds || []).includes(l.id));
    const labelsHtml = labels.length ? `<div class="task-card-labels">${labels.map(l => `<span class="task-card-label" style="background:${l.color}" title="${Utils.escapeHtml(l.name)}"></span>`).join('')}</div>` : '';

    return `
      <div class="task-card" data-task-id="${task.id}" data-status="${task.status}" draggable="false">
        <div class="task-card-top">
          <span class="task-card-key">${Utils.escapeHtml(task.key)}</span>
          <span class="badge badge-type-${task.type}">${Utils.getTypeLabel(task.type)}</span>
          <span class="priority-dot priority-${task.priority}" title="${task.priority}"></span>
        </div>
        ${labelsHtml}
        <div class="task-card-title">${Utils.escapeHtml(Utils.truncate(task.title, 80))}</div>
        <div class="task-card-footer">
          <div class="task-card-assignees">${assigneeAvatars}</div>
          ${dueHtml}
          ${spHtml}
        </div>
      </div>`;
  }

  // ── Swimlane Render ─────────────────────────────────────────────────────
  function _renderSwimlanes(grouped) {
    const members = _getProjectMembers();
    const unassignedTasks = {};
    Kanban.STATUSES.forEach(s => {
      unassignedTasks[s] = (grouped[s] || []).filter(t => !t.assigneeIds || t.assigneeIds.length === 0);
    });

    const swimlanes = members.map(user => {
      const userTasks = {};
      let total = 0;
      Kanban.STATUSES.forEach(s => {
        userTasks[s] = (grouped[s] || []).filter(t => t.assigneeIds && t.assigneeIds.includes(user.id));
        total += userTasks[s].length;
      });
      if (total === 0) return '';
      const [fg, bg] = Utils.getAvatarColor(user.id);
      const initials = Utils.getInitials(user.name);
      return `
        <div class="swimlane" data-assignee="${user.id}">
          <div class="swimlane-header">
            <span class="avatar avatar-sm" style="background:${bg};color:${fg}">${Utils.escapeHtml(initials)}</span>
            <span class="swimlane-label">${Utils.escapeHtml(user.name)}</span>
            <span class="swimlane-task-count">${total} task</span>
          </div>
          <div class="swimlane-columns">
            ${Kanban.STATUSES.map(s => `
              <div class="swimlane-col" data-status="${s}" data-assignee="${user.id}">
                <div class="swimlane-col-header" style="color:${_colDotColor(s)}">${_colLabel(s)}</div>
                ${userTasks[s].length ? userTasks[s].map(t => _renderTaskCard(t)).join('') : '<div class="col-empty">—</div>'}
              </div>`).join('')}
          </div>
        </div>`;
    }).join('');

    const unassignedTotal = Object.values(unassignedTasks).reduce((a, b) => a + b.length, 0);
    const unassignedHtml = unassignedTotal > 0 ? `
      <div class="swimlane">
        <div class="swimlane-header">
          <span class="avatar avatar-sm" style="background:var(--color-border)">?</span>
          <span class="swimlane-label">Unassigned</span>
          <span class="swimlane-task-count">${unassignedTotal} task</span>
        </div>
        <div class="swimlane-columns">
          ${Kanban.STATUSES.map(s => `
            <div class="swimlane-col" data-status="${s}">
              <div class="swimlane-col-header" style="color:${_colDotColor(s)}">${_colLabel(s)}</div>
              ${unassignedTasks[s].length ? unassignedTasks[s].map(t => _renderTaskCard(t)).join('') : '<div class="col-empty">—</div>'}
            </div>`).join('')}
        </div>
      </div>` : '';

    return swimlanes + unassignedHtml || `<div class="board-empty"><p>Tidak ada task yang cocok dengan filter</p></div>`;
  }

  // ── Drag & Drop (Native Pointer Events) ──────────────────────────────
  function _bindColumnEvents() {
    const body = document.getElementById('board-body');
    if (!body) return;

    // Task card click → navigate
    body.addEventListener('click', _handleCardClick, { capture: false });

    // Quick add buttons
    body.querySelectorAll('.kanban-quick-add-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        const status = e.currentTarget.dataset.status;
        _openQuickAdd(status);
      });
    });

    body.querySelectorAll('.quick-add-submit').forEach(btn => {
      btn.addEventListener('click', e => {
        const status = e.currentTarget.dataset.status;
        _submitQuickAdd(status);
      });
    });

    body.querySelectorAll('.quick-add-cancel').forEach(btn => {
      btn.addEventListener('click', e => {
        const status = e.currentTarget.dataset.status;
        _closeQuickAdd(status);
      });
    });

    body.querySelectorAll('.kanban-quick-add-input').forEach(inp => {
      inp.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          _submitQuickAdd(inp.dataset.status);
        }
        if (e.key === 'Escape') _closeQuickAdd(inp.dataset.status);
      });
    });

    // Drag & drop on cards
    body.querySelectorAll('.task-card').forEach(card => {
      card.addEventListener('pointerdown', _onPointerDown);
    });
  }

  function _handleCardClick(e) {
    const card = e.target.closest('.task-card');
    if (!card || _drag.active) return;
    if (e.target.closest('.kanban-quick-add-btn, .quick-add-submit, .quick-add-cancel, .kanban-quick-add-input')) return;
    const taskId = card.dataset.taskId;
    if (taskId) {
      window.location.href = `./task-detail.html?id=${taskId}`;
    }
  }

  // ── Drag Implementation ───────────────────────────────────────────────
  function _onPointerDown(e) {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    if (e.target.closest('button, a, input, textarea, select')) return;

    const card = e.currentTarget;
    const taskId = card.dataset.taskId;
    if (!taskId) return;

    const task = Task.getById(taskId);
    if (!task) return;

    // Role guard
    if (_session.role === 'viewer') return;
    if (_session.role === 'developer' && !task.assigneeIds.includes(_session.userId) && task.reporterId !== _session.userId) return;

    e.preventDefault();

    const rect = card.getBoundingClientRect();
    _drag.taskId = taskId;
    _drag.sourceStatus = card.dataset.status;
    _drag.currentStatus = card.dataset.status;
    _drag.startX = e.clientX;
    _drag.startY = e.clientY;
    _drag.offsetX = e.clientX - rect.left;
    _drag.offsetY = e.clientY - rect.top;
    _drag.active = false; // will set true on move threshold

    // Create ghost
    const ghost = card.cloneNode(true);
    ghost.classList.add('ghost');
    ghost.style.position = 'fixed';
    ghost.style.width = rect.width + 'px';
    ghost.style.left = rect.left + 'px';
    ghost.style.top = rect.top + 'px';
    ghost.style.zIndex = '9999';
    ghost.style.pointerEvents = 'none';
    ghost.style.transition = 'none';
    document.body.appendChild(ghost);
    _drag.ghost = ghost;

    card.setPointerCapture(e.pointerId);
    card.addEventListener('pointermove', _onPointerMove);
    card.addEventListener('pointerup', _onPointerUp);
    card.addEventListener('pointercancel', _onPointerUp);
  }

  function _onPointerMove(e) {
    if (!_drag.ghost) return;

    const dx = e.clientX - _drag.startX;
    const dy = e.clientY - _drag.startY;

    if (!_drag.active && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
      _drag.active = true;
      const srcCard = document.querySelector(`.task-card[data-task-id="${_drag.taskId}"]`);
      if (srcCard) srcCard.classList.add('dragging');
    }

    if (!_drag.active) return;

    _drag.ghost.style.left = (e.clientX - _drag.offsetX) + 'px';
    _drag.ghost.style.top = (e.clientY - _drag.offsetY) + 'px';

    _updateDropTarget(e.clientX, e.clientY);
  }

  function _updateDropTarget(cx, cy) {
    // Remove existing drop indicators
    document.querySelectorAll('.drop-indicator').forEach(el => el.remove());
    document.querySelectorAll('.kanban-column').forEach(col => col.classList.remove('drag-over'));

    // Find which column we're over
    const cols = document.querySelectorAll('[data-drop-zone="true"]');
    let targetCol = null;
    let targetStatus = null;

    cols.forEach(col => {
      const rect = col.getBoundingClientRect();
      if (cx >= rect.left && cx <= rect.right && cy >= rect.top && cy <= rect.bottom) {
        targetCol = col;
        targetStatus = col.dataset.status;
      }
    });

    if (!targetCol) return;

    // Highlight column container
    const colEl = targetCol.closest('.kanban-column');
    if (colEl) colEl.classList.add('drag-over');

    _drag.currentStatus = targetStatus;

    // Find insert position
    const cards = Array.from(targetCol.querySelectorAll('.task-card:not(.dragging)'));
    let insertBefore = null;
    let insertOrder = cards.length;

    for (let i = 0; i < cards.length; i++) {
      const rect = cards[i].getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      if (cy < midY) {
        insertBefore = cards[i];
        insertOrder = i;
        break;
      }
    }

    _drag.currentOrder = insertOrder;

    // Show drop indicator
    const indicator = document.createElement('div');
    indicator.className = 'drop-indicator';
    if (insertBefore) {
      targetCol.insertBefore(indicator, insertBefore);
    } else {
      const emptyEl = targetCol.querySelector('.col-empty');
      if (emptyEl) { targetCol.insertBefore(indicator, emptyEl); }
      else { targetCol.appendChild(indicator); }
    }
  }

  function _onPointerUp(e) {
    const card = e.currentTarget;
    card.removeEventListener('pointermove', _onPointerMove);
    card.removeEventListener('pointerup', _onPointerUp);
    card.removeEventListener('pointercancel', _onPointerUp);

    if (_drag.ghost) { _drag.ghost.remove(); _drag.ghost = null; }
    document.querySelectorAll('.drop-indicator').forEach(el => el.remove());
    document.querySelectorAll('.kanban-column').forEach(col => col.classList.remove('drag-over'));

    if (_drag.active && _drag.taskId) {
      const newStatus = _drag.currentStatus || _drag.sourceStatus;
      const newOrder = _drag.currentOrder != null ? _drag.currentOrder : 0;

      const srcCard = document.querySelector(`.task-card[data-task-id="${_drag.taskId}"]`);
      if (srcCard) srcCard.classList.remove('dragging');

      if (newStatus !== _drag.sourceStatus || newOrder !== null) {
        Kanban.moveTask(_drag.taskId, newStatus, newOrder);
        _renderColumns();
      }
    } else {
      const srcCard = document.querySelector(`.task-card[data-task-id="${_drag.taskId}"]`);
      if (srcCard) srcCard.classList.remove('dragging');
    }

    _drag.active = false;
    _drag.taskId = null;
    _drag.sourceStatus = null;
    _drag.currentStatus = null;
    _drag.currentOrder = null;
  }

  // ── Quick Add ──────────────────────────────────────────────────────────
  function _openQuickAdd(status) {
    const form = document.getElementById(`quick-add-${status}`);
    const btn = document.querySelector(`.kanban-quick-add-btn[data-status="${status}"]`);
    if (!form || !btn) return;
    form.classList.add('active');
    btn.style.display = 'none';
    const inp = document.getElementById(`quick-input-${status}`);
    if (inp) { inp.value = ''; inp.focus(); }
  }

  function _closeQuickAdd(status) {
    const form = document.getElementById(`quick-add-${status}`);
    const btn = document.querySelector(`.kanban-quick-add-btn[data-status="${status}"]`);
    if (form) form.classList.remove('active');
    if (btn) btn.style.display = '';
  }

  function _submitQuickAdd(status) {
    const inp = document.getElementById(`quick-input-${status}`);
    if (!inp) return;
    const title = inp.value.trim();
    if (!title) { inp.focus(); return; }

    if (!_project) return;
    const sprintId = _sprint ? _sprint.id : null;

    const task = Task.create({
      projectId: _project.id,
      sprintId,
      title,
      status,
      type: 'task',
      priority: 'medium',
    });

    if (task && task.id) {
      App.Toast.success('Task ditambahkan');
      _closeQuickAdd(status);
      _renderColumns();
    } else {
      App.Toast.error('Gagal membuat task');
    }
  }

  // ── Filter Dropdowns ──────────────────────────────────────────────────
  function _bindToolbarEvents() {
    const main = document.getElementById('main-content');
    if (!main) return;

    // Project select
    const projSel = document.getElementById('board-project-select');
    if (projSel) {
      projSel.addEventListener('change', () => {
        const projects = _getVisibleProjects();
        _project = projects.find(p => p.id === projSel.value) || null;
        _sprint = null;
        _filters = { assigneeIds: [], labelIds: [], priorities: [], types: [] };
        _renderBoard();
      });
    }

    // Sprint select
    const sprintSel = document.getElementById('board-sprint-select');
    if (sprintSel) {
      sprintSel.addEventListener('change', () => {
        const val = sprintSel.value;
        if (!val) { _sprint = null; }
        else {
          const sprints = _getActiveSprints();
          _sprint = sprints.find(s => s.id === val) || null;
        }
        _renderColumns();
      });
    }

    // Group by assignee
    const btnGroup = document.getElementById('btn-group-assignee');
    if (btnGroup) {
      btnGroup.addEventListener('click', () => {
        _groupByAssignee = !_groupByAssignee;
        _renderBoard();
      });
    }

    // Create task
    const btnCreate = document.getElementById('btn-create-task');
    if (btnCreate) {
      btnCreate.addEventListener('click', () => {
        TaskModal.open({
          projectId: _project ? _project.id : null,
          sprintId: _sprint ? _sprint.id : null,
          onSuccess: () => _renderColumns(),
        });
      });
    }

    // Clear filters
    const clearBtn = document.getElementById('filter-clear-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        _filters = { assigneeIds: [], labelIds: [], priorities: [], types: [] };
        _renderBoard();
      });
    }

    // Filter dropdowns
    _setupFilterDropdown('filter-assignee-btn', 'filter-assignee-dd', _buildAssigneeFilter);
    _setupFilterDropdown('filter-priority-btn', 'filter-priority-dd', _buildPriorityFilter);
    _setupFilterDropdown('filter-type-btn', 'filter-type-dd', _buildTypeFilter);
    _setupFilterDropdown('filter-label-btn', 'filter-label-dd', _buildLabelFilter);

    // Close dropdowns on outside click
    document.addEventListener('pointerdown', _handleOutsideClick, { once: false });
  }

  let _openDropdown = null;

  function _setupFilterDropdown(btnId, ddId, builder) {
    const btn = document.getElementById(btnId);
    const dd = document.getElementById(ddId);
    if (!btn || !dd) return;

    btn.addEventListener('click', e => {
      e.stopPropagation();
      if (dd.style.display !== 'none') {
        dd.style.display = 'none';
        _openDropdown = null;
        return;
      }
      // Close others
      document.querySelectorAll('.filter-dropdown').forEach(el => el.style.display = 'none');
      dd.innerHTML = builder();
      dd.style.display = 'block';
      _openDropdown = dd;

      // Bind checkboxes
      dd.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        cb.addEventListener('change', () => {
          _updateFilter(ddId, dd);
          _renderColumns();
          // Re-render toolbar to update badge counts
          const projSel = document.getElementById('board-project-select');
          const sprintSel = document.getElementById('board-sprint-select');
          const projId = projSel ? projSel.value : (_project ? _project.id : null);
          const sprintId = sprintSel ? sprintSel.value : (_sprint ? _sprint.id : null);
          // Partial re-render of toolbar filter buttons
          _updateFilterChipBadges();
        });
      });

      if (window.lucide) lucide.createIcons();
    });
  }

  function _handleOutsideClick(e) {
    if (!_openDropdown) return;
    if (!e.target.closest('.filter-wrap')) {
      _openDropdown.style.display = 'none';
      _openDropdown = null;
    }
  }

  function _updateFilter(ddId, dd) {
    const checked = Array.from(dd.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
    if (ddId === 'filter-assignee-dd') _filters.assigneeIds = checked;
    else if (ddId === 'filter-priority-dd') _filters.priorities = checked;
    else if (ddId === 'filter-type-dd') _filters.types = checked;
    else if (ddId === 'filter-label-dd') _filters.labelIds = checked;
  }

  function _updateFilterChipBadges() {
    const btns = {
      'filter-assignee-btn': _filters.assigneeIds.length,
      'filter-priority-btn': _filters.priorities.length,
      'filter-type-btn': _filters.types.length,
      'filter-label-btn': _filters.labelIds.length,
    };
    Object.entries(btns).forEach(([id, count]) => {
      const btn = document.getElementById(id);
      if (!btn) return;
      const badge = btn.querySelector('.filter-active-badge');
      if (count > 0) {
        if (!badge) {
          const span = document.createElement('span');
          span.className = 'filter-active-badge';
          span.textContent = count;
          btn.appendChild(span);
        } else { badge.textContent = count; }
        btn.classList.add('active');
      } else {
        if (badge) badge.remove();
        btn.classList.remove('active');
      }
    });

    // Clear btn
    const totalFilters = _filters.assigneeIds.length + _filters.labelIds.length + _filters.priorities.length + _filters.types.length;
    const existingClear = document.getElementById('filter-clear-btn');
    if (totalFilters > 0 && !existingClear) {
      const clearBtn = document.createElement('button');
      clearBtn.id = 'filter-clear-btn';
      clearBtn.className = 'filter-chip';
      clearBtn.style.cssText = 'color:var(--color-danger);border-color:var(--color-danger);';
      clearBtn.textContent = 'Clear filters';
      clearBtn.addEventListener('click', () => {
        _filters = { assigneeIds: [], labelIds: [], priorities: [], types: [] };
        _renderBoard();
      });
      const left = document.querySelector('.board-toolbar-left');
      if (left) left.appendChild(clearBtn);
    } else if (totalFilters === 0 && existingClear) {
      existingClear.remove();
    }
  }

  function _buildAssigneeFilter() {
    const members = _getProjectMembers();
    const opts = members.map(u => {
      const checked = _filters.assigneeIds.includes(u.id) ? 'checked' : '';
      const initials = Utils.getInitials(u.name);
      const [fg, bg] = Utils.getAvatarColor(u.id);
      return `<label class="filter-option">
        <input type="checkbox" value="${u.id}" ${checked}>
        <span class="avatar avatar-xs" style="background:${bg};color:${fg}">${Utils.escapeHtml(initials)}</span>
        <span>${Utils.escapeHtml(u.name)}</span>
      </label>`;
    }).join('');
    return `<div class="filter-dropdown-title">Assignee</div>${opts || '<div class="filter-option" style="color:var(--color-text-3)">Tidak ada member</div>'}`;
  }

  function _buildPriorityFilter() {
    const priorities = [
      { value: 'critical', label: 'Critical' },
      { value: 'high', label: 'High' },
      { value: 'medium', label: 'Medium' },
      { value: 'low', label: 'Low' },
    ];
    const opts = priorities.map(p => {
      const checked = _filters.priorities.includes(p.value) ? 'checked' : '';
      return `<label class="filter-option">
        <input type="checkbox" value="${p.value}" ${checked}>
        <span class="priority-dot priority-${p.value}"></span>
        <span>${p.label}</span>
      </label>`;
    }).join('');
    return `<div class="filter-dropdown-title">Priority</div>${opts}`;
  }

  function _buildTypeFilter() {
    const types = [
      { value: 'story', label: 'Story' },
      { value: 'bug', label: 'Bug' },
      { value: 'task', label: 'Task' },
      { value: 'epic', label: 'Epic' },
    ];
    const opts = types.map(t => {
      const checked = _filters.types.includes(t.value) ? 'checked' : '';
      return `<label class="filter-option">
        <input type="checkbox" value="${t.value}" ${checked}>
        <span class="badge badge-type-${t.value}">${t.label}</span>
      </label>`;
    }).join('');
    return `<div class="filter-dropdown-title">Type</div>${opts}`;
  }

  function _buildLabelFilter() {
    const labels = _getLabels();
    if (!labels.length) return `<div class="filter-dropdown-title">Label</div><div class="filter-option" style="color:var(--color-text-3)">Tidak ada label</div>`;
    const opts = labels.map(l => {
      const checked = _filters.labelIds.includes(l.id) ? 'checked' : '';
      return `<label class="filter-option">
        <input type="checkbox" value="${l.id}" ${checked}>
        <span style="width:12px;height:12px;background:${l.color};border-radius:50%;display:inline-block;flex-shrink:0;"></span>
        <span>${Utils.escapeHtml(l.name)}</span>
      </label>`;
    }).join('');
    return `<div class="filter-dropdown-title">Label</div>${opts}`;
  }

  return { init };
})();
