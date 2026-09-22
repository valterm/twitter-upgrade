(() => {
  "use strict";

  const installationMarker = Symbol.for("twitter-upgrade.media.installed");
  if (window[installationMarker]) return;
  window[installationMarker] = true;

  const supportedHosts = new Set([
    "x.com", "www.x.com", "twitter.com", "www.twitter.com", "mobile.twitter.com"
  ]);
  const reservedRoutes = new Set([
    "i", "home", "explore", "search", "notifications", "messages",
    "settings", "compose", "intent", "login", "logout", "signup"
  ]);

  function profileMediaPath(url) {
    if (url.protocol !== "https:" || !supportedHosts.has(url.hostname)) return null;
    const match = /^\/([a-zA-Z0-9_]{1,15})\/media\/?$/.exec(url.pathname);
    if (!match || reservedRoutes.has(match[1].toLowerCase())) return null;
    return `/${match[1].toLowerCase()}/media`;
  }

  let enabled = false;
  let previousUrl = new URL(location.href);
  const replaceState = history.replaceState;
  let navigationVersion = 0;

  function defaultToPhotos(applyOnCurrentPage) {
    const current = new URL(location.href);
    const path = profileMediaPath(current);
    const profileChanged =
      current.origin !== previousUrl.origin || path !== profileMediaPath(previousUrl);
    previousUrl = current;

    if (!enabled || !path) return;
    if (!applyOnCurrentPage && !profileChanged) return;
    if (current.searchParams.has("filter")) return;
    current.searchParams.set("filter", "photo");

    Reflect.apply(replaceState, history, [history.state, "", current.href]);
    previousUrl = current;
    const queuedVersion = ++navigationVersion;

    queueMicrotask(() => {
      if (queuedVersion !== navigationVersion || location.href !== current.href) return;
      window.dispatchEvent(new PopStateEvent("popstate", {
        state: history.state
      }));
    });
  }

  for (const method of ["pushState", "replaceState"]) {
    const original = history[method];
    history[method] = function(...args) {
      const result = Reflect.apply(original, this, args);
      navigationVersion++;
      defaultToPhotos(false);
      return result;
    };
  }

  window.addEventListener("popstate", () => {
    navigationVersion++;
    defaultToPhotos(true);
  });
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) {
      defaultToPhotos(true);
    }
  });
  document.addEventListener("twitter-upgrade:media-setting", (event) => {
    const nextEnabled = event.detail === "enabled";
    const wasJustEnabled = nextEnabled && !enabled;
    enabled = nextEnabled;
    navigationVersion++;
    if (wasJustEnabled) defaultToPhotos(true);
  });
  document.dispatchEvent(new Event("twitter-upgrade:request-setting"));
})();
