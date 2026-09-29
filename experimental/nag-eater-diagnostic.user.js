// ==UserScript==
// @name         Nag Eater Diagnostic (EXPERIMENTAL)
// @namespace    https://github.com/transientclover-ui/janitorai-nag-eater/diagnostic
// @version      0.1.0
// @description  Manually capture redacted UI structure for review. Does not suppress anything.
// @license      MIT
// @match        https://janitorai.com/*
// @run-at       document-idle
// @noframes
// @grant        GM_registerMenuCommand
// ==/UserScript==

(() => {
  'use strict';
  const VERSION = '0.1.0';
  const WORDS = new Set('app banner promotion promo modal overlay dialog surface container card button title subtitle description text content footer header close download install continue chat plus bento wrapper flex grid hidden fixed absolute relative block inline rounded shadow'.split(' '));
  const TAGS = new Set('html body main section article aside nav header footer div span p h1 h2 h3 h4 h5 h6 a button input textarea select option label form img picture svg path g ul ol li dialog strong em small br hr iframe video audio canvas pre code table tr td th'.split(' '));
  const ROLES = new Set('dialog alertdialog alert button link banner main complementary navigation region group heading status presentation none list listitem textbox checkbox switch tab tabpanel tooltip menu menuitem'.split(' '));
  const PHRASES = {
    continueChatInApp: 'continue this chat in the app',
    pickUpWhereYouAre: 'pick up right where you are',
    getTheApp: 'get the app',
  };
  let lastReport = null;
  let dispose = () => {};
  const bucket = n => n === 0 ? '0' : n <= 16 ? '1-16' : n <= 64 ? '17-64' : n <= 256 ? '65-256' : '257+';
  const cap = n => Math.min(n, 100);

  function classSummary(el) {
    const raw = el.getAttribute('class') || '';
    // Never publish arbitrary tokens, including seemingly human-readable usernames.
    return {
      inputTruncated: raw.length > 1024,
      tokens: raw.slice(0, 1024).split(/\s+/).filter(Boolean).slice(0, 12).map(token => {
        const words = token.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase().split(/[^a-z]+/);
        return {
          category: /\d|[a-f0-9]{8}|^css-|^_[^_]+_/.test(token) ? 'possibly-generated' : 'unknown-stability',
          semanticHints: [...new Set(words.filter(word => WORDS.has(word)))].slice(0, 6),
          lengthBucket: bucket(token.length),
        };
      }),
    };
  }

  function structure(el) {
    const role = el.getAttribute('role');
    const states = {};
    for (const name of ['aria-hidden', 'aria-modal', 'aria-expanded', 'aria-disabled', 'data-modal-open']) {
      if (el.hasAttribute(name)) {
        const value = el.getAttribute(name);
        states[name] = value === 'true' || value === 'false' ? value : 'redacted';
      }
    }
    return {
      tag: TAGS.has(el.localName) ? el.localName : 'other',
      classes: classSummary(el),
      role: role === null ? null : ROLES.has(role) ? role : 'redacted',
      states,
      attributePresence: Object.fromEntries(['id', 'aria-label', 'aria-labelledby', 'aria-describedby', 'title', 'href', 'src', 'name', 'data-testid', 'contenteditable'].map(name => [name, el.hasAttribute(name)])),
      childElementCountCapped: cap(el.childElementCount),
    };
  }

  function textIndicators(el) {
    // Do not read textContent of a subtree: it can concatenate entire chat histories.
    // Visit at most 120 nodes and inspect at most 2048 characters total.
    const found = Object.fromEntries(Object.keys(PHRASES).map(key => [key, false]));
    const stack = [el];
    let visits = 0;
    let inspected = 0;
    let truncated = false;
    const excluded = new Set(['input', 'textarea', 'select', 'script', 'style', 'noscript', 'template']);
    while (stack.length && visits < 120 && inspected < 2048) {
      const node = stack.pop();
      visits++;
      if (node.nodeType === 1) {
        if (excluded.has(node.localName) || node.isContentEditable) continue;
        // Bounded enqueue as well as bounded traversal, even for huge containers.
        let child = node.firstChild;
        let count = 0;
        const children = [];
        while (child && count++ < 24) { children.push(child); child = child.nextSibling; }
        if (child) return { knownPhrases: found, inspectedLengthBucket: bucket(inspected), incomplete: true };
        for (let i = children.length - 1; i >= 0; i--) stack.push(children[i]);
      } else if (node.nodeType === 3) {
        const value = node.data.slice(0, Math.min(256, 2048 - inspected));
        if (node.data.length > value.length) truncated = true;
        inspected += value.length;
        const normalized = value.toLowerCase().replace(/\s+/g, ' ').trim();
        // Exact text-node matches only; quoted phrases in conversations are not proof of a promo.
        for (const [key, phrase] of Object.entries(PHRASES)) if (normalized === phrase) found[key] = true;
      }
    }
    return { knownPhrases: found, inspectedLengthBucket: bucket(inspected), incomplete: truncated || stack.length > 0 || inspected >= 2048 || visits >= 120 };
  }

  function report(el) {
    const ancestors = [];
    let parent = el.parentElement;
    while (parent && ancestors.length < 4) { ancestors.push(structure(parent)); parent = parent.parentElement; }
    const children = [];
    let child = el.firstElementChild;
    while (child && children.length < 8) { children.push(structure(child)); child = child.nextElementSibling; }
    const rect = el.getBoundingClientRect();
    const round = value => Math.round(value / 16) * 16;
    const firstSegment = (location.pathname.split('/')[1] || '').toLowerCase();
    const pageCategory = !firstSegment ? 'home' : ['chat', 'chats'].includes(firstSegment) ? 'chat' : ['character', 'characters'].includes(firstSegment) ? 'character' : 'other';
    return {
      tool: 'Nag Eater Experimental Diagnostic', toolVersion: VERSION, schemaVersion: 1,
      pageCategory,
      viewport: { width: innerWidth, height: innerHeight, category: innerWidth < 768 ? 'narrow' : innerWidth < 1200 ? 'medium' : 'wide' },
      selected: structure(el),
      layout: { quantizedPixels: 16, x: round(rect.x), y: round(rect.y), width: round(rect.width), height: round(rect.height) },
      textIndicators: textIndicators(el),
      ancestors, children,
      siblings: { previous: el.previousElementSibling ? structure(el.previousElementSibling) : null, next: el.nextElementSibling ? structure(el.nextElementSibling) : null },
      limits: { ancestors: 4, children: 8, siblings: 2, classesPerElement: 12, visitedTextNodesAndElements: 120, inspectedCharacters: 2048 },
      privacyNotes: [
        'Review before public posting. No raw text, class tokens, IDs, arbitrary attribute names/values, URLs, timestamps, or account data are included.',
        'Only allowlisted semantic class hints, roles and boolean states survive. All unknown values are omitted or redacted; stability categories are heuristic.',
        'Text is inspected only within the selected element with strict limits; form/editable values are excluded. No ancestor/sibling text is inspected.',
        'Phrase flags are exact text-node matches, can miss split/truncated phrases, and do not prove this is a promotion.',
        'Counts are capped; text lengths bucketed; layout rounded. No network or persistent storage. Latest report lives only in userscript memory until reload.',
      ],
    };
  }

  function surface() {
    const host = document.createElement('div');
    host.setAttribute('data-nag-eater-diagnostic-ui', '');
    host.style.cssText = 'all:initial!important;position:fixed!important;inset:0!important;z-index:2147483647!important;display:block!important;pointer-events:auto!important;';
    const root = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = ':host{color-scheme:light}*{box-sizing:border-box}section{position:absolute;inset:20px;max-width:850px;margin:auto;padding:20px;background:#fff;color:#171717;font:16px/1.5 sans-serif;border:3px solid #235b45;overflow:auto}button{font:inherit;margin:6px;padding:8px;cursor:pointer}textarea{width:100%;height:55vh;font:13px monospace;color:#111;background:#fff}p{margin:8px 0}';
    root.append(style);
    document.documentElement.append(host);
    const previousFocus = document.activeElement;
    const cleanups = [];
    let done = false;
    const on = (target, type, callback, options) => {
      target.addEventListener(type, callback, options);
      cleanups.push(() => target.removeEventListener(type, callback, options));
    };
    const close = () => {
      if (done) return;
      done = true;
      for (const cleanup of cleanups) cleanup();
      host.remove();
      if (previousFocus?.isConnected && typeof previousFocus.focus === 'function') previousFocus.focus({ preventScroll: true });
      dispose = () => {};
    };
    dispose = close;
    on(window, 'pagehide', close);
    on(window, 'keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); close(); }
      // Keep focus on diagnostic controls while the temporary surface is open.
      if (event.key === 'Tab') {
        const controls = [...root.querySelectorAll('button,textarea')];
        const index = controls.indexOf(root.activeElement);
        event.preventDefault(); event.stopImmediatePropagation();
        controls[(index + (event.shiftKey ? controls.length - 1 : 1)) % controls.length]?.focus();
      }
    }, true);
    return { host, root, on, close };
  }

  function button(root, label, action) {
    const el = document.createElement('button');
    el.type = 'button'; el.textContent = label;
    el.addEventListener('click', action); root.append(el);
    return el;
  }

  function review() {
    dispose();
    const { root, close } = surface();
    const panel = document.createElement('section');
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Diagnostic report review');
    root.append(panel);
    const notice = document.createElement('p');
    notice.textContent = 'EXPERIMENTAL DIAGNOSTIC — Review before posting publicly. Copy manually with Ctrl+C / Cmd+C. Nothing is submitted. Escape or Close dismisses this window.';
    panel.append(notice);
    const area = document.createElement('textarea');
    area.readOnly = true; area.setAttribute('aria-label', 'Diagnostic report');
    area.value = lastReport || 'No report yet. Use the Capture element menu command.';
    panel.append(area);
    button(panel, 'Select report for copying', () => { area.focus(); area.select(); });
    button(panel, 'Forget report', () => { lastReport = null; close(); });
    button(panel, 'Close', close).focus();
  }

  function capture() {
    dispose();
    const { host, root, on, close } = surface();
    host.style.background = 'transparent';
    host.style.cursor = 'crosshair';
    const panel = document.createElement('section');
    panel.style.cssText = 'inset:8px 8px auto auto;width:min(440px,90vw);margin:0;padding:10px;';
    panel.textContent = 'Capture mode: click the unwanted element. Select a small card, not the entire chat. Escape cancels. No site action will be clicked.';
    root.append(panel);
    button(panel, 'Cancel capture', close).focus();
    const outline = document.createElement('div');
    outline.style.cssText = 'position:fixed;pointer-events:none;border:3px solid #00a878;background:rgba(0,168,120,.08);';
    root.append(outline);
    const candidate = event => document.elementsFromPoint(event.clientX, event.clientY).find(el => el !== host && !['html', 'body'].includes(el.localName));
    on(host, 'pointermove', event => {
      if (event.composedPath().includes(panel)) { outline.style.display = 'none'; return; }
      const el = candidate(event);
      if (!el) { outline.style.display = 'none'; return; }
      const rect = el.getBoundingClientRect();
      Object.assign(outline.style, { display: 'block', left: `${rect.x}px`, top: `${rect.y}px`, width: `${rect.width}px`, height: `${rect.height}px` });
    });
    // The shield receives the complete pointer sequence, never the selected site element.
    for (const type of ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'dblclick', 'contextmenu', 'touchstart', 'touchend', 'wheel']) {
      on(host, type, event => {
        if (event.composedPath().includes(panel)) return;
        event.preventDefault(); event.stopImmediatePropagation();
      }, { passive: false });
    }
    on(host, 'click', event => {
      if (event.composedPath().includes(panel)) return;
      event.preventDefault(); event.stopImmediatePropagation();
      const el = candidate(event);
      if (!el) return;
      try { lastReport = JSON.stringify(report(el), null, 2); }
      finally { close(); }
      review();
    });
  }

  GM_registerMenuCommand('Nag Eater Diagnostic: Capture element', capture);
  GM_registerMenuCommand('Nag Eater Diagnostic: View last report', review);
})();
