/* global Auth, Storage, Utils */
const Auth = (() => {
  function isLoggedIn() {
    const session = Storage.get('sp_session');
    return !!session && !!session.userId;
  }

  function getSession() {
    return Storage.get('sp_session');
  }

  function getCurrentUser() {
    const session = getSession();
    if (!session) return null;
    const users = Storage.get('sp_users') || [];
    return users.find(u => u.id === session.userId) || null;
  }

  function requireAuth() {
    if (!isLoggedIn()) {
      // Simpan hanya nama file dari pathname agar kompatibel file://
      const pathParts = window.location.pathname.split('/');
      const currentFile = pathParts[pathParts.length - 1] || 'dashboard.html';
      const currentSearch = window.location.search;
      const redirectTarget = currentFile + currentSearch + window.location.hash;
      window.location.href = './login.html?redirect=' + encodeURIComponent(redirectTarget);
    }
  }

  function requireRole(...roles) {
    requireAuth();
    const user = getCurrentUser();
    if (!user || !roles.includes(user.role)) {
      window.location.href = './dashboard.html';
    }
  }

  async function login(email, password) {
    const users = Storage.get('sp_users') || [];
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) return { ok: false, error: 'Email tidak ditemukan' };
    if (!user.isActive) return { ok: false, error: 'Akun dinonaktifkan' };

    const hashed = await Utils.hashPassword(password);
    if (user.password !== hashed) {
      // Fallback: try sync hash for legacy
      const syncHash = Utils.hashPasswordSync(password);
      if (user.password !== syncHash) {
        return { ok: false, error: 'Password salah' };
      }
    }

    const session = { userId: user.id, role: user.role, loginAt: Utils.nowISO() };
    Storage.set('sp_session', session);

    // Update lastLoginAt
    Storage.update('sp_users', (arr) =>
      arr.map(u => u.id === user.id ? { ...u, lastLoginAt: Utils.nowISO() } : u)
    );

    // Check due-soon notifications (deferred so Notification module is available)
    setTimeout(() => {
      if (window.Notification) Notification.checkDueSoon();
    }, 500);

    return { ok: true, user };
  }

  function logout() {
    Storage.remove('sp_session');
    window.location.href = './login.html';
  }

  function hasRole(...roles) {
    const user = getCurrentUser();
    return user && roles.includes(user.role);
  }

  function canEditTask(task) {
    const user = getCurrentUser();
    if (!user) return false;
    if (['admin', 'pm'].includes(user.role)) return true;
    if (user.role === 'developer') {
      return task.assigneeIds && task.assigneeIds.includes(user.id);
    }
    return false;
  }

  function canManageProject(project) {
    const user = getCurrentUser();
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (user.role === 'pm') return project.ownerId === user.id || project.memberIds.includes(user.id);
    return false;
  }

  return { isLoggedIn, getSession, getCurrentUser, requireAuth, requireRole, login, logout, hasRole, canEditTask, canManageProject };
})();
