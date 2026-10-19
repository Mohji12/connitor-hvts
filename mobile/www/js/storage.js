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
  };
})();
