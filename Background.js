// CryptX — CPU behavior monitoring (long tasks proxy)

let cpuFlaggedTabs = new Set();

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg && msg.wasm && sender.tab) {
    // mark tab as WASM-active (used later for scoring)
    cpuFlaggedTabs.add(sender.tab.id);
  }
});

// Observe long tasks via PerformanceObserver (runs in SW via alarms/messages)
chrome.runtime.onInstalled.addListener(() => {
  console.log("[CryptX] Background initialized");
});

// Receive long-task reports from content script
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg && msg.longTask && sender.tab) {
    console.log("[CryptX] Long task detected on tab", sender.tab.id);
  }
});
