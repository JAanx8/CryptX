// wasm_intercept.js — MAIN world
// Intercepts: WebAssembly API + Web Worker Constructor
(function() {

  // ══════════════════════════════════════════════════
  // LAYER 1 — WebAssembly API Interception
  // ══════════════════════════════════════════════════
  const _instantiate          = WebAssembly.instantiate;
  const _compile              = WebAssembly.compile;
  const _instantiateStreaming = WebAssembly.instantiateStreaming;

  function notifyWasm(source) {
    console.log('[CryptX] WebAssembly intercepted:', source);
    window.dispatchEvent(new CustomEvent('__cryptx_wasm__', {
      detail: { source, url: location.href }
    }));
  }

  WebAssembly.instantiate = function() {
    notifyWasm('WebAssembly.instantiate');
    return _instantiate.apply(this, arguments);
  };
  WebAssembly.compile = function() {
    notifyWasm('WebAssembly.compile');
    return _compile.apply(this, arguments);
  };
  WebAssembly.instantiateStreaming = function() {
    notifyWasm('WebAssembly.instantiateStreaming');
    return _instantiateStreaming.apply(this, arguments);
  };

  // ══════════════════════════════════════════════════
  // WEB WORKER DETECTION — Option A
  // Override Worker constructor before page scripts run
  // ══════════════════════════════════════════════════
  const WORKER_MINER_PATTERNS = [
    'coinhive','cryptonight','coinimp','cryptoloot',
    'minero','authedmine','deepminer','miner.start',
    'hashrate','stratum','monero','cn_hash',
    'cryptonight_hash','job_id'
  ];

  function isMinerUrl(url) {
    const lower = url.toLowerCase();
    return WORKER_MINER_PATTERNS.some(p => lower.includes(p));
  }

  function notifyWorker(url, type) {
    console.log('[CryptX] Worker detected — type:' + type + ' url:' + url);
    window.dispatchEvent(new CustomEvent('__cryptx_worker__', {
      detail: { url, type, pageUrl: location.href }
    }));
  }

  const _Worker = window.Worker;
  if (_Worker) {
    window.Worker = function(scriptUrl, options) {
      const urlStr = typeof scriptUrl === 'string' ? scriptUrl : String(scriptUrl);
      console.log('[CryptX] Worker constructor called:', urlStr);

      // Check 1 — URL pattern match
      if (isMinerUrl(urlStr)) {
        notifyWorker(urlStr, 'miner_url');
      }

      // Check 2 — Blob worker (used to hide miner code)
      if (urlStr.startsWith('blob:')) {
        console.log('[CryptX] Blob worker detected');
        notifyWorker(urlStr, 'blob_worker');
      }

      // Create real worker
      const workerInstance = new _Worker(scriptUrl, options);

      // Check 3 — Intercept postMessage mining commands
      const _postMessage = workerInstance.postMessage.bind(workerInstance);
      workerInstance.postMessage = function(msg) {
        if (msg && typeof msg === 'object') {
          const msgStr = JSON.stringify(msg).toLowerCase();
          if (msgStr.includes('mining') || msgStr.includes('job') ||
              msgStr.includes('hash')   || msgStr.includes('nonce') ||
              msgStr.includes('stratum')) {
            console.log('[CryptX] Worker postMessage mining command');
            notifyWorker(urlStr, 'mining_command');
          }
        }
        return _postMessage(msg);
      };

      // Check 4 — Fetch and inspect worker script
      if (!urlStr.startsWith('blob:')) {
        fetch(urlStr)
          .then(r => r.text())
          .then(code => {
            const lower = code.toLowerCase();
            const hits = WORKER_MINER_PATTERNS.filter(p => lower.includes(p));
            if (hits.length >= 2) {
              console.log('[CryptX] Worker script mining code found: ' + hits.join(', '));
              notifyWorker(urlStr, 'script_content');
            }
          })
          .catch(() => {});
      }

      return workerInstance;
    };
    window.Worker.prototype = _Worker.prototype;
    console.log('[CryptX] Worker constructor overridden');
  }

  // Also intercept SharedWorker
  const _SharedWorker = window.SharedWorker;
  if (_SharedWorker) {
    window.SharedWorker = function(scriptUrl, options) {
      const urlStr = typeof scriptUrl === 'string' ? scriptUrl : String(scriptUrl);
      console.log('[CryptX] SharedWorker created:', urlStr);
      if (isMinerUrl(urlStr)) notifyWorker(urlStr, 'shared_worker_miner');
      return new _SharedWorker(scriptUrl, options);
    };
    window.SharedWorker.prototype = _SharedWorker.prototype;
  }

  console.log('[CryptX] MAIN world — WASM + Worker interception active');
})();
