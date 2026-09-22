"use strict";

const defaults = globalThis.TWITTER_UPGRADE_DEFAULTS;
const status = document.getElementById("status");
const controls = Object.keys(defaults).map(key => document.getElementById(key));

async function saveControl(control) {
  control.disabled = true;
  try {
    await chrome.storage.local.set({
      [control.id]: control.checked
    });
    status.textContent = "";
  } catch {
    control.checked = !control.checked;
    status.textContent = "Could not save this change. Please try again.";
  } finally {
    control.disabled = false;
  }
}

chrome.storage.local.get(defaults).then(settings => {
  for (const control of controls) {
    const savedValue = settings[control.id];
    control.checked = typeof savedValue === "boolean" ? savedValue : defaults[control.id];
    control.disabled = false;
    control.addEventListener("change", () => saveControl(control));
  }
  status.textContent = "";
}).catch(() => {
  status.textContent = "Could not load settings. Please reopen the popup.";
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  for (const control of controls) {
    if (control.id in changes) {
      control.checked = changes[control.id].newValue ?? defaults[control.id];
    }
  }
});
