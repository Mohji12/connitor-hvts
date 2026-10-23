(function () {
  const TIMING = {
    flyMs: 900,
    mergeMs: 300,
    holdMs: 700,
    moveMs: 900,
    settleMs: 300,
  };
  const PARTICLE_COUNT = 40;
  const COLORS = ['#001B71', '#4A90E2', '#6BA8E8', '#0A2A8A', '#2E6FC4', '#001B71', '#4A90E2'];

  function hash01(n) {
    const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
    return x - Math.floor(x);
  }

  function appHome() {
    const base =
      (window.__CONNINTER__ && window.__CONNINTER__.appHome) || 'https://www.conninter.com/app/';
    // Mark the live origin so Welcome `/app/` stays the in-app home (hides marketing links).
    try {
      const url = new URL(base);
      url.searchParams.set('native', '1');
      // Bypass Android WebView HTML cache so a Vercel deploy shows up on the next open.
      url.searchParams.set('_cb', String(Date.now()));
      return url.toString();
    } catch {
      const join = base.includes('?') ? '&' : '?';
      return `${base}${join}native=1&_cb=${Date.now()}`;
    }
  }

  // Intercept deep link events while splash is mounting
  if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
    try {
      window.Capacitor.Plugins.App.addListener('appUrlOpen', (data) => {
        if (data && data.url && window.ConninterStorage) {
          const target = window.ConninterStorage.parseDeepLink(data.url);
          if (target) {
            sessionStorage.setItem('conninter.gate.deeplink', target);
            window.location.replace(target);
          }
        }
      });
    } catch (err) {
      // ignore
    }
  }

  async function goNext() {
    // Priority: if opened via QR deep link, navigate directly to that gate page.
    let target = sessionStorage.getItem('conninter.gate.deeplink');
    if (!target && window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
      try {
        const launch = await window.Capacitor.Plugins.App.getLaunchUrl();
        if (launch && launch.url && window.ConninterStorage) {
          target = window.ConninterStorage.parseDeepLink(launch.url);
        }
      } catch (err) {
        // ignore
      }
    }

    if (target) {
      sessionStorage.removeItem('conninter.gate.deeplink');
      window.location.replace(target);
      return;
    }

    const done = window.ConninterStorage.getHasCompletedOnboarding();
    // Website is unreachable: use the bundled offline gate, not www.conninter.com.
    if (done && typeof navigator !== 'undefined' && navigator.onLine === false) {
      window.location.replace('./offline-gate.html');
      return;
    }
    // Always land on Welcome (/app/), never the marketing homepage.
    if (done) {
      window.location.replace(appHome());
      return;
    }
    window.location.replace('./onboarding.html');
  }

  function mountParticles(layer) {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const radius = Math.max(width, height) * 0.72;

    for (let i = 0; i < PARTICLE_COUNT; i += 1) {
      const baseAngle = (i / PARTICLE_COUNT) * Math.PI * 2;
      const angle = baseAngle + (hash01(i * 17 + 3) - 0.5) * 1.15;
      const dist = radius * (0.55 + hash01(i * 31 + 7) * 0.55);
      const startX = Math.cos(angle) * dist;
      const startY = Math.sin(angle) * dist;
      const delay = Math.floor(hash01(i * 53 + 11) * 420);
      const size = 4 + Math.floor(hash01(i * 71 + 19) * 7);
      const color = COLORS[Math.floor(hash01(i * 97 + 23) * COLORS.length)];

      const el = document.createElement('span');
      el.className = 'particle';
      el.style.width = `${size}px`;
      el.style.height = `${size}px`;
      el.style.background = color;
      el.style.setProperty('--sx', `${startX}px`);
      el.style.setProperty('--sy', `${startY}px`);
      el.style.transform = `translate(calc(-50% + ${startX}px), calc(-50% + ${startY}px))`;
      el.style.animationDuration = `${TIMING.flyMs}ms`;
      el.style.animationDelay = `${delay}ms`;
      layer.appendChild(el);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const stage = document.getElementById('splash-stage');
    const logo = document.getElementById('splash-logo');
    const layer = document.getElementById('particle-layer');
    if (!stage || !logo || !layer) return;

    mountParticles(layer);

    const mergeAt = TIMING.flyMs;
    const moveAt = TIMING.flyMs + TIMING.mergeMs + TIMING.holdMs;
    const doneAt = moveAt + TIMING.moveMs + TIMING.settleMs;

    window.setTimeout(() => logo.classList.add('is-visible'), mergeAt);
    window.setTimeout(() => stage.classList.add('is-rising'), moveAt);
    window.setTimeout(goNext, doneAt);
  });
})();
