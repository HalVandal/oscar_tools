/*
 * Copyright (c) 2025 Steve
 * This work is licensed under a Creative Commons Attribution 4.0 International License.
 * See LICENSE file or https://creativecommons.org/licenses/by/4.0/
 */

// Attachment Manager troubleshooter.
// One bad PDF breaks the combined Print with no hint which file it was:
//   - password-protected PDF  -> Print returns 200 with a 0-byte PDF
//   - encrypted (owner-password/permissions) PDF -> Print returns 500
//     ("PDF contains an encryption dictionary" in the server log), preview still works
// "Check Documents" sends each Document to the same print endpoint the PRINT button uses,
// one per request, and flags any that fail. Responses are only inspected in memory, never saved.
// Injected by background.js on /kaiemr/#/attachment-manager.

(function () {
  if (window.__oscarAttachmentChecker) return; // already injected into this page
  window.__oscarAttachmentChecker = true;
  console.info('[Oscar Tools] Attachment Manager document checker loaded');

  const BTN_ID = 'oscar-attach-check-btn';
  const PANEL_ID = 'oscar-attach-check-panel';
  const FLAG_CLASS = 'oscar-attach-flagged';
  const CONCURRENCY = 3;
  const REQUEST_TIMEOUT_MS = 60000;
  const DATE_RE = /\d{4}-\d{2}-\d{2}/g;
  const HAS_DATE = /\d{4}-\d{2}-\d{2}/;

  let running = false;
  let stopRequested = false;
  let controllers = [];

  function injectStyles() {
    if (document.getElementById('oscar-attach-check-styles')) return;
    const st = document.createElement('style');
    st.id = 'oscar-attach-check-styles';
    st.textContent = `
      .${FLAG_CLASS}{outline:2px solid #d32f2f !important;outline-offset:-2px;background:#fdecea !important;}
      #${PANEL_ID}{position:fixed;right:20px;bottom:20px;width:440px;max-height:60vh;display:flex;flex-direction:column;
        background:#fff;border:1px solid #ccc;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.2);z-index:100000;
        font-family:Arial,sans-serif;font-size:13px;color:#222;}
      #${PANEL_ID} .oac-head{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;
        background:#1e6f5c;color:#fff;border-radius:8px 8px 0 0;font-weight:bold;}
      #${PANEL_ID} .oac-head button{background:transparent;border:0;color:#fff;font-size:18px;cursor:pointer;line-height:1;}
      #${PANEL_ID} .oac-status{padding:10px 12px;border-bottom:1px solid #eee;}
      #${PANEL_ID} .oac-bar{height:6px;background:#eee;border-radius:3px;margin-top:6px;overflow:hidden;}
      #${PANEL_ID} .oac-bar > div{height:100%;width:0;background:#1e6f5c;transition:width .2s;}
      #${PANEL_ID} .oac-list{overflow:auto;padding:4px 0;}
      #${PANEL_ID} .oac-item{padding:6px 12px;cursor:pointer;border-bottom:1px solid #f3f3f3;}
      #${PANEL_ID} .oac-item:hover{background:#f6f6f6;}
      #${PANEL_ID} .oac-item .oac-reason{color:#d32f2f;font-size:12px;}
      #${PANEL_ID} .oac-item.oac-warn .oac-reason{color:#b26a00;}
      #${PANEL_ID} .oac-item .oac-id{color:#888;font-size:11px;}
      #${PANEL_ID} .oac-actions{padding:8px 12px;border-top:1px solid #eee;display:flex;gap:8px;}
      #${PANEL_ID} .oac-actions button{padding:5px 10px;border:1px solid #1e6f5c;background:#fff;color:#1e6f5c;
        border-radius:4px;cursor:pointer;font-weight:bold;}
      #${BTN_ID}.oac-inline{margin-left:12px;padding:0 14px;height:36px;background:#1f7a63;color:#fff;border:0;
        border-radius:4px;font-family:inherit;font-size:14px;font-weight:bold;cursor:pointer;vertical-align:middle;}
      #${BTN_ID}.oac-inline:hover{filter:brightness(1.1);}
      #${BTN_ID}.oac-fallback{position:fixed;top:12px;right:120px;z-index:100000;padding:8px 14px;background:#1e6f5c;
        color:#fff;border:0;border-radius:4px;font-weight:bold;cursor:pointer;}
    `;
    document.head.appendChild(st);
  }

  // ---------- Page helpers ----------

  function findButtonByText(re) {
    return Array.from(document.querySelectorAll('button, a, [role="button"]'))
      .find(el => re.test((el.innerText || '').trim()));
  }

  // Walk up from the eye icon to the row: the first ancestor that contains a date
  // plus some other text (the document name). Stopping at "date only" would give us
  // just the right-hand date/eye cell.
  function getRowForIcon(icon) {
    let el = icon.parentElement;
    while (el && el !== document.body) {
      const text = (el.innerText || '');
      if (HAS_DATE.test(text) && text.replace(DATE_RE, '').trim().length > 0) return el;
      el = el.parentElement;
    }
    return icon.parentElement;
  }

  function getRowName(row) {
    const text = (row.innerText || '').replace(DATE_RE, '').trim();
    return text.split('\n').map(s => s.trim()).filter(Boolean)[0] || '';
  }

  function isRowSelected(row) {
    const cb = row.querySelector('input[type="checkbox"], [role="checkbox"]');
    if (!cb) return false;
    return cb.checked === true || cb.getAttribute('aria-checked') === 'true';
  }

  // Rows in the Documents section, keyed by trimmed name, so API results can be
  // highlighted on the page and so ticked rows can limit the check.
  function collectDocumentRows() {
    const container = document.querySelector('[data-pendo-id="category-Document"]');
    const byName = new Map();
    if (!container) return byName;
    container.querySelectorAll('i.fa-eye').forEach(icon => {
      const row = getRowForIcon(icon);
      const name = getRowName(row);
      if (!byName.has(name)) byName.set(name, []);
      byName.get(name).push(row);
    });
    return byName;
  }

  function getCookie(name) {
    const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : null;
  }

  // The page's own attachment-list request has the patient/provider numbers in it.
  function findListUrlInPage() {
    const entries = performance.getEntriesByType('resource')
      .map(e => e.name)
      .filter(n => /\/attachment-manager\/printable\?/.test(n));
    return entries.length ? entries[entries.length - 1] : null;
  }

  // Authorization header + list URL noted by attachmentSessionHook.js from the page's own API calls
  function getSession() {
    return new Promise(resolve => {
      const timer = setTimeout(() => {
        document.removeEventListener('oscar-attach-session', onReply);
        resolve({}); // hook not present - page was open before the extension was (re)loaded
      }, 1000);
      function onReply(e) {
        clearTimeout(timer);
        document.removeEventListener('oscar-attach-session', onReply);
        try { resolve(JSON.parse(e.detail) || {}); } catch (err) { resolve({}); }
      }
      document.addEventListener('oscar-attach-session', onReply);
      document.dispatchEvent(new CustomEvent('oscar-attach-get-session'));
    });
  }

  function apiHeaders(auth) {
    const h = { 'Accept': 'application/json, text/plain, */*', 'Authorization': auth };
    const xsrf = getCookie('XSRF-TOKEN');
    if (xsrf) h['X-XSRF-TOKEN'] = xsrf;
    return h;
  }

  async function timedFetch(url, opts) {
    const ctrl = new AbortController();
    controllers.push(ctrl);
    const timer = setTimeout(() => ctrl.abort('timeout'), REQUEST_TIMEOUT_MS);
    try {
      return await fetch(url, Object.assign({ credentials: 'same-origin', signal: ctrl.signal }, opts));
    } finally {
      clearTimeout(timer);
      controllers = controllers.filter(c => c !== ctrl);
    }
  }

  // ---------- The actual check ----------

  async function printOne(doc, printUrl, auth) {
    let res;
    try {
      res = await timedFetch(printUrl, {
        method: 'POST',
        headers: Object.assign(apiHeaders(auth), { 'Content-Type': 'application/json' }),
        body: JSON.stringify([doc])
      });
    } catch (e) {
      if (stopRequested) return { level: 'skip' };
      return { level: 'warn', reason: 'No response within ' + (REQUEST_TIMEOUT_MS / 1000) + 's - check manually' };
    }

    if (res.status === 401 || res.status === 403) return { level: 'auth', status: res.status };
    if (!res.ok) {
      return { level: 'bad', reason: `Print failed (server error ${res.status}) - likely an encrypted/restricted PDF` };
    }

    // Read the body only to inspect it; it is discarded as soon as this returns
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.length === 0) {
      return { level: 'bad', reason: 'Print returned an empty (0-byte) PDF - likely password-protected' };
    }
    const head = String.fromCharCode.apply(null, bytes.subarray(0, 1024));
    if (head.includes('%PDF')) return { level: 'ok' };
    if (/^\s*"?JVBERi/.test(head)) return { level: 'ok' }; // base64-encoded PDF
    return {
      level: 'warn',
      reason: `Unexpected print response (${res.headers.get('content-type') || 'unknown type'}, ${bytes.length} bytes) - check manually`
    };
  }

  // Simple worker pool so a few prints run at once without hammering the server
  async function runPool(items, worker) {
    let next = 0;
    async function lane() {
      while (!stopRequested && next < items.length) {
        const i = next++;
        await worker(items[i], i);
      }
    }
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, lane));
  }

  // ---------- Results panel ----------

  function buildPanel() {
    let panel = document.getElementById(PANEL_ID);
    if (panel) panel.remove();
    panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.innerHTML = `
      <div class="oac-head"><span>Document Check</span><button type="button" title="Close">&times;</button></div>
      <div class="oac-status"><div class="oac-text">Starting...</div><div class="oac-bar"><div></div></div></div>
      <div class="oac-list"></div>
      <div class="oac-actions"><button type="button" class="oac-stop">Stop</button></div>
    `;
    panel.querySelector('.oac-head button').addEventListener('click', () => {
      stop();
      panel.remove();
    });
    panel.querySelector('.oac-stop').addEventListener('click', stop);
    document.body.appendChild(panel);
    return panel;
  }

  function stop() {
    stopRequested = true;
    controllers.forEach(c => c.abort('stopped'));
  }

  function setStatus(panel, text, done, total) {
    panel.querySelector('.oac-text').textContent = text;
    panel.querySelector('.oac-bar > div').style.width = total ? (100 * done / total) + '%' : '0';
  }

  function finishPanel(panel, text) {
    setStatus(panel, text, 1, 1);
    const btn = panel.querySelector('.oac-stop');
    if (!btn) return;
    const rerun = btn.cloneNode(false); // drop the Stop listener
    rerun.textContent = 'Run again';
    rerun.addEventListener('click', () => run());
    btn.replaceWith(rerun);
  }

  function addResult(panel, doc, rows, result) {
    const el = document.createElement('div');
    el.className = 'oac-item' + (result.level === 'warn' ? ' oac-warn' : '');
    const title = document.createElement('div');
    title.textContent = (result.level === 'bad' ? '⛔ ' : '⚠ ') + (doc.name || '').trim();
    const id = document.createElement('span');
    id.className = 'oac-id';
    id.textContent = '  (document id ' + doc.id + ')';
    title.appendChild(id);
    const reason = document.createElement('div');
    reason.className = 'oac-reason';
    reason.textContent = result.reason;
    el.appendChild(title);
    el.appendChild(reason);
    if (rows.length) {
      el.title = 'Click to scroll to this document';
      el.addEventListener('click', () => rows[0].scrollIntoView({ behavior: 'smooth', block: 'center' }));
    }
    panel.querySelector('.oac-list').appendChild(el);
  }

  // ---------- Main run ----------

  async function run() {
    if (running) return;
    running = true;
    stopRequested = false;
    injectStyles();
    document.querySelectorAll('.' + FLAG_CLASS).forEach(el => el.classList.remove(FLAG_CLASS));
    const panel = buildPanel();

    try {
      const session = await getSession();
      const listUrl = session.listUrl || findListUrlInPage();
      if (!session.auth || !listUrl) {
        const missing = [!session.auth && 'login header', !listUrl && 'document list'].filter(Boolean).join(' and ');
        finishPanel(panel, `Could not pick up the page session (missing ${missing}). Refresh this page (F5) and try again.`);
        return;
      }
      const demographicNo = new URL(listUrl, location.origin).searchParams.get('demographicNumber');
      const printUrl = location.origin + '/kaiemr/api/v1/attachment-manager/printable/' + encodeURIComponent(demographicNo);

      setStatus(panel, 'Loading document list...', 0, 0);
      const listRes = await timedFetch(listUrl, { headers: apiHeaders(session.auth) });
      if (!listRes.ok) {
        finishPanel(panel, `Could not load the document list (server returned ${listRes.status}). Refresh the page and try again.`);
        return;
      }
      const list = await listRes.json();
      let docs = (list.Document || []).filter(d => d.supported !== false);

      // Expand so rows exist on the page for highlighting / reading ticked boxes
      const expandAll = findButtonByText(/^expand all/i);
      if (expandAll) {
        expandAll.click();
        await new Promise(r => setTimeout(r, 800));
      }
      const rowsByName = collectDocumentRows();
      const selectedNames = new Set();
      rowsByName.forEach((rows, name) => { if (rows.some(isRowSelected)) selectedNames.add(name); });
      const scope = selectedNames.size ? 'selected' : 'all';
      if (selectedNames.size) docs = docs.filter(d => selectedNames.has((d.name || '').trim()));

      if (!docs.length) {
        finishPanel(panel, 'No printable Documents found for this patient.');
        return;
      }

      let done = 0, flagged = 0, authFailed = false;
      setStatus(panel, `Checking 0 of ${docs.length} ${scope} Documents...`, 0, docs.length);

      await runPool(docs, async doc => {
        const result = await printOne(doc, printUrl, session.auth);
        if (result.level === 'auth') {
          authFailed = true;
          stop();
          return;
        }
        if (result.level === 'skip') return;
        done++;
        if (result.level !== 'ok') {
          flagged++;
          const rows = rowsByName.get((doc.name || '').trim()) || [];
          if (result.level === 'bad') rows.forEach(r => r.classList.add(FLAG_CLASS));
          addResult(panel, doc, rows, result);
        }
        setStatus(panel, `Checking ${done} of ${docs.length} ${scope} Documents... (${flagged} flagged)`, done, docs.length);
      });

      if (!document.getElementById(PANEL_ID)) return; // closed mid-run
      if (authFailed) {
        finishPanel(panel, 'The server rejected the request (session expired?). Refresh the page and try again.');
        return;
      }
      const prefix = stopRequested ? `Stopped after ${done} of ${docs.length}. ` : 'Done. ';
      finishPanel(panel, prefix + (flagged
        ? `${flagged} problem Document(s) found in ${done} checked. Remove or re-save these before printing.`
        : `No problems found in ${done} ${scope} Document(s).`));
    } catch (e) {
      finishPanel(panel, 'Error: ' + e.message);
    } finally {
      running = false;
    }
  }

  // ---------- Button placement ----------

  function ensureButton() {
    const onPage = location.hash.includes('attachment-manager');
    const existing = document.getElementById(BTN_ID);
    if (!onPage) {
      if (existing) existing.remove();
      return;
    }
    if (existing && existing.isConnected) return;

    injectStyles();
    // Sit next to the PRINT / FAX / EMAIL / SAVE FOR OCEAN buttons. Those are <weg-button-*>
    // components with encapsulated styles, so insert after the outer component and style our own.
    const ocean = document.querySelector('[data-pendo-id="attachment-manager-save-for-ocean-button"]');
    const anchorBtn = findButtonByText(/save for ocean/i) || findButtonByText(/^print$/i);
    const anchor = ocean || (anchorBtn && (anchorBtn.closest('weg-button-basic-with-icon') || anchorBtn));
    if (!anchor && !document.querySelector('i.fa-eye')) return; // page not rendered yet

    const btn = document.createElement('button');
    btn.id = BTN_ID;
    btn.type = 'button';
    btn.title = 'Test-print each Document in the background and flag ones that would break PRINT (e.g. password-protected or encrypted PDFs)';
    btn.innerHTML = '<i class="fa-solid fa-magnifying-glass"></i> CHECK DOCUMENTS';
    btn.addEventListener('click', e => { e.preventDefault(); run(); });

    if (anchor) {
      btn.className = 'oac-inline';
      anchor.insertAdjacentElement('afterend', btn);
    } else {
      btn.className = 'oac-fallback';
      document.body.appendChild(btn);
    }
  }

  // Angular re-renders the toolbar on route changes, so keep re-checking
  ensureButton();
  setInterval(ensureButton, 1000);
})();
