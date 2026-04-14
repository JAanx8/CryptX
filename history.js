const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

let allHistory = [];
let blockedSites = [];
let renderSearchFilter = "";
let renderTypeFilter = "all";
let keyboardSelectedIndex = -1;
let ignoredSuggestions = new Set();

// ── Load Data ─────────────────────────────────────────
browserAPI.storage.local.get(["threatHistory", "blockedSites"], data => {
  allHistory = data.threatHistory || [];
  blockedSites = data.blockedSites || [];
  renderStats();
  renderHistory();
  renderBlocked();
});

// ── Buttons & Inputs ──────────────────────────────────
document.getElementById("clear-btn").addEventListener("click", clearHistory);
document.getElementById("export-btn").addEventListener("click", exportCSV);

const searchInput = document.getElementById('search-input');
const filterSelect = document.getElementById('filter-select');
if (searchInput) {
  searchInput.addEventListener('input', (e) => {
    renderSearchFilter = e.target.value;
    renderHistory();
  });
}
if (filterSelect) {
  filterSelect.addEventListener('change', (e) => {
    renderTypeFilter = e.target.value;
    renderHistory();
  });
}

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
  checkSmartSuggestions();
  
  if (allHistory.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🛡️</div>
        No threat history recorded yet.<br>Visit a cryptojacking site to see detections here.
      </div>`;
    return;
  }

  let filtered = allHistory
    .map((t, i) => ({ ...t, _index: i }))
    .filter(t => {
      if (renderTypeFilter !== "all" && t.threat !== renderTypeFilter) return false;
      if (renderSearchFilter) {
        const s = renderSearchFilter.toLowerCase();
        let hostname = t.url;
        try { hostname = new URL(t.url).hostname; } catch {}
        return (hostname && hostname.toLowerCase().includes(s)) || (t.url && t.url.toLowerCase().includes(s)) || (t.threat && t.threat.toLowerCase().includes(s));
      }
      return true;
    })
    .reverse();

  let rows = filtered.map(t => {
    const info = getThreatLabel(t.threat);
    let hostname = t.url;
    try { hostname = new URL(t.url).hostname; } catch {}

    return `
      <tr class="threat-row" data-index="${t._index}">
        <td>${t.date || "—"}</td>
        <td>${t.time || "—"}</td>
        <td><span class="badge" style="background:${info.color}22;color:${info.color};border:1px solid ${info.color}44;padding:2px 8px;border-radius:3px;font-size:9px;font-weight:bold;letter-spacing:1px;">${info.label}</span></td>
        <td>${hostname}</td>
        <td style="position:relative; max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${t.url}">${t.url}
          <button class="btn-delete-icon" data-index="${t._index}" title="Delete record">🗑</button>
        </td>
      </tr>`;
  }).join("");

  container.innerHTML = `
    <table class="threat-table" id="threat-table">
      <thead>
        <tr>
          <th>Date</th><th>Time</th><th>Type</th><th>Site</th><th>Source URL</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;

  const table = document.getElementById("threat-table");
  table.addEventListener('click', (e) => {
    const row = e.target.closest('.threat-row');
    const deleteBtn = e.target.closest('.btn-delete-icon');

    if (deleteBtn) {
      e.stopPropagation();
      const idx = parseInt(deleteBtn.getAttribute('data-index'), 10);
      const url = allHistory[idx] ? allHistory[idx].url : "Unknown URL";
      showDeleteModal(idx, url);
      return;
    }

    if (row) {
      e.stopPropagation();
      document.querySelectorAll('.threat-row').forEach(r => r.classList.remove('row-selected'));
      row.classList.add('row-selected');
      const idx = parseInt(row.getAttribute('data-index'), 10);
      showSidePanel(idx);
    }
  });

  table.addEventListener('contextmenu', (e) => {
    const row = e.target.closest('.threat-row');
    if (row && typeof contextMenu !== 'undefined' && contextMenu) {
      e.preventDefault();
      contextMenuIndex = parseInt(row.getAttribute('data-index'), 10);
      contextMenu.style.display = 'block';
      
      let x = e.clientX;
      let y = e.clientY;
      const menuWidth = contextMenu.offsetWidth || 150;
      const menuHeight = contextMenu.offsetHeight || 40;
      
      if (x + menuWidth > window.innerWidth) x = window.innerWidth - menuWidth;
      if (y + menuHeight > window.innerHeight) y = window.innerHeight - menuHeight;
      
      contextMenu.style.left = `${x}px`;
      contextMenu.style.top = `${y}px`;
    }
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#side-panel') && !e.target.closest('.modal-card')) {
      document.querySelectorAll('.threat-row').forEach(r => r.classList.remove('row-selected'));
      hideSidePanel();
    }
  });
}

