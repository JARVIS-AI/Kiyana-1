 (function () {
    const root = document.documentElement;
    const buttons = Array.from(document.querySelectorAll('.theme-btn'));

    // NOTE: this project disables window.setTimeout (see inline script),
    // so we use requestAnimationFrame-based delays.
    function rafDelay(ms, fn) {
      const start = performance.now();
      function tick(now) {
        if (now - start >= ms) return fn();
        requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }

    const THEME_TOKENS = {
      blue:     { bg1: '#0077ea', bg2: '#1f4f96', bg3: '#1b2949', bg4: '#000' },
      purple:   { bg1: '#8a2be2', bg2: '#4b1d7a', bg3: '#1f0a3a', bg4: '#000' },
      hotpink:  { bg1: '#ff69b4', bg2: '#b12c6d', bg3: '#3a0a22', bg4: '#000' },
      deeppink: { bg1: '#ff1493', bg2: '#a60b5d', bg3: '#320018', bg4: '#000' },
      teal:     { bg1: '#328E6E', bg2: '#005461', bg3: '#062b2f', bg4: '#000' },
      rose:     { bg1: '#BE5985', bg2: '#7b2e52', bg3: '#240511', bg4: '#000' },
      rosegold: { bg1: '#B76E79', bg2: '#7A3B45', bg3: '#2A0B11', bg4: '#000' },
      green:    { bg1: '#22C55E', bg2: '#15803D', bg3: '#052E1A', bg4: '#000' },
      brown:    { bg1: '#8B5E34', bg2: '#4E2A16', bg3: '#1F1008', bg4: '#000' },
      orange:   { bg1: '#FF7A00', bg2: '#C2410C', bg3: '#3B0F00', bg4: '#000' },
      wine:     { bg1: '#AC1754', bg2: '#3A0519', bg3: '#120008', bg4: '#000' },
    };

    const allowedThemes = new Set(Object.keys(THEME_TOKENS));
    let currentTheme = 'blue';

    const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function applyTheme(theme) {
      if (!theme || theme === 'blue') {
        root.removeAttribute('data-theme');
        theme = 'blue';
      } else {
        root.setAttribute('data-theme', theme);
      }
      currentTheme = theme;

      buttons.forEach((btn) => {
        const isActive = btn.dataset.theme === theme;
        btn.classList.toggle('is-active', isActive);
        btn.setAttribute('aria-pressed', String(isActive));

        const label = btn.querySelector('.label');
        if (label) label.textContent = isActive ? '(active)' : '';
      });

      try { localStorage.setItem('kiyana-theme', theme); } catch (e) {}
    }

    function revealToTheme(theme) {
      if (!allowedThemes.has(theme)) theme = 'blue';
      if (theme === currentTheme) return;

      // If user prefers reduced motion, just swap instantly.
      if (prefersReducedMotion) {
        applyTheme(theme);
        return;
      }

      const t = THEME_TOKENS[theme] || THEME_TOKENS.blue;

      const overlay = document.createElement('div');
      overlay.className = 'theme-reveal';
      overlay.style.setProperty('--reveal-1', t.bg1);
      overlay.style.setProperty('--reveal-2', t.bg2);
      overlay.style.setProperty('--reveal-3', t.bg3);
      overlay.style.setProperty('--reveal-4', t.bg4);
      document.body.appendChild(overlay);

      // Start animation (background reveal happens behind text)
      requestAnimationFrame(() => overlay.classList.add('is-on'));

      // When reveal finishes, apply theme and then remove overlay.
      const onDone = () => {
        applyTheme(theme);
        // Remove in next frame to avoid any flicker.
        requestAnimationFrame(() => overlay.remove());
      };
      overlay.addEventListener('transitionend', (e) => {
        if (e.propertyName !== 'transform') return;
        onDone();
      }, { once: true });

      // Fallback cleanup in case transitionend doesn't fire
      rafDelay(1200, () => {
        if (overlay && overlay.isConnected) {
          applyTheme(theme);
          overlay.remove();
        }
      });
    }

    // Restore theme (no reveal on first load)
    let saved = 'blue';
    try { saved = localStorage.getItem('kiyana-theme') || 'blue'; } catch (e) {}
    if (!allowedThemes.has(saved)) saved = 'blue';
    applyTheme(saved);

    // Bind clicks
    buttons.forEach((btn) => {
      btn.addEventListener('click', () => revealToTheme(btn.dataset.theme || 'blue'));
    });
  })();
  