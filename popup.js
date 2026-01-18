// CryptX — Popup status updater

const statusEl = document.getElementById("status");
const scoreEl = document.getElementById("score");

// Ask background for latest status
chrome.runtime.sendMessage({ request: "STATUS" });

// Listen for updates
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.status) {
    statusEl.textContent = msg.status;
  }
  if (typeof msg.score === "number") {
    scoreEl.textContent = "Score: " + msg.score;
  }
});
