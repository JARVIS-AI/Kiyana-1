(function () {
  const root = document.documentElement;
  const buttons = Array.from(document.querySelectorAll('.theme-btn'));

  // Themes are defined in CSS. We only allow themes present in the UI.
  const allowedThemes = new Set(
    buttons.map((b) => (b.dataset.theme || '').trim()).filter(Boolean)
  );
  allowedThemes.add('blue');

  let currentTheme = 'blue';
  let activeOverlay = null;
  let unlockBodyBackground = null;

  const prefersReducedMotion =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function normalizeTheme(theme) {
    const t = (theme || 'blue').trim();
    return allowedThemes.has(t) ? t : 'blue';
  }

  function updateButtons(activeTheme) {
    buttons.forEach((btn) => {
      const isActive = (btn.dataset.theme || 'blue') === activeTheme;
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-pressed', String(isActive));

      const label = btn.querySelector('.label');
      if (label) label.textContent = isActive ? '(active)' : '';
    });
  }

  function applyTheme(theme) {
    let t = normalizeTheme(theme);
    if (!t || t === 'blue') {
      root.removeAttribute('data-theme');
      t = 'blue';
    } else {
      root.setAttribute('data-theme', t);
    }

    currentTheme = t;
    updateButtons(t);

    try {
      localStorage.setItem('kiyana-theme', t);
    } catch (e) {}
  }

  // Read the CSS variables for a theme by creating a temporary element.
  // Our CSS uses `[data-theme="..."] { --bg-1: ... }` so variables apply to that element too.
  function readThemeBackgroundVars(theme) {
    const probe = document.createElement('div');
    probe.style.position = 'fixed';
    probe.style.left = '-9999px';
    probe.style.top = '-9999px';
    probe.style.width = '0';
    probe.style.height = '0';
    probe.style.opacity = '0';
    probe.style.pointerEvents = 'none';

    const t = normalizeTheme(theme);
    if (t && t !== 'blue') probe.setAttribute('data-theme', t);

    document.body.appendChild(probe);
    const cs = getComputedStyle(probe);
    const bg1 = cs.getPropertyValue('--bg-1').trim();
    const bg2 = cs.getPropertyValue('--bg-2').trim();
    const bg3 = cs.getPropertyValue('--bg-3').trim();
    const bg4 = cs.getPropertyValue('--bg-4').trim();
    probe.remove();

    return {
      bg1: bg1 || '#000',
      bg2: bg2 || '#000',
      bg3: bg3 || '#000',
      bg4: bg4 || '#000',
    };
  }

  function cleanupActiveTransition() {
    if (activeOverlay && activeOverlay.isConnected) activeOverlay.remove();
    activeOverlay = null;

    if (typeof unlockBodyBackground === 'function') unlockBodyBackground();
    unlockBodyBackground = null;
  }

  // Lock the *current* background onto the body inline so changing theme tokens
  // does not instantly change the visible background (prevents the "two-step" lag).
  function lockCurrentBodyBackground() {
    const body = document.body;
    const cs = getComputedStyle(body);
    const prev = {
      background: body.style.background,
      backgroundImage: body.style.backgroundImage,
      backgroundColor: body.style.backgroundColor,
    };

    // Freeze the computed background (keeps old theme visible).
    body.style.backgroundImage = cs.backgroundImage;
    body.style.backgroundColor = cs.backgroundColor;

    return function unlock() {
      body.style.background = prev.background;
      body.style.backgroundImage = prev.backgroundImage;
      body.style.backgroundColor = prev.backgroundColor;
    };
  }

  function revealToTheme(theme) {
    const target = normalizeTheme(theme);
    if (target === currentTheme) return;

    if (prefersReducedMotion) {
      cleanupActiveTransition();
      applyTheme(target);
      return;
    }

    cleanupActiveTransition();

    // 1) Freeze current background
    unlockBodyBackground = lockCurrentBodyBackground();

    // 2) Create reveal overlay using CSS variables of the target theme
    const t = readThemeBackgroundVars(target);
    const overlay = document.createElement('div');
    overlay.className = 'theme-reveal';
    overlay.style.setProperty('--reveal-1', t.bg1);
    overlay.style.setProperty('--reveal-2', t.bg2);
    overlay.style.setProperty('--reveal-3', t.bg3);
    overlay.style.setProperty('--reveal-4', t.bg4);
    document.body.appendChild(overlay);
    activeOverlay = overlay;

    // 3) Animate + apply theme in the same frame so nothing "lags" behind.
    // This avoids a single-frame mismatch where text changes before the reveal starts.
    requestAnimationFrame(() => {
      applyTheme(target);
      overlay.classList.add('is-on');
    });

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;

      // 5) Unfreeze background so the new theme background shows underneath.
      if (typeof unlockBodyBackground === 'function') unlockBodyBackground();
      unlockBodyBackground = null;

      // Remove overlay next frame to avoid any flicker.
      requestAnimationFrame(() => {
        if (overlay && overlay.isConnected) overlay.remove();
        activeOverlay = null;
      });
    };

    overlay.addEventListener(
      'transitionend',
      (e) => {
        if (e.propertyName !== 'transform') return;
        finish();
      },
      { once: true }
    );

    // Fallback cleanup (transitionend can be skipped in rare cases)
    window.setTimeout(finish, 1100);
  }

  // Restore theme (no reveal on first load)
  let saved = 'blue';
  try {
    saved = localStorage.getItem('kiyana-theme') || 'blue';
  } catch (e) {}
  saved = normalizeTheme(saved);
  applyTheme(saved);

  // Bind clicks
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => revealToTheme(btn.dataset.theme || 'blue'));
  });
})();
  