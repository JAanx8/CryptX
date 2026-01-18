// =======================================================
// CryptX — Content Script
// - WebAssembly execution detection
// - CPU behavior monitoring (Long Task API)
// - Mitigation: block further WASM execution
// Client-side only | Non-ML | MV3 compatible
// =======================================================


// -------------------------------
// 1. Inject WASM detection hooks
// -------------------------------
(function injectWasmHook() {
  const script = document.createElement("script");
  script.textContent = `
    (function () {
      const origInstantiate = WebAssembly.instantiate;
      const origCompile = WebAssembly.compile;

      WebAssembly.instantiate = function (...args) {
        window.postMessage({ source: "CryptX", type: "WASM_DETECTED" }, "*");
        return origInstantiate.apply(this, args);
      };

      WebAssembly.compile = function (...args) {
        window.postMessage({ source: "CryptX", type: "WASM_DETECTED" }, "*");
        return origCompile.apply(this, args);
      };
    })();
  `;
  (document.documentElement || document.head).appendChild(script);
  script.remove();
})();


// ------------------------------------------------
// 2. Receive WASM signals from page → background
// ------------------------------------------------
window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  if (event.data && event.data.source === "CryptX" && event.data.type === "WASM_DETECTED") {
    chrome.runtime.sendMessage({ wasm: true });
  }
});


// ---------------------------------------
// 3. CPU behavior monitoring (Long Tasks)
// ---------------------------------------
if ("PerformanceObserver" in window) {
  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration >= 50) { // heuristic long-task threshold
          chrome.runtime.sendMessage({ longTask: true });
        }
      }
    });

    observer.observe({ entryTypes: ["longtask"] });
  } catch (e) {
    // Silently ignore if unsupported
  }
}


// ------------------------------------------------------
// 4. Mitigation: Block further WebAssembly execution
// ------------------------------------------------------
(function injectWasmBlocker() {
  const script = document.createElement("script");
  script.textContent = `
    (function () {
      const origInstantiate = WebAssembly.instantiate;
      const origCompile = WebAssembly.compile;

      window.__CRYPTX_BLOCK_WASM__ = false;

      WebAssembly.instantiate = function (...args) {
        if (window.__CRYPTX_BLOCK_WASM__) {
          throw new Error("CryptX: WebAssembly execution blocked");
        }
        return origInstantiate.apply(this, args);
      };

      WebAssembly.compile = function (...args) {
        if (window.__CRYPTX_BLOCK_WASM__) {
          throw new Error("CryptX: WebAssembly execution blocked");
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


// ------------------------------------------------
// 5. Receive mitigation command from background
// ------------------------------------------------
chrome.runtime.onMessage.addListener((msg) => {
  if (msg && msg.mitigate === true) {
    window.postMessage({ type: "CRYPTX_BLOCK_WASM" }, "*");
  }
});
