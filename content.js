// =======================================================
// CryptX — Content Script
// =======================================================


// -------------------------------------------------------
// 1. Inject external WASM hook (CSP-safe)
// -------------------------------------------------------
const script = document.createElement("script");
script.src = chrome.runtime.getURL("wasm-hook.js");
script.type = "text/javascript";
(document.documentElement || document.head).appendChild(script);
script.remove();


// -------------------------------------------------------
// 2. Receive WASM detection from page → background
// -------------------------------------------------------
window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  if (event.data && event.data.source === "CryptX" && event.data.type === "WASM_DETECTED") {
    chrome.runtime.sendMessage({ wasm: true });
  }
});


// -------------------------------------------------------
// 3. CPU behavior monitoring (Long Task API)
// -------------------------------------------------------
if ("PerformanceObserver" in window) {
  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration >= 50) {
          chrome.runtime.sendMessage({ longTask: true });
        }
      }
    });
    observer.observe({ entryTypes: ["longtask"] });
  } catch (e) {
    // Ignore if unsupported
  }
}


// -------------------------------------------------------
// 4. Receive mitigation command → page context
// -------------------------------------------------------
chrome.runtime.onMessage.addListener((msg) => {
  if (msg && msg.mitigate === true) {
    window.postMessage({ type: "CRYPTX_BLOCK_WASM" }, "*");
  }
});
