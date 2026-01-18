// CryptX — Page context WASM hook (CSP-safe)

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

  // Mitigation support
  window.__CRYPTX_BLOCK_WASM__ = false;

  window.addEventListener("message", (e) => {
    if (e.data && e.data.type === "CRYPTX_BLOCK_WASM") {
      window.__CRYPTX_BLOCK_WASM__ = true;
    }
  });
})();
