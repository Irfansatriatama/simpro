/* SIMPRO Page: settings — v0.15.0 */
const Page = (() => {
  let _session = null;
  let _user = null;
  let _activeTab = 'appearance';
  let _labelProjectId = null;
  let _editingProjectId = null;
  let _editingLabelId = null;

  function init() {
    _session = Storage.get('sp_session');
    _user = Auth.getCurrentUser();
    if (!_user) return;
    _renderShell();
    _switchTab('appearance');
    _bindShellEvents();
  }

  /* ── Shell ── */

  function _renderShell() {
    const main = document.getElementById('main-content');
    const isAdmin = _user.role === 'admin';

    main.innerHTML = `
      <div class="page-header">
        <div class="page-header-left"><h1 class="page-title">Settings</h1></div>
      </div>

      <div class="settings-layout">
        <nav class="settings-sidenav" id="settings-sidenav">
          <div class="settings-sidenav-item active" data-tab="appearance">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14"/></svg>
            Tampilan
          </div>
          <div class="settings-sidenav-item" data-tab="projects">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            Projects
          </div>
          <div class="settings-sidenav-item" data-tab="labels">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
            Labels
          </div>
          ${isAdmin ? `
          <div class="settings-sidenav-item" data-tab="danger">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            Danger Zone
          </div>` : ''}
        </nav>

        <div id="settings-content">
          <div id="panel-appearance"  class="settings-panel"></div>
          <div id="panel-projects"    class="settings-panel"></div>
          <div id="panel-labels"      class="settings-panel"></div>
          <div id="panel-danger"      class="settings-panel"></div>
        </div>
      </div>

      <!-- Project Edit Modal -->
      <div class="modal-overlay" id="project-edit-modal" style="display:none;">
        <div class="modal" style="max-width:440px;">
          <div class="modal-header">
            <h3 class="modal-title">Edit Project</h3>
            <button class="modal-close" id="close-project-modal">&times;</button>
          </div>
          <div class="modal-body project-edit-modal-body" id="project-modal-body"></div>
          <div class="modal-footer">
            <button class="btn btn-secondary btn-sm" id="cancel-project-modal">Batal</button>
            <button class="btn btn-primary btn-sm" id="save-project-modal">Simpan</button>
          </div>
        </div>
      </div>
    `;
  }

  function _bindShellEvents() {
    document.getElementById('settings-sidenav').addEventListener('click', e => {
      const item = e.target.closest('[data-tab]');
      if (item) _switchTab(item.dataset.tab);
    });

    document.addEventListener('click', e => {
      if (e.target.closest('#close-project-modal') || e.target.closest('#cancel-project-modal')) {
        _closeProjectModal();
      }
      if (e.target.closest('#save-project-modal')) _saveProjectModal();

      const projectModal = document.getElementById('project-edit-modal');
      if (e.target === projectModal) _closeProjectModal();
    });
  }

  function _switchTab(tab) {
    _activeTab = tab;
    document.querySelectorAll('.settings-sidenav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.tab === tab);
    });
    document.querySelectorAll('.settings-panel').forEach(el => el.classList.remove('active'));
    const panel = document.getElementById(`panel-${tab}`);
    if (panel) { panel.classList.add('active'); _renderPanel(tab); }
  }

  /* ── Render Panels ── */

  function _renderPanel(tab) {
    if (tab === 'appearance')  _renderAppearance();
    else if (tab === 'projects') _renderProjects();
    else if (tab === 'labels')   _renderLabels();
    else if (tab === 'danger')   _renderDanger();
  }

  /* ── Appearance ── */

  function _renderAppearance() {
    const isDark  = document.documentElement.getAttribute('data-theme') === 'dark';
    const fontSize = Storage.get('sp_font_size') || 'normal';

    document.getElementById('panel-appearance').innerHTML = `
      <div class="settings-card">
        <div class="settings-card-header">
          <div class="settings-card-title">Tema</div>
          <div class="settings-card-desc">Atur tampilan terang atau gelap</div>
        </div>
        <div class="settings-card-body">
          <div class="appearance-option">
            <div>
              <div class="appearance-option-label">Dark Mode</div>
              <div class="appearance-option-sub">Aktifkan tampilan gelap untuk mengurangi silau layar</div>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" id="toggle-dark" ${isDark ? 'checked' : ''}>
              <span class="toggle-switch-track"></span>
            </label>
          </div>
        </div>
      </div>

      <div class="settings-card">
        <div class="settings-card-header">
          <div class="settings-card-title">Ukuran Font</div>
          <div class="settings-card-desc">Sesuaikan ukuran teks aplikasi</div>
        </div>
        <div class="settings-card-body">
          <div class="font-size-options">
            <div class="font-size-option ${fontSize === 'normal' ? 'active' : ''}" data-size="normal">
              <span class="font-size-preview" style="font-size:14px;">Aa</span>
              Normal
            </div>
            <div class="font-size-option ${fontSize === 'large' ? 'active' : ''}" data-size="large">
              <span class="font-size-preview" style="font-size:17px;">Aa</span>
              Besar
            </div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('toggle-dark').addEventListener('change', e => {
      const dark = e.target.checked;
      if (dark) {
        document.documentElement.setAttribute('data-theme', 'dark');
        Storage.set('sp_theme', 'dark');
      } else {
        document.documentElement.removeAttribute('data-theme');
        Storage.set('sp_theme', 'light');
      }
      App.Toast.success(dark ? 'Dark mode aktif' : 'Light mode aktif');
    });

    document.querySelectorAll('[data-size]').forEach(el => {
      el.addEventListener('click', () => {
        const size = el.dataset.size;
        Storage.set('sp_font_size', size);
        document.querySelectorAll('[data-size]').forEach(x => x.classList.toggle('active', x.dataset.size === size));
        _applyFontSize(size);
        App.Toast.success('Ukuran font diperbarui');
      });
    });
  }

  function _applyFontSize(size) {
    const root = document.documentElement;
    if (size === 'large') {
      root.style.setProperty('--text-base', '16px');
      root.style.setProperty('--text-sm',   '14px');
      root.style.setProperty('--text-md',   '17px');
      root.style.setProperty('--text-lg',   '19px');
    } else {
      root.style.setProperty('--text-base', '14px');
      root.style.setProperty('--text-sm',   '13px');
      root.style.setProperty('--text-md',   '15px');
      root.style.setProperty('--text-lg',   '17px');
    }
  }

  /* ── Projects ── */

  function _renderProjects() {
    const projects = _getEditableProjects();
    const panel = document.getElementById('panel-projects');

    if (!projects.length) {
      panel.innerHTML = `
        <div class="settings-card">
          <div class="settings-card-header"><div class="settings-card-title">Project</div></div>
          <div class="settings-card-body" style="color:var(--color-text-2);font-size:var(--text-sm);">
            Tidak ada project yang dapat dikelola.
          </div>
        </div>`;
      return;
    }

    panel.innerHTML = `
      <div class="settings-card">
        <div class="settings-card-header">
          <div class="settings-card-title">Project</div>
          <div class="settings-card-desc">Kelola project yang kamu miliki</div>
        </div>
        <div class="settings-card-body">
          <ul class="project-settings-list" id="projects-settings-list">
            ${projects.map(p => `
              <li class="project-settings-item" data-id="${p.id}">
                <span class="project-color-dot" style="background:${p.color || '#3B5BDB'};"></span>
                <span class="project-settings-name">${Utils.escapeHtml(p.name)}</span>
                <span class="project-settings-key">${Utils.escapeHtml(p.key)}</span>
                <div class="project-settings-actions">
                  <button class="btn btn-ghost btn-sm" data-action="edit-project" data-id="${p.id}" title="Edit">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button class="btn btn-ghost btn-sm" data-action="delete-project" data-id="${p.id}" data-name="${Utils.escapeHtml(p.name)}" title="Hapus" style="color:var(--color-danger);">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                  </button>
                </div>
              </li>`).join('')}
          </ul>
        </div>
      </div>
    `;

    document.getElementById('projects-settings-list').addEventListener('click', e => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      if (btn.dataset.action === 'edit-project')   _openProjectModal(btn.dataset.id);
      if (btn.dataset.action === 'delete-project') _deleteProject(btn.dataset.id, btn.dataset.name);
    });
  }

  function _getEditableProjects() {
    const all = Storage.get('sp_projects') || [];
    if (_user.role === 'admin') return all;
    return all.filter(p => p.ownerId === _user.id);
  }

  function _openProjectModal(projectId) {
    const p = (Storage.get('sp_projects') || []).find(x => x.id === projectId);
    if (!p) return;
    _editingProjectId = projectId;

    const colors = ['#3B5BDB','#2F9E44','#C92A2A','#7048E8','#E67700','#1971C2','#0C8599','#9C36B5'];
    document.getElementById('project-modal-body').innerHTML = `
      <div class="form-group">
        <label class="form-label" for="pm-proj-name">Nama Project</label>
        <input class="form-input" type="text" id="pm-proj-name" value="${Utils.escapeHtml(p.name)}" maxlength="80">
      </div>
      <div class="form-group">
        <label class="form-label" for="pm-proj-key">Project Key</label>
        <input class="form-input" type="text" id="pm-proj-key" value="${Utils.escapeHtml(p.key)}" maxlength="6" style="text-transform:uppercase;">
        <div class="form-hint">Prefix task (maks 6 huruf). Perubahan tidak mempengaruhi task yang sudah ada.</div>
      </div>
      <div class="form-group">
        <label class="form-label">Warna Project</label>
        <div style="display:flex;gap:var(--sp-2);flex-wrap:wrap;" id="pm-proj-colors">
          ${colors.map(c => `
            <div class="color-swatch ${p.color === c ? 'selected' : ''}" data-color="${c}"
              style="width:24px;height:24px;border-radius:50%;background:${c};cursor:pointer;border:2px solid ${p.color === c ? '#fff' : 'transparent'};box-shadow:${p.color === c ? '0 0 0 2px ' + c : 'none'};"></div>
          `).join('')}
          <div class="color-picker-wrap" style="width:24px;height:24px;border-radius:50%;overflow:hidden;border:1px dashed var(--color-border);" title="Warna custom">
            <input type="color" id="pm-proj-color-custom" value="${p.color || '#3B5BDB'}">
          </div>
        </div>
        <input type="hidden" id="pm-proj-color" value="${p.color || '#3B5BDB'}">
      </div>
    `;

    document.getElementById('pm-proj-key').addEventListener('input', e => {
      e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    });

    document.getElementById('pm-proj-colors').addEventListener('click', e => {
      const sw = e.target.closest('[data-color]');
      if (!sw) return;
      document.querySelectorAll('#pm-proj-colors .color-swatch').forEach(x => {
        x.style.border = '2px solid transparent';
        x.style.boxShadow = 'none';
      });
      sw.style.border = '2px solid #fff';
      sw.style.boxShadow = `0 0 0 2px ${sw.dataset.color}`;
      document.getElementById('pm-proj-color').value = sw.dataset.color;
      document.getElementById('pm-proj-color-custom').value = sw.dataset.color;
    });

    document.getElementById('pm-proj-color-custom').addEventListener('input', e => {
      document.getElementById('pm-proj-color').value = e.target.value;
    });

    document.getElementById('project-edit-modal').style.display = 'flex';
  }

  function _closeProjectModal() {
    document.getElementById('project-edit-modal').style.display = 'none';
    _editingProjectId = null;
  }

  function _saveProjectModal() {
    const name  = document.getElementById('pm-proj-name').value.trim();
    const key   = document.getElementById('pm-proj-key').value.trim().toUpperCase();
    const color = document.getElementById('pm-proj-color').value;

    if (!name) { App.Toast.error('Nama project wajib diisi'); return; }
    if (!key || key.length < 1) { App.Toast.error('Project key wajib diisi'); return; }

    const projects = Storage.get('sp_projects') || [];
    const conflict = projects.find(p => p.key === key && p.id !== _editingProjectId);
    if (conflict) { App.Toast.error('Key sudah digunakan project lain'); return; }

    Storage.update('sp_projects', arr =>
      arr.map(p => p.id === _editingProjectId
        ? { ...p, name, key, color, updatedAt: Utils.nowISO() }
        : p)
    );

    _closeProjectModal();
    _renderProjects();
    App.Toast.success('Project diperbarui');
  }

  function _deleteProject(projectId, name) {
    if (!confirm(`Hapus project "${name}"?\n\nSemua task, sprint, dan data terkait akan ikut dihapus. Tindakan ini tidak dapat dibatalkan.`)) return;

    const tasks = Storage.get('sp_tasks') || [];
    const taskIds = tasks.filter(t => t.projectId === projectId).map(t => t.id);

    Storage.update('sp_projects',  arr => arr.filter(p => p.id !== projectId));
    Storage.update('sp_tasks',     arr => arr.filter(t => t.projectId !== projectId));
    Storage.update('sp_sprints',   arr => arr.filter(s => s.projectId !== projectId));
    Storage.update('sp_timelogs',  arr => arr.filter(tl => !taskIds.includes(tl.taskId)));
    Storage.update('sp_comments',  arr => arr.filter(c => !taskIds.includes(c.taskId)));
    Storage.update('sp_milestones',arr => arr.filter(m => m.projectId !== projectId));
    Storage.update('sp_labels',    arr => arr.filter(l => l.projectId !== projectId));

    _renderProjects();
    App.Toast.success(`Project "${name}" dihapus`);
  }

  /* ── Labels ── */

  function _renderLabels() {
    const editableProjects = _getEditableProjects();
    const panel = document.getElementById('panel-labels');

    if (!editableProjects.length) {
      panel.innerHTML = `
        <div class="settings-card">
          <div class="settings-card-header"><div class="settings-card-title">Labels</div></div>
          <div class="settings-card-body" style="color:var(--color-text-2);font-size:var(--text-sm);">Tidak ada project yang dapat dikelola.</div>
        </div>`;
      return;
    }

    if (!_labelProjectId || !editableProjects.find(p => p.id === _labelProjectId)) {
      _labelProjectId = editableProjects[0].id;
    }

    const labels = (Storage.get('sp_labels') || []).filter(l => l.projectId === _labelProjectId);

    panel.innerHTML = `
      <div class="settings-card">
        <div class="settings-card-header">
          <div class="settings-card-title">Labels</div>
          <div class="settings-card-desc">Kelola label per project</div>
        </div>
        <div class="settings-card-body">
          <div class="label-project-select-wrap">
            <select class="form-input" id="label-project-select" style="max-width:280px;">
              ${editableProjects.map(p => `<option value="${p.id}" ${p.id === _labelProjectId ? 'selected' : ''}>${Utils.escapeHtml(p.name)}</option>`).join('')}
            </select>
          </div>

          <ul class="labels-list" id="labels-list">
            ${labels.length ? labels.map(l => _labelItemHtml(l)).join('') : `
              <li style="padding:var(--sp-4) 0;color:var(--color-text-2);font-size:var(--text-sm);">
                Belum ada label untuk project ini.
              </li>`}
          </ul>

          <!-- Add label form -->
          <div class="add-label-form">
            <div class="color-picker-wrap">
              <input type="color" id="new-label-color" value="#3B5BDB">
            </div>
            <input class="form-input" type="text" id="new-label-name" placeholder="Nama label baru…" maxlength="40">
            <button class="btn btn-primary btn-sm" id="btn-add-label">Tambah</button>
          </div>
        </div>
      </div>
    `;

    document.getElementById('label-project-select').addEventListener('change', e => {
      _labelProjectId = e.target.value;
      _renderLabels();
    });

    document.getElementById('btn-add-label').addEventListener('click', _addLabel);
    document.getElementById('new-label-name').addEventListener('keydown', e => {
      if (e.key === 'Enter') _addLabel();
    });

    document.getElementById('labels-list').addEventListener('click', e => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      if (btn.dataset.action === 'delete-label') _deleteLabel(btn.dataset.id);
      if (btn.dataset.action === 'edit-label')   _startEditLabel(btn.dataset.id);
      if (btn.dataset.action === 'save-label')   _saveEditLabel(btn.dataset.id);
      if (btn.dataset.action === 'cancel-label') _renderLabels();
    });
  }

  function _labelItemHtml(l) {
    return `
      <li class="label-item" data-label-id="${l.id}">
        <span class="label-color-swatch" style="background:${l.color};"></span>
        <span class="label-name">${Utils.escapeHtml(l.name)}</span>
        <div class="label-actions">
          <button class="btn btn-ghost btn-sm" data-action="edit-label" data-id="${l.id}" title="Edit">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn btn-ghost btn-sm" data-action="delete-label" data-id="${l.id}" title="Hapus" style="color:var(--color-danger);">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M9 6V4h6v2"/></svg>
          </button>
        </div>
      </li>`;
  }

  function _addLabel() {
    const name  = (document.getElementById('new-label-name').value || '').trim();
    const color = document.getElementById('new-label-color').value;
    if (!name) { App.Toast.error('Nama label wajib diisi'); return; }
    Label.create({ name, color, projectId: _labelProjectId });
    document.getElementById('new-label-name').value = '';
    _renderLabels();
    App.Toast.success('Label ditambahkan');
  }

  function _deleteLabel(id) {
    if (!confirm('Hapus label ini? Label akan dihapus dari semua task.')) return;
    Label.remove(id);
    _renderLabels();
    App.Toast.success('Label dihapus');
  }

  function _startEditLabel(id) {
    const l = (Storage.get('sp_labels') || []).find(x => x.id === id);
    if (!l) return;
    const li = document.querySelector(`[data-label-id="${id}"]`);
    if (!li) return;
    li.innerHTML = `
      <div class="color-picker-wrap" style="width:28px;height:28px;border-radius:4px;flex-shrink:0;">
        <input type="color" id="edit-label-color-${id}" value="${l.color}">
      </div>
      <input class="form-input" type="text" id="edit-label-name-${id}" value="${Utils.escapeHtml(l.name)}" style="flex:1;">
      <div class="label-actions">
        <button class="btn btn-primary btn-sm" data-action="save-label" data-id="${id}">Simpan</button>
        <button class="btn btn-ghost btn-sm" data-action="cancel-label">Batal</button>
      </div>
    `;
    document.getElementById(`edit-label-name-${id}`).focus();
  }

  function _saveEditLabel(id) {
    const name  = (document.getElementById(`edit-label-name-${id}`)?.value || '').trim();
    const color = document.getElementById(`edit-label-color-${id}`)?.value;
    if (!name) { App.Toast.error('Nama label wajib diisi'); return; }
    Label.update(id, { name, color });
    _renderLabels();
    App.Toast.success('Label diperbarui');
  }

  /* ── Danger Zone ── */

  function _renderDanger() {
    if (_user.role !== 'admin') return;
    document.getElementById('panel-danger').innerHTML = `
      <div class="danger-zone-card">
        <div class="danger-zone-header">
          <div class="danger-zone-title">Danger Zone</div>
        </div>
        <div class="danger-zone-body">
          <div class="danger-zone-item">
            <div>
              <div class="danger-zone-label">Reset Semua Data</div>
              <div class="danger-zone-desc">Hapus semua project, task, sprint, user, dan data lainnya. Aplikasi akan kembali ke kondisi awal dengan seed data default.</div>
            </div>
            <button class="btn btn-danger btn-sm" id="btn-reset-all">Reset Data</button>
          </div>
        </div>
      </div>
    `;

    document.getElementById('btn-reset-all').addEventListener('click', () => {
      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.style.display = 'flex';
      modal.innerHTML = `
        <div class="modal" style="max-width:400px;">
          <div class="modal-header">
            <h3 class="modal-title" style="color:var(--color-danger);">Reset Semua Data</h3>
            <button class="modal-close" id="close-reset-modal">&times;</button>
          </div>
          <div class="modal-body">
            <p style="font-size:var(--text-sm);color:var(--color-text-2);margin-bottom:var(--sp-4);">
              Tindakan ini akan menghapus <strong>semua data</strong> (project, task, sprint, user, notifikasi, dll) dan tidak dapat dibatalkan.
            </p>
            <p style="font-size:var(--text-sm);font-weight:500;margin-bottom:var(--sp-2);">Ketik <code style="font-family:var(--font-mono);color:var(--color-danger);">RESET</code> untuk konfirmasi:</p>
            <input class="form-input" type="text" id="reset-confirm-input" placeholder="RESET" autocomplete="off">
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary btn-sm" id="close-reset-modal-btn">Batal</button>
            <button class="btn btn-danger btn-sm" id="confirm-reset-btn" disabled>Reset Semua Data</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      const closeModal = () => modal.remove();
      modal.querySelector('#close-reset-modal').addEventListener('click', closeModal);
      modal.querySelector('#close-reset-modal-btn').addEventListener('click', closeModal);
      modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

      const input = modal.querySelector('#reset-confirm-input');
      const confirmBtn = modal.querySelector('#confirm-reset-btn');
      input.addEventListener('input', () => {
        confirmBtn.disabled = input.value !== 'RESET';
      });

      confirmBtn.addEventListener('click', async () => {
        Storage.clearAll();
        await Storage.seed();
        App.Toast.success('Data berhasil direset. Memuat ulang…');
        setTimeout(() => window.location.href = './login.html', 1500);
      });
    });
  }

  return { init };
})();
