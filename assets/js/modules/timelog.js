/* SIMPRO Module: timelog */
const TimeLog = (() => {
  const KEY = 'sp_timelogs';

  function add({ taskId, userId, hours, description, date }) {
    if (!taskId || !userId) return { error: 'taskId dan userId wajib diisi' };
    const h = parseFloat(hours);
    if (isNaN(h) || h <= 0) return { error: 'Jam harus angka positif' };
    if (!date) return { error: 'Tanggal wajib diisi' };

    const log = {
      id: Utils.generateId('tl'),
      taskId,
      userId,
      hours: h,
      description: (description || '').trim(),
      date,
      createdAt: Utils.nowISO()
    };

    Storage.update(KEY, (list) => [...(list || []), log]);

    // Update loggedHours di task
    const allLogs = Storage.get(KEY) || [];
    const total = allLogs.filter(l => l.taskId === taskId).reduce((s, l) => s + l.hours, 0);
    Storage.update('sp_tasks', (tasks) =>
      (tasks || []).map(t => t.id === taskId ? { ...t, loggedHours: total, updatedAt: Utils.nowISO() } : t)
    );

    return log;
  }

  function getByTask(taskId) {
    return Storage.query(KEY, l => l.taskId === taskId)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  function getByUser(userId) {
    return Storage.query(KEY, l => l.userId === userId)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  function getByProject(projectId) {
    const tasks = Storage.query('sp_tasks', t => t.projectId === projectId);
    const taskIds = new Set(tasks.map(t => t.id));
    return Storage.query(KEY, l => taskIds.has(l.taskId))
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  function getTotalByTask(taskId) {
    return getByTask(taskId).reduce((s, l) => s + l.hours, 0);
  }

  function getTotalByUser(userId, projectId) {
    let logs = getByUser(userId);
    if (projectId) {
      const tasks = Storage.query('sp_tasks', t => t.projectId === projectId);
      const taskIds = new Set(tasks.map(t => t.id));
      logs = logs.filter(l => taskIds.has(l.taskId));
    }
    return logs.reduce((s, l) => s + l.hours, 0);
  }

  function remove(logId, session) {
    const logs = Storage.get(KEY) || [];
    const log = logs.find(l => l.id === logId);
    if (!log) return { error: 'Log tidak ditemukan' };

    const canDelete = session && (
      log.userId === session.userId ||
      session.role === 'admin' ||
      session.role === 'pm'
    );
    if (!canDelete) return { error: 'Tidak punya akses untuk menghapus log ini' };

    Storage.update(KEY, (list) => (list || []).filter(l => l.id !== logId));

    // Recalculate loggedHours
    const remaining = (Storage.get(KEY) || []).filter(l => l.taskId === log.taskId);
    const total = remaining.reduce((s, l) => s + l.hours, 0);
    Storage.update('sp_tasks', (tasks) =>
      (tasks || []).map(t => t.id === log.taskId ? { ...t, loggedHours: total, updatedAt: Utils.nowISO() } : t)
    );

    return { deleted: true };
  }

  function getSummaryByMember(projectId) {
    const tasks = Storage.query('sp_tasks', t => t.projectId === projectId && !t.parentId);
    const users = Storage.get('sp_users') || [];

    const memberMap = {};
    tasks.forEach(task => {
      const taskLogs = getByTask(task.id);
      taskLogs.forEach(log => {
        if (!memberMap[log.userId]) {
          const u = users.find(u => u.id === log.userId);
          memberMap[log.userId] = {
            userId: log.userId,
            name: u ? u.name : 'Unknown',
            loggedHours: 0
          };
        }
        memberMap[log.userId].loggedHours += log.hours;
      });
    });

    // Ensure all assignees appear even with 0 logged
    tasks.forEach(task => {
      (task.assigneeIds || []).forEach(uid => {
        if (!memberMap[uid]) {
          const u = users.find(u => u.id === uid);
          memberMap[uid] = { userId: uid, name: u ? u.name : 'Unknown', loggedHours: 0 };
        }
      });
    });

    // Estimated hours per member (distribute equally among assignees)
    const estimatedMap = {};
    tasks.forEach(task => {
      const est = task.estimatedHours || 0;
      const assignees = task.assigneeIds || [];
      if (assignees.length > 0 && est > 0) {
        const perPerson = est / assignees.length;
        assignees.forEach(uid => {
          estimatedMap[uid] = (estimatedMap[uid] || 0) + perPerson;
        });
      }
    });

    return Object.values(memberMap).map(m => ({
      ...m,
      estimatedHours: Math.round((estimatedMap[m.userId] || 0) * 10) / 10
    })).sort((a, b) => b.loggedHours - a.loggedHours);
  }

  return { add, getByTask, getByUser, getByProject, getTotalByTask, getTotalByUser, remove, getSummaryByMember };
})();
