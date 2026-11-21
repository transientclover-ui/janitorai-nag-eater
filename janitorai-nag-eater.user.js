// ==UserScript==
// @name         JanitorAI Nag Eater
// @namespace    https://github.com/transientclover-ui/janitorai-nag-eater
// @version      0.2.3
// @description  Hides JanitorAI Plus subscription promotional popups.
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
  const MODAL_OVERLAY_SELECTOR = '[class*="_modalOverlay_"]';
  const SUPPRESSED_ATTRIBUTE = 'data-jne-plus-promotion';
  const MEMORY_BANNER_ATTRIBUTE = 'data-jne-plus-memory-banner';
  const MEMORY_BANNER_COPY = [
    "don't let your characters forget you",
    'your characters lose context as your chat grows',
    'upgrade now to help your characters remember more',
  ];
  const suppressedSurfaces = new WeakSet();
  const countedMemoryBanners = new WeakSet();
  let suppressedCount = 0;
  const markedOverlays = new Set();
  const markedMemoryBanners = new Set();

  const style = document.createElement('style');
  // Keep :has() separate: unsupported selectors must not invalidate the
  // surface rule or the observer fallback.
  style.textContent = `
    ${PLUS_SURFACE_SELECTOR},
    ${MODAL_OVERLAY_SELECTOR}[${SUPPRESSED_ATTRIBUTE}],
    [${MEMORY_BANNER_ATTRIBUTE}] {
      display: none !important;
    }
    ${MODAL_OVERLAY_SELECTOR}:has(${PLUS_SURFACE_SELECTOR}) {
      display: none !important;
    }
  `;
  (document.head || document.documentElement).append(style);

  function hasMemoryBannerCopy(element) {
    const text = (element.textContent || '')
      .toLowerCase()
      .replace(/[’‘]/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
    return MEMORY_BANNER_COPY.every(phrase => text.includes(phrase));
  }

  function findMemoryBanners() {
    const matches = [...document.querySelectorAll('body *')]
      .filter(hasMemoryBannerCopy);
    // Keep only the innermost matching containers. A page or chat root can
    // contain the banner copy too, but its own card is the suppression unit.
    return matches.filter(element =>
      !matches.some(other => other !== element && element.contains(other)),
    );
  }

  function reconcile() {
    const activeOverlays = new Set();
    for (const surface of document.querySelectorAll(PLUS_SURFACE_SELECTOR)) {
      if (!suppressedSurfaces.has(surface)) {
        suppressedSurfaces.add(surface);
        suppressedCount += 1;
      }
      // Match the CSS ancestry rule, including nested overlays.
      for (let parent = surface.parentElement; parent; parent = parent.parentElement) {
        if (parent.matches(MODAL_OVERLAY_SELECTOR)) {
          activeOverlays.add(parent);
        }
      }

    const activeMemoryBanners = new Set(findMemoryBanners());
    for (const banner of activeMemoryBanners) {
      if (!countedMemoryBanners.has(banner)) {
        countedMemoryBanners.add(banner);
        suppressedCount += 1;
      }
    }
    for (const banner of markedMemoryBanners) {
      if (!activeMemoryBanners.has(banner)) {
        banner.removeAttribute(MEMORY_BANNER_ATTRIBUTE);
        markedMemoryBanners.delete(banner);
      }
    }
    for (const banner of activeMemoryBanners) {
      if (!banner.hasAttribute(MEMORY_BANNER_ATTRIBUTE)) {
        banner.setAttribute(MEMORY_BANNER_ATTRIBUTE, '');
      }
      markedMemoryBanners.add(banner);
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
    characterData: true,
    attributes: true,
    attributeFilter: ['class', 'data-modal-open'],
  });
})();
