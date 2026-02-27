/* SIMPRO Page: project-detail */
const ProjectDetailPage = (() => {
  let _project = null;
  let _session = null;
  let _canManage = false;
  let _settingsColor = '#3B5BDB';

  function init() {
    _session = Storage.get('sp_session');
    if (!_session) return;

    const params = Utils.parseQueryParams(window.location.search);
    const projectId = params.id;
    if (!projectId) { window.location.href = '/pages/projects.html'; return; }

    _project = Project.getById(projectId);
    if (!_project) { window.location.href = '/pages/projects.html'; return; }

    _canManage = _session.role === 'admin' || _session.role === 'pm';

    _renderHeader();
    _bindTabs();
    _renderOverview();
    _renderMembers();
    if (_canManage) _renderSettings();
    else document.getElementById('tab-settings-btn').style.display = 'none';

    if (window.lucide) lucide.createIcons();
  }

  function _renderHeader() {
    document.title = `${_project.name} — SIMPRO`;
    document.getElementById('breadcrumb-name').textContent = _project.name;
    document.getElementById('project-name').textContent = _project.name;
    document.getElementById('project-key-badge').textContent = _project.key;

    const dot = document.getElementById('project-color-dot');
    dot.style.background = _project.color;

    const statusBadge = document.getElementById('project-status-badge');
    statusBadge.textContent = Utils.getProjectStatusLabel(_project.status);
    statusBadge.className = `badge badge-${Utils.getProjectStatusColor(_project.status)}`;

    const desc = document.getElementById('project-desc-text');
    desc.textContent = _project.description || '';

    const actionsEl = document.getElementById('project-actions');
    actionsEl.innerHTML = '';

    const _sess = Storage.get('sp_session');
    const links = [
      { href: `/pages/board.html?project=${_project.id}`, icon: 'kanban', label: 'Board' },
      { href: `/pages/backlog.html?project=${_project.id}`, icon: 'list', label: 'Backlog' },
      { href: `/pages/gantt.html?project=${_project.id}`, icon: 'gantt-chart', label: 'Gantt' },
    ];
    links.forEach(l => {
      const a = document.createElement('a');
      a.className = 'btn btn-ghost btn-sm';
      a.href = l.href;
      a.innerHTML = `<i data-lucide="${l.icon}" width="14" height="14"></i> ${l.label}`;
      actionsEl.appendChild(a);
    });

    if (_sess && _sess.role !== 'viewer') {
      const btn = document.createElement('button');
      btn.className = 'btn btn-primary btn-sm';
      btn.innerHTML = '<i data-lucide="plus" width="14" height="14"></i> Buat Task';
      btn.addEventListener('click', () => {
        if (typeof TaskModal !== 'undefined') {
          TaskModal.open({ projectId: _project.id, onSuccess: () => _renderOverview() });
        }
      });
      actionsEl.appendChild(btn);
    }
  }

  function _bindTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
        btn.classList.add('active');
        const panel = document.getElementById(`panel-${btn.dataset.tab}`);
        if (panel) panel.classList.remove('hidden');
        if (window.lucide) lucide.createIcons();
      });
    });
  }

  function _renderOverview() {
    const stats = Project.getStats(_project.id);
    const statsEl = document.getElementById('overview-stats');
    statsEl.innerHTML = `
      <div class="stat-card">
        <div class="stat-value">${stats.total}</div>
        <div class="stat-label">Total Task</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="color:var(--color-success);">${stats.done}</div>
        <div class="stat-label">Selesai</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="color:var(--color-accent);">${stats.inProgress}</div>
        <div class="stat-label">In Progress</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.backlog}</div>
        <div class="stat-label">Backlog</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="color:var(--color-danger);">${stats.overdue}</div>
        <div class="stat-label">Terlambat</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.progress}%</div>
        <div class="stat-label">Progress</div>
        <div class="progress-bar" style="margin-top:4px;">
          <div class="progress-fill" style="width:${stats.progress}%;background:${_project.color};"></div>
        </div>
      </div>`;

    // Sprint aktif
    const sprintBody = document.getElementById('sprint-active-body');
    const activeSprints = Storage.query('sp_sprints', s => s.projectId === _project.id && s.status === 'active');
    if (activeSprints.length === 0) {
      sprintBody.innerHTML = `<div class="empty-state" style="padding:var(--sp-6);"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="empty-state-icon"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg><p class="empty-state-title">Tidak ada sprint aktif</p><p class="empty-state-desc">Mulai sprint dari halaman Backlog</p><a href="/pages/backlog.html?project=${_project.id}" class="btn btn-secondary btn-sm" style="margin-top:var(--sp-3)">Buka Backlog</a></div>`;
    } else {
      const sp = activeSprints[0];
      const spTasks = Storage.query('sp_tasks', t => t.sprintId === sp.id && !t.parentId);
      const spDone = spTasks.filter(t => t.status === 'done').length;
      const spProgress = spTasks.length > 0 ? Math.round((spDone / spTasks.length) * 100) : 0;
      const daysLeft = Utils.daysUntil ? Utils.daysUntil(sp.endDate) : null;
      sprintBody.innerHTML = `
        <div class="sprint-summary">
          <div class="sprint-summary-name">${Utils.escapeHtml(sp.name)}</div>
          ${sp.goal ? `<div class="text-xs text-muted" style="margin-top:2px;">${Utils.escapeHtml(sp.goal)}</div>` : ''}
          <div class="sprint-summary-dates text-xs text-muted" style="margin-top:4px;">
            ${Utils.formatDate(sp.startDate)} — ${Utils.formatDate(sp.endDate)}
            ${daysLeft !== null ? `<span style="margin-left:4px;">(${daysLeft > 0 ? `${daysLeft} hari lagi` : daysLeft === 0 ? 'Hari ini' : 'Terlambat'})</span>` : ''}
          </div>
          <div class="progress-bar" style="margin-top:8px;">
            <div class="progress-fill" style="width:${spProgress}%;background:${_project.color};"></div>
          </div>
          <div class="text-xs text-muted" style="margin-top:4px;">${spDone}/${spTasks.length} task selesai</div>
          <a href="/pages/sprint.html?project=${_project.id}" class="btn btn-ghost btn-sm" style="margin-top:8px;">Lihat Sprint</a>
        </div>`;
    }

    // Milestones
    const msBody = document.getElementById('milestones-body');
    const milestones = Storage.query('sp_milestones', m => m.projectId === _project.id);
    if (milestones.length === 0) {
      msBody.innerHTML = `<div class="empty-state" style="padding:var(--sp-6);"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="empty-state-icon"><path d="M3 3h18M3 9h18M3 15h18"/><circle cx="9" cy="21" r="1"/><circle cx="15" cy="21" r="1"/></svg><p class="empty-state-title">Belum ada milestone</p><p class="empty-state-desc">Buat milestone dari halaman Gantt</p></div>`;
    } else {
      const statusColor = { 'on-track': 'success', 'at-risk': 'warning', 'missed': 'danger', 'completed': 'neutral' };
      msBody.innerHTML = milestones.map(m => `
        <div class="milestone-row">
          <div class="milestone-info">
            <span class="text-sm fw-500">${Utils.escapeHtml(m.name)}</span>
            <span class="badge badge-${statusColor[m.status] || 'neutral'}" style="margin-left:6px;">${m.status}</span>
          </div>
          <div class="text-xs text-muted">${Utils.formatDate(m.dueDate)}</div>
        </div>`).join('');
    }

    // Time tracking summary
    const timeBody = document.getElementById('time-summary-body');
    if (timeBody && typeof TimeLog !== 'undefined') {
      const summary = TimeLog.getSummaryByMember(_project.id);
      if (summary.length === 0) {
        timeBody.innerHTML = `<div class="empty-state" style="padding:var(--sp-6);"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="empty-state-icon"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg><p class="empty-state-title">Belum ada log waktu</p></div>`;
      } else {
        timeBody.innerHTML = `
          <table class="data-table" style="font-size:var(--text-sm)">
            <thead><tr>
              <th>Member</th>
              <th style="text-align:right">Estimasi</th>
              <th style="text-align:right">Dicatat</th>
              <th style="text-align:right">%</th>
            </tr></thead>
            <tbody>
              ${summary.map(m => {
                const pct = m.estimatedHours > 0 ? Math.round((m.loggedHours / m.estimatedHours) * 100) : null;
                const isOver = pct !== null && pct > 100;
                return `<tr>
                  <td>${Utils.escapeHtml(m.name)}</td>
                  <td style="text-align:right;color:var(--color-text-2)">${m.estimatedHours > 0 ? Utils.formatHours(m.estimatedHours) : '—'}</td>
                  <td style="text-align:right;font-weight:500;font-family:var(--font-mono);color:${isOver ? 'var(--color-danger)' : 'var(--color-text)'}">${Utils.formatHours(m.loggedHours)}</td>
                  <td style="text-align:right;color:${isOver ? 'var(--color-danger)' : 'var(--color-text-2)'}">${pct !== null ? pct + '%' : '—'}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>`;
      }
    }
  }

  function _renderMembers() {
    const users = Storage.get('sp_users') || [];
    const members = _project.memberIds.map(id => users.find(u => u.id === id)).filter(Boolean);

    const inviteBtn = document.getElementById('btn-invite-member');
    if (_canManage) inviteBtn.style.display = '';
    else inviteBtn.style.display = 'none';

    const tbody = document.getElementById('members-table-body');

    if (members.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="padding:var(--sp-6);text-align:center;color:var(--color-text-3);">Belum ada member di project ini.</td></tr>`;
      return;
    }

    const rows = members.map(u => {
      const role = Project.getMemberRole(_project, u.id);
      const [fg, bg] = Utils.getAvatarColor(u.id);
      const avatarHtml = u.avatar
        ? `<div class="avatar avatar-sm"><img src="${u.avatar}" alt="${Utils.escapeHtml(u.name)}"></div>`
        : `<div class="avatar avatar-sm" style="background:${bg};color:${fg};">${Utils.getInitials(u.name)}</div>`;
      const isOwner = u.id === _project.ownerId;
      return `
        <tr>
          <td>
            <div style="display:flex;align-items:center;gap:8px;">
              ${avatarHtml}
              <div>
                <div class="text-sm fw-500">${Utils.escapeHtml(u.name)}${isOwner ? ' <span class="badge badge-accent" style="font-size:10px;">Owner</span>' : ''}</div>
                <div class="text-xs text-muted">${Utils.escapeHtml(u.email)}</div>
              </div>
            </div>
          </td>
          <td><span class="badge badge-${Utils.getRoleColor(role)}">${Utils.getRoleLabel(role)}</span></td>
          <td><span class="text-xs text-muted">${u.lastLoginAt ? Utils.timeAgo(u.lastLoginAt) : 'Belum pernah'}</span></td>
          <td>
            ${_canManage && !isOwner && u.id !== _session.userId ? `
            <button class="btn btn-ghost btn-icon btn-sm btn-remove-member" data-uid="${u.id}" title="Hapus member" style="color:var(--color-danger);">
              <i data-lucide="user-minus" width="14" height="14"></i>
            </button>` : ''}
          </td>
        </tr>`;
    }).join('');

    tbody.innerHTML = `
      <table class="data-table">
        <thead><tr><th>User</th><th>Role</th><th>Last Login</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`;

    document.querySelectorAll('.btn-remove-member').forEach(btn => {
      btn.addEventListener('click', () => {
        const u = users.find(x => x.id === btn.dataset.uid);
        if (!u) return;
        if (!confirm(`Hapus ${u.name} dari project ini?`)) return;
        Project.removeMember(_project.id, btn.dataset.uid);
        _project = Project.getById(_project.id);
        _renderMembers();
        App.Toast.success('Member dihapus');
        if (window.lucide) lucide.createIcons();
      });
    });

    inviteBtn.onclick = _openInviteModal;
    if (window.lucide) lucide.createIcons();
  }

  function _openInviteModal() {
    const allUsers = Storage.get('sp_users') || [];
    const nonMembers = allUsers.filter(u => !_project.memberIds.includes(u.id) && u.isActive);
    const select = document.getElementById('invite-user-select');
    select.innerHTML = '<option value="">— Pilih user —</option>' +
      nonMembers.map(u => `<option value="${u.id}">${Utils.escapeHtml(u.name)} (${Utils.escapeHtml(u.email)})</option>`).join('');

    document.getElementById('invite-form-error').classList.add('hidden');
    document.getElementById('modal-invite').classList.remove('hidden');
    if (window.lucide) lucide.createIcons();

    document.getElementById('modal-invite-close').onclick = _closeInviteModal;
    document.getElementById('btn-invite-cancel').onclick = _closeInviteModal;
    document.getElementById('modal-invite').onclick = e => { if (e.target.id === 'modal-invite') _closeInviteModal(); };
    document.getElementById('btn-invite-save').onclick = _saveInvite;
  }

  function _closeInviteModal() {
    document.getElementById('modal-invite').classList.add('hidden');
  }

  function _saveInvite() {
    const userId = document.getElementById('invite-user-select').value;
    const role = document.getElementById('invite-role-select').value;
    const errEl = document.getElementById('invite-form-error');
    errEl.classList.add('hidden');

    if (!userId) { errEl.textContent = 'Pilih user yang ingin diundang.'; errEl.classList.remove('hidden'); return; }

    Project.addMember(_project.id, userId, role);
    _project = Project.getById(_project.id);
    _closeInviteModal();
    _renderMembers();
    App.Toast.success('Member berhasil diundang');
    if (window.lucide) lucide.createIcons();
  }

  function _renderSettings() {
    document.getElementById('setting-name').value = _project.name;
    document.getElementById('setting-key').value = _project.key;
    document.getElementById('setting-priority').value = _project.priority;
    document.getElementById('setting-desc').value = _project.description || '';
    document.getElementById('setting-start').value = _project.startDate || '';
    document.getElementById('setting-end').value = _project.endDate || '';
    _settingsColor = _project.color;
    document.getElementById('setting-color').value = _project.color;

    document.querySelectorAll('#settings-color-row .color-swatch').forEach(s => {
      s.classList.toggle('active', s.dataset.color === _project.color);
      s.onclick = () => {
        document.querySelectorAll('#settings-color-row .color-swatch').forEach(x => x.classList.remove('active'));
        s.classList.add('active');
        _settingsColor = s.dataset.color;
        document.getElementById('setting-color').value = _settingsColor;
      };
    });

    document.getElementById('setting-color').addEventListener('input', e => {
      _settingsColor = e.target.value;
      document.querySelectorAll('#settings-color-row .color-swatch').forEach(s => s.classList.remove('active'));
    });

    document.getElementById('setting-key').addEventListener('input', e => {
      e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, '');
    });

    document.getElementById('btn-settings-save').onclick = _saveSettings;

    document.getElementById('btn-settings-archive').textContent = _project.status === 'archived' ? 'Aktifkan' : 'Arsipkan';
    document.getElementById('btn-settings-archive').onclick = () => {
      if (_project.status === 'archived') {
        Project.unarchive(_project.id);
        App.Toast.success('Project diaktifkan');
      } else {
        Project.archive(_project.id);
        App.Toast.success('Project diarsipkan');
      }
      _project = Project.getById(_project.id);
      _renderHeader();
      _renderSettings();
    };

    document.getElementById('btn-settings-delete').onclick = () => {
      if (!confirm(`Hapus project "${_project.name}"? Semua task, sprint, dan data akan dihapus permanen.`)) return;
      Project.remove(_project.id);
      App.Toast.success('Project dihapus');
      window.location.href = '/pages/projects.html';
    };
  }

  function _saveSettings() {
    const name = document.getElementById('setting-name').value.trim();
    const key = document.getElementById('setting-key').value.trim().toUpperCase();
    const priority = document.getElementById('setting-priority').value;
    const desc = document.getElementById('setting-desc').value.trim();
    const startDate = document.getElementById('setting-start').value;
    const endDate = document.getElementById('setting-end').value;
    const errEl = document.getElementById('settings-form-error');
    errEl.classList.add('hidden');

    if (!name) { errEl.textContent = 'Nama project wajib diisi.'; errEl.classList.remove('hidden'); return; }
    if (!key || key.length < 2 || key.length > 5 || !/^[A-Z]+$/.test(key)) {
      errEl.textContent = 'Key harus 2–5 huruf kapital A–Z.'; errEl.classList.remove('hidden'); return;
    }

    const result = Project.update(_project.id, { name, key, priority, description: desc, color: _settingsColor, startDate: startDate || null, endDate: endDate || null });
    if (result && result.error) {
      errEl.textContent = result.error === 'key_exists' ? `Key "${key}" sudah digunakan.` : `Nama "${name}" sudah digunakan.`;
      errEl.classList.remove('hidden');
      return;
    }

    _project = Project.getById(_project.id);
    _renderHeader();
    App.Toast.success('Pengaturan disimpan');
    if (window.lucide) lucide.createIcons();
  }

  return { init };
})();
