/* SIMPRO Module: project */
const Project = (() => {

  function _getSession() {
    return Storage.get('sp_session');
  }

  function create(data) {
    const session = _getSession();
    if (!session) return null;
    const existing = Storage.get('sp_projects') || [];
    if (existing.some(p => p.key === data.key.toUpperCase())) return { error: 'key_exists' };
    if (existing.some(p => p.name.toLowerCase() === data.name.toLowerCase())) return { error: 'name_exists' };

    const now = Utils.nowISO();
    const project = {
      id: Utils.generateId('proj'),
      name: data.name.trim(),
      description: data.description || '',
      key: data.key.toUpperCase(),
      status: 'active',
      priority: data.priority || 'medium',
      color: data.color || '#3B5BDB',
      ownerId: session.userId,
      memberIds: [session.userId],
      memberRoles: {},
      startDate: data.startDate || null,
      endDate: data.endDate || null,
      taskCounter: 0,
      createdAt: now,
      updatedAt: now,
    };

    Storage.update('sp_projects', (arr) => [...(arr || []), project]);
    return project;
  }

  function getAll() {
    return Storage.get('sp_projects') || [];
  }

  function getById(id) {
    const projects = Storage.get('sp_projects') || [];
    return projects.find(p => p.id === id) || null;
  }

  function getForUser(userId, role) {
    const projects = getAll();
    if (role === 'admin' || role === 'pm') return projects;
    return projects.filter(p => p.memberIds.includes(userId));
  }

  function update(id, data) {
    const existing = getById(id);
    if (!existing) return null;

    const projects = Storage.get('sp_projects') || [];

    if (data.key && data.key.toUpperCase() !== existing.key) {
      if (projects.some(p => p.id !== id && p.key === data.key.toUpperCase())) {
        return { error: 'key_exists' };
      }
    }
    if (data.name && data.name.toLowerCase() !== existing.name.toLowerCase()) {
      if (projects.some(p => p.id !== id && p.name.toLowerCase() === data.name.toLowerCase())) {
        return { error: 'name_exists' };
      }
    }

    Storage.update('sp_projects', (arr) =>
      arr.map(p => p.id === id ? { ...p, ...data, key: (data.key || p.key).toUpperCase(), updatedAt: Utils.nowISO() } : p)
    );
    return getById(id);
  }

  function archive(id) {
    return update(id, { status: 'archived' });
  }

  function unarchive(id) {
    return update(id, { status: 'active' });
  }

  function remove(id) {
    Storage.update('sp_projects', (arr) => (arr || []).filter(p => p.id !== id));
    Storage.update('sp_tasks',      (arr) => (arr || []).filter(t => t.projectId !== id));
    Storage.update('sp_sprints',    (arr) => (arr || []).filter(s => s.projectId !== id));
    Storage.update('sp_labels',     (arr) => (arr || []).filter(l => l.projectId !== id));
    Storage.update('sp_milestones', (arr) => (arr || []).filter(m => m.projectId !== id));
    return true;
  }

  function addMember(projectId, userId, role) {
    const project = getById(projectId);
    if (!project) return null;
    const existingIds = Array.isArray(project.memberIds) ? project.memberIds : [];
    if (existingIds.includes(userId)) return project;

    Storage.update('sp_projects', (arr) =>
      arr.map(p => {
        if (p.id !== projectId) return p;
        const memberIds = [...(Array.isArray(p.memberIds) ? p.memberIds : []), userId];
        const memberRoles = { ...(p.memberRoles || {}) };
        if (role && role !== 'pm') memberRoles[userId] = role;
        return { ...p, memberIds, memberRoles, updatedAt: Utils.nowISO() };
      })
    );
    return getById(projectId);
  }

  function removeMember(projectId, userId) {
    const project = getById(projectId);
    if (!project) return null;

    Storage.update('sp_projects', (arr) =>
      arr.map(p => {
        if (p.id !== projectId) return p;
        const memberIds = (Array.isArray(p.memberIds) ? p.memberIds : []).filter(id => id !== userId);
        const memberRoles = { ...p.memberRoles };
        delete memberRoles[userId];
        return { ...p, memberIds, memberRoles, updatedAt: Utils.nowISO() };
      })
    );
    return getById(projectId);
  }

  function getMemberRole(project, userId) {
    if (!project) return null;
    if (project.ownerId === userId) return 'pm';
    return project.memberRoles[userId] || 'developer';
  }

  function getStats(projectId) {
    const tasks = Storage.query('sp_tasks', t => t.projectId === projectId && !t.parentId);
    const total = tasks.length;
    const done = tasks.filter(t => t.status === 'done').length;
    const inProgress = tasks.filter(t => t.status === 'in-progress').length;
    const backlog = tasks.filter(t => !t.sprintId).length;
    const overdue = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done').length;
    return { total, done, inProgress, backlog, overdue, progress: total > 0 ? Math.round((done / total) * 100) : 0 };
  }

  function nextTaskKey(projectId) {
    let counter = 0;
    Storage.update('sp_projects', (arr) =>
      arr.map(p => {
        if (p.id !== projectId) return p;
        counter = p.taskCounter + 1;
        return { ...p, taskCounter: counter, updatedAt: Utils.nowISO() };
      })
    );
    const project = getById(projectId);
    return project ? `${project.key}-${counter}` : `?-${counter}`;
  }

  return { create, getAll, getById, getForUser, update, archive, unarchive, remove, addMember, removeMember, getMemberRole, getStats, nextTaskKey };
})();
