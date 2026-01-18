// =======================================================
// CryptX — Page Context WASM Hook (CSP-safe)
// =======================================================

(function () {
  const origInstantiate = WebAssembly.instantiate;
  const origCompile = WebAssembly.compile;

  // Global flag for mitigation
  window.__CRYPTX_BLOCK_WASM__ = false;

  WebAssembly.instantiate = function (...args) {
    if (window.__CRYPTX_BLOCK_WASM__) {
      throw new Error("CryptX: WebAssembly execution blocked");
    }
    window.postMessage({ source: "CryptX", type: "WASM_DETECTED" }, "*");
    return origInstantiate.apply(this, args);
  };

  WebAssembly.compile = function (...args) {
    if (window.__CRYPTX_BLOCK_WASM__) {
      throw new Error("CryptX: WebAssembly execution blocked");
    }
    window.postMessage({ source: "CryptX", type: "WASM_DETECTED" }, "*");
    return origCompile.apply(this, args);
  };

  // Listen for mitigation command
  window.addEventListener("message", (e) => {
    if (e.data && e.data.type === "CRYPTX_BLOCK_WASM") {
      window.__CRYPTX_BLOCK_WASM__ = true;
    }
  });
})();
