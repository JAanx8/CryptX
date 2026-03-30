const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

// ── Theme Toggle ─────────────────────────────────────
browserAPI.storage.local.get('theme', data => {
  if (data.theme === 'light') document.body.classList.add('light');
});

document.getElementById('theme-toggle').addEventListener('click', () => {
  const isLight = document.body.classList.toggle('light');
  browserAPI.storage.local.set({ theme: isLight ? 'light' : 'dark' });
});

// ── Open History Page ─────────────────────────────────
document.getElementById('history-btn').addEventListener('click', () => {
  browserAPI.tabs.create({ url: browserAPI.runtime.getURL('history.html') });
});

// ── Load Popup Data ───────────────────────────────────
browserAPI.tabs.query({ active: true, currentWindow: true }, tabs => {
  const tab = tabs[0];
  const url = tab?.url || '';
  let hostname = url;
  try { hostname = new URL(url).hostname; } catch {}

  browserAPI.storage.local.get('threats', data => {
    const threats = data.threats || {};
    const tabThreats = threats[tab.id] || [];

    if (tabThreats.length === 0) {
      renderSafe(hostname);
    } else {
      renderDanger(tabThreats, hostname);
    }
  });
});

// ── Safe State ────────────────────────────────────────
function renderSafe(hostname) {
  document.getElementById('status-dot').classList.remove('danger');
  document.getElementById('popup-body').innerHTML = `
    <div class="safe-body">
      <div class="shield-icon">🛡️</div>
      <div class="safe-title">This page is safe</div>
      <div class="safe-sub">No cryptojacking activity detected</div>
      <div class="site-name">${hostname}</div>
    </div>`;
}

// ── Danger State ──────────────────────────────────────
function renderDanger(threats, hostname) {
  document.getElementById('status-dot').classList.add('danger');

  const cards = threats.map(t => {
    const typeClass  = t.threat === 'wasm_detected' ? 'wasm'
                     : t.threat === 'script_signature' ? 'script' : 'cpu';
    const badgeClass = t.threat === 'wasm_detected' ? 'badge-wasm'
                     : t.threat === 'script_signature' ? 'badge-script' : 'badge-cpu';
    const typeLabel  = t.threat === 'wasm_detected' ? 'WebAssembly'
                     : t.threat === 'script_signature' ? 'Miner Script' : 'High CPU';
    return `
      <div class="threat-card ${typeClass}">
        <div class="threat-top">
          <span class="threat-badge ${badgeClass}">${typeLabel}</span>
          <span class="threat-time">${t.time || ''}</span>
        </div>
        <div class="threat-url" title="${t.url}">${t.url}</div>
      </div>`;
  }).join('');

  document.getElementById('popup-body').innerHTML = `
    <div class="danger-banner">
      <div class="danger-icon">⚠️</div>
      <div>
        <div class="danger-title">Cryptojacking Detected!</div>
        <div class="danger-count">${threats.length} threat${threats.length > 1 ? 's' : ''} found on ${hostname}</div>
      </div>
    </div>
    <div class="threats-list">${cards}</div>`;
}