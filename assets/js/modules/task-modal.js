/* SIMPRO Module: TaskModal — global create-task modal v1.1.0 (BUG-18) */
/* BUG-18 FIX: Enhanced modal layout + custom assignee multi-select dropdown */
const TaskModal = (() => {
  let _onSuccess = null;
  let _defaultProjectId = null;
  let _assigneeDropdownOpen = false;
  let _selectedAssignees = []; // array of userId strings

  // ── DOM Builder ───────────────────────────────────────────────────────────
  function _ensureDOM() {
    if (document.getElementById('modal-create-task')) return;

    const overlay = document.createElement('div');
    overlay.id = 'modal-create-task';
    overlay.className = 'modal-overlay';
    overlay.style.display = 'none';
    overlay.innerHTML = `
      <div class="modal modal-lg task-create-modal">
        <div class="modal-header">
          <div class="modal-header-content">
            <h2 class="modal-title">Buat Task Baru</h2>
            <p class="modal-subtitle">Isi detail task yang ingin dibuat</p>
          </div>
          <button class="modal-close" id="modal-task-close" title="Tutup">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="modal-body task-modal-body">

          <!-- Row 1: Judul (full width) -->
          <div class="form-group task-modal-full">
            <label class="form-label required">Judul Task</label>
            <input type="text" id="inp-task-title" class="form-input task-title-input" placeholder="Deskripsikan task secara singkat...">
          </div>

          <!-- Row 2: Deskripsi (full width) -->
          <div class="form-group task-modal-full">
            <label class="form-label">Deskripsi <span class="form-label-optional">(opsional)</span></label>
            <textarea id="inp-task-desc" class="form-textarea" rows="2" placeholder="Deskripsi lebih detail..."></textarea>
          </div>

          <!-- Divider -->
          <div class="task-modal-divider"></div>

          <!-- Row 3: Project & Sprint -->
          <div class="task-modal-row">
            <div class="form-group">
              <label class="form-label required">Project</label>
              <select id="inp-task-project" class="form-select"></select>
            </div>
            <div class="form-group">
              <label class="form-label">Sprint</label>
              <select id="inp-task-sprint" class="form-select">
                <option value="">Backlog</option>
              </select>
            </div>
          </div>

          <!-- Row 4: Tipe, Status, Prioritas -->
          <div class="task-modal-row task-modal-row-3">
            <div class="form-group">
              <label class="form-label">Tipe</label>
              <select id="inp-task-type" class="form-select">
                <option value="task">Task</option>
                <option value="story">Story</option>
                <option value="bug">Bug</option>
                <option value="epic">Epic</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Status</label>
              <select id="inp-task-status" class="form-select">
                <option value="todo">To Do</option>
                <option value="in-progress">In Progress</option>
                <option value="review">In Review</option>
                <option value="done">Done</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Prioritas</label>
              <select id="inp-task-priority" class="form-select">
                <option value="medium" selected>Medium</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          <!-- Row 5: Assignee (custom dropdown), Due Date -->
          <div class="task-modal-row">
            <div class="form-group">
              <label class="form-label">Assignee</label>
              <div class="assignee-dropdown-wrapper" id="assignee-dropdown-wrapper">
                <button type="button" class="assignee-dropdown-trigger" id="assignee-dropdown-btn">
                  <span id="assignee-dropdown-label">Belum ada assignee</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;flex-shrink:0;"><polyline points="6 9 12 15 18 9"/></svg>
                </button>
                <div class="assignee-dropdown-menu hidden" id="assignee-dropdown-menu">
                  <div class="assignee-dropdown-search-wrap">
                    <input type="text" class="assignee-dropdown-search" id="assignee-search-input" placeholder="Cari member...">
                  </div>
                  <div class="assignee-dropdown-list" id="assignee-dropdown-list"></div>
                </div>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Due Date</label>
              <input type="date" id="inp-task-due" class="form-input">
            </div>
          </div>

          <!-- Row 6: Story Points, Estimasi -->
          <div class="task-modal-row">
            <div class="form-group">
              <label class="form-label">Story Points</label>
              <input type="number" id="inp-task-sp" class="form-input" min="0" max="100" placeholder="—">
            </div>
            <div class="form-group">
              <label class="form-label">Estimasi (jam)</label>
              <input type="number" id="inp-task-hours" class="form-input" min="0" step="0.5" placeholder="—">
            </div>
          </div>

        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost btn-sm" id="btn-task-cancel">Batal</button>
          <button class="btn btn-primary btn-sm" id="btn-task-save">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;"><polyline points="20 6 9 17 4 12"/></svg>
            Buat Task
          </button>
        </div>
      </div>`;

    document.body.appendChild(overlay);

    // Bind events
    document.getElementById('modal-task-close').addEventListener('click', close);
    document.getElementById('btn-task-cancel').addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    document.getElementById('btn-task-save').addEventListener('click', _save);
    document.getElementById('inp-task-project').addEventListener('change', _onProjectChange);

    // Assignee dropdown toggle
    document.getElementById('assignee-dropdown-btn').addEventListener('click', e => {
      e.stopPropagation();
      _toggleAssigneeDropdown();
    });
    document.getElementById('assignee-search-input').addEventListener('input', e => {
      _filterAssigneeList(e.target.value);
    });
    // Stop clicks inside menu from closing
    document.getElementById('assignee-dropdown-menu').addEventListener('click', e => {
      e.stopPropagation();
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        if (_assigneeDropdownOpen) { _closeAssigneeDropdown(); return; }
        if (overlay.style.display === 'flex') close();
      }
    });
    document.addEventListener('click', e => {
      if (_assigneeDropdownOpen && !document.getElementById('assignee-dropdown-wrapper')?.contains(e.target)) {
        _closeAssigneeDropdown();
      }
    });
  }

  // ── Assignee Dropdown ─────────────────────────────────────────────────────
  function _toggleAssigneeDropdown() {
    if (_assigneeDropdownOpen) {
      _closeAssigneeDropdown();
    } else {
      _openAssigneeDropdown();
    }
  }

  function _openAssigneeDropdown() {
    const menu = document.getElementById('assignee-dropdown-menu');
    const search = document.getElementById('assignee-search-input');
    if (!menu) return;
    menu.classList.remove('hidden');
    _assigneeDropdownOpen = true;
    document.getElementById('assignee-dropdown-btn')?.classList.add('open');
    if (search) { search.value = ''; _filterAssigneeList(''); search.focus(); }
  }

  function _closeAssigneeDropdown() {
    const menu = document.getElementById('assignee-dropdown-menu');
    if (!menu) return;
    menu.classList.add('hidden');
    _assigneeDropdownOpen = false;
    document.getElementById('assignee-dropdown-btn')?.classList.remove('open');
  }

  function _filterAssigneeList(query) {
    const items = document.querySelectorAll('#assignee-dropdown-list .assignee-item');
    const q = query.toLowerCase();
    items.forEach(item => {
      const name = item.dataset.name || '';
      item.style.display = name.toLowerCase().includes(q) ? '' : 'none';
    });
  }

  function _updateAssigneeLabel() {
    const label = document.getElementById('assignee-dropdown-label');
    if (!label) return;
    if (_selectedAssignees.length === 0) {
      label.textContent = 'Belum ada assignee';
      label.style.color = '';
    } else {
      const users = Storage.get('sp_users') || [];
      const names = _selectedAssignees.map(id => {
        const u = users.find(u => u.id === id);
        return u ? u.name.split(' ')[0] : id;
      });
      label.textContent = names.join(', ');
      label.style.color = 'var(--color-text)';
    }
  }

  function _renderAssigneeList(members) {
    const list = document.getElementById('assignee-dropdown-list');
    if (!list) return;
    if (!members.length) {
      list.innerHTML = `<div style="padding:var(--sp-3);text-align:center;font-size:var(--text-sm);color:var(--color-text-3);">Tidak ada member</div>`;
      return;
    }
    list.innerHTML = members.map(u => {
      const [fg, bg] = Utils.getAvatarColor(u.id);
      const initials = Utils.getInitials(u.name);
      const checked = _selectedAssignees.includes(u.id);
      const avatarHtml = u.avatar
        ? `<img style="width:24px;height:24px;border-radius:50%;object-fit:cover;" src="${u.avatar}" alt="${Utils.escapeHtml(u.name)}">`
        : `<span style="width:24px;height:24px;border-radius:50%;background:${bg};color:${fg};font-size:10px;font-weight:600;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${initials}</span>`;
      return `
        <div class="assignee-item${checked ? ' selected' : ''}" data-user-id="${u.id}" data-name="${Utils.escapeHtml(u.name)}" role="option" aria-selected="${checked}">
          <div class="assignee-item-avatar">${avatarHtml}</div>
          <span class="assignee-item-name">${Utils.escapeHtml(u.name)}</span>
          <span class="assignee-item-role">${u.role}</span>
          <span class="assignee-item-check${checked ? ' visible' : ''}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:13px;height:13px;"><polyline points="20 6 9 17 4 12"/></svg>
          </span>
        </div>`;
    }).join('');

    list.querySelectorAll('.assignee-item').forEach(item => {
      item.addEventListener('click', () => {
        const userId = item.dataset.userId;
        const idx = _selectedAssignees.indexOf(userId);
        if (idx === -1) {
          _selectedAssignees.push(userId);
        } else {
          _selectedAssignees.splice(idx, 1);
        }
        const isNowSelected = _selectedAssignees.includes(userId);
        item.classList.toggle('selected', isNowSelected);
        item.setAttribute('aria-selected', isNowSelected);
        item.querySelector('.assignee-item-check')?.classList.toggle('visible', isNowSelected);
        _updateAssigneeLabel();
      });
    });
  }

  // ── Project/Sprint population ─────────────────────────────────────────────
  function _populateProjects() {
    const session = Storage.get('sp_session');
    if (!session) return;
    const projects = (Storage.get('sp_projects') || []).filter(p =>
      p.status === 'active' &&
      (session.role === 'admin' || session.role === 'pm' || (Array.isArray(p.memberIds) && p.memberIds.includes(session.userId)))
    );
    const sel = document.getElementById('inp-task-project');
    sel.innerHTML = projects.map(p => `<option value="${p.id}">${Utils.escapeHtml(p.name)} (${p.key})</option>`).join('');
    if (_defaultProjectId) {
      sel.value = _defaultProjectId;
    }
    _onProjectChange();
  }

  function _onProjectChange() {
    const projectId = document.getElementById('inp-task-project')?.value;
    const sprintSel = document.getElementById('inp-task-sprint');
    if (!sprintSel || !projectId) return;

    const sprints = (Storage.get('sp_sprints') || []).filter(s => s.projectId === projectId && s.status !== 'completed');
    sprintSel.innerHTML = `<option value="">Backlog</option>` + sprints.map(s =>
      `<option value="${s.id}">${Utils.escapeHtml(s.name)} (${s.status})</option>`
    ).join('');

    const project = (Storage.get('sp_projects') || []).find(p => p.id === projectId);
    if (project) {
      const users = Storage.get('sp_users') || [];
      const members = users.filter(u => Array.isArray(project.memberIds) && project.memberIds.includes(u.id));
      _selectedAssignees = [];
      _updateAssigneeLabel();
      _renderAssigneeList(members);
    }
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  function _save() {
    const title = document.getElementById('inp-task-title')?.value?.trim();
    if (!title) { App.Toast.warning('Judul task wajib diisi'); return; }
    const projectId = document.getElementById('inp-task-project')?.value;
    if (!projectId) { App.Toast.warning('Pilih project terlebih dahulu'); return; }

    const data = {
      projectId,
      title,
      description: document.getElementById('inp-task-desc')?.value || '',
      sprintId: document.getElementById('inp-task-sprint')?.value || null,
      type: document.getElementById('inp-task-type')?.value || 'task',
      priority: document.getElementById('inp-task-priority')?.value || 'medium',
      status: document.getElementById('inp-task-status')?.value || 'todo',
      assigneeIds: [..._selectedAssignees],
      dueDate: document.getElementById('inp-task-due')?.value || null,
      storyPoints: document.getElementById('inp-task-sp')?.value !== '' ? Number(document.getElementById('inp-task-sp')?.value) : null,
      estimatedHours: document.getElementById('inp-task-hours')?.value !== '' ? Number(document.getElementById('inp-task-hours')?.value) : null,
    };

    const result = Task.create(data);
    if (!result || result.error) {
      App.Toast.error('Gagal membuat task', result?.error || '');
      return;
    }

    App.Toast.success('Task dibuat', `${result.key}: ${result.title}`);
    close();
    if (typeof _onSuccess === 'function') _onSuccess(result);
  }

  // ── Open / Close ──────────────────────────────────────────────────────────
  function open(options = {}) {
    _ensureDOM();
    _defaultProjectId = options.projectId || null;
    _onSuccess = options.onSuccess || null;
    _selectedAssignees = [];
    _assigneeDropdownOpen = false;

    _populateProjects();

    // Reset form fields
    ['inp-task-title','inp-task-desc','inp-task-due','inp-task-sp','inp-task-hours'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    ['inp-task-type','inp-task-priority','inp-task-status'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.selectedIndex = 0;
    });

    if (options.status) {
      const statusSel = document.getElementById('inp-task-status');
      if (statusSel) statusSel.value = options.status;
    }

    _updateAssigneeLabel();
    document.getElementById('assignee-dropdown-menu')?.classList.add('hidden');

    document.getElementById('modal-create-task').style.display = 'flex';
    setTimeout(() => document.getElementById('inp-task-title')?.focus(), 50);
  }

  function close() {
    _closeAssigneeDropdown();
    const modal = document.getElementById('modal-create-task');
    if (modal) modal.style.display = 'none';
  }

  return { open, close };
})();
