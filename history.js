const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

let allHistory = [];
let blockedSites = [];

// ── Load Data ─────────────────────────────────────────
browserAPI.storage.local.get(["threatHistory", "blockedSites"], data => {
  allHistory = data.threatHistory || [];
  blockedSites = data.blockedSites || [];
  renderStats();
  renderHistory();
  renderBlocked();
});

// ── Buttons ───────────────────────────────────────────
document.getElementById("clear-btn").addEventListener("click", clearHistory);
document.getElementById("export-btn").addEventListener("click", exportCSV);

// ── Render Stats ──────────────────────────────────────
function renderStats() {
  document.getElementById("total-threats").textContent = allHistory.length;
  const uniqueSites = [...new Set(allHistory.map(t => {
    try { return new URL(t.url).hostname; } catch { return t.url; }
  }))];
  document.getElementById("total-sites").textContent = uniqueSites.length;
  document.getElementById("total-blocked").textContent = blockedSites.length;
  const uniqueDates = [...new Set(allHistory.map(t => t.date || ""))];
  document.getElementById("total-sessions").textContent = uniqueDates.filter(Boolean).length;
}

// ── Render History Table ──────────────────────────────
function getThreatLabel(t) {
  if (t === 'wasm_detected')    return { label: 'WebAssembly',       color: '#ff6600' };
  if (t === 'high_cpu')         return { label: 'High CPU',          color: '#ff4444' };
  if (t === 'wasm_binary')      return { label: 'WASM Binary',       color: '#ff0088' };
  if (t === 'hidden_iframe')    return { label: 'Hidden iFrame',     color: '#ffaa00' };
  if (t === 'background_mining')return { label: 'Background Mining', color: '#0088ff' };
  if (t === 'clipboard_hijack')    return { label: 'Clipboard Hijack',   color: '#ff00ff' };
  if (t === 'worker_mining')       return { label: 'Web Worker Mining',  color: '#00ddff' };
  return                               { label: 'Miner Script',      color: '#cc00ff' };
}

function renderHistory() {
  const container = document.getElementById("history-container");
  if (allHistory.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🛡️</div>
        No threat history recorded yet.<br>Visit a cryptojacking site to see detections here.
      </div>`;
    return;
  }

  const sorted = [...allHistory].reverse();
  let rows = sorted.map(t => {
    const info = getThreatLabel(t.threat);
    let hostname = t.url;
    try { hostname = new URL(t.url).hostname; } catch {}

    return `
      <tr>
        <td>${t.date || "—"}</td>
        <td>${t.time || "—"}</td>
        <td><span class="badge" style="background:${info.color}22;color:${info.color};border:1px solid ${info.color}44;padding:2px 8px;border-radius:3px;font-size:9px;font-weight:bold;letter-spacing:1px;">${info.label}</span></td>
        <td>${hostname}</td>
        <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${t.url}">${t.url}</td>
      </tr>`;
  }).join("");

  container.innerHTML = `
    <table class="threat-table">
      <thead>
        <tr>
          <th>Date</th><th>Time</th><th>Type</th><th>Site</th><th>Source URL</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

// ── Render Blocked Sites ──────────────────────────────
function renderBlocked() {
  const container = document.getElementById("blocked-container");
  if (blockedSites.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">✅</div>
        No sites permanently blocked yet.
      </div>`;
    return;
  }

  container.innerHTML = `<div class="blocked-list">` +
    blockedSites.map(site => `
      <div class="blocked-item">
        <div>
          <div class="blocked-domain">🔒 ${site}</div>
          <div class="blocked-meta">Permanently blocked — all visits intercepted</div>
        </div>
        <button class="btn-unblock" data-site="${site}">Unblock</button>
      </div>`).join("") +
    `</div>`;

  document.querySelectorAll(".btn-unblock").forEach(btn => {
    btn.addEventListener("click", () => {
      const hostname = btn.getAttribute("data-site");
      if (confirm("Are you sure you want to unblock " + hostname + "?")) {
        browserAPI.runtime.sendMessage({ type: "UNBLOCK", hostname });
        blockedSites = blockedSites.filter(s => s !== hostname);
        browserAPI.storage.local.set({ blockedSites });
        renderBlocked();
        renderStats();
      }
    });
  });
}

// ── Export CSV ────────────────────────────────────────
function exportCSV() {
  if (allHistory.length === 0) {
    alert("No threat history to export.");
    return;
  }

  const headers = ["Date", "Time", "Threat Type", "Hostname", "Full URL"];
  const rows = allHistory.map(t => {
    let hostname = t.url;
    try { hostname = new URL(t.url).hostname; } catch {}
    const type = t.threat === "wasm_detected" ? "WebAssembly"
               : t.threat === "high_cpu" ? "High CPU"
               : "Miner Script";
    return [t.date || "", t.time || "", type, hostname, t.url].map(v => `"${v}"`).join(",");
  });

  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "cryptX_threat_history.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// ── Clear History ─────────────────────────────────────
function clearHistory() {
  if (confirm("Are you sure you want to clear all threat history? This cannot be undone.")) {
    allHistory = [];
    browserAPI.storage.local.set({ threatHistory: [] });
    renderStats();
    renderHistory();
  }
}