// ── Side Panel Logic ──────────────────────────────────
const sidePanel = document.getElementById('side-panel');
const panelClose = document.getElementById('close-panel');
const panelUrl = document.getElementById('panel-url');
const panelThreat = document.getElementById('panel-threat');
const panelReason = document.getElementById('panel-reason');
const panelCpu = document.getElementById('panel-cpu');
const panelScript = document.getElementById('panel-script');
const panelDateTime = document.getElementById('panel-datetime');

function showSidePanel(idx) {
  const t = allHistory[idx];
  if (!t) return;
  
  if (panelUrl) panelUrl.textContent = t.url || 'Unknown';
  
  if (panelThreat) {
    const info = getThreatLabel(t.threat);
    panelThreat.innerHTML = `<span class="badge" style="background:${info.color}22;color:${info.color};border:1px solid ${info.color}44;padding:4px 10px;border-radius:4px;font-size:11px;">${info.label}</span>`;
  }
  
  if (panelReason) panelReason.textContent = getDetectionReason(t.threat);
  if (panelCpu) {
    panelCpu.innerHTML = renderCpuMeter(t.threat);
    panelCpu.className = '';
  }
  if (panelScript) panelScript.textContent = t.scriptSource || 'Initial Document / Unknown Origin';
  if (panelDateTime) panelDateTime.textContent = `${t.date || '—'}  at  ${t.time || '—'}`;
  
  if (sidePanel) sidePanel.classList.add('open');
}

function getDetectionReason(threatId) {
  if (threatId === 'wasm_detected') return 'Found WebAssembly modules typically used in mining pools.';
  if (threatId === 'high_cpu') return 'Sustained abnormal CPU starvation detected by the extension.';
  if (threatId === 'wasm_binary') return 'Direct execution of raw WASM instruction payload observed.';
  if (threatId === 'background_mining') return 'Hidden background processing matching miner footprints.';
  if (threatId === 'worker_mining') return 'Dedicated Web Worker spawned to solve cryptographic hashes.';
  return 'Heuristics triggered standard cryptojacking behavior parameters.';
}

function getCpuEstimate(threatId) {
  if (threatId === 'high_cpu') return "🔥 90–95% (Critical)";
  if (threatId === 'worker_mining') return "⚠️ 75–90% (High)";
  if (threatId === 'wasm_detected') return "⚠️ 60–75% (Moderate)";
  if (threatId === 'hidden_iframe') return "⚠️ 40–60% (Low–Medium)";
  return "⚠️ 30–50% (Suspicious)";
}

function renderCpuMeter(threatId) {
  const estimate = getCpuEstimate(threatId);
  let percentage = 40;
  let color = '#00ccaa';
  let shadow = 'rgba(0, 204, 170, 0.4)';
  
  if (estimate.includes('Critical')) { percentage = 95; color = '#ff4444'; shadow = 'rgba(255, 68, 68, 0.5)'; }
  else if (estimate.includes('High')) { percentage = 85; color = '#ff5500'; shadow = 'rgba(255, 85, 0, 0.5)'; }
  else if (estimate.includes('Moderate')) { percentage = 65; color = '#ffcc00'; shadow = 'rgba(255, 204, 0, 0.4)'; }
  else if (estimate.includes('Low')) { percentage = 50; color = '#00ff88'; shadow = 'rgba(0, 255, 136, 0.4)'; }

  return `
    <div class="cpu-meter-text">
      <span>${estimate.split(' ')[0]} ${threatId.replace('_', ' ').toUpperCase()}</span>
      <span style="color:${color}; font-weight:bold;">${percentage}%</span>
    </div>
    <div class="cpu-meter-wrapper">
      <div class="cpu-meter-fill" style="width: ${percentage}%; background: ${color}; box-shadow: 0 0 10px ${shadow};"></div>
    </div>
  `;
}

function hideSidePanel() {
  if (sidePanel) sidePanel.classList.remove('open');
}

if (panelClose) {
  panelClose.addEventListener('click', () => {
    document.querySelectorAll('.threat-row').forEach(r => r.classList.remove('row-selected'));
    hideSidePanel();
  });
}

