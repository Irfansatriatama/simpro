/* SIMPRO Module: kanban — v0.6.0 */
const Kanban = (() => {

  const STATUSES = ['todo', 'in-progress', 'review', 'done'];

  function getTasksByStatus(projectId, sprintId, filters = {}) {
    let tasks = Storage.query('sp_tasks', t =>
      t.projectId === projectId &&
      t.sprintId === (sprintId || null) &&
      !t.parentId
    );

    if (filters.assigneeIds && filters.assigneeIds.length) {
      tasks = tasks.filter(t =>
        t.assigneeIds && t.assigneeIds.some(id => filters.assigneeIds.includes(id))
      );
    }
    if (filters.labelIds && filters.labelIds.length) {
      tasks = tasks.filter(t =>
        t.labelIds && t.labelIds.some(id => filters.labelIds.includes(id))
      );
    }
    if (filters.priorities && filters.priorities.length) {
      tasks = tasks.filter(t => filters.priorities.includes(t.priority));
    }
    if (filters.types && filters.types.length) {
      tasks = tasks.filter(t => filters.types.includes(t.type));
    }

    const result = {};
    STATUSES.forEach(s => {
      result[s] = tasks.filter(t => t.status === s).sort((a, b) => a.order - b.order);
    });
    return result;
  }

  function moveTask(taskId, newStatus, newOrder) {
    const task = Task.getById(taskId);
    if (!task) return false;

    const s = Storage.get('sp_session');
    if (!s) return false;
    if (s.role === 'viewer') return false;
    if (s.role === 'developer' && !task.assigneeIds.includes(s.userId) && task.reporterId !== s.userId) return false;

    const oldStatus = task.status;

    const destTasks = Storage.query('sp_tasks', t =>
      t.projectId === task.projectId &&
      t.sprintId === task.sprintId &&
      t.status === newStatus &&
      t.id !== taskId &&
      !t.parentId
    ).sort((a, b) => a.order - b.order);

    destTasks.splice(newOrder, 0, { id: taskId, _placeholder: true });

    const orderMap = {};
    destTasks.forEach((t, idx) => { orderMap[t.id] = idx; });

    Storage.update('sp_tasks', arr => arr.map(t => {
      if (t.id === taskId) {
        return { ...t, status: newStatus, order: orderMap[taskId] ?? newOrder, updatedAt: Utils.nowISO() };
      }
      if (orderMap[t.id] !== undefined) return { ...t, order: orderMap[t.id] };
      return t;
    }));

    if (oldStatus !== newStatus) {
      Comment.addActivity(taskId, 'status_changed', { from: oldStatus, to: newStatus });
    }

    App.events.emit('task:updated', Task.getById(taskId));
    return true;
  }

  function reorderInColumn(taskId, newOrder) {
    const task = Task.getById(taskId);
    if (!task) return false;
    return Task.reorder(taskId, newOrder, task.sprintId, task.status);
  }

  function getColumnStats(tasks) {
    const stats = {};
    STATUSES.forEach(s => {
      const col = tasks[s] || [];
      stats[s] = {
        count: col.length,
        points: col.reduce((sum, t) => sum + (t.storyPoints || 0), 0),
      };
    });
    return stats;
  }

  return { STATUSES, getTasksByStatus, moveTask, reorderInColumn, getColumnStats };
})();
