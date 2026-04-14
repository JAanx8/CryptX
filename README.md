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

## 🚀 Recent Updates

- 🔍 Added search and filter system in threat history
- 🎯 Improved history page UI and layout
- ⚠️ Smart threat suggestions for repeated attacks
- 🧾 Enhanced delete interaction with better UX
- 🎨 Improved dropdown styling with dark theme and glow effects

---

## File Structure