// ── Delete UX UI ──────────────────────────────────────
let pendingDeleteIndex = -1;
const modalOverlay = document.getElementById('delete-modal-overlay');
const modalCancelBtn = document.getElementById('modal-cancel-btn');
const modalDeleteBtn = document.getElementById('modal-delete-btn');
const modalSiteUrl = document.getElementById('modal-site-url');

function showDeleteModal(index, url) {
  pendingDeleteIndex = index;
  modalSiteUrl.textContent = url;
  modalOverlay.classList.add('active');
}

function hideDeleteModal() {
  pendingDeleteIndex = -1;
  modalOverlay.classList.remove('active');
}

if (modalOverlay) {
  modalCancelBtn.addEventListener('click', hideDeleteModal);
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) hideDeleteModal();
  });

  modalDeleteBtn.addEventListener('click', () => {
    if (pendingDeleteIndex > -1) {
      allHistory.splice(pendingDeleteIndex, 1);
      browserAPI.storage.local.set({ threatHistory: allHistory });
      renderStats();
      renderHistory();
      hideDeleteModal();
      showToast("Threat record deleted.");
    }
  });
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
function showToast(message) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  container.appendChild(toast);
  
  void toast.offsetWidth; // trigger reflow
  toast.classList.add('show');
  
  setTimeout(() => {
    toast.classList.remove('show');
    toast.addEventListener('transitionend', () => toast.remove());
  }, 3000);
}

function checkSmartSuggestions() {
  const banner = document.getElementById('suggestion-banner');
  if (!banner) return;
  banner.style.display = 'none';
  
  const domainCounts = {};
  for (const t of allHistory) {
    try {
      const host = new URL(t.url).hostname;
      domainCounts[host] = (domainCounts[host] || 0) + 1;
    } catch(e) {}
  }
  
  for (const [host, count] of Object.entries(domainCounts)) {
    if (count >= 3 && !ignoredSuggestions.has(host) && !blockedSites.includes(host)) {
      banner.style.display = 'flex';
      banner.innerHTML = `
        <div>⚠️ <b>${host}</b> triggered multiple threats (${count} times). Block permanently?</div>
        <div class="banner-actions">
          <button class="btn-banner btn-ignore" data-host="${host}">Ignore</button>
          <button class="btn-banner btn-block-now" data-host="${host}">Block Now</button>
        </div>
      `;
      banner.querySelector('.btn-ignore').addEventListener('click', (e) => {
        ignoredSuggestions.add(e.target.getAttribute('data-host'));
        checkSmartSuggestions();
      });
      banner.querySelector('.btn-block-now').addEventListener('click', (e) => {
        const h = e.target.getAttribute('data-host');
        browserAPI.runtime.sendMessage({ type: "BLOCK", hostname: h });
        if(!blockedSites.includes(h)) blockedSites.push(h);
        browserAPI.storage.local.set({ blockedSites });
        checkSmartSuggestions();
        renderBlocked();
        renderStats();
        showToast("Site permanently blocked.");
      });
      break;
    }
  }
}

function clearHistory() {
  if (confirm("Are you sure you want to clear all threat history? This cannot be undone.")) {
    allHistory = [];
    browserAPI.storage.local.set({ threatHistory: [] });
    renderStats();
    renderHistory();
    showToast("Threat history cleared.");
  }
}

// ── Animation System (Parallax, 3D Tilt, Floating Logo) ──
let mouseX = 0, mouseY = 0;

// Track mouse globally
window.addEventListener('mousemove', (e) => {
  mouseX = (e.clientX / window.innerWidth) - 0.5;
  mouseY = (e.clientY / window.innerHeight) - 0.5;
});

// Elements cache
const tiltables = document.querySelectorAll('.tiltable');

