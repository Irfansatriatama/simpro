/* SIMPRO Module: label */
const Label = (() => {

  function _session() {
    return Storage.get('sp_session');
  }

  function create(data) {
    const s = _session();
    if (!s || (s.role !== 'admin' && s.role !== 'pm')) return { error: 'permission_denied' };
    if (!data.name || !data.projectId) return null;

    const label = {
      id: Utils.generateId('label'),
      projectId: data.projectId,
      name: data.name.trim(),
      color: data.color || '#3B5BDB',
    };
    Storage.update('sp_labels', arr => [...(arr || []), label]);
    return label;
  }

  function getByProject(projectId) {
    return Storage.query('sp_labels', l => l.projectId === projectId);
  }

  function getById(id) {
    return (Storage.get('sp_labels') || []).find(l => l.id === id) || null;
  }

  function update(id, data) {
    const s = _session();
    if (!s || (s.role !== 'admin' && s.role !== 'pm')) return { error: 'permission_denied' };
    Storage.update('sp_labels', arr =>
      arr.map(l => l.id === id ? { ...l, ...data, id } : l)
    );
    return getById(id);
  }

  function remove(id) {
    const s = _session();
    if (!s || (s.role !== 'admin' && s.role !== 'pm')) return false;
    Storage.update('sp_labels', arr => arr.filter(l => l.id !== id));
    // Remove from all tasks
    Storage.update('sp_tasks', arr =>
      (arr || []).map(t => ({
        ...t,
        labelIds: (t.labelIds || []).filter(lid => lid !== id),
      }))
    );
    return true;
  }

  return { create, getByProject, getById, update, remove };
})();
