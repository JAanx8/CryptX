// CryptX — WebAssembly detection (page context injection)

(function injectWasmHook() {
  const script = document.createElement("script");
  script.textContent = `
    (function () {
      const origInstantiate = WebAssembly.instantiate;
      const origCompile = WebAssembly.compile;

      WebAssembly.instantiate = function (...args) {
        window.postMessage({ source: "CryptX", type: "WASM_INSTANTIATE" }, "*");
        return origInstantiate.apply(this, args);
      };

      WebAssembly.compile = function (...args) {
        window.postMessage({ source: "CryptX", type: "WASM_COMPILE" }, "*");
        return origCompile.apply(this, args);
      };
    })();
  `;
  (document.documentElement || document.head).appendChild(script);
  script.remove();
})();

// Listen for WASM events from page context
window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  if (event.data && event.data.source === "CryptX") {
    chrome.runtime.sendMessage({ wasm: true });
  }
});
// CryptX — CPU behavior via Long Task API (heuristic)
if ("PerformanceObserver" in window) {
  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration >= 50) { // long task threshold
          chrome.runtime.sendMessage({ longTask: true });
        }
      }
    });
    observer.observe({ entryTypes: ["longtask"] });
  } catch (e) {
    // ignore
  }
}
// CryptX — Mitigation: block further WebAssembly execution when instructed
let blockWasm = false;

// Listen for mitigation command from background
chrome.runtime.onMessage.addListener((msg) => {
  if (msg && msg.mitigate === true) {
    blockWasm = true;
  }
});

// Inject a blocker into page context
(function injectWasmBlocker() {
  const script = document.createElement("script");
  script.textContent = `
    (function () {
      const origInstantiate = WebAssembly.instantiate;
      const origCompile = WebAssembly.compile;

      WebAssembly.instantiate = function (...args) {
        if (window.__CRYPTX_BLOCK_WASM__) {
          throw new Error("CryptX blocked WebAssembly execution");
        }
        return origInstantiate.apply(this, args);
      };

      WebAssembly.compile = function (...args) {
        if (window.__CRYPTX_BLOCK_WASM__) {
          throw new Error("CryptX blocked WebAssembly execution");
        }
        return origCompile.apply(this, args);
      };

      window.addEventListener("message", (e) => {
        if (e.data && e.data.type === "CRYPTX_BLOCK_WASM") {
          window.__CRYPTX_BLOCK_WASM__ = true;
        }
      });
    })();
  `;
  (document.documentElement || document.head).appendChild(script);
  script.remove();
})();

// Relay mitigation command to page context
chrome.runtime.onMessage.addListener((msg) => {
  if (msg && msg.mitigate === true) {
    window.postMessage({ type: "CRYPTX_BLOCK_WASM" }, "*");
  }
});
