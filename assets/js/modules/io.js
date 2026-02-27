/* global IO, Storage, Utils */
const IO = (() => {
  const SP_KEYS = [
    'sp_users', 'sp_projects', 'sp_tasks', 'sp_sprints',
    'sp_comments', 'sp_timelogs', 'sp_labels', 'sp_milestones',
    'sp_notifications', 'sp_settings',
  ];

  // ── Export SIMPRO JSON ──────────────────────────────────────────
  function exportJSON() {
    const snapshot = {};
    SP_KEYS.forEach(k => {
      const val = Storage.get(k);
      if (val !== null) snapshot[k] = val;
    });
    snapshot._meta = {
      version: '0.13.0',
      exportedAt: Utils.nowISO(),
      app: 'SIMPRO',
    };
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'simpro_backup_' + Utils.todayISO() + '.json';
    a.click();
    URL.revokeObjectURL(url);
    return _summarizeSnapshot(snapshot);
  }

  function _summarizeSnapshot(snap) {
    return {
      projects: (snap.sp_projects || []).length,
      tasks:    (snap.sp_tasks    || []).length,
      users:    (snap.sp_users    || []).length,
      sprints:  (snap.sp_sprints  || []).length,
    };
  }

  function validateJSON(data) {
    if (typeof data !== 'object' || data === null) return { valid: false, error: 'Format tidak valid.' };
    const hasAny = SP_KEYS.some(k => Array.isArray(data[k]));
    if (!hasAny) return { valid: false, error: 'File tidak mengandung data SIMPRO yang dikenali.' };
    return { valid: true };
  }

  function importJSONReplace(data) {
    Storage.clearAll();
    SP_KEYS.forEach(k => {
      if (data[k] !== undefined) Storage.set(k, data[k]);
    });
  }

  function importJSONMerge(data) {
    SP_KEYS.forEach(k => {
      const incoming = data[k];
      if (!Array.isArray(incoming)) return;
      const existing = Storage.get(k) || [];
      const existingIds = new Set(existing.map(x => x.id));
      const toAdd = incoming.filter(x => x.id && !existingIds.has(x.id));
      Storage.set(k, [...existing, ...toAdd]);
    });
  }

  // ── Export Tasks CSV ─────────────────────────────────────────────
  function exportTasksCSV(projectId) {
    const tasks   = Storage.query('sp_tasks', t => t.projectId === projectId && !t.parentId);
    const users   = Storage.get('sp_users') || [];
    const sprints = Storage.get('sp_sprints') || [];
    const findName = id => (users.find(u => u.id === id) || {}).name || '';
    const findSpr  = id => (sprints.find(s => s.id === id) || {}).name || '';

    const header = ['Key','Title','Type','Status','Priority','Assignee','Sprint','Story Points','Due Date','Created At'];
    const rows = tasks.map(t => [
      t.key, t.title, t.type, t.status, t.priority,
      (t.assigneeIds || []).map(findName).join('; '),
      t.sprintId ? findSpr(t.sprintId) : '',
      t.storyPoints || '',
      t.dueDate || '',
      (t.createdAt || '').slice(0, 10),
    ]);

    const csv = [header, ...rows].map(r => r.map(_csvCell).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const project = (Storage.get('sp_projects') || []).find(p => p.id === projectId);
    const fname = 'simpro_tasks_' + (project ? project.key.toLowerCase() : projectId) + '_' + Utils.todayISO() + '.csv';
    const a = document.createElement('a');
    a.href = url; a.download = fname; a.click();
    URL.revokeObjectURL(url);
    return tasks.length;
  }

  function _csvCell(val) {
    const s = String(val == null ? '' : val);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  // ── File reader ───────────────────────────────────────────────────
  function readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.onerror = () => reject(new Error('Gagal membaca file'));
      reader.readAsText(file, 'UTF-8');
    });
  }

  // ── Trello JSON ───────────────────────────────────────────────────
  function parseTrelloJSON(raw) {
    try {
      const data = JSON.parse(raw);
      if (!data || typeof data !== 'object') return { ok: false, error: 'Bukan JSON valid.' };
      const boards = Array.isArray(data) ? data : [data];
      const valid = boards.filter(b => b.id && b.name && Array.isArray(b.lists) && Array.isArray(b.cards));
      if (!valid.length) return { ok: false, error: 'File tidak terdeteksi sebagai export Trello yang valid.' };
      return { ok: true, boards: valid };
    } catch {
      return { ok: false, error: 'File bukan JSON yang valid.' };
    }
  }

  function importTrello({ boards, selectedBoardIds, listStatusMap }) {
    const now = Utils.nowISO();
    const session = Storage.get('sp_session');
    const userId = session ? session.userId : 'user_001';
    const existingProjects = Storage.get('sp_projects') || [];
    const existingTasks = Storage.get('sp_tasks') || [];

    const importedBoards = boards.filter(b => selectedBoardIds.includes(b.id));
    const newProjects = [];
    const newTasks = [];
    let taskTotal = 0;

    importedBoards.forEach(board => {
      const projId = Utils.generateId('proj');
      const key = _toKey(board.name);
      let counter = 0;

      newProjects.push({
        id: projId, name: board.name, description: board.desc || '',
        key, status: 'active', priority: 'medium',
        color: '#3B5BDB', ownerId: userId,
        memberIds: [userId], memberRoles: {},
        startDate: Utils.todayISO(), endDate: null,
        taskCounter: 0, createdAt: now, updatedAt: now,
      });

      const lists = board.lists || [];
      const cards = (board.cards || []).filter(c => !c.closed);
      const checklists = board.checklists || [];
      const checklistMap = {};
      checklists.forEach(cl => { checklistMap[cl.id] = cl; });

      cards.forEach(card => {
        const list = lists.find(l => l.id === card.idList);
        if (!list) return;
        const status = listStatusMap[list.id] || listStatusMap[list.name] || 'todo';
        counter++;
        const taskId = Utils.generateId('task');
        newTasks.push({
          id: taskId, projectId: projId, sprintId: null, parentId: null,
          key: key + '-' + counter, title: card.name,
          description: card.desc || '', type: 'task', status,
          priority: 'medium', assigneeIds: [], reporterId: userId,
          labelIds: [], milestoneId: null, storyPoints: 0, estimatedHours: 0,
          loggedHours: 0, dueDate: card.due ? card.due.slice(0, 10) : null,
          order: counter, attachments: [], createdAt: now, updatedAt: now,
        });

        (card.idChecklists || []).forEach(clId => {
          const cl = checklistMap[clId];
          if (!cl) return;
          (cl.checkItems || []).forEach((item, idx) => {
            counter++;
            newTasks.push({
              id: Utils.generateId('task'), projectId: projId, sprintId: null,
              parentId: taskId, key: key + '-' + counter,
              title: item.name, description: '', type: 'task',
              status: item.state === 'complete' ? 'done' : 'todo',
              priority: 'medium', assigneeIds: [], reporterId: userId,
              labelIds: [], milestoneId: null, storyPoints: 0,
              estimatedHours: 0, loggedHours: 0, dueDate: null,
              order: idx, attachments: [], createdAt: now, updatedAt: now,
            });
          });
        });

        newProjects[newProjects.length - 1].taskCounter = counter;
      });

      taskTotal += counter;
    });

    Storage.set('sp_projects', [...existingProjects, ...newProjects]);
    Storage.set('sp_tasks', [...existingTasks, ...newTasks]);
    return { projects: newProjects.length, tasks: taskTotal };
  }

  // ── Jira CSV ──────────────────────────────────────────────────────
  function parseCSVText(text) {
    const cells = row => {
      const result = []; let cell = '', q = false;
      for (let i = 0; i < row.length; i++) {
        const ch = row[i];
        if (ch === '"') { if (q && row[i+1] === '"') { cell += '"'; i++; } else q = !q; }
        else if (ch === ',' && !q) { result.push(cell); cell = ''; }
        else cell += ch;
      }
      result.push(cell);
      return result;
    };
    return text.split('\n')
      .map(l => cells(l.replace(/\r$/, '')))
      .filter(r => r.some(c => c.trim()));
  }

  function autoDetectJiraMapping(headers) {
    return {
      summary:  _findHeader(headers, ['summary','title','subject','name']),
      type:     _findHeader(headers, ['issue type','issuetype','type','kind']),
      status:   _findHeader(headers, ['status','state']),
      priority: _findHeader(headers, ['priority']),
      assignee: _findHeader(headers, ['assignee','assigned to','owner']),
      dueDate:  _findHeader(headers, ['due date','duedate','due']),
      points:   _findHeader(headers, ['story points','storypoints','points','sp','estimate']),
    };
  }

  function _findHeader(headers, candidates) {
    for (const c of candidates) {
      const idx = headers.findIndex(h => h.toLowerCase().trim() === c);
      if (idx !== -1) return idx;
    }
    return -1;
  }

  function _mapJiraStatus(val) {
    const v = (val || '').toLowerCase();
    if (v.includes('done') || v.includes('closed') || v.includes('resolved') || v.includes('complete')) return 'done';
    if (v.includes('progress') || v.includes('doing') || v.includes('in dev')) return 'in-progress';
    if (v.includes('review') || v.includes('testing') || v.includes('qa')) return 'review';
    return 'todo';
  }

  function _mapJiraPriority(val) {
    const v = (val || '').toLowerCase();
    if (v.includes('critical') || v.includes('blocker')) return 'critical';
    if (v.includes('high') || v.includes('major')) return 'high';
    if (v.includes('low') || v.includes('minor') || v.includes('trivial')) return 'low';
    return 'medium';
  }

  function _mapJiraType(val) {
    const v = (val || '').toLowerCase();
    if (v.includes('bug') || v.includes('defect')) return 'bug';
    if (v.includes('epic')) return 'epic';
    if (v.includes('story') || v.includes('user story')) return 'story';
    return 'task';
  }

  function importJiraCSV({ rows, mapping, projectId }) {
    const now = Utils.nowISO();
    const session = Storage.get('sp_session');
    const userId = session ? session.userId : 'user_001';
    const existingTasks = Storage.get('sp_tasks') || [];
    const projects = Storage.get('sp_projects') || [];
    const project = projects.find(p => p.id === projectId);
    if (!project) return { tasks: 0 };

    let counter = project.taskCounter || 0;
    const newTasks = [];

    rows.forEach(row => {
      const get = idx => (idx >= 0 && idx < row.length) ? row[idx].trim() : '';
      const title = get(mapping.summary);
      if (!title) return;
      counter++;
      newTasks.push({
        id: Utils.generateId('task'),
        projectId, sprintId: null, parentId: null,
        key: project.key + '-' + counter, title,
        description: '', type: _mapJiraType(get(mapping.type)),
        status: _mapJiraStatus(get(mapping.status)),
        priority: _mapJiraPriority(get(mapping.priority)),
        assigneeIds: [], reporterId: userId,
        labelIds: [], milestoneId: null,
        storyPoints: parseFloat(get(mapping.points)) || 0,
        estimatedHours: 0, loggedHours: 0,
        dueDate: get(mapping.dueDate) || null,
        order: counter, attachments: [], createdAt: now, updatedAt: now,
      });
    });

    Storage.update('sp_projects', arr =>
      arr.map(p => p.id === projectId ? { ...p, taskCounter: counter, updatedAt: now } : p)
    );
    Storage.set('sp_tasks', [...existingTasks, ...newTasks]);
    return { tasks: newTasks.length };
  }

  function _toKey(name) {
    const existing = new Set((Storage.get('sp_projects') || []).map(p => p.key));
    const base = name.replace(/[^a-zA-Z ]/g, '').split(' ')
      .filter(Boolean).map(w => w[0].toUpperCase()).join('').slice(0, 5) || 'IMP';
    let k = base.length >= 2 ? base : (name.replace(/[^A-Z0-9]/gi,'').toUpperCase().slice(0,5) || 'IMP');
    let i = 2;
    while (existing.has(k)) k = base + (i++);
    return k;
  }

  return {
    exportJSON, validateJSON,
    importJSONReplace, importJSONMerge,
    exportTasksCSV, readFile,
    parseTrelloJSON, importTrello,
    parseCSVText, autoDetectJiraMapping, importJiraCSV,
  };
})();
