// CryptX — Popup status + temporary color indicator

const statusEl = document.getElementById("status");
const scoreEl = document.getElementById("score");
const boxEl = document.getElementById("statusBox");

function applyColor(status) {
  let color = "#999";

  if (status === "SAFE") color = "green";
  if (status === "MONITORING") color = "orange";
  if (status === "DETECTED") color = "red";

  boxEl.style.background = color;

  // reset after 60 seconds
  setTimeout(() => {
    boxEl.style.background = "#999";
  }, 60000);
}

// Request current tab status when popup opens
chrome.runtime.sendMessage({ request: "STATUS" });

// Listen for updates from background
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.status) {
    statusEl.textContent = msg.status;
    applyColor(msg.status);
  }
  if (typeof msg.score === "number") {
    scoreEl.textContent = "Score: " + msg.score;
  }
});
