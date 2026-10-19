/**
 * Injected into the Conninter WebView before page JS runs.
 *
 * The live site stores staff JWT in sessionStorage and then calls
 * localStorage.removeItem('authToken'). In Expo WebView, soft/full navigations
 * after login can drop sessionStorage while the dashboard waits forever on
 * "Loading dashboard…". We keep a durable localStorage mirror and make auth
 * reads check both stores.
 */
export const NATIVE_SHELL_BRIDGE_JS = `
(function () {
  try {
    window.__CONNINTER_NATIVE_SHELL__ = 'expo';
    var AUTH = 'authToken';
    var ss = window.sessionStorage;
    var ls = window.localStorage;
    var ssGet = ss.getItem.bind(ss);
    var ssSet = ss.setItem.bind(ss);
    var ssRemove = ss.removeItem.bind(ss);
    var lsGet = ls.getItem.bind(ls);
    var lsSet = ls.setItem.bind(ls);
    var lsRemove = ls.removeItem.bind(ls);

    function readAuth() {
      return ssGet(AUTH) || lsGet(AUTH);
    }

    function writeAuth(value) {
      ssSet(AUTH, value);
      lsSet(AUTH, value);
    }

    function clearAuth() {
      ssRemove(AUTH);
      lsRemove(AUTH);
    }

    // Restore any durable token into the store the website reads today.
    var existing = readAuth();
    if (existing) {
      writeAuth(existing);
    }

    ss.getItem = function (key) {
      if (key === AUTH) return readAuth();
      return ssGet(key);
    };
    ss.setItem = function (key, value) {
      if (key === AUTH) {
        writeAuth(String(value));
        return;
      }
      ssSet(key, value);
    };
    ss.removeItem = function (key) {
      if (key === AUTH) {
        clearAuth();
        return;
      }
      ssRemove(key);
    };

    ls.getItem = function (key) {
      if (key === AUTH) return readAuth();
      return lsGet(key);
    };
    ls.setItem = function (key, value) {
      if (key === AUTH) {
        writeAuth(String(value));
        return;
      }
      lsSet(key, value);
    };
    // Website login clears localStorage after writing sessionStorage — ignore that
    // wipe so the Expo shell keeps the JWT across dashboard navigation.
    ls.removeItem = function (key) {
      if (key === AUTH) return;
      lsRemove(key);
    };
  } catch (e) {}
})();
true;
`.trim();

/** Re-assert shell flag + heal auth token mirror after navigations. */
export const NATIVE_SHELL_SYNC_JS = `
(function () {
  try {
    window.__CONNINTER_NATIVE_SHELL__ = 'expo';
    var AUTH = 'authToken';
    var fromSs = sessionStorage.getItem(AUTH);
    var fromLs = localStorage.getItem(AUTH);
    var token = fromSs || fromLs;
    if (token) {
      try { sessionStorage.setItem(AUTH, token); } catch (e1) {}
      try { localStorage.setItem(AUTH, token); } catch (e2) {}
    }
  } catch (e) {}
  true;
})();
`.trim();
