// ==UserScript==
// @name         JanitorAI Nag Eater
// @namespace    https://github.com/transientclover-ui/janitorai-nag-eater
// @version      0.1.0
// @description  Hides JanitorAI Plus subscription promotional popups.
// @author       JanitorAI Nag Eater contributors
// @license      MIT
// @match        https://janitorai.com/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(() => {
  'use strict';

  const PLUS_SURFACE_SELECTOR =
    '[data-modal-open="true"][class*="_plusSurface_"]';
  const MODAL_OVERLAY_SELECTOR = '[class*="_modalOverlay_"]';
  const SUPPRESSED_ATTRIBUTE = 'data-jne-plus-promotion';

  const style = document.createElement('style');
  style.textContent = `
    ${PLUS_SURFACE_SELECTOR},
    ${MODAL_OVERLAY_SELECTOR}:has(${PLUS_SURFACE_SELECTOR}),
    [${SUPPRESSED_ATTRIBUTE}] {
      display: none !important;
    }
  `;
  (document.head || document.documentElement).append(style);

  function suppressSurface(surface) {
    const overlay = surface.closest(MODAL_OVERLAY_SELECTOR);
    if (!overlay) {
      return;
    }

    overlay.setAttribute(SUPPRESSED_ATTRIBUTE, '');
    overlay.setAttribute('aria-hidden', 'true');
    overlay.inert = true;
  }

  function scan(root) {
    if (!(root instanceof Element)) {
      return;
    }

    if (root.matches(PLUS_SURFACE_SELECTOR)) {
      suppressSurface(root);
    }

    for (const surface of root.querySelectorAll(PLUS_SURFACE_SELECTOR)) {
      suppressSurface(surface);
    }
  }

  scan(document.documentElement);

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        scan(node);
      }
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
})();
