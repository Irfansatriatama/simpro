/* SIMPRO Module: notification — v0.11.0 */
const Notification = (() => {

  function _session() { return Storage.get('sp_session'); }

  function create({ userId, type, title, message, referenceType, referenceId }) {
    if (!userId || !type || !title) return null;
    const notif = {
      id: Utils.generateId('notif'),
      userId,
      type,
      title,
      message: message || '',
      referenceType: referenceType || null,
      referenceId: referenceId || null,
      isRead: false,
      createdAt: Utils.nowISO(),
    };
    Storage.update('sp_notifications', arr => [...(arr || []), notif]);
    return notif;
  }

  function getByUser(userId) {
    return Storage.query('sp_notifications', n => n.userId === userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  function getUnreadCount(userId) {
    return Storage.query('sp_notifications', n => n.userId === userId && !n.isRead).length;
  }

  function markRead(notifId) {
    Storage.update('sp_notifications', arr =>
      (arr || []).map(n => n.id === notifId ? { ...n, isRead: true } : n)
    );
  }

  function markAllRead(userId) {
    Storage.update('sp_notifications', arr =>
      (arr || []).map(n => n.userId === userId ? { ...n, isRead: true } : n)
    );
  }

  function clearAll(userId) {
    Storage.update('sp_notifications', arr =>
      (arr || []).filter(n => n.userId !== userId)
    );
  }

  // --- Auto-create helpers ---

  function onTaskAssigned(task, prevAssigneeIds) {
    const prev = prevAssigneeIds || [];
    const newAssignees = (task.assigneeIds || []).filter(id => !prev.includes(id));
    const session = _session();
    const actorId = session ? session.userId : null;

    newAssignees.forEach(userId => {
      if (userId === actorId) return;
      const users = Storage.get('sp_users') || [];
      const actor = actorId ? users.find(u => u.id === actorId) : null;
      create({
        userId,
        type: 'task_assigned',
        title: 'Task baru diassign ke kamu',
        message: `${task.key} — ${task.title}${actor ? ' oleh ' + actor.name : ''}`,
        referenceType: 'task',
        referenceId: task.id,
      });
    });
    App.refreshNotifBadge();
  }

  function onTaskCommented(task, commentAuthorId) {
    const session = _session();
    const actorId = commentAuthorId || (session ? session.userId : null);

    const comments = Storage.get('sp_comments') || [];
    const prevCommenters = [...new Set(
      comments
        .filter(c => c.taskId === task.id && c.type === 'comment' && c.authorId !== actorId)
        .map(c => c.authorId)
    )];

    const recipients = [...new Set([
      ...(task.assigneeIds || []),
      ...prevCommenters,
    ])].filter(uid => uid !== actorId);

    const users = Storage.get('sp_users') || [];
    const actor = users.find(u => u.id === actorId);

    recipients.forEach(userId => {
      create({
        userId,
        type: 'task_commented',
        title: 'Komentar baru di task kamu',
        message: `${task.key} — ${task.title}${actor ? ' oleh ' + actor.name : ''}`,
        referenceType: 'task',
        referenceId: task.id,
      });
    });
    App.refreshNotifBadge();
  }

  function checkDueSoon() {
    const session = _session();
    if (!session) return;
    const userId = session.userId;

    const now = new Date();
    const twoDaysMs = 2 * 24 * 60 * 60 * 1000;
    const today = Utils.todayISO();
    const soonDate = new Date(now.getTime() + twoDaysMs).toISOString().slice(0, 10);

    const tasks = Storage.query('sp_tasks', t =>
      t.assigneeIds && t.assigneeIds.includes(userId) &&
      t.status !== 'done' &&
      t.dueDate && t.dueDate >= today && t.dueDate <= soonDate
    );

    const existing = Storage.query('sp_notifications', n =>
      n.userId === userId && n.type === 'due_soon' && n.createdAt.slice(0, 10) === today
    );
    const existingRefs = new Set(existing.map(n => n.referenceId));

    tasks.forEach(task => {
      if (existingRefs.has(task.id)) return;
      const daysLeft = Math.ceil((new Date(task.dueDate) - now) / (24 * 60 * 60 * 1000));
      create({
        userId,
        type: 'due_soon',
        title: 'Task hampir jatuh tempo',
        message: `${task.key} — ${task.title} (${daysLeft <= 0 ? 'hari ini' : daysLeft + ' hari lagi'})`,
        referenceType: 'task',
        referenceId: task.id,
      });
    });

    if (tasks.length) App.refreshNotifBadge();
  }

  function onSprintStarted(sprint) {
    const project = (Storage.get('sp_projects') || []).find(p => p.id === sprint.projectId);
    if (!project) return;
    const session = _session();
    const actorId = session ? session.userId : null;

    (project.memberIds || []).forEach(userId => {
      if (userId === actorId) return;
      create({
        userId,
        type: 'sprint_started',
        title: 'Sprint dimulai',
        message: `${sprint.name} di project ${project.name} telah dimulai`,
        referenceType: 'sprint',
        referenceId: sprint.id,
      });
    });
    App.refreshNotifBadge();
  }

  function onSprintCompleted(sprint) {
    const project = (Storage.get('sp_projects') || []).find(p => p.id === sprint.projectId);
    if (!project) return;
    const session = _session();
    const actorId = session ? session.userId : null;

    (project.memberIds || []).forEach(userId => {
      if (userId === actorId) return;
      create({
        userId,
        type: 'sprint_completed',
        title: 'Sprint selesai',
        message: `${sprint.name} di project ${project.name} telah diselesaikan`,
        referenceType: 'project',
        referenceId: project.id,
      });
    });
    App.refreshNotifBadge();
  }

  return {
    create,
    getByUser,
    getUnreadCount,
    markRead,
    markAllRead,
    clearAll,
    onTaskAssigned,
    onTaskCommented,
    onSprintStarted,
    onSprintCompleted,
    checkDueSoon,
  };
})();
