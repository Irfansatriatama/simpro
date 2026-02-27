/* SIMPRO Module: TaskModal — global create-task modal, dapat dipanggil dari halaman manapun */
const TaskModal = (() => {
  let _onSuccess = null;
  let _defaultProjectId = null;

  function _ensureDOM() {
    if (document.getElementById('modal-create-task')) return;

    const overlay = document.createElement('div');
    overlay.id = 'modal-create-task';
    overlay.className = 'modal-overlay';
    overlay.style.display = 'none';
    overlay.innerHTML = `
      <div class="modal modal-lg">
        <div class="modal-header">
          <h2 class="modal-title">Buat Task Baru</h2>
          <button class="modal-close" id="modal-task-close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="modal-body">
          <div class="modal-task-grid">
            <div class="form-group full">
              <label class="form-label required">Judul Task</label>
              <input type="text" id="inp-task-title" class="form-input" placeholder="Deskripsikan task secara singkat...">
            </div>
            <div class="form-group full">
              <label class="form-label">Deskripsi</label>
              <textarea id="inp-task-desc" class="form-textarea" rows="3" placeholder="Deskripsi detail (opsional)..."></textarea>
            </div>
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
              <label class="form-label">Prioritas</label>
              <select id="inp-task-priority" class="form-select">
                <option value="medium" selected>Medium</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="low">Low</option>
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
              <label class="form-label">Assignee</label>
              <select id="inp-task-assignee" class="form-select" multiple style="height:80px"></select>
            </div>
            <div class="form-group">
              <label class="form-label">Due Date</label>
              <input type="date" id="inp-task-due" class="form-input">
            </div>
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
          <button class="btn btn-primary btn-sm" id="btn-task-save">Buat Task</button>
        </div>
      </div>`;

    document.body.appendChild(overlay);

    document.getElementById('modal-task-close').addEventListener('click', close);
    document.getElementById('btn-task-cancel').addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    document.getElementById('btn-task-save').addEventListener('click', _save);
    document.getElementById('inp-task-project').addEventListener('change', _onProjectChange);

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && overlay.style.display === 'flex') close();
    });
  }

  function _populateProjects() {
    const session = Storage.get('sp_session');
    if (!session) return;
    const projects = (Storage.get('sp_projects') || []).filter(p =>
      p.status === 'active' &&
      (session.role === 'admin' || session.role === 'pm' || p.memberIds.includes(session.userId))
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
    const assigneeSel = document.getElementById('inp-task-assignee');
    if (!sprintSel || !projectId) return;

    const sprints = (Storage.get('sp_sprints') || []).filter(s => s.projectId === projectId && s.status !== 'completed');
    sprintSel.innerHTML = `<option value="">Backlog</option>` + sprints.map(s =>
      `<option value="${s.id}">${Utils.escapeHtml(s.name)} (${s.status})</option>`
    ).join('');

    const project = (Storage.get('sp_projects') || []).find(p => p.id === projectId);
    if (project && assigneeSel) {
      const users = Storage.get('sp_users') || [];
      const members = users.filter(u => project.memberIds.includes(u.id));
      assigneeSel.innerHTML = members.map(u => `<option value="${u.id}">${Utils.escapeHtml(u.name)}</option>`).join('');
    }
  }

  function _save() {
    const title = document.getElementById('inp-task-title')?.value?.trim();
    if (!title) { App.Toast.warning('Judul task wajib diisi'); return; }
    const projectId = document.getElementById('inp-task-project')?.value;
    if (!projectId) { App.Toast.warning('Pilih project terlebih dahulu'); return; }

    const assigneeSel = document.getElementById('inp-task-assignee');
    const assigneeIds = assigneeSel
      ? Array.from(assigneeSel.selectedOptions).map(o => o.value)
      : [];

    const data = {
      projectId,
      title,
      description: document.getElementById('inp-task-desc')?.value || '',
      sprintId: document.getElementById('inp-task-sprint')?.value || null,
      type: document.getElementById('inp-task-type')?.value || 'task',
      priority: document.getElementById('inp-task-priority')?.value || 'medium',
      status: document.getElementById('inp-task-status')?.value || 'todo',
      assigneeIds,
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

  function open(options = {}) {
    _ensureDOM();
    _defaultProjectId = options.projectId || null;
    _onSuccess = options.onSuccess || null;
    _populateProjects();

    // Reset form
    ['inp-task-title','inp-task-desc','inp-task-due','inp-task-sp','inp-task-hours'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    ['inp-task-type','inp-task-priority','inp-task-status'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.selectedIndex = 0;
    });

    // Set status if provided
    if (options.status) {
      const statusSel = document.getElementById('inp-task-status');
      if (statusSel) statusSel.value = options.status;
    }

    document.getElementById('modal-create-task').style.display = 'flex';
    setTimeout(() => document.getElementById('inp-task-title')?.focus(), 50);
    if (window.lucide) lucide.createIcons({ scopeElement: document.getElementById('modal-create-task') });
  }

  function close() {
    const modal = document.getElementById('modal-create-task');
    if (modal) modal.style.display = 'none';
  }

  return { open, close };
})();
