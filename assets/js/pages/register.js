/* SIMPRO — Page: Register */
(async function() {
  await Storage.seed();

  if (Auth.isLoggedIn()) {
    window.location.replace('/pages/dashboard.html');
    return;
  }

  if (window.lucide) lucide.createIcons();

  const settings = Storage.get('sp_settings') || {};
  if (!settings.allowRegistration) {
    document.getElementById('reg-form').style.display = 'none';
    document.getElementById('reg-disabled').style.display = 'block';
    return;
  }

  const form         = document.getElementById('reg-form');
  const nameInput    = document.getElementById('name');
  const emailInput   = document.getElementById('email');
  const passInput    = document.getElementById('password');
  const pass2Input   = document.getElementById('password2');
  const regBtn       = document.getElementById('reg-btn');
  const errorBanner  = document.getElementById('error-banner');
  const errorText    = document.getElementById('error-text');
  const passToggle   = document.getElementById('pass-toggle');
  const strengthWrap = document.getElementById('strength-wrap');
  const strengthFill = document.getElementById('strength-fill');
  const strengthLabel= document.getElementById('strength-label');

  function showError(msg) {
    errorText.textContent = msg;
    errorBanner.classList.add('visible');
    errorBanner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function hideError() {
    errorBanner.classList.remove('visible');
  }

  passToggle.addEventListener('click', () => {
    const isPass = passInput.type === 'password';
    passInput.type = isPass ? 'text' : 'password';
    passToggle.setAttribute('aria-label', isPass ? 'Sembunyikan password' : 'Tampilkan password');
    passToggle.querySelector('svg').innerHTML = isPass
      ? '<line x1="1" y1="1" x2="23" y2="23"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><path d="M1 1l22 22M9.88 9.88A3 3 0 0015 12"/>'
      : '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
  });

  function calcStrength(p) {
    let score = 0;
    if (p.length >= 6)  score++;
    if (p.length >= 10) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    return score;
  }

  passInput.addEventListener('input', () => {
    const val = passInput.value;
    if (!val) { strengthWrap.style.display = 'none'; return; }
    strengthWrap.style.display = 'block';
    const score = calcStrength(val);
    const levels = [
      { w: '20%', bg: 'var(--color-danger)',  label: 'Sangat lemah' },
      { w: '40%', bg: 'var(--color-danger)',  label: 'Lemah' },
      { w: '60%', bg: 'var(--color-warning)', label: 'Cukup' },
      { w: '80%', bg: 'var(--color-info)',    label: 'Kuat' },
      { w: '100%',bg: 'var(--color-success)', label: 'Sangat kuat' },
    ];
    const level = levels[Math.min(score - 1, 4)] || levels[0];
    strengthFill.style.width      = level.w;
    strengthFill.style.background = level.bg;
    strengthLabel.textContent     = level.label;
    strengthLabel.style.color     = level.bg;
  });

  [nameInput, emailInput, passInput, pass2Input].forEach(el => {
    el.addEventListener('input', hideError);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();

    const name     = nameInput.value.trim();
    const email    = emailInput.value.trim();
    const password = passInput.value;
    const password2= pass2Input.value;

    if (!name)      { showError('Nama lengkap wajib diisi'); nameInput.focus(); return; }
    if (!email)     { showError('Email wajib diisi'); emailInput.focus(); return; }
    if (!password)  { showError('Password wajib diisi'); passInput.focus(); return; }
    if (password.length < 6) { showError('Password minimal 6 karakter'); passInput.focus(); return; }
    if (password !== password2) { showError('Konfirmasi password tidak cocok'); pass2Input.focus(); return; }

    const users = Storage.get('sp_users') || [];
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
      showError('Email sudah terdaftar, gunakan email lain');
      emailInput.focus();
      return;
    }

    regBtn.disabled    = true;
    regBtn.textContent = 'Memuat…';

    const hashed  = await Utils.hashPassword(password);
    const newUser = {
      id:          Utils.generateId('user'),
      name, email,
      password:    hashed,
      role:        'developer',
      avatar:      null,
      bio:         '',
      isActive:    true,
      createdAt:   Utils.nowISO(),
      lastLoginAt: null,
    };

    Storage.update('sp_users', arr => [...(arr || []), newUser]);

    const result = await Auth.login(email, password);
    if (result.ok) {
      window.location.replace('/pages/dashboard.html');
    } else {
      showError('Gagal masuk setelah registrasi. Coba login manual.');
      regBtn.disabled    = false;
      regBtn.textContent = 'Buat Akun';
    }
  });
})();
