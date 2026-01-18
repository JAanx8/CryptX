// CryptX — Heuristic Risk Scoring (non-ML)

const tabState = {}; // tabId -> state

const SCORE = {
  WASM: 40,
  LONG_TASK: 30
};

const THRESHOLDS = {
  SAFE: 0,
  MONITORING: 40,
  DETECTED: 70
};

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

function recomputeStatus(tabId) {
  const s = tabState[tabId].score;
  if (s >= THRESHOLDS.DETECTED) return "DETECTED";
  if (s >= THRESHOLDS.MONITORING) return "MONITORING";
  return "SAFE";
}

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (!sender.tab) return;
  const tabId = sender.tab.id;
  ensureTab(tabId);

  if (msg.wasm && !tabState[tabId].wasm) {
    tabState[tabId].wasm = true;
    tabState[tabId].score += SCORE.WASM;
  }

  if (msg.longTask) {
    tabState[tabId].longTaskHits += 1;
    // add score only after repeated long tasks
    if (tabState[tabId].longTaskHits % 5 === 0) {
      tabState[tabId].score += SCORE.LONG_TASK;
    }
  }

  const newStatus = recomputeStatus(tabId);
  if (newStatus !== tabState[tabId].status) {
    tabState[tabId].status = newStatus;
    console.log("[CryptX]", "Tab", tabId, "status:", newStatus, "score:", tabState[tabId].score);
    chrome.runtime.sendMessage({
      status: newStatus,
      score: tabState[tabId].score
    });
  }
});

// Cleanup when tab closes
chrome.tabs.onRemoved.addListener((tabId) => {
  delete tabState[tabId];
});
