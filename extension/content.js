(() => {
  "use strict";

  const defaults = globalThis.TWITTER_UPGRADE_DEFAULTS;
  let settings;

  const stylesheet = document.createElement("style");
  stylesheet.id = "twitter-upgrade-styles";

  const selectors = {
    hideGrok: [
      'header a[href="/i/grok"]',
      'nav a[href="/i/grok"]',
      'header a[href^="/i/grok?"]',
      'nav a[href^="/i/grok?"]',
      '[data-testid="AppTabBar_Grok_Link"]',
    ].join(", "),
    hidePremium: [
      'a[data-testid="premium-signup-tab"]',
      ...["/i/premium_sign_up", "/i/premium", "/premium"].flatMap(path => [
        `:is(header, nav, [role="menu"]) a[href="${path}"]`,
        `:is(header, nav, [role="menu"]) a[href="${path}/"]`,
        `:is(header, nav, [role="menu"]) a[href^="${path}?"]`,
      ]),
      '[data-twitter-upgrade-hide="hidePremium"]',
    ].join(", "),
    hideCreatorStudio: [
      ':is(header, nav, [role="menu"]) a[href="/i/jf/creators/studio"]',
      ':is(header, nav, [role="menu"]) a[href^="/i/jf/creators/studio?"]',
      ':is(header, nav, [role="menu"]) a[href="/i/jf/creators/studio/"]',
      '[data-twitter-upgrade-hide="hideCreatorStudio"]',
    ].join(", "),
    hideGrokChat: [
      '[data-testid="GrokDrawer"]',
      '[data-testid="GrokDrawerHeader"]',
    ].join(", "),
    hideExplainPost: [
      '[data-testid="tweet"] button[aria-label="Grok actions"]',
      '[data-testid="tweet"] [data-testid="grokActions"]',
      '[data-twitter-upgrade-hide="hideExplainPost"]',
    ].join(", "),
    hideProfileSummary: [
      '[data-testid="UserProfileHeader_Items"] [aria-label="Profile Summary"]',
      '[data-twitter-upgrade-hide="hideProfileSummary"]',
    ].join(", "),
  };

  function publishMediaSetting() {
    if (!settings) return;
    document.dispatchEvent(new CustomEvent("twitter-upgrade:media-setting", {
      detail: settings.defaultPhotos ? "enabled" : "disabled",
    }));
  }
  document.addEventListener("twitter-upgrade:request-setting", publishMediaSetting);

  function featureForControl(control) {
    const labels = [
      control.getAttribute("aria-label"),
      control.getAttribute("title"),
      control.textContent,
    ]
      .filter(Boolean)
      .map(value => value.trim().replace(/\s+/g, " ").toLowerCase());

    if (labels.includes("explain this post")) return "hideExplainPost";
    if (labels.includes("profile summary")) return "hideProfileSummary";
    if (!control.closest('header, nav, [role="menu"]')) return null;
    if (labels.includes("premium")) return "hidePremium";
    if (labels.includes("creator studio")) return "hideCreatorStudio";
    return null;
  }

  function markHiddenControls() {
    if (!document.documentElement) return;
    if (!stylesheet.isConnected) document.documentElement.append(stylesheet);

    const controls = document.querySelectorAll(
      'button, a, div[role="button"], [role="menuitem"], [data-twitter-upgrade-hide]'
    );
    for (const control of controls) {
      const feature = featureForControl(control);
      if (feature) {
        if (control.getAttribute("data-twitter-upgrade-hide") !== feature) {
          control.setAttribute("data-twitter-upgrade-hide", feature);
        }
      } else if (control.hasAttribute("data-twitter-upgrade-hide")) {
        control.removeAttribute("data-twitter-upgrade-hide");
      }
    }
  }

  function applySettings() {
    stylesheet.textContent = Object.entries(selectors)
      .filter(([key]) => settings[key])
      .map(([, selector]) => `${selector} { display: none !important; }`)
      .join("\n");
    markHiddenControls();
    publishMediaSetting();
  }

  let scanScheduled = false;
  const observer = new MutationObserver(() => {
    if (scanScheduled) return;
    scanScheduled = true;
    requestAnimationFrame(() => {
      scanScheduled = false;
      markHiddenControls();
    });
  });
  observer.observe(document, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ["aria-label", "title", "href", "role", "data-testid"]
  });

  const pendingSettings = {};
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    for (const key of Object.keys(defaults)) {
      if (!(key in changes)) continue;
      const newValue = changes[key].newValue;
      pendingSettings[key] = typeof newValue === "boolean" ? newValue : defaults[key];
    }
    if (settings) {
      Object.assign(settings, pendingSettings);
      applySettings();
    }
  });

  chrome.storage.local.get(defaults).then(saved => {
    settings = {};
    for (const [key, fallback] of Object.entries(defaults)) {
      settings[key] = typeof saved[key] === "boolean" ? saved[key] : fallback;
    }
    Object.assign(settings, pendingSettings);
    applySettings();
  }).catch(error => console.error("Twitter Upgrade could not load settings", error));
})();
