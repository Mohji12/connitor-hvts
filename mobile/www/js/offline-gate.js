(function () {
  const DEVICE_KEY = 'conninter.gate.device';
  const VAULT_KEY = 'conninter.gate.vault';

  function parsePass(raw) {
    const text = String(raw || '').trim();
    if (!text) return { passId: null, passType: null };
    if (text.charAt(0) === '{') {
      try {
        const data = JSON.parse(text);
        if (data.qrPayload) {
          const payload = String(data.qrPayload);
          if (payload.indexOf('PASS:') === 0 || payload.indexOf('PASS-EXIT:') === 0) {
            return { passId: payload.split(':')[1] || payload, passType: 'attendant' };
          }
          return { passId: payload.split(':')[0], passType: 'delivery' };
        }
        const visitId = data.v || data.visitId || data.id;
        if (visitId) return { passId: String(visitId), passType: 'visitor' };
      } catch (err) {
        return { passId: null, passType: null };
      }
    }
    return { passId: text, passType: null };
  }

  async function readPref(key) {
    try {
      if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Preferences) {
        const result = await window.Capacitor.Plugins.Preferences.get({ key: key });
        if (result && result.value) return result.value;
      }
    } catch (err) {
      // use localStorage
    }
    return localStorage.getItem(key);
  }

  function loadDevice() {
    try {
      return JSON.parse(localStorage.getItem(DEVICE_KEY) || 'null');
    } catch (err) {
      return null;
    }
  }

  function loadVault() {
    try {
      const raw = localStorage.getItem('conninter.gate.vault.json') || localStorage.getItem(VAULT_KEY);
      if (!raw) return { manifest: null, events: [] };
      const parsed = JSON.parse(raw);
      if (parsed && parsed.events) return parsed;
    } catch (err) {
      // encrypted blobs cannot be decoded here without WebCrypto + secret
    }
    return { manifest: null, events: [] };
  }

  async function hydrateFromNative() {
    const deviceRaw = await readPref(DEVICE_KEY);
    const vaultRaw = (await readPref('conninter.gate.vault.json')) || (await readPref(VAULT_KEY));
    if (deviceRaw) localStorage.setItem(DEVICE_KEY, deviceRaw);
    if (vaultRaw) {
      try {
        JSON.parse(vaultRaw);
        localStorage.setItem('conninter.gate.vault.json', vaultRaw);
      } catch (err) {
        // encrypted
      }
    }
  }

  function saveVault(vault) {
    localStorage.setItem(VAULT_KEY, JSON.stringify(vault));
  }

  function verify(raw) {
    const parsed = parsePass(raw);
    const vault = loadVault();
    const device = loadDevice();
    if (!parsed.passId) return { decision: 'REJECT', reasonCode: 'QR_UNPARSEABLE' };
    if (!vault.manifest || !device) return { decision: 'UNCERTAIN', reasonCode: 'NO_MANIFEST' };
    if (Date.parse(vault.manifest.expiresAt) <= Date.now()) {
      return { decision: 'REJECT', reasonCode: 'MANIFEST_EXPIRED', passId: parsed.passId };
    }
    if ((vault.manifest.revocations || []).some((row) => row.passId === parsed.passId)) {
      return { decision: 'REJECT', reasonCode: 'REVOKED', passId: parsed.passId };
    }
    const pass = (vault.manifest.passes || []).find(
      (row) => row.passId === parsed.passId || (row.aliases || []).indexOf(parsed.passId) >= 0,
    );
    if (!pass) return { decision: 'REJECT', reasonCode: 'NOT_IN_MANIFEST', passId: parsed.passId };
    if (pass.oneTime && (vault.events || []).some((row) => row.passId === pass.passId && row.eventType === 'ACCEPT')) {
      return { decision: 'REJECT', reasonCode: 'LOCAL_DUPLICATE', passId: pass.passId };
    }
    if (!vault.manifest.offlineAcceptance) {
      return { decision: 'UNCERTAIN', reasonCode: 'OFFLINE_NOT_ENABLED', passId: pass.passId };
    }
    const event = {
      eventId: 'evt-' + Date.now() + '-' + Math.random().toString(16).slice(2),
      passId: pass.passId,
      passType: pass.passType,
      eventType: 'ACCEPT',
      reasonCode: 'OFFLINE_OK',
      occurredAt: new Date().toISOString(),
      decisionMode: 'OFFLINE',
      syncStatus: 'PENDING',
    };
    vault.events.push(event);
    saveVault(vault);
    return { decision: 'ACCEPT', reasonCode: 'OFFLINE_OK', passId: pass.passId };
  }

  function show(result) {
    document.getElementById('verdict').textContent = result.decision + ' · ' + result.reasonCode;
    document.getElementById('detail').textContent = result.passId || '';
  }

  async function startCamera() {
    const video = document.getElementById('camera');
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    video.srcObject = stream;
    await video.play();
    if (!('BarcodeDetector' in window)) return;
    const detector = new BarcodeDetector({ formats: ['qr_code'] });
    const tick = async () => {
      try {
        const codes = await detector.detect(video);
        if (codes[0] && codes[0].rawValue) {
          show(verify(codes[0].rawValue));
        }
      } catch (err) {
        // keep looping
      }
      window.requestAnimationFrame(tick);
    };
    window.requestAnimationFrame(tick);
  }

  document.addEventListener('DOMContentLoaded', () => {
    hydrateFromNative().finally(() => {
      const device = loadDevice();
      const vault = loadVault();
      document.getElementById('status').textContent = device
        ? 'Enrolled device. Manifest ' + (vault.manifest ? vault.manifest.version : 'missing') + '. Cached QR images are not authorization.'
        : 'No enrolled device on this phone. Sync while online first.';
      document.getElementById('verify-btn').addEventListener('click', () => {
        show(verify(document.getElementById('raw').value));
      });
      startCamera().catch(() => undefined);
    });
  });
})();
