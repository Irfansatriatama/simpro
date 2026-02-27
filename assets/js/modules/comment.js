/* SIMPRO Module: comment */
const Comment = (() => {

  function _session() {
    return Storage.get('sp_session');
  }

  function addComment(taskId, content) {
    const s = _session();
    if (!s) return null;
    if (s.role === 'viewer') return { error: 'permission_denied' };
    if (!content || !content.trim()) return null;

    const now = Utils.nowISO();
    const comment = {
      id: Utils.generateId('cmt'),
      taskId,
      authorId: s.userId,
      content: content.trim(),
      type: 'comment',
      activityData: null,
      isEdited: false,
      createdAt: now,
      updatedAt: now,
    };
    Storage.update('sp_comments', arr => [...(arr || []), comment]);
    return comment;
  }

  function editComment(id, content) {
    const s = _session();
    if (!s) return null;
    const comments = Storage.get('sp_comments') || [];
    const comment = comments.find(c => c.id === id);
    if (!comment) return null;
    if (comment.authorId !== s.userId && s.role !== 'admin') return { error: 'permission_denied' };

    // Only editable within 24 hours
    const ageMs = Date.now() - new Date(comment.createdAt).getTime();
    if (ageMs > 86400000 && s.role !== 'admin') return { error: 'edit_expired' };

    const now = Utils.nowISO();
    Storage.update('sp_comments', arr =>
      arr.map(c => c.id === id ? { ...c, content: content.trim(), isEdited: true, updatedAt: now } : c)
    );
    return (Storage.get('sp_comments') || []).find(c => c.id === id);
  }

  function deleteComment(id) {
    const s = _session();
    if (!s) return false;
    const comments = Storage.get('sp_comments') || [];
    const comment = comments.find(c => c.id === id);
    if (!comment) return false;
    if (comment.authorId !== s.userId && s.role !== 'admin' && s.role !== 'pm') return false;

    Storage.update('sp_comments', arr => arr.filter(c => c.id !== id));
    return true;
  }

  function getByTask(taskId) {
    return Storage.query('sp_comments', c => c.taskId === taskId)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }

  function addActivity(taskId, action, data) {
    const s = _session();
    const now = Utils.nowISO();
    const activity = {
      id: Utils.generateId('act'),
      taskId,
      authorId: s ? s.userId : 'system',
      content: '',
      type: 'activity',
      activityData: { action, ...data },
      isEdited: false,
      createdAt: now,
      updatedAt: now,
    };
    Storage.update('sp_comments', arr => [...(arr || []), activity]);
    return activity;
  }

  return {
    addComment,
    editComment,
    deleteComment,
    getByTask,
    addActivity,
  };
})();
