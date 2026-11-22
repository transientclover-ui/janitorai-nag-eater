// ==UserScript==
// @name         JanitorAI Nag Eater
// @namespace    https://github.com/transientclover-ui/janitorai-nag-eater
// @version      0.2.4
// @description  Hides JanitorAI Plus promotional popups and the memory-upgrade banner.
// @author       JanitorAI Nag Eater contributors
// @license      MIT
// @match        https://janitorai.com/*
// @run-at       document-start
// @grant        GM_registerMenuCommand
// ==/UserScript==

(() => {
  'use strict';

  const PLUS_SURFACE_SELECTOR =
    '[data-modal-open="true"][class*="_plusSurface_"]';
  // Confirmed by the redacted DOM capture: this semantic class uniquely
  // identifies the Plus memory-upgrade banner.
  const PLUS_MEMORY_BANNER_SELECTOR = 'div.hp-plus-banner';
  const MODAL_OVERLAY_SELECTOR = '[class*="_modalOverlay_"]';
  const SUPPRESSED_ATTRIBUTE = 'data-jne-plus-promotion';
  const countedPromotions = new WeakSet();
  let suppressedCount = 0;
  const markedOverlays = new Set();

  const style = document.createElement('style');
  // Keep :has() separate: unsupported selectors must not invalidate the
  // surface rule or the observer fallback.
  style.textContent = `
    ${PLUS_SURFACE_SELECTOR},
    ${MODAL_OVERLAY_SELECTOR}[${SUPPRESSED_ATTRIBUTE}],
    ${PLUS_MEMORY_BANNER_SELECTOR} {
      display: none !important;
    }
    ${MODAL_OVERLAY_SELECTOR}:has(${PLUS_SURFACE_SELECTOR}) {
      display: none !important;
    }
  `;
  (document.head || document.documentElement).append(style);

  function reconcile() {
    const activeOverlays = new Set();
    for (const surface of document.querySelectorAll(PLUS_SURFACE_SELECTOR)) {
      if (!countedPromotions.has(surface)) {
        countedPromotions.add(surface);
        suppressedCount += 1;
      }
      // Match the CSS ancestry rule, including nested overlays.
      for (let parent = surface.parentElement; parent; parent = parent.parentElement) {
        if (parent.matches(MODAL_OVERLAY_SELECTOR)) {
          activeOverlays.add(parent);
        }
      }
    }

    for (const banner of document.querySelectorAll(PLUS_MEMORY_BANNER_SELECTOR)) {
      if (!countedPromotions.has(banner)) {
        countedPromotions.add(banner);
        suppressedCount += 1;
      }
    }

    // React may close, move, or replace the promotion and reuse its overlay.
    // Only our marker is owned by us; leave nodes, aria-hidden and inert alone.
    for (const overlay of markedOverlays) {
      if (!activeOverlays.has(overlay)) {
        overlay.removeAttribute(SUPPRESSED_ATTRIBUTE);
        markedOverlays.delete(overlay);
      }
    }
    for (const overlay of activeOverlays) {
      if (!overlay.hasAttribute(SUPPRESSED_ATTRIBUTE)) {
        overlay.setAttribute(SUPPRESSED_ATTRIBUTE, '');
      }
      markedOverlays.add(overlay);
    }
  }

  GM_registerMenuCommand('Show suppressed promotion count', () => {
    const noun = suppressedCount === 1 ? 'element' : 'elements';
    alert(
      `JanitorAI Nag Eater suppressed ${suppressedCount} promotional ${noun} on this page.`,
    );
  });

  reconcile();

  // One reconciliation per mutation batch. Our marker is not observed, so
  // suppression cannot trigger an observer feedback loop.
  const observer = new MutationObserver(reconcile);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'data-modal-open'],
  });
})();
