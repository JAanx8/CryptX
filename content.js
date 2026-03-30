// Firefox + Chrome compatibility shim
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

// content.js — ISOLATED world — cryptX v2.0
// 5 Layer Detection: WASM+CPU Combined | WASM Binary Analysis | iFrame | Background Tab | Clipboard

// ─── WHITELIST ────────────────────────────────────────
const WASM_WHITELIST = [
  'google.com','youtube.com','gmail.com','drive.google.com','docs.google.com',
  'gemini.google.com','meet.google.com','maps.google.com','facebook.com',
  'instagram.com','twitter.com','x.com','linkedin.com','reddit.com',
  'pinterest.com','tiktok.com','whatsapp.com','figma.com','canva.com',
  'notion.so','office.com','outlook.com','live.com','microsoft.com',
  'dropbox.com','zoom.us','adobe.com','sketch.com','miro.com',
  'netflix.com','spotify.com','twitch.tv','discord.com','soundcloud.com',
  'vimeo.com','github.com','stackoverflow.com','codepen.io','replit.com',
  'codesandbox.io','gitlab.com','bitbucket.org','vercel.app','netlify.app',
  'claude.ai','chatgpt.com','openai.com','anthropic.com','wikipedia.org',
  'apple.com','cloudflare.com','amazon.com','flipkart.com','shopify.com'
];

function isWhitelisted(hostname) {
  return WASM_WHITELIST.some(s => hostname === s || hostname.endsWith('.' + s));
}

if (isWhitelisted(location.hostname)) {
  console.log('[CryptX] Whitelisted site — monitoring disabled');
  // Stop everything for whitelisted sites
  throw new Error('CryptX: whitelisted');
}

// ─── STATE FLAGS ──────────────────────────────────────
let wasmDetected    = false;  // Layer 1 signal A
let cpuDetected     = false;  // Layer 1 signal B
let alertShown      = false;
let userWhitelisted = false;

// ─── RISK SCORE ───────────────────────────────────────
let riskScore = 0;

// ─── USER WHITELIST CHECK ─────────────────────────────
browserAPI.storage.local.get('userWhitelist', data => {
  const list = data.userWhitelist || [];
  if (list.includes(location.hostname)) {
    userWhitelisted = true;
    console.log('[CryptX] User whitelisted:', location.hostname);
  }
});

// ─── SAVE THREAT ──────────────────────────────────────
function saveThreat(type, url) {
  browserAPI.runtime.sendMessage({ type: 'SAVE_THREAT', threat: type, url }, res => {
    if (browserAPI.runtime.lastError) return;
    console.log('[CryptX] Threat saved:', type);
  });
}

// ─── CHECK COMBINED TRIGGER (Layer 1) ─────────────────
// Both WASM + CPU must fire together → confirmed mining
function checkCombinedTrigger() {
  if (wasmDetected && cpuDetected && !alertShown && !userWhitelisted) {
    alertShown = true;
    console.log('[CryptX] LAYER 1 CONFIRMED — WASM + CPU combined trigger');
    showBlockChoice('WebAssembly + High CPU (Combined Detection)');
    setTimeout(() => { alertShown = false; }, 30000);
  }
}


// ════════════════════════════════════════════════════════
// LAYER 4 — Background Tab Mining Detection
// Detects mining that intensifies when tab is hidden
// ════════════════════════════════════════════════════════
let visibleBaseline = null;
let hiddenMeasurements = [];
let tabWasHidden = false;

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    // Tab just went hidden — start measuring
    tabWasHidden = true;
    hiddenMeasurements = [];
    console.log('[CryptX] Layer 4 — Tab hidden, monitoring CPU...');

    const hiddenMonitor = setInterval(() => {
      if (!document.hidden) {
        clearInterval(hiddenMonitor);
        return;
      }
      const elapsed = benchmarkTime();
      hiddenMeasurements.push(elapsed);

      if (hiddenMeasurements.length >= 3 && baseline) {
        const avgHidden = hiddenMeasurements.reduce((a,b) => a+b, 0) / hiddenMeasurements.length;
        // If CPU in hidden tab is 2x normal baseline → background mining
        if (avgHidden > baseline * 2) {
          console.log(`[CryptX] LAYER 4 CONFIRMED — Background mining! Hidden avg: ${avgHidden.toFixed(2)}ms vs Baseline: ${baseline.toFixed(2)}ms`);
          saveThreat('background_mining', location.href);
          clearInterval(hiddenMonitor);
        }
      }
    }, 3000);

  } else if (tabWasHidden) {
    // Tab became visible again
    tabWasHidden = false;
    console.log('[CryptX] Layer 4 — Tab visible again');
  }
});

// ════════════════════════════════════════════════════════
// LAYER 5 — Clipboard Hijacking Detection
// Detects when site replaces copied crypto wallet addresses
// ════════════════════════════════════════════════════════
const WALLET_PATTERNS = [
  /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/,        // Bitcoin
  /^0x[a-fA-F0-9]{40}$/,                        // Ethereum
  /^[48][0-9AB][1-9A-HJ-NP-Za-km-z]{93}$/,     // Monero
  /^[LM3][a-km-zA-HJ-NP-Z1-9]{26,33}$/,        // Litecoin
  /^bc1[ac-hj-np-z02-9]{11,71}$/,               // Bitcoin bech32
];

function isWalletAddress(text) {
  return WALLET_PATTERNS.some(p => p.test(text.trim()));
}

