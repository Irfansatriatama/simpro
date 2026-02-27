/* SIMPRO Module: sprint — v0.7.0 */
const Sprint = (() => {

  function _session() { return Storage.get('sp_session'); }

  function _canManage() {
    const s = _session();
    return s && (s.role === 'admin' || s.role === 'pm');
  }

  function create(data) {
    if (!_canManage()) return { error: 'permission_denied' };
    const now = Utils.nowISO();
    const sprint = {
      id: Utils.generateId('sprint'),
      projectId: data.projectId,
      name: data.name.trim(),
      goal: data.goal || '',
      status: 'planned',
      startDate: data.startDate || null,
      endDate: data.endDate || null,
      completedAt: null,
      velocity: 0,
      createdAt: now,
    };
    Storage.update('sp_sprints', arr => [...(arr || []), sprint]);
    return sprint;
  }

  function getByProject(projectId) {
    return Storage.query('sp_sprints', s => s.projectId === projectId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  function getById(id) {
    return (Storage.get('sp_sprints') || []).find(s => s.id === id) || null;
  }

  function getActive(projectId) {
    return (Storage.get('sp_sprints') || []).find(s => s.projectId === projectId && s.status === 'active') || null;
  }

  function update(id, data) {
    if (!_canManage()) return { error: 'permission_denied' };
    Storage.update('sp_sprints', arr => arr.map(s => {
      if (s.id !== id) return s;
      return {
        ...s,
        name: data.name !== undefined ? data.name.trim() : s.name,
        goal: data.goal !== undefined ? data.goal : s.goal,
        startDate: data.startDate !== undefined ? data.startDate : s.startDate,
        endDate: data.endDate !== undefined ? data.endDate : s.endDate,
      };
    }));
    return getById(id);
  }

  function remove(id) {
    if (!_canManage()) return { error: 'permission_denied' };
    const sprint = getById(id);
    if (!sprint) return { error: 'not_found' };
    if (sprint.status === 'active') return { error: 'cannot_delete_active' };
    Storage.update('sp_tasks', arr => arr.map(t =>
      t.sprintId === id ? { ...t, sprintId: null, updatedAt: Utils.nowISO() } : t
    ));
    Storage.update('sp_sprints', arr => arr.filter(s => s.id !== id));
    return { ok: true };
  }

  function start(id) {
    if (!_canManage()) return { error: 'permission_denied' };
    const sprint = getById(id);
    if (!sprint) return { error: 'not_found' };
    const existing = getActive(sprint.projectId);
    if (existing) return { error: 'active_exists', sprintName: existing.name };
    Storage.update('sp_sprints', arr => arr.map(s =>
      s.id === id ? { ...s, status: 'active', startDate: s.startDate || Utils.todayISO() } : s
    ));
    const startedSprint = getById(id);
    App.events.emit('sprint:started', startedSprint);
    if (window.Notification) Notification.onSprintStarted(startedSprint);
    return { ok: true };
  }

  function complete(id, undoneBehavior, targetSprintId) {
    if (!_canManage()) return { error: 'permission_denied' };
    const sprint = getById(id);
    if (!sprint) return { error: 'not_found' };
    if (sprint.status !== 'active') return { error: 'not_active' };

    const tasks = Storage.query('sp_tasks', t => t.sprintId === id && !t.parentId);
    const doneTasks = tasks.filter(t => t.status === 'done');
    const undoneTasks = tasks.filter(t => t.status !== 'done');
    const velocity = doneTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
    const now = Utils.nowISO();

    Storage.update('sp_tasks', arr => arr.map(t => {
      if (t.sprintId !== id || t.status === 'done' || t.parentId) return t;
      return {
        ...t,
        sprintId: undoneBehavior === 'next_sprint' && targetSprintId ? targetSprintId : null,
        updatedAt: now,
      };
    }));

    Storage.update('sp_sprints', arr => arr.map(s =>
      s.id === id ? { ...s, status: 'completed', completedAt: now, velocity } : s
    ));

    const summary = {
      totalTasks: tasks.length,
      doneTasks: doneTasks.length,
      carryOver: undoneTasks.length,
      velocity,
    };

    const completedSprint = getById(id);
    App.events.emit('sprint:completed', { sprint: completedSprint, summary });
    if (window.Notification) Notification.onSprintCompleted(completedSprint);
    return { ok: true, summary };
  }

  function addTask(sprintId, taskId) {
    if (!_canManage()) return { error: 'permission_denied' };
    Storage.update('sp_tasks', arr => arr.map(t =>
      t.id === taskId ? { ...t, sprintId, updatedAt: Utils.nowISO() } : t
    ));
    App.events.emit('task:updated', (Storage.get('sp_tasks') || []).find(t => t.id === taskId));
    return { ok: true };
  }

  function removeTask(taskId) {
    if (!_canManage()) return { error: 'permission_denied' };
    Storage.update('sp_tasks', arr => arr.map(t =>
      t.id === taskId ? { ...t, sprintId: null, updatedAt: Utils.nowISO() } : t
    ));
    App.events.emit('task:updated', (Storage.get('sp_tasks') || []).find(t => t.id === taskId));
    return { ok: true };
  }

  function getSprintStats(sprintId) {
    const tasks = Storage.query('sp_tasks', t => t.sprintId === sprintId && !t.parentId);
    const done = tasks.filter(t => t.status === 'done');
    const totalPoints = tasks.reduce((s, t) => s + (t.storyPoints || 0), 0);
    const donePoints = done.reduce((s, t) => s + (t.storyPoints || 0), 0);
    return { total: tasks.length, done: done.length, totalPoints, donePoints };
  }

  return { create, getByProject, getById, getActive, update, remove, start, complete, addTask, removeTask, getSprintStats };
})();