function updateAnimations() {
  // 3D Tilt for Stat Cards
  tiltables.forEach(target => {
    const rx = mouseY * -10;
    const ry = mouseX * 10;
    target.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`;
  });
  requestAnimationFrame(updateAnimations);
}

// Start animation loop
requestAnimationFrame(updateAnimations);

// ── Three.js Background ───────────────────────────────
function initThreeJS() {
  const canvas = document.getElementById('three-canvas');
  if (!canvas || typeof THREE === 'undefined') return;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  renderer.setClearColor(0x000000, 0);

  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.z = 5;

  const geometry = new THREE.PlaneGeometry(25, 25, 32, 32);

  const material = new THREE.ShaderMaterial({
    uniforms: {
      u_time: { value: 0.0 },
      u_mouse: { value: new THREE.Vector2(0, 0) }
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      uniform float u_time;
      uniform vec2 u_mouse;

      void main() {
        vec2 uv = vUv;
        float time = u_time * 0.15;
        
        vec2 p1 = vec2(0.3 + sin(time * 0.4) * 0.4, 0.3 + cos(time * 0.3) * 0.4) + u_mouse * 0.08;
        vec2 p2 = vec2(0.7 + cos(time * 0.3) * 0.4, 0.3 + sin(time * 0.5) * 0.4) - u_mouse * 0.05;
        vec2 p3 = vec2(0.5 + sin(time * 0.5) * 0.4, 0.7 + cos(time * 0.4) * 0.4) + u_mouse * 0.03;
        
        float d1 = distance(uv, p1);
        float d2 = distance(uv, p2);
        float d3 = distance(uv, p3);
        
        float w1 = smoothstep(0.9, 0.0, d1) * 0.12;
        float w2 = smoothstep(0.8, 0.0, d2) * 0.12;
        float w3 = smoothstep(0.95, 0.0, d3) * 0.1;
        
        vec3 c1 = vec3(0.0, 1.0, 0.53); // Neon green
        vec3 c2 = vec3(0.0, 0.86, 1.0); // Cyan
        vec3 c3 = vec3(0.8, 0.0, 1.0);  // Purple
        
        vec3 base = vec3(0.02, 0.02, 0.02);
        
        vec3 finalColor = base + (c1 * w1) + (c2 * w2) + (c3 * w3);
        gl_FragColor = vec4(finalColor, 1.0);
      }
    `,
    transparent: true,
    depthWrite: false
  });

  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const elapsedTime = clock.getElapsedTime();
    material.uniforms.u_time.value = elapsedTime;
    material.uniforms.u_mouse.value.lerp(new THREE.Vector2(mouseX, mouseY), 0.05);
    renderer.render(scene, camera);
  }
  
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  animate();
}

document.addEventListener("DOMContentLoaded", initThreeJS);

// ── Keyboard Shortcuts Logic ──────────────────────────
document.addEventListener('keydown', (e) => {
  const tag = e.target.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
  
  const visibleRows = Array.from(document.querySelectorAll('.threat-row'));
  if (visibleRows.length === 0) return;
  
  const currentIndex = visibleRows.findIndex(r => r.classList.contains('row-selected'));
  if (currentIndex !== -1) {
    keyboardSelectedIndex = parseInt(visibleRows[currentIndex].getAttribute('data-index'), 10);
  }
  
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    let next = currentIndex < visibleRows.length - 1 ? currentIndex + 1 : 0;
    visibleRows.forEach(r => r.classList.remove('row-selected'));
    visibleRows[next].classList.add('row-selected');
    visibleRows[next].scrollIntoView({ block: "nearest" });
    keyboardSelectedIndex = parseInt(visibleRows[next].getAttribute('data-index'), 10);
  }
  else if (e.key === 'ArrowUp') {
    e.preventDefault();
    let prev = currentIndex > 0 ? currentIndex - 1 : visibleRows.length - 1;
    visibleRows.forEach(r => r.classList.remove('row-selected'));
    visibleRows[prev].classList.add('row-selected');
    visibleRows[prev].scrollIntoView({ block: "nearest" });
    keyboardSelectedIndex = parseInt(visibleRows[prev].getAttribute('data-index'), 10);
  }
  else if (e.key === 'Enter') {
    if (currentIndex !== -1) {
      e.preventDefault();
      showSidePanel(keyboardSelectedIndex);
    }
  }
  else if (e.key === 'Delete' || e.key === 'Backspace') {
    if (currentIndex !== -1) {
      e.preventDefault();
      const url = allHistory[keyboardSelectedIndex] ? allHistory[keyboardSelectedIndex].url : "Unknown URL";
      showDeleteModal(keyboardSelectedIndex, url);
    }
  }
});

// ── Context Menu Logic ────────────────────────────────
const contextMenu = document.getElementById('context-menu');
const contextDeleteBtn = document.getElementById('context-delete-btn');
let contextMenuIndex = -1;

function hideContextMenu() {
  if (contextMenu) contextMenu.style.display = 'none';
}

if (contextMenu) {
  document.addEventListener('click', hideContextMenu);
  window.addEventListener('scroll', hideContextMenu);
  if (sidePanel) sidePanel.addEventListener('transitionstart', hideContextMenu);
  
  contextDeleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    hideContextMenu();
    if (contextMenuIndex > -1) {
      const url = allHistory[contextMenuIndex] ? allHistory[contextMenuIndex].url : "Unknown URL";
      showDeleteModal(contextMenuIndex, url);
    }
  });
}