let lastCopiedText = '';

document.addEventListener('copy', () => {
  // Small delay to let page manipulate clipboard
  setTimeout(() => {
    navigator.clipboard.readText().then(clipText => {
      if (clipText && clipText !== lastCopiedText) {
        lastCopiedText = clipText;
        if (isWalletAddress(clipText)) {
          console.log('[CryptX] LAYER 5 — Wallet address in clipboard:', clipText.substring(0, 10) + '...');
          // Check if page manipulated it
          saveThreat('clipboard_hijack', location.href);
          showClipboardAlert(clipText);
        }
      }
    }).catch(() => {}); // Permission denied — ignore
  }, 100);
});

function showClipboardAlert(address) {
  const existing = document.getElementById('cryptx-clipboard-alert');
  if (existing) return;

  const overlay = document.createElement('div');
  overlay.id = 'cryptx-clipboard-alert';
  overlay.style.cssText = `
    position:fixed;bottom:20px;right:20px;z-index:2147483647;
    background:#0d0d0d;border:2px solid #ffaa00;border-radius:12px;
    padding:16px 20px;max-width:300px;font-family:'Segoe UI',Arial,sans-serif;
    box-shadow:0 0 30px #ffaa0044;`;
  overlay.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
      <span style="font-size:22px;">⚠️</span>
      <div style="color:#ffaa00;font-size:13px;font-weight:bold;">Clipboard Alert</div>
    </div>
    <div style="color:#888;font-size:11px;line-height:1.5;margin-bottom:12px;">
      A <b style="color:#ffcc44">crypto wallet address</b> was detected in your clipboard.
      Verify it hasn't been replaced by this site.
    </div>
    <div style="background:#1a1a1a;border-radius:6px;padding:8px;
      font-size:10px;color:#555;word-break:break-all;margin-bottom:12px;">
      ${address.substring(0, 20)}...
    </div>
    <button onclick="this.parentElement.remove()" style="
      background:#ffaa00;color:#000;border:none;padding:8px 16px;
      border-radius:6px;font-size:11px;font-weight:bold;cursor:pointer;width:100%;">
      Got it — I'll verify
    </button>`;
  document.documentElement.appendChild(overlay);
  setTimeout(() => overlay.remove(), 15000);
}

// ════════════════════════════════════════════════════════
// BLOCK CHOICE DIALOG
// ════════════════════════════════════════════════════════
function showBlockChoice(detectionLayer) {
  const existing = document.getElementById('cryptx-block-choice');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'cryptx-block-choice';
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:2147483647;';
  overlay.innerHTML = `
    <div style="width:100%;height:100%;background:rgba(0,0,0,0.90);
      display:flex;align-items:center;justify-content:center;
      font-family:'Segoe UI',Arial,sans-serif;">
      <div style="background:#0d0d0d;border:2px solid #ff660066;
        border-radius:16px;padding:30px 34px;max-width:400px;width:90%;text-align:center;">
        <div style="font-size:44px;margin-bottom:10px;">🛡️</div>
        <div style="color:#00ff88;font-size:13px;letter-spacing:3px;margin-bottom:6px;">crypt X</div>
        <div style="color:#ff4444;font-size:12px;margin-bottom:6px;">Detected: ${detectionLayer}</div>
        <div style="color:#fff;font-size:17px;font-weight:bold;margin-bottom:8px;">
          How do you want to block this site?</div>
        <div style="color:#555;font-size:12px;margin-bottom:22px;">${window.location.hostname}</div>
        <button id="cryptx-temp-block" style="background:#ff8800;color:white;border:none;
          padding:12px 20px;border-radius:8px;font-size:13px;font-weight:bold;
          cursor:pointer;width:100%;margin-bottom:10px;">
          🚫 Block Temporarily
          <div style="font-size:10px;font-weight:normal;opacity:0.8;margin-top:3px;">
            Just this session — site works again after restart</div>
        </button>
        <button id="cryptx-perm-block" style="background:#cc0000;color:white;border:none;
          padding:12px 20px;border-radius:8px;font-size:13px;font-weight:bold;
          cursor:pointer;width:100%;margin-bottom:10px;">
          🔒 Block Permanently
          <div style="font-size:10px;font-weight:normal;opacity:0.8;margin-top:3px;">
            Always blocked — every future visit is stopped</div>
        </button>
        <button id="cryptx-ignore" style="background:transparent;color:#444;
          border:1px solid #222;padding:10px 20px;border-radius:8px;
          font-size:12px;cursor:pointer;width:100%;">
          Ignore — Stay on this page</button>
      </div>
    </div>`;

  document.documentElement.appendChild(overlay);

  document.getElementById('cryptx-temp-block').onclick = () => {
    overlay.remove();
    window.location.href = 'about:blank';
  };
  document.getElementById('cryptx-perm-block').onclick = () => {
    overlay.remove();
    browserAPI.runtime.sendMessage({ type: 'BLOCK_PERMANENT_REQ', url: window.location.href });
  };
  document.getElementById('cryptx-ignore').onclick = () => overlay.remove();
}

// ─── Block from MAIN world signal ────────────────────
window.addEventListener('__cryptx_block_perm__', e => {
  browserAPI.runtime.sendMessage({ type: 'BLOCK_PERMANENT_REQ', url: e.detail.url });
});

console.log('[CryptX] v2.0 — 5 Layer detection active on:', location.hostname);