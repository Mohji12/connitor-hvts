/** Onboarding flags (localStorage) — mirrors mobile-expo AsyncStorage keys. */
(function () {
  const KEY = 'hasCompletedOnboarding';
  const VERSION_KEY = 'onboardingVersion';

  function version() {
    return (window.__CONNINTER__ && window.__CONNINTER__.onboardingVersion) || '3';
  }

  window.ConninterStorage = {
    getHasCompletedOnboarding() {
      try {
        const expected = version();
        if (localStorage.getItem(VERSION_KEY) !== expected) {
          localStorage.removeItem(KEY);
          localStorage.setItem(VERSION_KEY, expected);
          return false;
        }
        return localStorage.getItem(KEY) === 'true';
      } catch {
        return false;
      }
    },
    setHasCompletedOnboarding(done) {
      localStorage.setItem(VERSION_KEY, version());
      localStorage.setItem(KEY, done ? 'true' : 'false');
    },
    parseDeepLink(raw) {
      if (!raw || typeof raw !== 'string') return null;
      const text = raw.trim();
      const origin =
        (window.__CONNINTER__ && window.__CONNINTER__.origin) || 'https://www.conninter.com';

      // 1. conninter://gate/<branchId> or com.conninter.hvts://gate/<branchId>
      const customMatch = text.match(/(?:conninter|com\.conninter\.hvts):\/\/gate\/([^/?#]+)/i);
      if (customMatch && customMatch[1]) {
        const branchId = decodeURIComponent(customMatch[1]);
        return `${origin}/gate/${encodeURIComponent(branchId)}/?native=1`;
      }

      // 2. intent://gate/<branchId>#Intent;...
      const intentMatch = text.match(/intent:\/\/gate\/([^#;/?]+)/i);
      if (intentMatch && intentMatch[1]) {
        const branchId = decodeURIComponent(intentMatch[1]);
        return `${origin}/gate/${encodeURIComponent(branchId)}/?native=1`;
      }

      // 3. https://(www.)conninter.com/gate/<branchId>
      const httpsMatch = text.match(/https?:\/\/[^/]+\/gate\/([^/?#]+)/i);
      if (httpsMatch && httpsMatch[1]) {
        const branchId = decodeURIComponent(httpsMatch[1]);
        return `${origin}/gate/${encodeURIComponent(branchId)}/?native=1`;
      }

      return null;
    },
  };
})();
