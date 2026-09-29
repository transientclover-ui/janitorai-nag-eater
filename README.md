# JanitorAI Nag Eater

JanitorAI Nag Eater is a small userscript that hides JanitorAI Plus subscription promotional popups. It does not target adblock warnings, change subscription or account state, or simulate clicks.

## Install

1. Install [Violentmonkey](https://violentmonkey.github.io/) or [Tampermonkey](https://www.tampermonkey.net/).
2. Open `janitorai-nag-eater.user.js` from this repository's raw file view.
3. Confirm the userscript manager's installation prompt.

The script runs only on `https://janitorai.com/*`.

## How it works

Investigation of JanitorAI's production bundle on September 24, 2026 found that the Plus launch promotion is rendered asynchronously as a React portal under `document.body`. The shared Plus surface has:

- `data-modal-open="true"`
- a CSS-module class with the semantic prefix `_plusSurface_`
- an ancestor overlay with the semantic prefix `_modalOverlay_`

The launch promotion can appear after a remotely configured dwell time and is recreated during client-side navigation. JanitorAI currently serves multiple layouts from the same Plus surface component.

The userscript installs targeted CSS at `document-start`. A small `MutationObserver` handles browsers without usable `:has()` support by marking only an overlay that contains the confirmed Plus surface. The observer also covers delayed rendering and client-side navigation.

Use the userscript manager's **Show suppressed promotion count** menu command to see how many targeted Plus surfaces have been suppressed during the current page session. Repeated observation of the same element is counted only once.

The script does not:

- hide elements merely because they contain the word "Plus"
- target generic dialogs or notifications
- click dismiss buttons
- alter JanitorAI's localStorage promotion counters
- modify network requests, subscription state, or account functionality
- interact with adblockers

## App-promotion banners

App-banner suppression is disabled in v0.2.1. The v0.2.0 CSS accidentally emitted global tag selectors that hid ordinary page content. This patch restores the Plus-only behavior from commit `b94652f`; app banners remain visible until their live structure can be verified and safely targeted.

## Verification and limitations

Chromium browser tests verify ordinary UI visibility and interaction, early Plus CSS suppression, delayed insertion, recreated modals, suppression counts, and preservation of unrelated dialogs and unverified app-banner containers. The visibility regression test fails against the released v0.2.0 script and passes against v0.2.1.

Live JanitorAI validation for v0.2.1 was blocked by the browser environment's site-safety policy. Earlier repository investigation recorded the Plus component in the production bundle at `https://assets.janitorai.com/index-C11jBagP.js`; that live bundle was not revalidated for this patch.

Authenticated live testing was not available. The following remain unverified:

- behavior inside a real logged-in chat
- differences between free and paid accounts
- route-specific or code-split promotions not implemented with the shared Plus surface
- future JanitorAI refactors that rename the semantic CSS-module classes

This project does not claim to suppress unverified surfaces. If JanitorAI changes its markup, please include the affected page and current DOM structure in a bug report.

## Development model

This project is “2D-printed”: I specify the behavior, AI workers fabricate the implementation, and I test, inspect, refine, and iterate the result.

Install development dependencies with `npm ci`, install the test browser with `npx playwright install chromium`, then run the full Chromium browser suite with `npm test`. The userscript itself has no runtime dependencies.

## License

[MIT](LICENSE)
