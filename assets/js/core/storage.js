/* global Storage, Utils */
const Storage = (() => {
  function get(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  function set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch { return false; }
  }

  function update(key, fn) {
    try {
      const current = get(key);
      const updated = fn(current);
      return set(key, updated);
    } catch { return false; }
  }

  function remove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch { return false; }
  }

  function query(key, filterFn) {
    const arr = get(key);
    if (!Array.isArray(arr)) return [];
    return arr.filter(filterFn);
  }

  function clearAll() {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('sp_'));
    keys.forEach(k => localStorage.removeItem(k));
  }

  async function seed() {
    if (get('sp_seeded')) return;

    const now = Utils.nowISO();
    const today = Utils.todayISO();

    // Hash passwords
    const adminHash = await Utils.hashPassword('admin123');
    const pmHash    = await Utils.hashPassword('pm123');
    const devHash   = await Utils.hashPassword('dev123');
    const viewHash  = await Utils.hashPassword('viewer123');

    const users = [
      { id: 'user_001', name: 'Admin SIMPRO', email: 'admin@simpro.id', password: adminHash,
        role: 'admin', avatar: null, bio: 'System administrator', isActive: true,
        createdAt: now, lastLoginAt: null },
      { id: 'user_002', name: 'Andi Wijaya', email: 'pm@simpro.id', password: pmHash,
        role: 'pm', avatar: null, bio: 'Project Manager berpengalaman', isActive: true,
        createdAt: now, lastLoginAt: null },
      { id: 'user_003', name: 'Budi Santoso', email: 'dev@simpro.id', password: devHash,
        role: 'developer', avatar: null, bio: 'Frontend Developer', isActive: true,
        createdAt: now, lastLoginAt: null },
      { id: 'user_004', name: 'Citra Lestari', email: 'viewer@simpro.id', password: viewHash,
        role: 'viewer', avatar: null, bio: 'Stakeholder project WR', isActive: true,
        createdAt: now, lastLoginAt: null },
    ];

    const projects = [
      { id: 'proj_001', name: 'Website Redesign', description: 'Redesain website utama perusahaan',
        key: 'WR', status: 'active', priority: 'high', color: '#3B5BDB',
        ownerId: 'user_002', memberIds: ['user_001','user_002','user_003','user_004'],
        memberRoles: { 'user_003': 'developer', 'user_004': 'viewer' },
        startDate: '2026-01-01', endDate: '2026-06-30', taskCounter: 8,
        createdAt: now, updatedAt: now },
      { id: 'proj_002', name: 'Mobile App', description: 'Aplikasi mobile untuk pelanggan',
        key: 'MA', status: 'active', priority: 'medium', color: '#2F9E44',
        ownerId: 'user_002', memberIds: ['user_001','user_002','user_003'],
        memberRoles: { 'user_003': 'developer' },
        startDate: '2026-02-01', endDate: '2026-08-31', taskCounter: 5,
        createdAt: now, updatedAt: now },
    ];

    const sprints = [
      { id: 'sprint_001', projectId: 'proj_001', name: 'Sprint 1',
        goal: 'Selesaikan semua halaman autentikasi dan landing page',
        status: 'active', startDate: '2026-02-17', endDate: '2026-03-02',
        completedAt: null, velocity: 0, createdAt: now },
      { id: 'sprint_002', projectId: 'proj_001', name: 'Sprint 2',
        goal: 'Implementasi dashboard dan fitur utama',
        status: 'planned', startDate: '2026-03-03', endDate: '2026-03-16',
        completedAt: null, velocity: 0, createdAt: now },
      { id: 'sprint_003', projectId: 'proj_002', name: 'Sprint 1 MA',
        goal: 'Setup arsitektur dan fitur onboarding',
        status: 'active', startDate: '2026-02-10', endDate: '2026-02-23',
        completedAt: null, velocity: 0, createdAt: now },
      { id: 'sprint_004', projectId: 'proj_002', name: 'Sprint 2 MA',
        goal: 'Fitur utama aplikasi',
        status: 'planned', startDate: '2026-02-24', endDate: '2026-03-09',
        completedAt: null, velocity: 0, createdAt: now },
    ];

    const tasks = [
      // WR Sprint 1
      { id: 'task_001', projectId: 'proj_001', sprintId: 'sprint_001', parentId: null,
        key: 'WR-1', title: 'Desain halaman login & register', description: 'Buat mockup dan implementasi halaman auth sesuai brand guideline baru.',
        type: 'story', status: 'done', priority: 'high',
        assigneeIds: ['user_003'], reporterId: 'user_002', labelIds: [], milestoneId: 'ms_001',
        storyPoints: 3, estimatedHours: 8, loggedHours: 9,
        dueDate: '2026-02-20', order: 0, createdAt: now, updatedAt: now },
      { id: 'task_002', projectId: 'proj_001', sprintId: 'sprint_001', parentId: null,
        key: 'WR-2', title: 'Implementasi autentikasi JWT', description: 'Integrasi backend auth dengan frontend.',
        type: 'task', status: 'in-progress', priority: 'high',
        assigneeIds: ['user_003'], reporterId: 'user_002', labelIds: [], milestoneId: null,
        storyPoints: 5, estimatedHours: 12, loggedHours: 6,
        dueDate: '2026-02-25', order: 1, createdAt: now, updatedAt: now },
      { id: 'task_003', projectId: 'proj_001', sprintId: 'sprint_001', parentId: null,
        key: 'WR-3', title: 'Landing page hero section', description: 'Redesain hero section dengan animasi scroll.',
        type: 'story', status: 'in-progress', priority: 'medium',
        assigneeIds: ['user_003'], reporterId: 'user_002', labelIds: [], milestoneId: null,
        storyPoints: 3, estimatedHours: 6, loggedHours: 2,
        dueDate: '2026-02-28', order: 2, createdAt: now, updatedAt: now },
      { id: 'task_004', projectId: 'proj_001', sprintId: 'sprint_001', parentId: null,
        key: 'WR-4', title: 'Bug: Form validasi email tidak bekerja', description: 'Email format validation tidak trigger saat blur.',
        type: 'bug', status: 'review', priority: 'critical',
        assigneeIds: ['user_003'], reporterId: 'user_002', labelIds: [], milestoneId: null,
        storyPoints: 1, estimatedHours: 2, loggedHours: 1.5,
        dueDate: '2026-02-22', order: 3, createdAt: now, updatedAt: now },
      { id: 'task_005', projectId: 'proj_001', sprintId: 'sprint_001', parentId: null,
        key: 'WR-5', title: 'Responsive mobile navigation', description: 'Hamburger menu dan bottom navigation untuk mobile.',
        type: 'task', status: 'todo', priority: 'medium',
        assigneeIds: ['user_003'], reporterId: 'user_002', labelIds: [], milestoneId: null,
        storyPoints: 2, estimatedHours: 4, loggedHours: 0,
        dueDate: '2026-03-01', order: 4, createdAt: now, updatedAt: now },
      // WR Backlog
      { id: 'task_006', projectId: 'proj_001', sprintId: null, parentId: null,
        key: 'WR-6', title: 'Halaman profil pengguna', description: 'Edit profil, upload avatar, ganti password.',
        type: 'story', status: 'todo', priority: 'medium',
        assigneeIds: [], reporterId: 'user_002', labelIds: [], milestoneId: null,
        storyPoints: 5, estimatedHours: 10, loggedHours: 0,
        dueDate: null, order: 0, createdAt: now, updatedAt: now },
      { id: 'task_007', projectId: 'proj_001', sprintId: null, parentId: null,
        key: 'WR-7', title: 'Integrasi Google Analytics', description: 'Pasang GA4 tracking di semua halaman.',
        type: 'task', status: 'todo', priority: 'low',
        assigneeIds: [], reporterId: 'user_002', labelIds: [], milestoneId: null,
        storyPoints: 2, estimatedHours: 3, loggedHours: 0,
        dueDate: null, order: 1, createdAt: now, updatedAt: now },
      { id: 'task_008', projectId: 'proj_001', sprintId: null, parentId: null,
        key: 'WR-8', title: 'SEO optimization meta tags', description: 'Open Graph, Twitter Cards, meta description.',
        type: 'task', status: 'todo', priority: 'low',
        assigneeIds: [], reporterId: 'user_002', labelIds: [], milestoneId: null,
        storyPoints: 2, estimatedHours: 4, loggedHours: 0,
        dueDate: null, order: 2, createdAt: now, updatedAt: now },
      // MA Sprint 1
      { id: 'task_009', projectId: 'proj_002', sprintId: 'sprint_003', parentId: null,
        key: 'MA-1', title: 'Setup project React Native', description: 'Inisialisasi project, setup linting dan CI.',
        type: 'task', status: 'done', priority: 'high',
        assigneeIds: ['user_003'], reporterId: 'user_002', labelIds: [], milestoneId: null,
        storyPoints: 2, estimatedHours: 4, loggedHours: 3,
        dueDate: '2026-02-15', order: 0, createdAt: now, updatedAt: now },
      { id: 'task_010', projectId: 'proj_002', sprintId: 'sprint_003', parentId: null,
        key: 'MA-2', title: 'Onboarding screen flow', description: 'Desain dan implementasi 4 layar onboarding.',
        type: 'story', status: 'in-progress', priority: 'high',
        assigneeIds: ['user_003'], reporterId: 'user_002', labelIds: [], milestoneId: null,
        storyPoints: 5, estimatedHours: 12, loggedHours: 5,
        dueDate: '2026-02-23', order: 1, createdAt: now, updatedAt: now },
      { id: 'task_011', projectId: 'proj_002', sprintId: 'sprint_003', parentId: null,
        key: 'MA-3', title: 'Push notification setup', description: 'Konfigurasi FCM untuk Android dan iOS.',
        type: 'task', status: 'todo', priority: 'medium',
        assigneeIds: [], reporterId: 'user_002', labelIds: [], milestoneId: null,
        storyPoints: 3, estimatedHours: 6, loggedHours: 0,
        dueDate: '2026-02-23', order: 2, createdAt: now, updatedAt: now },
      // MA Backlog
      { id: 'task_012', projectId: 'proj_002', sprintId: null, parentId: null,
        key: 'MA-4', title: 'Dark mode support', description: 'Implementasi dark mode dengan system preference.',
        type: 'story', status: 'todo', priority: 'low',
        assigneeIds: [], reporterId: 'user_002', labelIds: [], milestoneId: null,
        storyPoints: 3, estimatedHours: 6, loggedHours: 0,
        dueDate: null, order: 0, createdAt: now, updatedAt: now },
    ];

    const milestones = [
      { id: 'ms_001', projectId: 'proj_001', name: 'MVP Launch', description: 'Peluncuran versi pertama website',
        dueDate: '2026-03-31', status: 'on-track', createdAt: now },
      { id: 'ms_002', projectId: 'proj_001', name: 'Full Launch', description: 'Peluncuran penuh semua fitur',
        dueDate: '2026-06-30', status: 'on-track', createdAt: now },
    ];

    const timelogs = [
      { id: 'tl_001', taskId: 'task_001', userId: 'user_003', hours: 4, description: 'Desain mockup Figma', date: '2026-02-18', createdAt: now },
      { id: 'tl_002', taskId: 'task_001', userId: 'user_003', hours: 5, description: 'Implementasi HTML/CSS', date: '2026-02-19', createdAt: now },
      { id: 'tl_003', taskId: 'task_002', userId: 'user_003', hours: 6, description: 'Setup JWT middleware', date: '2026-02-21', createdAt: now },
      { id: 'tl_004', taskId: 'task_009', userId: 'user_003', hours: 3, description: 'Init project dan config', date: '2026-02-12', createdAt: now },
    ];

    const labels = [
      { id: 'label_001', projectId: 'proj_001', name: 'Frontend', color: '#3B5BDB' },
      { id: 'label_002', projectId: 'proj_001', name: 'Backend', color: '#2F9E44' },
      { id: 'label_003', projectId: 'proj_001', name: 'Design', color: '#7048E8' },
      { id: 'label_004', projectId: 'proj_002', name: 'Mobile', color: '#E67700' },
      { id: 'label_005', projectId: 'proj_002', name: 'API', color: '#C92A2A' },
    ];

    const notifications = [
      { id: 'notif_001', userId: 'user_003', type: 'task_assigned',
        title: 'Task baru diassign', message: 'WR-5 "Responsive mobile navigation" diassign ke kamu',
        referenceType: 'task', referenceId: 'task_005', isRead: false, createdAt: now },
      { id: 'notif_002', userId: 'user_003', type: 'sprint_started',
        title: 'Sprint dimulai', message: 'Sprint 1 pada project Website Redesign telah dimulai',
        referenceType: 'sprint', referenceId: 'sprint_001', isRead: true, createdAt: now },
      { id: 'notif_003', userId: 'user_002', type: 'task_commented',
        title: 'Komentar baru', message: 'Budi berkomentar di WR-2',
        referenceType: 'task', referenceId: 'task_002', isRead: false, createdAt: now },
    ];

    const comments = [
      { id: 'cmt_001', taskId: 'task_002', authorId: 'user_003',
        content: 'Sudah setup middleware, sekarang testing di staging.',
        type: 'comment', activityData: null, isEdited: false, createdAt: now, updatedAt: now },
      { id: 'act_001', taskId: 'task_001', authorId: 'user_003',
        content: '', type: 'activity',
        activityData: { action: 'status_changed', from: 'in-progress', to: 'done' },
        isEdited: false, createdAt: now, updatedAt: now },
    ];

    const settings = {
      appName: 'SIMPRO',
      allowRegistration: true,
      defaultProjectColor: '#3B5BDB',
    };

    set('sp_users',         users);
    set('sp_projects',      projects);
    set('sp_sprints',       sprints);
    set('sp_tasks',         tasks);
    set('sp_milestones',    milestones);
    set('sp_timelogs',      timelogs);
    set('sp_labels',        labels);
    set('sp_notifications', notifications);
    set('sp_comments',      comments);
    set('sp_settings',      settings);
    set('sp_seeded',        true);
  }

  return { get, set, update, remove, query, clearAll, seed };
})();
