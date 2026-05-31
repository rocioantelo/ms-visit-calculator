(function () {
  const data = loadData();
  const SESSION_KEY = 'msTrialCalculatorSession_v1';

  // Demo profiles — one per center, with a sample user name and role
  const PROFILE_TEMPLATES = {
    vh:        { user: 'Dra. María García',    role: 'Investigadora Principal', email: 'maria.garcia@vhebron.net',          color: '#2563eb' },
    clinic:    { user: 'Dr. Joan Martí',       role: 'Investigador Principal',  email: 'jmarti@clinic.cat',                 color: '#059669' },
    bellvitge: { user: 'Anna López',           role: 'Study Coordinator',       email: 'alopez@bellvitgehospital.cat',      color: '#dc2626' },
    gtp:       { user: 'Pere Soler',           role: 'Study Coordinator',       email: 'psoler@germanstrias.cat',           color: '#7c3aed' }
  };

  function profilesForCenters() {
    return data.centers.map(c => {
      const tpl = PROFILE_TEMPLATES[c.id] || {
        user: 'Investigador/a',
        role: 'Profesional',
        email: 'usuario@centro.cat',
        color: '#6b7280'
      };
      return { centerId: c.id, centerName: c.name, address: c.address, ...tpl };
    });
  }

  function initials(name) {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('');
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, ch => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));
  }

  function renderProfiles() {
    const list = document.getElementById('profileList');
    const profiles = profilesForCenters();
    if (profiles.length === 0) {
      list.innerHTML = '<div class="empty">No hay centros definidos. Ve a "Protocolos por centro" primero.</div>';
      return;
    }
    list.innerHTML = profiles.map(p => `
      <button class="profile-card" data-center="${p.centerId}" data-email="${escapeHtml(p.email)}">
        <div class="profile-avatar" style="background: ${p.color};">${initials(p.user)}</div>
        <div class="profile-info">
          <div class="profile-user">${escapeHtml(p.user)}</div>
          <div class="profile-role">${escapeHtml(p.role)}</div>
          <div class="profile-center">${escapeHtml(p.centerName)}</div>
        </div>
        <div class="profile-arrow">→</div>
      </button>
    `).join('');

    list.querySelectorAll('.profile-card').forEach(card => {
      card.addEventListener('click', async () => {
        // Prevent double-clicks during animation
        if (card.classList.contains('selected')) return;
        list.querySelectorAll('.profile-card').forEach(c => c.disabled = true);
        card.classList.add('selected');

        const centerId = card.dataset.center;
        const email = card.dataset.email;
        const emailInput = document.getElementById('loginEmail');
        const passwordInput = document.getElementById('loginPassword');
        const submitBtn = document.querySelector('.login-btn');

        emailInput.value = '';
        passwordInput.value = '';
        emailInput.focus();

        await typeText(emailInput, email, 45);
        await wait(180);

        passwordInput.focus();
        await typeText(passwordInput, 'demoPassword2026', 60);
        await wait(280);

        if (submitBtn) {
          submitBtn.classList.add('loading');
          submitBtn.textContent = 'Accediendo…';
        }
        await wait(500);
        loginAs(centerId, email);
      });
    });
  }

  function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async function typeText(input, text, baseDelay) {
    for (let i = 0; i < text.length; i++) {
      input.value += text[i];
      // Slight random variation to feel human
      const jitter = Math.random() * 50;
      await wait(baseDelay + jitter);
    }
  }

  function loginAs(centerId, email) {
    const profiles = profilesForCenters();
    const profile = profiles.find(p => p.centerId === centerId);
    const session = {
      loggedIn: true,
      centerId,
      email,
      user: profile ? profile.user : 'Usuario',
      role: profile ? profile.role : '',
      color: profile ? profile.color : null,
      loginAt: new Date().toISOString()
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    window.location.href = 'index.html';
  }

  // Standard email/password submit: just accept anything (demo) and go to calculator
  document.getElementById('loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    if (!email) return;
    // Try to match email to a known profile, otherwise default to first center
    const profiles = profilesForCenters();
    const match = profiles.find(p => p.email.toLowerCase() === email.toLowerCase());
    const centerId = match ? match.centerId : (data.centers[0] && data.centers[0].id);
    if (!centerId) {
      alert('No hay centros definidos.');
      return;
    }
    loginAs(centerId, email);
  });

  renderProfiles();
})();
