// Get site from URL parameter
const params = new URLSearchParams(window.location.search);
const site = params.get("site") || "";

// Show site name
const siteNameEl = document.getElementById("site-name");
if (site) {
  siteNameEl.textContent = "🔒 " + site;
} else {
  siteNameEl.textContent = "Unknown site";
}

// Go Back button
document.getElementById("back-btn").addEventListener("click", () => {
  window.history.back();
});

// Unblock button
document.getElementById("unblock-btn").addEventListener("click", () => {
  if (!site) {
    window.history.back();
    return;
  }
  if (confirm("Are you sure you want to unblock " + site + "?\n\nThis site will be accessible again.")) {
    chrome.runtime.sendMessage({ type: "UNBLOCK", hostname: site }, () => {
      window.history.back();
    });
  }
});