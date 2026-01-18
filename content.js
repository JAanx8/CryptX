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
