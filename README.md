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

The userscript installs targeted `display: none !important` CSS at `document-start` for the existing confirmed Plus selector. It never deletes, replaces, or reparents site-owned nodes and leaves site-owned `aria-hidden` and `inert` attributes unchanged. CSS suppression was already used in v0.2.1; v0.2.2 makes its overlay fallback reversible.

A small `MutationObserver` reconciles overlay markers after child-list, class, and open-state changes, removing its marker when the promotion closes, moves, disappears, or loses its identifying class. This prevents a reused ordinary overlay from remaining hidden. The `:has()` rule is separate so unsupported browsers can still use the surface CSS and observer fallback. Suppression counts remain unique per surface node.

Use the userscript manager's **Show suppressed promotion count** menu command to see how many targeted Plus surfaces have been suppressed during the current page session. Repeated observation of the same element is counted only once.

The script does not:

- hide elements merely because they contain the word "Plus"
- target generic dialogs or notifications
- click dismiss buttons
- alter JanitorAI's localStorage promotion counters
- modify network requests, subscription state, or account functionality
- interact with adblockers

## App-promotion banners

App-banner suppression remains unimplemented in v0.2.2. The v0.2.0 CSS accidentally emitted global tag selectors that hid ordinary page content. v0.2.1 restored the Plus-only behavior from commit `b94652f`. The reported “Continue this chat in the app / Get the app” card still has no verified live DOM; no selector or suppression rule is provided for it.

## Experimental diagnostic (optional, GitHub only)

To help investigate the unverified app card or other unwanted UI, use the separate [EXPERIMENTAL DIAGNOSTIC userscript](https://raw.githubusercontent.com/transientclover-ui/janitorai-nag-eater/main/experimental/nag-eater-diagnostic.user.js). It provides a manual element picker and a redacted structural report for local review/copying. It does not suppress UI, upload anything, or replace stable Nag Eater v0.2.2. No Greasy Fork publication is involved.

See [install, capture, privacy and limitations](docs/experimental-diagnostic.md). Review every report before sharing it through the [diagnostic issue form](https://github.com/transientclover-ui/janitorai-nag-eater/issues/new?template=diagnostic.yml). Participation is optional; missing captures are not a blocker for stable Nag Eater.

## Verification and limitations

The complete 12-test Chromium suite covers ordinary UI and errors, chat input/buttons and navigation, early Plus CSS, delayed/recreated surfaces, unique counts, attribute-only opening, reversible overlay reuse, and the marker-only fallback with the `:has()` rule removed. Node-identity and DOM-mutation assertions verify that suppression retains children, unsaved input state and event listeners, and permits subsequent removal by the owning renderer. These are browser DOM lifecycle fixtures, not an authenticated React/JanitorAI integration test.

History inspection confirms that v0.2.0's global hiding regression came from malformed CSS selector-list composition, not physical DOM removal. CSS alone is not inherently safe: selectors must remain narrow and suppression must track the current target state.

Live JanitorAI validation remains unavailable in the Work browser. Earlier repository investigation recorded the Plus component in the production bundle at `https://assets.janitorai.com/index-C11jBagP.js`; that live bundle was not revalidated for this patch. CSS retains component effects as well as DOM ownership; live focus traps, body scroll locks, and other modal effects cannot be ruled out by these fixtures and are not modified by this script.

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
