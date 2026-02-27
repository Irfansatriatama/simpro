/* global Page, Auth, App, Shell, Storage, Utils, IO, lucide */
const Page = (() => {
  // ─── State ─────────────────────────────────────────────────────
  let _trelloBoards = [];
  let _trelloWizardStep = 0; // 0=upload 1=select 2=mapping 3=confirm
  let _selectedBoardIds = new Set();
  let _listStatusMap = {};  // listId -> status

  let _jiraRows = [];
  let _jiraHeaders = [];
  let _jiraMapping = {};
  let _jiraProjectId = null;

  // ─── Init ───────────────────────────────────────────────────────
  function init() {
    _renderExportSection();
    _renderImportSimproSection();
    _renderImportTrelloSection();
    _renderImportJiraSection();
    _renderExportCSVSection();
    lucide.createIcons();
  }

  // ═══════════════════════════════════════════════════════════════
  // 1. EXPORT SIMPRO JSON
  // ═══════════════════════════════════════════════════════════════
  function _renderExportSection() {
    const btn = document.getElementById('btn-export-json');
    if (!btn) return;
    btn.addEventListener('click', () => {
      try {
        const summary = IO.exportJSON();
        document.getElementById('export-summary').innerHTML =
          '<span class="badge badge-success">Download dimulai</span>' +
          ' &nbsp; ' + summary.projects + ' project · ' + summary.tasks + ' task · ' +
          summary.users + ' user · ' + summary.sprints + ' sprint';
        App.Toast.show({ type: 'success', title: 'Export berhasil', message: 'File JSON sedang diunduh.' });
      } catch (e) {
        App.Toast.show({ type: 'error', title: 'Export gagal', message: e.message });
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // 2. IMPORT SIMPRO JSON
  // ═══════════════════════════════════════════════════════════════
  function _renderImportSimproSection() {
    const fileInput = document.getElementById('import-json-file');
    const previewEl = document.getElementById('import-json-preview');
    const modeReplace = document.getElementById('mode-replace');
    const modeMerge   = document.getElementById('mode-merge');
    const confirmInput = document.getElementById('confirm-replace-input');
    const confirmWrap  = document.getElementById('confirm-replace-wrap');
    const btnImport    = document.getElementById('btn-import-json');

    if (!fileInput) return;

    let _parsed = null;

    function _updateBtnState() {
      if (!_parsed) { btnImport.disabled = true; return; }
      if (modeReplace.checked) {
        btnImport.disabled = confirmInput.value.trim() !== 'CONFIRM';
      } else {
        btnImport.disabled = false;
      }
    }

    modeReplace.addEventListener('change', () => {
      confirmWrap.classList.toggle('hidden', !modeReplace.checked);
      _updateBtnState();
    });
    modeMerge.addEventListener('change', () => {
      confirmWrap.classList.toggle('hidden', !modeReplace.checked);
      _updateBtnState();
    });
    confirmInput.addEventListener('input', _updateBtnState);

    fileInput.addEventListener('change', async () => {
      const file = fileInput.files[0];
      if (!file) return;
      try {
        const text = await IO.readFile(file);
        const data = JSON.parse(text);
        const check = IO.validateJSON(data);
        if (!check.valid) {
          previewEl.innerHTML = '<p class="io-error">' + Utils.escapeHtml(check.error) + '</p>';
          _parsed = null; _updateBtnState(); return;
        }
        _parsed = data;
        const s = {
          projects: (data.sp_projects||[]).length,
          tasks: (data.sp_tasks||[]).length,
          users: (data.sp_users||[]).length,
          sprints: (data.sp_sprints||[]).length,
        };
        const meta = data._meta || {};
        previewEl.innerHTML =
          '<div class="io-preview-grid">' +
          _previewStat('Projects', s.projects) +
          _previewStat('Tasks', s.tasks) +
          _previewStat('Users', s.users) +
          _previewStat('Sprints', s.sprints) +
          '</div>' +
          (meta.exportedAt ? '<p class="io-meta">Dibuat: ' + Utils.formatDate(meta.exportedAt) + ' · Versi: ' + (meta.version||'–') + '</p>' : '');
        _updateBtnState();
      } catch {
        previewEl.innerHTML = '<p class="io-error">File tidak dapat dibaca atau bukan JSON yang valid.</p>';
        _parsed = null; _updateBtnState();
      }
    });

    btnImport.addEventListener('click', () => {
      if (!_parsed) return;
      try {
        if (modeReplace.checked) {
          IO.importJSONReplace(_parsed);
          App.Toast.show({ type: 'success', title: 'Import berhasil', message: 'Data diganti. Halaman akan dimuat ulang.' });
        } else {
          IO.importJSONMerge(_parsed);
          App.Toast.show({ type: 'success', title: 'Import berhasil (merge)', message: 'Data digabungkan. Halaman akan dimuat ulang.' });
        }
        setTimeout(() => location.reload(), 1200);
      } catch (e) {
        App.Toast.show({ type: 'error', title: 'Import gagal', message: e.message });
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // 3. IMPORT TRELLO JSON — Wizard
  // ═══════════════════════════════════════════════════════════════
  function _renderImportTrelloSection() {
    const fileInput = document.getElementById('trello-file');
    const wizardEl  = document.getElementById('trello-wizard');
    if (!fileInput) return;

    fileInput.addEventListener('change', async () => {
      const file = fileInput.files[0];
      if (!file) return;
      wizardEl.innerHTML = '<p class="io-loading">Membaca file…</p>';
      try {
        const text = await IO.readFile(file);
        const result = IO.parseTrelloJSON(text);
        if (!result.ok) {
          wizardEl.innerHTML = '<p class="io-error">' + Utils.escapeHtml(result.error) + '</p>';
          return;
        }
        _trelloBoards = result.boards;
        _selectedBoardIds = new Set(_trelloBoards.map(b => b.id));
        _trelloWizardStep = 1;
        _renderTrelloStep();
      } catch (e) {
        wizardEl.innerHTML = '<p class="io-error">Gagal membaca file: ' + Utils.escapeHtml(e.message) + '</p>';
      }
    });
  }

  function _renderTrelloStep() {
    const wizardEl = document.getElementById('trello-wizard');
    if (_trelloWizardStep === 1) {
      wizardEl.innerHTML = _trelloStep1HTML();
      _trelloBoards.forEach(b => {
        const cb = wizardEl.querySelector('[data-board="' + b.id + '"]');
        if (cb) cb.addEventListener('change', e => {
          if (e.target.checked) _selectedBoardIds.add(b.id);
          else _selectedBoardIds.delete(b.id);
        });
      });
      wizardEl.querySelector('#trello-next-1').addEventListener('click', () => {
        if (!_selectedBoardIds.size) { App.Toast.show({ type: 'warning', title: 'Pilih minimal 1 board.' }); return; }
        _listStatusMap = {};
        _trelloWizardStep = 2;
        _renderTrelloStep();
      });
    } else if (_trelloWizardStep === 2) {
      wizardEl.innerHTML = _trelloStep2HTML();
      wizardEl.querySelectorAll('.trello-list-select').forEach(sel => {
        sel.addEventListener('change', e => {
          _listStatusMap[e.target.dataset.listId] = e.target.value;
        });
        // init default value
        _listStatusMap[sel.dataset.listId] = sel.value;
      });
      wizardEl.querySelector('#trello-back-2').addEventListener('click', () => { _trelloWizardStep = 1; _renderTrelloStep(); });
      wizardEl.querySelector('#trello-next-2').addEventListener('click', () => { _trelloWizardStep = 3; _renderTrelloStep(); });
    } else if (_trelloWizardStep === 3) {
      wizardEl.innerHTML = _trelloStep3HTML();
      wizardEl.querySelector('#trello-back-3').addEventListener('click', () => { _trelloWizardStep = 2; _renderTrelloStep(); });
      wizardEl.querySelector('#trello-confirm').addEventListener('click', () => {
        try {
          const result = IO.importTrello({
            boards: _trelloBoards,
            selectedBoardIds: Array.from(_selectedBoardIds),
            listStatusMap: _listStatusMap,
          });
          App.Toast.show({ type: 'success', title: 'Import Trello berhasil', message: result.projects + ' project, ' + result.tasks + ' task diimport.' });
          document.getElementById('trello-wizard').innerHTML = '<p class="io-success">Import selesai! ' + result.projects + ' project · ' + result.tasks + ' task.</p>';
          document.getElementById('trello-file').value = '';
        } catch (e) {
          App.Toast.show({ type: 'error', title: 'Import gagal', message: e.message });
        }
      });
    }
    lucide.createIcons();
  }

  function _trelloStep1HTML() {
    return '<div class="wizard-step">' +
      '<div class="wizard-step-header"><span class="wizard-step-num">1</span> Pilih Board</div>' +
      '<div class="io-checklist">' +
      _trelloBoards.map(b => '<label class="io-check-item"><input type="checkbox" data-board="' + b.id + '"' +
        (_selectedBoardIds.has(b.id) ? ' checked' : '') + '> <span>' + Utils.escapeHtml(b.name) +
        ' <em>(' + (b.cards||[]).filter(c=>!c.closed).length + ' kartu)</em></span></label>').join('') +
      '</div>' +
      '<div class="wizard-actions"><button id="trello-next-1" class="btn btn-primary btn-sm">Lanjut <i data-lucide="arrow-right"></i></button></div>' +
      '</div>';
  }

  function _trelloStep2HTML() {
    const statusOptions = [
      { v: 'todo', l: 'To Do' }, { v: 'in-progress', l: 'In Progress' },
      { v: 'review', l: 'In Review' }, { v: 'done', l: 'Done' },
    ];
    const boards = _trelloBoards.filter(b => _selectedBoardIds.has(b.id));
    let rows = '';
    boards.forEach(b => {
      (b.lists || []).forEach(list => {
        const autoGuess = _autoGuessStatus(list.name);
        rows += '<tr><td>' + Utils.escapeHtml(b.name) + '</td><td>' + Utils.escapeHtml(list.name) + '</td>' +
          '<td><select class="input input-sm trello-list-select" data-list-id="' + list.id + '">' +
          statusOptions.map(o => '<option value="' + o.v + '"' + (o.v === autoGuess ? ' selected' : '') + '>' + o.l + '</option>').join('') +
          '</select></td></tr>';
      });
    });
    return '<div class="wizard-step">' +
      '<div class="wizard-step-header"><span class="wizard-step-num">2</span> Mapping List → Status</div>' +
      '<table class="io-table"><thead><tr><th>Board</th><th>List Trello</th><th>Status SIMPRO</th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table>' +
      '<div class="wizard-actions">' +
      '<button id="trello-back-2" class="btn btn-secondary btn-sm"><i data-lucide="arrow-left"></i> Kembali</button>' +
      '<button id="trello-next-2" class="btn btn-primary btn-sm">Preview <i data-lucide="arrow-right"></i></button>' +
      '</div></div>';
  }

  function _trelloStep3HTML() {
    const boards = _trelloBoards.filter(b => _selectedBoardIds.has(b.id));
    let totalCards = 0;
    boards.forEach(b => { totalCards += (b.cards||[]).filter(c=>!c.closed).length; });
    return '<div class="wizard-step">' +
      '<div class="wizard-step-header"><span class="wizard-step-num">3</span> Konfirmasi Import</div>' +
      '<div class="io-confirm-summary">' +
      _previewStat('Board dipilih', boards.length) +
      _previewStat('Kartu diimport', totalCards) +
      '</div>' +
      '<p class="io-note">Setiap board akan menjadi project baru di SIMPRO.</p>' +
      '<div class="wizard-actions">' +
      '<button id="trello-back-3" class="btn btn-secondary btn-sm"><i data-lucide="arrow-left"></i> Kembali</button>' +
      '<button id="trello-confirm" class="btn btn-primary btn-sm"><i data-lucide="download"></i> Import Sekarang</button>' +
      '</div></div>';
  }

  function _autoGuessStatus(listName) {
    const n = (listName || '').toLowerCase();
    if (n.includes('done') || n.includes('selesai') || n.includes('completed') || n.includes('closed')) return 'done';
    if (n.includes('progress') || n.includes('doing') || n.includes('proses') || n.includes('dev')) return 'in-progress';
    if (n.includes('review') || n.includes('testing') || n.includes('qa') || n.includes('uat')) return 'review';
    return 'todo';
  }

  // ═══════════════════════════════════════════════════════════════
  // 4. IMPORT JIRA CSV
  // ═══════════════════════════════════════════════════════════════
  function _renderImportJiraSection() {
    const fileInput = document.getElementById('jira-file');
    const previewEl = document.getElementById('jira-preview');
    const projectSel = document.getElementById('jira-project-select');
    const btnImport  = document.getElementById('btn-import-jira');
    if (!fileInput) return;

    // Populate project dropdown
    const projects = Storage.get('sp_projects') || [];
    const session = Storage.get('sp_session');
    const user = session ? (Storage.get('sp_users')||[]).find(u=>u.id===session.userId) : null;
    const myProjects = projects.filter(p => !user || ['admin','pm'].includes(user.role)
      ? true : p.memberIds.includes(session.userId));
    projectSel.innerHTML = '<option value="">— Pilih project tujuan —</option>' +
      myProjects.map(p => '<option value="' + p.id + '">' + Utils.escapeHtml(p.name) + ' (' + p.key + ')</option>').join('');

    fileInput.addEventListener('change', async () => {
      const file = fileInput.files[0];
      if (!file) return;
      previewEl.innerHTML = '<p class="io-loading">Membaca file…</p>';
      try {
        const text = await IO.readFile(file);
        const allRows = IO.parseCSVText(text);
        if (allRows.length < 2) { previewEl.innerHTML = '<p class="io-error">File CSV kosong atau tidak valid.</p>'; return; }
        _jiraHeaders = allRows[0];
        _jiraRows = allRows.slice(1).filter(r => r.some(c => c.trim()));
        _jiraMapping = IO.autoDetectJiraMapping(_jiraHeaders);
        _renderJiraPreview(previewEl);
        btnImport.disabled = false;
        lucide.createIcons();
      } catch (e) {
        previewEl.innerHTML = '<p class="io-error">Gagal membaca file: ' + Utils.escapeHtml(e.message) + '</p>';
      }
    });

    btnImport.addEventListener('click', () => {
      _jiraProjectId = projectSel.value;
      if (!_jiraProjectId) { App.Toast.show({ type: 'warning', title: 'Pilih project tujuan terlebih dahulu.' }); return; }
      if (!_jiraRows.length) return;
      // re-read mapping from selects
      _syncJiraMappingFromDOM();
      try {
        const result = IO.importJiraCSV({ rows: _jiraRows, mapping: _jiraMapping, projectId: _jiraProjectId });
        App.Toast.show({ type: 'success', title: 'Import Jira berhasil', message: result.tasks + ' task diimport.' });
        previewEl.innerHTML = '<p class="io-success">Import selesai! ' + result.tasks + ' task berhasil diimport.</p>';
        fileInput.value = '';
        btnImport.disabled = true;
      } catch (e) {
        App.Toast.show({ type: 'error', title: 'Import gagal', message: e.message });
      }
    });
  }

  function _renderJiraPreview(container) {
    const fields = ['summary','type','status','priority','assignee','dueDate','points'];
    const fieldLabels = { summary:'Judul',type:'Tipe',status:'Status',priority:'Prioritas',assignee:'Assignee',dueDate:'Due Date',points:'Story Points' };
    const preview5 = _jiraRows.slice(0, 5);

    let mappingHTML = '<div class="jira-mapping-grid">';
    fields.forEach(f => {
      const colOpts = _jiraHeaders.map((h, i) =>
        '<option value="' + i + '"' + (_jiraMapping[f] === i ? ' selected' : '') + '>' + Utils.escapeHtml(h) + '</option>').join('');
      mappingHTML += '<div class="jira-map-row">' +
        '<label class="jira-map-label">' + fieldLabels[f] + '</label>' +
        '<select class="input input-sm jira-map-select" data-field="' + f + '">' +
        '<option value="-1">— (abaikan) —</option>' + colOpts +
        '</select></div>';
    });
    mappingHTML += '</div>';

    let tableHTML = '<table class="io-table"><thead><tr>' +
      _jiraHeaders.map(h => '<th>' + Utils.escapeHtml(h) + '</th>').join('') +
      '</tr></thead><tbody>' +
      preview5.map(row => '<tr>' + row.map(c => '<td>' + Utils.escapeHtml(c) + '</td>').join('') + '</tr>').join('') +
      '</tbody></table>';

    container.innerHTML =
      '<p class="io-meta">' + _jiraRows.length + ' baris terdeteksi · ' + _jiraHeaders.length + ' kolom</p>' +
      '<div class="io-section-label">Mapping Kolom</div>' + mappingHTML +
      '<div class="io-section-label" style="margin-top:var(--sp-4)">Preview 5 Baris Pertama</div>' +
      '<div class="io-table-scroll">' + tableHTML + '</div>';

    container.querySelectorAll('.jira-map-select').forEach(sel => {
      sel.addEventListener('change', e => {
        _jiraMapping[e.target.dataset.field] = parseInt(e.target.value);
      });
    });
  }

  function _syncJiraMappingFromDOM() {
    document.querySelectorAll('.jira-map-select').forEach(sel => {
      _jiraMapping[sel.dataset.field] = parseInt(sel.value);
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // 5. EXPORT TASKS CSV
  // ═══════════════════════════════════════════════════════════════
  function _renderExportCSVSection() {
    const sel = document.getElementById('export-csv-project');
    const btn = document.getElementById('btn-export-csv');
    if (!sel) return;

    const projects = Storage.get('sp_projects') || [];
    const session = Storage.get('sp_session');
    const user = session ? (Storage.get('sp_users')||[]).find(u=>u.id===session.userId) : null;
    const myProjects = projects.filter(p => !user || ['admin','pm'].includes(user.role)
      ? true : p.memberIds.includes(session.userId));
    sel.innerHTML = '<option value="">— Pilih project —</option>' +
      myProjects.map(p => '<option value="' + p.id + '">' + Utils.escapeHtml(p.name) + ' (' + p.key + ')</option>').join('');

    btn.addEventListener('click', () => {
      const projectId = sel.value;
      if (!projectId) { App.Toast.show({ type: 'warning', title: 'Pilih project terlebih dahulu.' }); return; }
      try {
        const count = IO.exportTasksCSV(projectId);
        App.Toast.show({ type: 'success', title: 'Export CSV', message: count + ' task diekspor.' });
      } catch (e) {
        App.Toast.show({ type: 'error', title: 'Export gagal', message: e.message });
      }
    });
  }

  // ─── Helpers ────────────────────────────────────────────────────
  function _previewStat(label, val) {
    return '<div class="io-preview-stat"><span class="io-preview-num">' + val + '</span><span class="io-preview-label">' + label + '</span></div>';
  }

  return { init };
})();
