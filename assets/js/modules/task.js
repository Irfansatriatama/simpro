/* SIMPRO Module: task */
const Task = (() => {

  function _session() {
    return Storage.get('sp_session');
  }

  function _canEdit(task) {
    const s = _session();
    if (!s) return false;
    if (s.role === 'admin' || s.role === 'pm') return true;
    if (s.role === 'developer') return task.assigneeIds.includes(s.userId) || task.reporterId === s.userId;
    return false;
  }

  function _nextOrder(projectId, sprintId, status) {
    const tasks = Storage.query('sp_tasks', t =>
      t.projectId === projectId &&
      t.sprintId === sprintId &&
      t.status === status
    );
    return tasks.length;
  }

  function create(data) {
    const s = _session();
    if (!s) return null;
    if (s.role === 'viewer') return { error: 'permission_denied' };

    const project = (Storage.get('sp_projects') || []).find(p => p.id === data.projectId);
    if (!project) return { error: 'project_not_found' };

    let newKey;
    Storage.update('sp_projects', arr =>
      arr.map(p => {
        if (p.id === data.projectId) {
          const counter = (p.taskCounter || 0) + 1;
          newKey = `${p.key}-${counter}`;
          return { ...p, taskCounter: counter, updatedAt: Utils.nowISO() };
        }
        return p;
      })
    );

    const now = Utils.nowISO();
    const task = {
      id: Utils.generateId('task'),
      projectId: data.projectId,
      sprintId: data.sprintId || null,
      parentId: data.parentId || null,
      key: newKey,
      title: data.title.trim(),
      description: data.description || '',
      type: data.type || 'task',
      status: data.status || 'todo',
      priority: data.priority || 'medium',
      assigneeIds: data.assigneeIds || [],
      reporterId: s.userId,
      labelIds: data.labelIds || [],
      milestoneId: data.milestoneId || null,
      storyPoints: data.storyPoints != null ? Number(data.storyPoints) : null,
      estimatedHours: data.estimatedHours != null ? Number(data.estimatedHours) : null,
      loggedHours: 0,
      dueDate: data.dueDate || null,
      order: data.order != null ? data.order : _nextOrder(data.projectId, data.sprintId || null, data.status || 'todo'),
      createdAt: now,
      updatedAt: now,
    };

    Storage.update('sp_tasks', arr => [...(arr || []), task]);
    Comment.addActivity(task.id, 'task_created', {});
    return task;
  }

  function getAll() {
    return Storage.get('sp_tasks') || [];
  }

  function getById(id) {
    return (Storage.get('sp_tasks') || []).find(t => t.id === id) || null;
  }

  function getByProject(projectId) {
    return Storage.query('sp_tasks', t => t.projectId === projectId && !t.parentId);
  }

  function getBySprintId(sprintId) {
    return Storage.query('sp_tasks', t => t.sprintId === sprintId && !t.parentId);
  }

  function getBacklog(projectId) {
    return Storage.query('sp_tasks', t => t.projectId === projectId && !t.sprintId && !t.parentId);
  }

  function getSubtasks(parentId) {
    return Storage.query('sp_tasks', t => t.parentId === parentId);
  }

  function update(id, data) {
    const task = getById(id);
    if (!task) return null;
    if (!_canEdit(task)) return { error: 'permission_denied' };

    const now = Utils.nowISO();
    const updated = { ...task, ...data, id: task.id, updatedAt: now };

    if (data.status && data.status !== task.status) {
      Comment.addActivity(id, 'status_changed', { from: task.status, to: data.status });
    }
    if (data.priority && data.priority !== task.priority) {
      Comment.addActivity(id, 'priority_changed', { from: task.priority, to: data.priority });
    }
    if (data.assigneeIds && JSON.stringify(data.assigneeIds.sort()) !== JSON.stringify([...task.assigneeIds].sort())) {
      Comment.addActivity(id, 'assignee_changed', { from: task.assigneeIds, to: data.assigneeIds });
    }
    if (data.sprintId !== undefined && data.sprintId !== task.sprintId) {
      Comment.addActivity(id, 'sprint_changed', { from: task.sprintId, to: data.sprintId });
    }

    Storage.update('sp_tasks', arr => arr.map(t => t.id === id ? updated : t));
    return getById(id);
  }

  function remove(id) {
    const task = getById(id);
    if (!task) return false;
    if (!_canEdit(task)) return false;

    const subtasks = getSubtasks(id);
    subtasks.forEach(st => {
      Storage.update('sp_tasks', arr => arr.filter(t => t.id !== st.id));
      Storage.update('sp_comments', arr => (arr || []).filter(c => c.taskId !== st.id));
      Storage.update('sp_timelogs', arr => (arr || []).filter(l => l.taskId !== st.id));
    });

    Storage.update('sp_tasks', arr => arr.filter(t => t.id !== id));
    Storage.update('sp_comments', arr => (arr || []).filter(c => c.taskId !== id));
    Storage.update('sp_timelogs', arr => (arr || []).filter(l => l.taskId !== id));
    return true;
  }

  function reorder(taskId, newOrder, targetSprintId, targetStatus) {
    const task = getById(taskId);
    if (!task) return false;

    const resolvedSprintId = targetSprintId !== undefined ? targetSprintId : task.sprintId;
    const resolvedStatus   = targetStatus || task.status;

    const siblings = Storage.query('sp_tasks', t =>
      t.projectId === task.projectId &&
      t.sprintId === resolvedSprintId &&
      t.status === resolvedStatus &&
      t.id !== taskId &&
      !t.parentId
    ).sort((a, b) => a.order - b.order);

    siblings.splice(newOrder, 0, { id: taskId });

    const orderMap = {};
    siblings.forEach((t, idx) => { orderMap[t.id] = idx; });

    Storage.update('sp_tasks', arr => arr.map(t => {
      if (t.id === taskId) {
        return { ...t, order: orderMap[taskId] ?? newOrder, sprintId: resolvedSprintId, status: resolvedStatus, updatedAt: Utils.nowISO() };
      }
      if (orderMap[t.id] !== undefined) return { ...t, order: orderMap[t.id] };
      return t;
    }));
    return true;
  }

  function addSubtask(parentId, data) {
    const parent = getById(parentId);
    if (!parent) return null;
    return create({ ...data, projectId: parent.projectId, parentId, sprintId: parent.sprintId });
  }

  return {
    create,
    getAll,
    getById,
    getByProject,
    getBySprintId,
    getBacklog,
    getSubtasks,
    update,
    remove,
    reorder,
    addSubtask,
  };
})();
