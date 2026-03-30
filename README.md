# CryptX — Cryptojacking Detection Extension

> A Chrome Extension (MV3) that detects and blocks cryptojacking in real-time using behavior-based analysis across 5 detection layers.

![Version](https://img.shields.io/badge/version-2.0-blueviolet)
![Manifest](https://img.shields.io/badge/manifest-v3-blue)
![Browser](https://img.shields.io/badge/browser-Chrome%20%7C%20Firefox%20%7C%20Android-orange)
![Published](https://img.shields.io/badge/published-IRJMETS%20Vol.8-green)

---

## What is Cryptojacking?

Cryptojacking is the unauthorized use of a victim's device to mine cryptocurrency. It silently runs in the browser — draining CPU, slowing your system, and increasing power consumption — all without your knowledge.

CryptX detects and blocks it before it can cause damage.

---

## Detection Layers

| Layer | Method | What it catches |
|-------|--------|----------------|
| 1 | WASM + CPU Gate | High CPU usage triggered by WebAssembly execution |
| 2 | WASM Binary Analysis | Suspicious opcodes in `.wasm` files (loop-heavy mining patterns) |
| 3 | Background Tab Mining | Mining that activates when the tab is hidden |
| 4 | Clipboard Hijacking | Crypto wallet address replacement via clipboard API |
| 5 | Web Worker Mining | Off-thread mining using Web Workers |

---

## Features

- Real-time detection and blocking
- Threat history log with timestamps
- Dark / Light mode UI
- Cross-browser: Chrome, Firefox, Android
- Built on Manifest V3 (latest Chrome extension standard)
- Zero external dependencies

---

## File Structure

```
CryptX/
├── manifest.json         # MV3 extension config
├── background.js         # Service worker — core detection engine
├── content.js            # Page-level script injection
├── injected.js           # WASM intercept injection
├── wasm_intercept.js     # WebAssembly API hooking
├── popup.html/js         # Extension popup UI
├── blocked.html/js       # Block page shown on detection
├── history.html/js       # Threat history log
└── icons/                # Extension icons (16, 32, 48, 128px)
```

---

## Installation (Developer Mode)

1. Clone this repo:
   ```bash
   git clone https://github.com/JAanx8/CryptX.git
   ```
2. Open Chrome → `chrome://extensions/`
3. Enable **Developer Mode** (top right toggle)
4. Click **Load unpacked** → select the `CryptX` folder
5. Extension is active!

---

## Research Paper

This project was published in:

**IRJMETS — International Research Journal of Modernization in Engineering, Technology and Science**
Volume 8 | DOI: [10.56726/IRJMETS90927](https://www.doi.org/10.56726/IRJMETS90927)

Presented at **ICAC 2026** — Bharathiar University, Coimbatore.

---

## Author

**Janani Priya S**
B.Sc. Computer Science (Cybersecurity) — Dr. N.G.P Arts and Science College, Coimbatore

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-blue)](https://www.linkedin.com/in/janani-priya-s-0a885235b)
[![GitHub](https://img.shields.io/badge/GitHub-JAanx8-black)](https://github.com/JAanx8)

---

## License

This project is open source and available under the [MIT License](LICENSE).
