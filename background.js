let threats = {};
let blockedSites = [];
let threatHistory = [];
let userWhitelist = [];

// Load on startup
chrome.storage.local.get(["blockedSites", "threatHistory", "userWhitelist"], data => {
  blockedSites = data.blockedSites || [];
  threatHistory = data.threatHistory || [];
  userWhitelist = data.userWhitelist || [];
  console.log("[CryptX] Loaded blocked sites:", blockedSites.length);
  console.log("[CryptX] Loaded history:", threatHistory.length);
  console.log("[CryptX] Loaded whitelist:", userWhitelist.length);
});

// Block permanently blocked sites
try {
  chrome.webNavigation.onBeforeNavigate.addListener(details => {
    if (details.frameId !== 0) return;
    try {
      const hostname = new URL(details.url).hostname;
      if (blockedSites.includes(hostname)) {
        chrome.tabs.update(details.tabId, {
          url: chrome.runtime.getURL("blocked.html") + "?site=" + hostname
        });
      }
    } catch (e) {}
  });
} catch(e) {
  console.log("[CryptX] webNavigation not available:", e.message);
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  sendResponse({ ok: true }); // Immediately respond to close port cleanly
  // Return true only for async handlers to avoid port closed error
  let isAsync = false;
  const tabId = sender.tab?.id;

  // ── SAVE_THREAT ──────────────────────────────────────
  if (msg.type === "SAVE_THREAT" && tabId) {
    isAsync = true;
    if (!threats[tabId]) threats[tabId] = [];

    const now = Date.now();
    const recent = threats[tabId].find(
      t => t.threat === msg.threat && (now - t.timestamp) < 5000
    );

    if (!recent) {
      const date = new Date();
      const dateStr = date.toLocaleDateString();
      const timeStr = date.toLocaleTimeString();

      const record = {
        threat: msg.threat,
        url: msg.url,
        time: timeStr,
        date: dateStr,
        timestamp: now
      };

      threats[tabId].push(record);
      threatHistory.push(record);

      if (threatHistory.length > 500) {
        threatHistory = threatHistory.slice(-500);
      }

      chrome.storage.local.set({ threats, threatHistory }, () => {
        // Badge — show count of threats on tab
        const count = threats[tabId].length;
        chrome.action.setBadgeText({ text: count.toString(), tabId });
        chrome.action.setBadgeBackgroundColor({ color: "#FF0000", tabId });

        // Desktop notification
        const threatLabel = msg.threat === "wasm_detected" ? "WebAssembly Miner"
                          : msg.threat === "high_cpu" ? "High CPU Usage"
                          : msg.threat === "wasm_binary" ? "WASM Binary Mining Code"
                          : msg.threat === "hidden_iframe" ? "Hidden iFrame Mining"
                          : msg.threat === "background_mining" ? "Background Tab Mining"
                          : msg.threat === "clipboard_hijack" ? "Clipboard Hijacking"
                          : msg.threat === "web_worker_mining" ? "Web Worker Mining"
                          : "Miner Script";
        let hostname = msg.url;
        try { hostname = new URL(msg.url).hostname; } catch {}

        chrome.notifications.create({
          type: "basic",
          iconUrl: "icons/icon48.png",
          title: "⚠️ cryptX — Cryptojacking Detected!",
          message: threatLabel + " detected on " + hostname,
          priority: 2
        });

        sendResponse({ success: true });
      });

      return true;
    } else {
      sendResponse({ success: false, reason: "duplicate" });
    }
  }

  // ── GET WHITELIST ────────────────────────────────────
  if (msg.type === "GET_WHITELIST") {
    sendResponse({ whitelist: userWhitelist });
    return true;
  }

  // ── ADD TO WHITELIST ─────────────────────────────────
  if (msg.type === "ADD_WHITELIST") {
    if (!userWhitelist.includes(msg.hostname)) {
      userWhitelist.push(msg.hostname);
      chrome.storage.local.set({ userWhitelist });
    }
    sendResponse({ success: true });
    return true;
  }

  // ── REMOVE FROM WHITELIST ────────────────────────────
  if (msg.type === "REMOVE_WHITELIST") {
    userWhitelist = userWhitelist.filter(s => s !== msg.hostname);
    chrome.storage.local.set({ userWhitelist });
    sendResponse({ success: true });
    return true;
  }

  // ── Permanent block from content overlay ────────────
  if (msg.type === "BLOCK_PERMANENT_REQ" && tabId) {
    try {
      const hostname = new URL(msg.url).hostname;
      if (!blockedSites.includes(hostname)) {
        blockedSites.push(hostname);
        chrome.storage.local.set({ blockedSites });
      }
      chrome.tabs.update(tabId, {
        url: chrome.runtime.getURL("blocked.html") + "?site=" + hostname
      });
    } catch (e) {}
  }

  // ── Permanent block from popup ───────────────────────
  if (msg.type === "BLOCK_PERMANENT") {
    if (!blockedSites.includes(msg.hostname)) {
      blockedSites.push(msg.hostname);
      chrome.storage.local.set({ blockedSites });
    }
    chrome.tabs.update(msg.tabId, {
      url: chrome.runtime.getURL("blocked.html") + "?site=" + msg.hostname
    });
  }

  // ── Unblock ──────────────────────────────────────────
  if (msg.type === "UNBLOCK") {
    blockedSites = blockedSites.filter(s => s !== msg.hostname);
    chrome.storage.local.set({ blockedSites });
  }

  return false;
});

// Clear tab threats on reload
chrome.tabs.onUpdated.addListener((tabId, info) => {
  if (info.status === "loading") {
    delete threats[tabId];
    chrome.action.setBadgeText({ text: "", tabId });
    chrome.storage.local.set({ threats });
  }
});