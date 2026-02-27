/* SIMPRO Page: profile — v0.15.0 */
const Page = (() => {
  let _user = null;
  let _session = null;

  function init() {
    _session = Storage.get('sp_session');
    _user = Auth.getCurrentUser();
    if (!_user) return;

    _renderPage();
    _bindEvents();
  }

  function _avatarHtml(user, size) {
    if (user.avatar) {
      return `<img class="profile-avatar-img" src="${user.avatar}" alt="Avatar" style="width:${size}px;height:${size}px;">`;
    }
    const colors = ['#3B5BDB','#2F9E44','#C92A2A','#7048E8','#E67700','#1971C2'];
    const idx = user.id.charCodeAt(user.id.length - 1) % colors.length;
    const initials = (user.name || 'U').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
    return `<div class="profile-avatar-initials" style="width:${size}px;height:${size}px;background:${colors[idx]};">${initials}</div>`;
  }

  function _roleLabel(role) {
    const map = { admin: 'Admin', pm: 'Project Manager', developer: 'Developer', viewer: 'Viewer' };
    return map[role] || role;
  }

  function _renderPage() {
    const main = document.getElementById('main-content');
    main.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">Profil Saya</h1>
        </div>
      </div>

      <div class="profile-layout">

        <div class="profile-avatar-card">
          <div class="profile-avatar-wrap" id="avatar-wrap">
            ${_avatarHtml(_user, 96)}
            <label for="avatar-file-input" class="profile-avatar-upload-btn" title="Ganti foto">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            </label>
            <input type="file" id="avatar-file-input" accept="image/*">
          </div>
          <div class="profile-name" id="profile-display-name">${Utils.escapeHtml(_user.name)}</div>
          <div class="profile-email">${Utils.escapeHtml(_user.email)}</div>
          <span class="profile-role-badge">${_roleLabel(_user.role)}</span>
          <div style="font-size:var(--text-xs);color:var(--color-text-3);text-align:center;">
            Bergabung ${Utils.formatDate(_user.createdAt)}
          </div>
          ${_user.avatar ? `<button class="btn btn-ghost btn-sm" id="btn-remove-avatar" style="color:var(--color-danger);font-size:var(--text-xs);">Hapus foto</button>` : ''}
        </div>

        <div class="profile-form-card">
          <div class="profile-form-section">
            <div class="profile-section-title">Informasi Akun</div>
            <div class="profile-form-grid">
              <div class="form-group">
                <label class="form-label" for="input-name">Nama Lengkap</label>
                <input class="form-input" type="text" id="input-name" value="${Utils.escapeHtml(_user.name)}" maxlength="80">
              </div>
              <div class="form-group">
                <label class="form-label" for="input-email">Email</label>
                <input class="form-input" type="email" id="input-email" value="${Utils.escapeHtml(_user.email)}" maxlength="120">
              </div>
              <div class="form-group full">
                <label class="form-label" for="input-bio">Bio <span style="color:var(--color-text-3);">(opsional)</span></label>
                <textarea class="form-input" id="input-bio" rows="3" maxlength="300" placeholder="Ceritakan sedikit tentang diri kamu…">${Utils.escapeHtml(_user.bio || '')}</textarea>
              </div>
            </div>
          </div>
          <div class="profile-form-actions">
            <button class="btn btn-primary btn-sm" id="btn-save-info">Simpan Perubahan</button>
          </div>

          <div class="profile-form-section" style="border-top:1px solid var(--color-border);">
            <div class="profile-section-title">Ganti Password</div>
            <div class="profile-form-grid">
              <div class="form-group">
                <label class="form-label" for="input-current-password">Password Saat Ini</label>
                <input class="form-input" type="password" id="input-current-password" autocomplete="current-password" placeholder="••••••••">
              </div>
              <div></div>
              <div class="form-group">
                <label class="form-label" for="input-new-password">Password Baru</label>
                <input class="form-input" type="password" id="input-new-password" autocomplete="new-password" placeholder="Min. 6 karakter">
                <div class="password-strength" id="pw-strength-bars">
                  <div class="password-strength-bar"></div>
                  <div class="password-strength-bar"></div>
                  <div class="password-strength-bar"></div>
                  <div class="password-strength-bar"></div>
                </div>
                <div class="password-strength-label" id="pw-strength-label"></div>
              </div>
              <div class="form-group">
                <label class="form-label" for="input-confirm-password">Konfirmasi Password Baru</label>
                <input class="form-input" type="password" id="input-confirm-password" autocomplete="new-password" placeholder="Ulangi password baru">
              </div>
            </div>
          </div>
          <div class="profile-form-actions">
            <button class="btn btn-primary btn-sm" id="btn-save-password">Ganti Password</button>
          </div>
        </div>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
  }

  function _bindEvents() {
    const main = document.getElementById('main-content');
    main.addEventListener('click', e => {
      if (e.target.closest('#btn-save-info'))     _saveInfo();
      if (e.target.closest('#btn-save-password')) _savePassword();
      if (e.target.closest('#btn-remove-avatar')) _removeAvatar();
    });
    main.addEventListener('input', e => {
      if (e.target.id === 'input-new-password') _updateStrengthBar(e.target.value);
    });
    main.addEventListener('change', e => {
      if (e.target.id === 'avatar-file-input') _handleAvatarUpload(e.target);
    });
  }

  function _handleAvatarUpload(input) {
    const file = input.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { App.Toast.error('Format tidak didukung', 'Pilih file gambar'); return; }
    if (file.size > 5 * 1024 * 1024) { App.Toast.error('File terlalu besar', 'Maksimal 5 MB'); return; }
    const reader = new FileReader();
    reader.onload = evt => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 128; canvas.height = 128;
        const ctx = canvas.getContext('2d');
        const size = Math.min(img.width, img.height);
        const sx = (img.width - size) / 2, sy = (img.height - size) / 2;
        ctx.drawImage(img, sx, sy, size, size, 0, 0, 128, 128);
        _saveAvatar(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = evt.target.result;
    };
    reader.readAsDataURL(file);
    input.value = '';
  }

  function _saveAvatar(base64) {
    Storage.update('sp_users', arr =>
      arr.map(u => u.id === _user.id ? { ...u, avatar: base64 } : u)
    );
    _user = Auth.getCurrentUser();
    _renderPage();
    _bindEvents();
    App.Toast.success('Foto profil diperbarui');
    Shell.applyTo('profile', 'Profil Saya');
  }

  function _removeAvatar() {
    Storage.update('sp_users', arr =>
      arr.map(u => u.id === _user.id ? { ...u, avatar: null } : u)
    );
    _user = Auth.getCurrentUser();
    _renderPage();
    _bindEvents();
    App.Toast.success('Foto profil dihapus');
    Shell.applyTo('profile', 'Profil Saya');
  }

  function _saveInfo() {
    const name  = document.getElementById('input-name').value.trim();
    const email = document.getElementById('input-email').value.trim().toLowerCase();
    const bio   = document.getElementById('input-bio').value.trim();
    if (!name)  { App.Toast.error('Nama wajib diisi'); return; }
    if (!email) { App.Toast.error('Email wajib diisi'); return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { App.Toast.error('Format email tidak valid'); return; }
    const users = Storage.get('sp_users') || [];
    if (users.find(u => u.email.toLowerCase() === email && u.id !== _user.id)) {
      App.Toast.error('Email sudah digunakan akun lain'); return;
    }
    Storage.update('sp_users', arr =>
      arr.map(u => u.id === _user.id ? { ...u, name, email, bio } : u)
    );
    _user = Auth.getCurrentUser();
    const el = document.getElementById('profile-display-name');
    if (el) el.textContent = name;
    App.Toast.success('Profil disimpan');
    Shell.applyTo('profile', 'Profil Saya');
  }

  async function _savePassword() {
    const current = document.getElementById('input-current-password').value;
    const newPw   = document.getElementById('input-new-password').value;
    const confirm = document.getElementById('input-confirm-password').value;
    if (!current) { App.Toast.error('Masukkan password saat ini'); return; }
    if (!newPw)   { App.Toast.error('Masukkan password baru'); return; }
    if (newPw.length < 6) { App.Toast.error('Password minimal 6 karakter'); return; }
    if (newPw !== confirm) { App.Toast.error('Konfirmasi password tidak cocok'); return; }

    const users = Storage.get('sp_users') || [];
    const user = users.find(u => u.id === _user.id);
    const currentHash = await Utils.hashPassword(current);
    const syncHash = Utils.hashPasswordSync(current);
    if (user.password !== currentHash && user.password !== syncHash) {
      App.Toast.error('Password saat ini salah'); return;
    }

    const newHash = await Utils.hashPassword(newPw);
    Storage.update('sp_users', arr =>
      arr.map(u => u.id === _user.id ? { ...u, password: newHash } : u)
    );
    document.getElementById('input-current-password').value = '';
    document.getElementById('input-new-password').value = '';
    document.getElementById('input-confirm-password').value = '';
    _updateStrengthBar('');
    App.Toast.success('Password berhasil diganti');
  }

  function _updateStrengthBar(pw) {
    const bars  = document.querySelectorAll('.password-strength-bar');
    const label = document.getElementById('pw-strength-label');
    if (!bars.length) return;
    let score = 0;
    if (pw.length >= 6)  score++;
    if (pw.length >= 10) score++;
    if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
    if (/[0-9]/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
    const cls    = ['','active-weak','active-medium','active-strong','active-strong'];
    const labels = ['','Lemah','Sedang','Kuat','Sangat kuat'];
    bars.forEach((bar, i) => {
      bar.className = 'password-strength-bar';
      if (pw && i < score) bar.classList.add(cls[score]);
    });
    if (label) {
      label.textContent = pw ? labels[score] : '';
      label.style.color = score <= 1 ? 'var(--color-danger)' : score === 2 ? 'var(--color-warning)' : 'var(--color-success)';
    }
  }

  return { init };
})();
