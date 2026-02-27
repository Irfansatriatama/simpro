/* SIMPRO — Page: Login */
(async function() {
  await Storage.seed();

  if (Auth.isLoggedIn()) {
    window.location.replace('./dashboard.html');
    return;
  }

  if (window.lucide) lucide.createIcons();

  const form       = document.getElementById('login-form');
  const emailInput = document.getElementById('email');
  const passInput  = document.getElementById('password');
  const loginBtn   = document.getElementById('login-btn');
  const errorBanner= document.getElementById('error-banner');
  const errorText  = document.getElementById('error-text');
  const passToggle = document.getElementById('pass-toggle');

  function showError(msg) {
    errorText.textContent = msg;
    errorBanner.classList.add('visible');
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

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();

    const email    = emailInput.value.trim();
    const password = passInput.value;

    if (!email || !password) {
      showError('Email dan password wajib diisi');
      return;
    }

    loginBtn.disabled    = true;
    loginBtn.textContent = 'Memuat…';

    const result = await Auth.login(email, password);

    if (result.ok) {
      const params   = new URLSearchParams(window.location.search);
      const redirect = params.get('redirect');
      window.location.replace(redirect || './dashboard.html');
    } else {
      showError(result.error);
      loginBtn.disabled    = false;
      loginBtn.textContent = 'Masuk';
      passInput.focus();
    }
  });

  document.querySelectorAll('.demo-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      emailInput.value = btn.dataset.email;
      passInput.value  = btn.dataset.pass;
      hideError();
      emailInput.focus();
    });
  });

  emailInput.addEventListener('input', hideError);
  passInput.addEventListener('input', hideError);
})();
