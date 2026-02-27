/* SIMPRO Module: report — v0.12.0 */
const Report = (() => {

  // ── Burndown ──────────────────────────────────────────────────────────────
  function burndown(sprintId) {
    const sprint = (Storage.get('sp_sprints') || []).find(s => s.id === sprintId);
    if (!sprint || !sprint.startDate || !sprint.endDate) return null;

    const tasks = Storage.query('sp_tasks', t => t.sprintId === sprintId && !t.parentId);
    const totalPoints = tasks.reduce((s, t) => s + (t.storyPoints || 0), 0);

    const start = new Date(sprint.startDate + 'T00:00:00');
    const end   = new Date(sprint.endDate   + 'T23:59:59');
    const today = new Date();
    const days  = Math.max(2, Math.round((end - start) / 86400000) + 1);

    const labels = [], planned = [], actual = [];

    for (let i = 0; i < days; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      labels.push(`${day.getMonth() + 1}/${day.getDate()}`);
      planned.push(Math.round(totalPoints * (1 - i / (days - 1))));

      if (day <= today) {
        const dayEnd = new Date(day);
        dayEnd.setHours(23, 59, 59, 999);
        const remaining = tasks
          .filter(t => t.status !== 'done' || new Date(t.updatedAt) > dayEnd)
          .reduce((s, t) => s + (t.storyPoints || 0), 0);
        actual.push(remaining);
      }
    }

    return { labels, planned, actual, totalPoints };
  }

  // ── Velocity ─────────────────────────────────────────────────────────────
  function velocity(projectId) {
    const sprints = (Storage.get('sp_sprints') || [])
      .filter(s => s.projectId === projectId && (s.status === 'completed' || s.status === 'active'))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    return sprints.map(s => {
      const tasks = Storage.query('sp_tasks', t => t.sprintId === s.id && !t.parentId);
      const planned = tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
      const done    = tasks.filter(t => t.status === 'done').reduce((sum, t) => sum + (t.storyPoints || 0), 0);
      return { sprintId: s.id, sprintName: s.name, planned, done, status: s.status };
    });
  }

  // ── Task Distribution ─────────────────────────────────────────────────────
  function distribution(projectId, sprintId) {
    const tasks = sprintId
      ? Storage.query('sp_tasks', t => t.sprintId === sprintId && !t.parentId)
      : Storage.query('sp_tasks', t => t.projectId === projectId && !t.parentId);

    const byStatus   = { todo: 0, 'in-progress': 0, review: 0, done: 0 };
    const byPriority = { critical: 0, high: 0, medium: 0, low: 0 };
    const byAssignee = {};
    const users = Storage.get('sp_users') || [];

    tasks.forEach(t => {
      byStatus[t.status] = (byStatus[t.status] || 0) + 1;
      byPriority[t.priority] = (byPriority[t.priority] || 0) + 1;
      (t.assigneeIds || []).forEach(uid => {
        if (!byAssignee[uid]) {
          const u = users.find(u => u.id === uid);
          byAssignee[uid] = { name: u ? u.name : 'Unknown', count: 0, done: 0 };
        }
        byAssignee[uid].count++;
        if (t.status === 'done') byAssignee[uid].done++;
      });
    });

    return {
      byStatus,
      byPriority,
      byAssignee: Object.values(byAssignee).sort((a, b) => b.count - a.count),
      total: tasks.length,
    };
  }

  // ── Time Stats ────────────────────────────────────────────────────────────
  function timeStats(projectId, sprintId) {
    const tasks = sprintId
      ? Storage.query('sp_tasks', t => t.sprintId === sprintId && !t.parentId)
      : Storage.query('sp_tasks', t => t.projectId === projectId && !t.parentId);

    const allLogs = Storage.get('sp_timelogs') || [];
    const taskIds = new Set(tasks.map(t => t.id));
    const logs = allLogs.filter(l => taskIds.has(l.taskId));

    const byTask = tasks.map(t => {
      const logged = logs.filter(l => l.taskId === t.id).reduce((s, l) => s + l.hours, 0);
      return { id: t.id, key: t.key, title: t.title, estimated: t.estimatedHours || 0, logged, over: logged > (t.estimatedHours || 0) && (t.estimatedHours || 0) > 0 };
    }).filter(t => t.estimated > 0 || t.logged > 0).sort((a, b) => b.logged - a.logged);

    const users = Storage.get('sp_users') || [];
    const memberMap = {};
    logs.forEach(l => {
      if (!memberMap[l.userId]) {
        const u = users.find(u => u.id === l.userId);
        memberMap[l.userId] = { name: u ? u.name : 'Unknown', logged: 0, estimated: 0 };
      }
      memberMap[l.userId].logged += l.hours;
    });
    tasks.forEach(t => {
      const est = t.estimatedHours || 0;
      const assignees = t.assigneeIds || [];
      if (est > 0 && assignees.length) {
        const per = est / assignees.length;
        assignees.forEach(uid => {
          if (!memberMap[uid]) { const u = users.find(u => u.id === uid); memberMap[uid] = { name: u ? u.name : 'Unknown', logged: 0, estimated: 0 }; }
          memberMap[uid].estimated += per;
        });
      }
    });

    const byMember = Object.values(memberMap)
      .map(m => ({ ...m, estimated: Math.round(m.estimated * 10) / 10 }))
      .sort((a, b) => b.logged - a.logged);

    return {
      byTask,
      byMember,
      totalEstimated: tasks.reduce((s, t) => s + (t.estimatedHours || 0), 0),
      totalLogged: logs.reduce((s, l) => s + l.hours, 0),
    };
  }

  return { burndown, velocity, distribution, timeStats };
})();
