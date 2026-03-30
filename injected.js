// ─── Runs in MAIN world — can intercept WebAssembly ───
const originalInstantiate = WebAssembly.instantiate;
const originalCompile = WebAssembly.compile;
const originalInstantiateStreaming = WebAssembly.instantiateStreaming;

let wasmBlocked = false;
let wasmAlertShown = false;

function handleWasmDetection(source) {
  console.log("[CryptX] WebAssembly intercepted: " + source);

  // Dispatch custom event to content script isolated world
  window.dispatchEvent(new CustomEvent("cryptx_wasm_detected", {
    detail: { source: source, url: location.href }
  }));

  if (!wasmAlertShown) {
    wasmAlertShown = true;
    showWasmAlert(source);
  }
  return wasmBlocked;
}

Object.defineProperty(WebAssembly, 'instantiate', {
  configurable: true, writable: true,
  value: function(bufferSource, importObject) {
    if (handleWasmDetection("WebAssembly.instantiate"))
      return Promise.reject(new Error("[CryptX] WebAssembly blocked"));
    return originalInstantiate.apply(this, arguments);
  }
});

Object.defineProperty(WebAssembly, 'compile', {
  configurable: true, writable: true,
  value: function(bufferSource) {
    if (handleWasmDetection("WebAssembly.compile"))
      return Promise.reject(new Error("[CryptX] WebAssembly blocked"));
    return originalCompile.apply(this, arguments);
  }
});

Object.defineProperty(WebAssembly, 'instantiateStreaming', {
  configurable: true, writable: true,
  value: function(source, importObject) {
    if (handleWasmDetection("WebAssembly.instantiateStreaming"))
      return Promise.reject(new Error("[CryptX] WebAssembly blocked"));
    return originalInstantiateStreaming.apply(this, arguments);
  }
});

function showWasmAlert(source) {
  const existing = document.getElementById("cryptx-wasm-alert");
  if (existing) existing.remove();

  const overlay = document.createElement("div");
  overlay.id = "cryptx-wasm-alert";
  overlay.innerHTML = `
    <div style="position:fixed;top:0;left:0;width:100%;height:100%;
      background:rgba(0,0,0,0.85);z-index:2147483647;
      display:flex;align-items:center;justify-content:center;
      font-family:'Segoe UI',Arial,sans-serif;">
      <div style="background:#0d0d0d;border:2px solid #ff4444;
        border-radius:16px;padding:32px 36px;max-width:420px;
        width:90%;text-align:center;box-shadow:0 0 40px #ff444444;">
        <div style="font-size:52px;margin-bottom:12px;">⛔</div>
        <div style="color:#00ff88;font-size:13px;letter-spacing:3px;margin-bottom:8px;">crypt X</div>
        <div style="color:#ff4444;font-size:20px;font-weight:bold;margin-bottom:10px;">
          WebAssembly Miner Detected!</div>
        <div style="color:#555;font-size:10px;letter-spacing:1px;margin-bottom:16px;">
          PRIMARY DETECTION — BEHAVIOUR BASED</div>
        <div style="color:#888;font-size:12px;margin-bottom:20px;line-height:1.6;">
          This page tried to run a <b style="color:#ff8888">WebAssembly module</b>
          commonly used for crypto mining without your consent.
        </div>
        <button id="cryptx-block-wasm" style="background:#ff4444;color:white;border:none;
          padding:11px 22px;border-radius:8px;font-size:13px;font-weight:bold;
          cursor:pointer;width:100%;margin-bottom:8px;">
          ❌ Block WebAssembly Execution</button>
        <button id="cryptx-allow-wasm" style="background:#1a1a1a;color:#888;border:1px solid #333;
          padding:11px 22px;border-radius:8px;font-size:13px;cursor:pointer;width:100%;">
          ✅ Allow (I trust this site)</button>
      </div>
    </div>`;

  document.documentElement.appendChild(overlay);

  document.getElementById("cryptx-block-wasm").onclick = () => {
    wasmBlocked = true;
    overlay.remove();
    window.dispatchEvent(new CustomEvent("cryptx_show_block_choice", {
      detail: { layer: "WebAssembly Execution" }
    }));
  };
  document.getElementById("cryptx-allow-wasm").onclick = () => {
    wasmBlocked = false;
    wasmAlertShown = false;
    overlay.remove();
  };
}