/* SIMPRO Module: milestone — v0.9.0 */
const Milestone = (() => {

  function _session() { return Storage.get('sp_session'); }

  function _canManage() {
    const s = _session();
    return s && (s.role === 'admin' || s.role === 'pm');
  }

  function create(data) {
    if (!_canManage()) return { error: 'permission_denied' };
    const now = Utils.nowISO();
    const milestone = {
      id: Utils.generateId('ms'),
      projectId: data.projectId,
      name: data.name.trim(),
      description: data.description || '',
      dueDate: data.dueDate || null,
      status: data.status || 'open',
      createdAt: now,
      updatedAt: now,
    };
    Storage.update('sp_milestones', arr => [...(arr || []), milestone]);
    return milestone;
  }

  function getByProject(projectId) {
    return Storage.query('sp_milestones', m => m.projectId === projectId)
      .sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      });
  }

  function getById(id) {
    return (Storage.get('sp_milestones') || []).find(m => m.id === id) || null;
  }

  function update(id, data) {
    if (!_canManage()) return { error: 'permission_denied' };
    Storage.update('sp_milestones', arr => arr.map(m => {
      if (m.id !== id) return m;
      return {
        ...m,
        name: data.name !== undefined ? data.name.trim() : m.name,
        description: data.description !== undefined ? data.description : m.description,
        dueDate: data.dueDate !== undefined ? data.dueDate : m.dueDate,
        status: data.status !== undefined ? data.status : m.status,
        updatedAt: Utils.nowISO(),
      };
    }));
    return getById(id);
  }

  function remove(id) {
    if (!_canManage()) return { error: 'permission_denied' };
    Storage.update('sp_milestones', arr => arr.filter(m => m.id !== id));
    Storage.update('sp_tasks', arr =>
      (arr || []).map(t => t.milestoneId === id ? { ...t, milestoneId: null } : t)
    );
    return true;
  }

  function checkStatus(projectId) {
    const today = Utils.todayISO();
    Storage.update('sp_milestones', arr =>
      (arr || []).map(m => {
        if (m.projectId !== projectId) return m;
        if (m.status === 'completed') return m;
        if (m.dueDate && m.dueDate < today && m.status !== 'missed') {
          return { ...m, status: 'missed', updatedAt: Utils.nowISO() };
        }
        if (m.dueDate && m.dueDate >= today && m.status === 'missed') {
          return { ...m, status: 'open', updatedAt: Utils.nowISO() };
        }
        return m;
      })
    );
  }

  return { create, getByProject, getById, update, remove, checkStatus };
})();
