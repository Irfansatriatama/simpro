/* SIMPRO Page: gantt — v0.9.0 */
const Page = (() => {
  let _session = null;
  let _project = null;
  let _zoom = 'month'; // week | month | quarter
  let _layout = null;
  let _syncScrolling = false;

  const ROW_H = 36;
  const LEFT_W = 280;

  // ── Helpers ──────────────────────────────────────────────────────────────
  function _getVisibleProjects() {
    const projects = Storage.get('sp_projects') || [];
    if (_session.role === 'admin' || _session.role === 'pm') {
      return projects.filter(p => p.status !== 'archived');
    }
    return projects.filter(p =>
      p.memberIds && p.memberIds.includes(_session.userId) && p.status !== 'archived'
    );
  }

  function _canManage() {
    return _session && (_session.role === 'admin' || _session.role === 'pm');
  }

  function _formatDate(iso) {
    if (!iso) return '—';
    return Utils.formatDateShort(iso);
  }

  // ── Build project selector ────────────────────────────────────────────────
  function _buildToolbar() {
    const projects = _getVisibleProjects();
    const sel = document.getElementById('gantt-project-select');
    if (!sel) return;
    sel.innerHTML = projects.map(p =>
      `<option value="${p.id}" ${_project && _project.id === p.id ? 'selected' : ''}>${Utils.escapeHtml(p.name)}</option>`
    ).join('');

    if (!_project && projects.length) {
      _project = projects[0];
    }
    if (_project) sel.value = _project.id;
  }

  // ── Main render ──────────────────────────────────────────────────────────
  function _render() {
    const container = document.getElementById('gantt-container');
    if (!container) return;

    if (!_project) {
      container.innerHTML = `<div class="gantt-empty"><p>Pilih project untuk melihat Gantt Chart.</p></div>`;
      return;
    }

    Milestone.checkStatus(_project.id);

    const tasks      = Gantt.getTasksWithDates(_project.id);
    const milestones = Milestone.getByProject(_project.id);
    const allTasks   = Storage.query('sp_tasks', t => t.projectId === _project.id && !t.parentId);
    const noDateCount = allTasks.length - tasks.length;

    _layout = Gantt.calculateLayout(tasks, milestones, _zoom);

    if (!_layout && !milestones.length) {
      container.innerHTML = `
        <div class="gantt-empty">
          <div class="gantt-empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div>
          <p>Belum ada task dengan due date di project ini. Tambahkan due date ke task untuk menampilkan Gantt Chart.</p>
        </div>`;
      return;
    }

    // If no datable tasks but have milestones, create a minimal layout
    if (!_layout) {
      const msWithDates = milestones.filter(m => m.dueDate);
      if (!msWithDates.length) {
        container.innerHTML = `<div class="gantt-empty"><p>Tambahkan due date ke milestone untuk menampilkan timeline.</p></div>`;
        return;
      }
      _layout = Gantt.calculateLayout([], msWithDates, _zoom);
    }

    const totalRows = tasks.length + milestones.length;
    const headerH   = _zoom === 'week' ? 28 : 48;
    const leftH     = headerH + totalRows * ROW_H;

    // Sync scroll between left rows and svg
    const hasMilestones = milestones.length > 0;
    const taskSectionH  = tasks.length > 0 ? (tasks.length * ROW_H) : 0;
    const msSectionH    = milestones.length > 0 ? (milestones.length * ROW_H) : 0;

    // Build left panel HTML
    const taskRowsHtml = tasks.map(t => {
      return `<a class="gantt-row" href="/pages/task-detail.html?id=${t.id}" style="height:${ROW_H}px;">
        <span class="gantt-row-status ${t.status}"></span>
        <span class="gantt-row-key">${Utils.escapeHtml(t.key)}</span>
        <span class="gantt-row-title" title="${Utils.escapeHtml(t.title)}">${Utils.escapeHtml(t.title)}</span>
      </a>`;
    }).join('');

    const msRowsHtml = milestones.map(m => {
      const statusLabel = { open: 'Open', completed: 'Selesai', missed: 'Terlewat' }[m.status] || m.status;
      return `<div class="gantt-row gantt-ms-row" data-ms-id="${m.id}" style="height:${ROW_H}px;cursor:default;">
        <span class="gantt-row-key" style="color:var(--color-epic);">◆</span>
        <span class="gantt-ms-name" title="${Utils.escapeHtml(m.name)}">${Utils.escapeHtml(m.name)}</span>
        <span class="gantt-ms-status-badge ${m.status}">${statusLabel}</span>
        ${_canManage() ? `<div class="ms-item-actions">
          <button class="btn-ms-edit" data-ms-id="${m.id}" title="Edit"><i data-lucide="pencil" style="width:12px;height:12px;"></i></button>
          <button class="btn-ms-delete" data-ms-id="${m.id}" title="Hapus"><i data-lucide="trash-2" style="width:12px;height:12px;"></i></button>
        </div>` : ''}
      </div>`;
    }).join('');

    // Render SVG
    const svgHtml = _layout ? Gantt.renderToSVG(tasks, milestones, _layout, ROW_H, LEFT_W) : '';

    const noDateBanner = noDateCount > 0 ? `
      <div class="gantt-info-banner">
        <i data-lucide="info" style="width:14px;height:14px;flex-shrink:0;"></i>
        ${noDateCount} task tidak memiliki due date dan tidak ditampilkan di Gantt Chart.
      </div>` : '';

    container.innerHTML = `
      ${noDateBanner}
      <div class="gantt-body">
        <div class="gantt-left" id="gantt-left" style="width:${LEFT_W}px;">
          <div class="gantt-left-header" style="height:${headerH}px;">Task / Milestone</div>
          <div class="gantt-left-rows" id="gantt-left-rows" style="overflow-y:hidden;">
            ${tasks.length > 0 ? `
              <div class="gantt-section-label">
                <i data-lucide="check-square" style="width:11px;height:11px;"></i>
                Tasks (${tasks.length})
              </div>
              ${taskRowsHtml}
            ` : ''}
            ${milestones.length > 0 ? `
              <div class="gantt-section-label">
                <i data-lucide="flag" style="width:11px;height:11px;"></i>
                Milestones (${milestones.length})
              </div>
              ${msRowsHtml}
            ` : ''}
          </div>
        </div>
        <div class="gantt-right" id="gantt-right">
          <div class="gantt-svg-wrap" id="gantt-svg-wrap">
            ${svgHtml}
          </div>
        </div>
      </div>`;

    // Sync scroll vertically
    const leftRows = document.getElementById('gantt-left-rows');
    const rightEl  = document.getElementById('gantt-right');
    if (leftRows && rightEl) {
      rightEl.addEventListener('scroll', () => {
        if (_syncScrolling) return;
        _syncScrolling = true;
        leftRows.scrollTop = rightEl.scrollTop;
        _syncScrolling = false;
      });
      leftRows.addEventListener('scroll', () => {
        if (_syncScrolling) return;
        _syncScrolling = true;
        rightEl.scrollTop = leftRows.scrollTop;
        _syncScrolling = false;
      });

      // Scroll today into view
      const todayX = _layout ? _dayOffsetToX(_layout) : 0;
      if (todayX > 100) {
        requestAnimationFrame(() => {
          rightEl.scrollLeft = Math.max(0, todayX - rightEl.clientWidth / 2);
        });
      }
    }

    // Event delegation for SVG bars → task detail nav
    const svgWrap = document.getElementById('gantt-svg-wrap');
    if (svgWrap) {
      svgWrap.addEventListener('click', e => {
        const bar = e.target.closest('.gantt-bar');
        if (bar) {
          const taskId = bar.getAttribute('data-task-id');
          if (taskId) window.location.href = `/pages/task-detail.html?id=${taskId}`;
        }
        const ms = e.target.closest('.gantt-milestone');
        if (ms) {
          const msId = ms.getAttribute('data-ms-id');
          if (msId) _openMilestoneModal(msId);
        }
      });
    }

    // Event delegation for left panel actions
    const leftEl = document.getElementById('gantt-left');
    if (leftEl) {
      leftEl.addEventListener('click', e => {
        const editBtn = e.target.closest('.btn-ms-edit');
        if (editBtn) {
          e.preventDefault();
          e.stopPropagation();
          _openMilestoneModal(editBtn.dataset.msId);
        }
        const delBtn = e.target.closest('.btn-ms-delete');
        if (delBtn) {
          e.preventDefault();
          e.stopPropagation();
          _deleteMilestone(delBtn.dataset.msId);
        }
      });
    }

    if (window.lucide) lucide.createIcons();
  }

  function _dayOffsetToX(layout) {
    const today = Utils.todayISO();
    const ms = new Date(today).getTime() - new Date(layout.startDate).getTime();
    const days = Math.round(ms / 86400000);
    return days * layout.cfg.colWidth;
  }

  // ── Milestone modal ───────────────────────────────────────────────────────
  function _openMilestoneModal(msId) {
    const existing = msId ? Milestone.getById(msId) : null;
    const title = existing ? 'Edit Milestone' : 'Tambah Milestone';

    const body = `
      <div class="form-group">
        <label class="form-label">Nama Milestone <span style="color:var(--color-danger)">*</span></label>
        <input class="form-input" id="ms-name" type="text" value="${existing ? Utils.escapeHtml(existing.name) : ''}" placeholder="Nama milestone">
      </div>
      <div class="form-group">
        <label class="form-label">Deskripsi</label>
        <textarea class="form-input" id="ms-desc" rows="2" placeholder="Opsional">${existing ? Utils.escapeHtml(existing.description) : ''}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label">Due Date</label>
        <input class="form-input" id="ms-due" type="date" value="${existing ? (existing.dueDate || '') : ''}">
      </div>
      <div class="form-group">
        <label class="form-label">Status</label>
        <select class="form-input" id="ms-status">
          <option value="open" ${!existing || existing.status === 'open' ? 'selected' : ''}>Open</option>
          <option value="completed" ${existing && existing.status === 'completed' ? 'selected' : ''}>Selesai</option>
          <option value="missed" ${existing && existing.status === 'missed' ? 'selected' : ''}>Terlewat</option>
        </select>
      </div>`;

    const footer = `
      <button class="btn btn-ghost" id="ms-cancel">Batal</button>
      <button class="btn btn-primary" id="ms-save">${existing ? 'Simpan' : 'Tambah'}</button>`;

    const { close } = App.createModal({ title, body, footer });

    document.getElementById('ms-cancel').addEventListener('click', close);
    document.getElementById('ms-name').focus();

    document.getElementById('ms-save').addEventListener('click', () => {
      const name = document.getElementById('ms-name').value.trim();
      if (!name) { App.Toast.error('Nama milestone wajib diisi'); return; }

      const data = {
        projectId: _project.id,
        name,
        description: document.getElementById('ms-desc').value.trim(),
        dueDate: document.getElementById('ms-due').value || null,
        status: document.getElementById('ms-status').value,
      };

      if (existing) {
        Milestone.update(existing.id, data);
        App.Toast.success('Milestone diperbarui');
      } else {
        Milestone.create(data);
        App.Toast.success('Milestone ditambahkan');
      }
      close();
      _render();
    });
  }

  function _deleteMilestone(msId) {
    const ms = Milestone.getById(msId);
    if (!ms) return;
    if (!confirm(`Hapus milestone "${ms.name}"?`)) return;
    Milestone.remove(msId);
    App.Toast.success('Milestone dihapus');
    _render();
  }

  // ── Milestone list panel ──────────────────────────────────────────────────
  function _openMilestoneListModal() {
    if (!_project) return;
    const milestones = Milestone.getByProject(_project.id);
    const canManage = _canManage();

    const msHtml = milestones.length ? milestones.map(m => {
      const statusLabel = { open: 'Open', completed: 'Selesai', missed: 'Terlewat' }[m.status] || m.status;
      return `<div class="ms-item">
        <div class="ms-item-diamond ${m.status}"></div>
        <div class="ms-item-info">
          <div class="ms-item-name">${Utils.escapeHtml(m.name)}</div>
          <div class="ms-item-date">${m.dueDate ? Utils.formatDate(m.dueDate) : 'Tanpa due date'} · ${statusLabel}</div>
        </div>
        ${canManage ? `<div class="ms-item-actions">
          <button class="btn-ms-edit-list" data-ms-id="${m.id}" title="Edit"><i data-lucide="pencil" style="width:13px;height:13px;"></i></button>
          <button class="btn-ms-delete-list btn-ms-delete" data-ms-id="${m.id}" title="Hapus"><i data-lucide="trash-2" style="width:13px;height:13px;"></i></button>
        </div>` : ''}
      </div>`;
    }).join('') : `<p style="color:var(--color-text-3);font-size:var(--text-sm);text-align:center;padding:var(--sp-4);">Belum ada milestone.</p>`;

    const footer = canManage
      ? `<button class="btn btn-ghost" id="ms-list-close">Tutup</button>
         <button class="btn btn-primary" id="ms-list-add"><i data-lucide="plus" style="width:14px;height:14px;"></i> Tambah Milestone</button>`
      : `<button class="btn btn-ghost" id="ms-list-close">Tutup</button>`;

    const { close } = App.createModal({
      title: `Milestones — ${_project.name}`,
      body: `<div class="ms-list">${msHtml}</div>`,
      footer,
      size: 'modal-md',
    });

    if (window.lucide) lucide.createIcons();

    document.getElementById('ms-list-close').addEventListener('click', close);
    const addBtn = document.getElementById('ms-list-add');
    if (addBtn) addBtn.addEventListener('click', () => { close(); _openMilestoneModal(null); });

    document.querySelectorAll('.btn-ms-edit-list').forEach(btn => {
      btn.addEventListener('click', () => { close(); _openMilestoneModal(btn.dataset.msId); });
    });
    document.querySelectorAll('.btn-ms-delete-list').forEach(btn => {
      btn.addEventListener('click', () => { close(); _deleteMilestone(btn.dataset.msId); });
    });
  }

  // ── Init ──────────────────────────────────────────────────────────────────
  function init() {
    _session = Storage.get('sp_session');
    if (!_session) return;

    const projects = _getVisibleProjects();
    _project = projects[0] || null;

    // Render toolbar
    const toolbar = document.getElementById('gantt-toolbar');
    if (toolbar) {
      const projectOptions = projects.map(p =>
        `<option value="${p.id}">${Utils.escapeHtml(p.name)}</option>`
      ).join('');

      toolbar.innerHTML = `
        <div class="gantt-toolbar-left">
          <select class="form-input" id="gantt-project-select" style="width:200px;">
            ${projectOptions}
          </select>
          <span style="font-size:var(--text-sm);color:var(--color-text-3);">Gantt Chart</span>
        </div>
        <div class="gantt-toolbar-right">
          ${_canManage() ? `<button class="btn btn-outline" id="btn-add-milestone"><i data-lucide="flag" style="width:14px;height:14px;"></i> Milestones</button>` : ''}
          <div class="gantt-zoom-group">
            <button class="gantt-zoom-btn ${_zoom === 'week' ? 'active' : ''}" data-zoom="week">Minggu</button>
            <button class="gantt-zoom-btn ${_zoom === 'month' ? 'active' : ''}" data-zoom="month">Bulan</button>
            <button class="gantt-zoom-btn ${_zoom === 'quarter' ? 'active' : ''}" data-zoom="quarter">Kuartal</button>
          </div>
        </div>`;

      document.getElementById('gantt-project-select').addEventListener('change', e => {
        const projects = _getVisibleProjects();
        _project = projects.find(p => p.id === e.target.value) || null;
        _render();
      });

      toolbar.querySelectorAll('.gantt-zoom-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          _zoom = btn.dataset.zoom;
          toolbar.querySelectorAll('.gantt-zoom-btn').forEach(b => b.classList.toggle('active', b.dataset.zoom === _zoom));
          _render();
        });
      });

      const msBtn = document.getElementById('btn-add-milestone');
      if (msBtn) msBtn.addEventListener('click', _openMilestoneListModal);
    }

    // Listen for task updates from other pages
    App.events.on('task:updated', _render);

    _render();
  }

  return { init };
})();
