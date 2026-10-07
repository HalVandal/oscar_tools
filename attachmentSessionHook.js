/*
 * Copyright (c) 2025 Steve
 * This work is licensed under a Creative Commons Attribution 4.0 International License.
 * See LICENSE file or https://creativecommons.org/licenses/by/4.0/
 */

// Injected by background.js into the page's own JS world as the page commits, so it is in place
// before the Angular app boots. The kaiemr API needs the Authorization header the app adds,
// which Chrome hides from extensions, so note it as the app sends it. Read-only: requests
// are passed through untouched. attachmentChecker.js asks for it via a DOM event.

(function () {
  if (window.__oscarApiHook) return;
  window.__oscarApiHook = true;
  console.info('[Oscar Tools] Document checker session hook active');

  const state = { auth: null, listUrl: null };

  function record(url, method, name, value) {
    try {
      if (!/^authorization$/i.test(name)) return;
      const abs = new URL(url, location.href).href;
      if (!/\/kaiemr\/api\//.test(abs)) return;
      state.auth = value;
      if (/\/attachment-manager\/printable\?/.test(abs) && /^get$/i.test(method || 'GET')) {
        state.listUrl = abs;
      }
    } catch (e) { /* never interfere with the app */ }
  }

  const origOpen = XMLHttpRequest.prototype.open;
  const origSetHeader = XMLHttpRequest.prototype.setRequestHeader;
  XMLHttpRequest.prototype.open = function (method, url) {
    this.__oscarMethod = method;
    this.__oscarUrl = url;
    return origOpen.apply(this, arguments);
  };
  XMLHttpRequest.prototype.setRequestHeader = function (name, value) {
    record(this.__oscarUrl, this.__oscarMethod, name, value);
    return origSetHeader.apply(this, arguments);
  };

  const origFetch = window.fetch;
  window.fetch = function (input, init) {
    try {
      const url = typeof input === 'string' ? input : (input && input.url) || String(input);
      const method = (init && init.method) || (input && input.method) || 'GET';
      const headers = new Headers((init && init.headers) || (input && input.headers) || undefined);
      const auth = headers.get('Authorization');
      if (auth) record(url, method, 'Authorization', auth);
    } catch (e) { /* never interfere with the app */ }
    return origFetch.apply(this, arguments);
  };

  // Objects can't cross from the page world to the extension world, so reply with a JSON string
  document.addEventListener('oscar-attach-get-session', function () {
    document.dispatchEvent(new CustomEvent('oscar-attach-session', { detail: JSON.stringify(state) }));
  });
})();
