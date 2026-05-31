(function () {
  const SESSION_KEY = 'msTrialCalculatorSession_v1';

  // Color themes per hospital — primary, hover, soft, secondary (for gradients)
  const THEMES = {
    '#2563eb': { primary: '#2563eb', hover: '#1d4ed8', soft: '#dbeafe', secondary: '#7c3aed', label: 'Vall d\'Hebron' },
    '#059669': { primary: '#059669', hover: '#047857', soft: '#d1fae5', secondary: '#0d9488', label: 'Clínic' },
    '#dc2626': { primary: '#dc2626', hover: '#b91c1c', soft: '#fee2e2', secondary: '#f59e0b', label: 'Bellvitge' },
    '#7c3aed': { primary: '#7c3aed', hover: '#6d28d9', soft: '#ede9fe', secondary: '#ec4899', label: 'Germans Trias' }
  };

  function getSession() {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  }

  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
  }

  function applyTheme(session) {
    if (!session || !session.color) return;
    const theme = THEMES[session.color];
    if (!theme) return;
    const root = document.documentElement;
    root.style.setProperty('--primary', theme.primary);
    root.style.setProperty('--primary-hover', theme.hover);
    root.style.setProperty('--primary-soft', theme.soft);
    root.style.setProperty('--primary-secondary', theme.secondary);
  }

  function initials(name) {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('');
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, ch => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));
  }

  function renderHeaderUser() {
    const userEl = document.getElementById('headerUser');
    const logoutEl = document.getElementById('headerLogout');
    if (!userEl) return;
    const session = getSession();
    if (!session || !session.loggedIn) {
      userEl.innerHTML = '<a href="login.html" class="logout-link">Iniciar sesión</a>';
      if (logoutEl) logoutEl.innerHTML = '';
      return;
    }
    userEl.innerHTML = `
      <div class="header-user-info">
        <div class="name">${escapeHtml(session.user || '—')}</div>
        <div class="role">${escapeHtml(session.role || '')}</div>
      </div>
      <div class="header-user-avatar">${initials(session.user || 'U')}</div>
    `;
    if (logoutEl) {
      logoutEl.innerHTML = '<a href="#" id="logoutBtn" class="logout-link">Cerrar sesión</a>';
      const logoutBtn = document.getElementById('logoutBtn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
          e.preventDefault();
          clearSession();
          window.location.href = 'login.html';
        });
      }
    }
  }

  // Redirect to login if no session
  function requireLogin() {
    const session = getSession();
    if (!session || !session.loggedIn) {
      window.location.href = 'login.html';
    }
  }

  // Expose globally
  window.MsSession = {
    get: getSession,
    clear: clearSession,
    requireLogin,
    renderHeaderUser
  };

  function init() {
    requireLogin();
    applyTheme(getSession());
    renderHeaderUser();
  }

  // Apply theme as early as possible to avoid color flash
  applyTheme(getSession());

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
