// ==UserScript==
// @name         JanitorAI Nag Eater
// @namespace    https://github.com/transientclover-ui/janitorai-nag-eater
// @version      0.2.0
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
  const APP_BANNER_CONTAINER_SELECTOR =
    '[class*="_appPromotionContainer_"]' +
    ', [class*="bentoAppPromotionBanner_"]' +
    ', [class*="bentoAppBanner_"]';
  const APP_BANNER_TEXT_SELECTOR =
    'h1, h2, h3, p, div, span, a, button, li';
  const SUPPRESSED_ATTRIBUTE = 'data-jne-plus-promotion';
  const APP_PROMOTION_SUPPRESSED_ATTRIBUTE =
    'data-jne-app-promotion-banner';
  const suppressedSurfaces = new WeakSet();
  const suppressedAppBanners = new WeakSet();
  let suppressedCount = 0;
  let suppressedAppBannerCount = 0;

  const style = document.createElement('style');
  style.textContent = `
    ${PLUS_SURFACE_SELECTOR},
    ${MODAL_OVERLAY_SELECTOR}:has(${PLUS_SURFACE_SELECTOR}),
    [${SUPPRESSED_ATTRIBUTE}] {
      display: none !important;
    }

    ${APP_BANNER_CONTAINER_SELECTOR},
    [${APP_PROMOTION_SUPPRESSED_ATTRIBUTE}],
    ${APP_BANNER_CONTAINER_SELECTOR} ${APP_BANNER_TEXT_SELECTOR} {
      display: none !important;
    }
  `;
  (document.head || document.documentElement).append(style);

  function suppressSurface(surface) {
    if (!suppressedSurfaces.has(surface)) {
      suppressedSurfaces.add(surface);
      suppressedCount += 1;
    }

    const overlay = surface.closest(MODAL_OVERLAY_SELECTOR);
    if (!overlay) {
      return;
    }

    overlay.setAttribute(SUPPRESSED_ATTRIBUTE, '');
    overlay.setAttribute('aria-hidden', 'true');
    overlay.inert = true;
  }

  function isAppPromotionBanner(container) {
    if (!(container instanceof Element)) {
      return false;
    }

    const textNodes = [];
    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
      null,
      false,
    );
    let node;
    while ((node = walker.nextNode())) {
      if (node.parentElement && node.parentElement.matches(APP_BANNER_TEXT_SELECTOR)) {
        textNodes.push(node);
      }
    }

    if (textNodes.length === 0) {
      return false;
    }

    const text = textNodes
      .map((n) => n.textContent.trim())
      .filter((s) => s.length > 0)
      .join(' ');

    if (text.length === 0) {
      return false;
    }

    const lowered = text.toLowerCase();
    const hasApplicationCta = lowered.includes('get the app') ||
      lowered.includes('download the app') ||
      lowered.includes('open in app') ||
      lowered.includes('continue in the app') ||
      lowered.includes('pick up right where you are') ||
      lowered.includes('continue this chat in the app');

    if (!hasApplicationCta) {
      return false;
    }

    const hasAppStoreLanguage = lowered.includes('app store') ||
      lowered.includes('google play') ||
      lowered.includes('ios') ||
      lowered.includes('android');

    const buttons = container.querySelectorAll(
      APP_BANNER_TEXT_SELECTOR + ':is([aria-label*="app" i], [role="button"])',
    );

    return hasApplicationCta && (
      hasAppStoreLanguage ||
      buttons.length > 0 ||
      textNodes.length <= 3
    );
  }

  function suppressAppBanner(container) {
    if (suppressedAppBanners.has(container)) {
      return;
    }

    suppressedAppBanners.add(container);
    suppressedAppBannerCount += 1;
    container.setAttribute(APP_PROMOTION_SUPPRESSED_ATTRIBUTE, '');
    container.inert = true;
  }

  function scan(root) {
    if (!(root instanceof Element)) {
      return;
    }

    if (root.matches(APP_BANNER_CONTAINER_SELECTOR) && isAppPromotionBanner(root)) {
      suppressAppBanner(root);
    }

    for (const container of root.querySelectorAll(APP_BANNER_CONTAINER_SELECTOR)) {
      if (isAppPromotionBanner(container)) {
        suppressAppBanner(container);
      }
    }

    if (root.matches(PLUS_SURFACE_SELECTOR)) {
      suppressSurface(root);
    }

    for (const surface of root.querySelectorAll(PLUS_SURFACE_SELECTOR)) {
      suppressSurface(surface);
    }
  }

  GM_registerMenuCommand('Show suppressed promotion count', () => {
    const surfaceNoun = suppressedCount === 1 ? 'element' : 'elements';
    const bannerNoun = suppressedAppBannerCount === 1 ? 'element' : 'elements';
    alert(
      `JanitorAI Nag Eater suppressed ${suppressedCount} promotional Plus ${surfaceNoun} and ${suppressedAppBannerCount} app-promotion banner ${bannerNoun} on this page.`,
    );
  });

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
