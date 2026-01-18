// CryptX — Background Service Worker
// Heuristic Risk Scoring + Popup Sync + Temporary Icon Change
// Client-side only | No ML | No backend

const tabState = {}; // tabId → state object

// Scoring weights (heuristic, not ML)
const SCORE = {
  WASM: 40,
  LONG_TASK: 30
};

// Status thresholds
const THRESHOLDS = {
  SAFE: 0,
  MONITORING: 40,
  DETECTED: 70
};

// Ensure tab state exists
function ensureTab(tabId) {
  if (!tabState[tabId]) {
    tabState[tabId] = {
      score: 0,
      wasm: false,
      longTaskHits: 0,
      status: "MONITORING"
    };
  }
}

// Decide status based on score
function computeStatus(score) {
  if (score >= THRESHOLDS.DETECTED) return "DETECTED";
  if (score >= THRESHOLDS.MONITORING) return "MONITORING";
  return "SAFE";
}

// Update extension icon temporarily (30–60 sec)
function updateIcon(status) {
  let path = "icons/normal.png";

  if (status === "SAFE") path = "icons/green.png";
  if (status === "MONITORING") path = "icons/yellow.png";
  if (status === "DETECTED") path = "icons/red.png";

  chrome.action.setIcon({ path });

  // Reset icon after 60 seconds
  setTimeout(() => {
    chrome.action.setIcon({ path: "icons/normal.png" });
  }, 60000);
}

// Handle messages from content script & popup
chrome.runtime.onMessage.addListener((msg, sender) => {
  // Popup requesting current status
  if (msg && msg.request === "STATUS" && sender.tab) {
    const tabId = sender.tab.id;
    if (tabState[tabId]) {
      chrome.runtime.sendMessage({
        status: tabState[tabId].status,
        score: tabState[tabId].score
      });
    }
    return;
  }

  // Ignore messages without tab context
  if (!sender.tab) return;

  const tabId = sender.tab.id;
  ensureTab(tabId);

  // WASM detection signal
  if (msg.wasm && !tabState[tabId].wasm) {
    tabState[tabId].wasm = true;
    tabState[tabId].score += SCORE.WASM;
  }

  // CPU long-task signal
  if (msg.longTask) {
    tabState[tabId].longTaskHits += 1;

    // Increase score every 5 long tasks
    if (tabState[tabId].longTaskHits % 5 === 0) {
      tabState[tabId].score += SCORE.LONG_TASK;
    }
  }

  // Recompute status
  const newStatus = computeStatus(tabState[tabId].score);

  // If status changed, notify popup & update icon
  if (newStatus !== tabState[tabId].status) {
    tabState[tabId].status = newStatus;

    chrome.runtime.sendMessage({
      status: newStatus,
      score: tabState[tabId].score
    });

    updateIcon(newStatus);
  }
});

// Cleanup when a tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  delete tabState[tabId];
});
