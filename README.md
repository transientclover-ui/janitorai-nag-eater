# JanitorAI Nag Eater

JanitorAI Nag Eater is a small userscript that hides JanitorAI Plus subscription promotional popups and JanitorAI's promotional in-chat app-banner. It does not target adblock warnings, change subscription or account state, or simulate clicks.

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

Use the userscript manager's **Show suppressed promotion count** menu command to see how many targeted Plus surfaces and app-promotion banners have been suppressed during the current page session. Repeated observation of the same element is counted only once.

The script does not:

- hide elements merely because they contain the word "Plus"
- target generic dialogs or notifications
- click dismiss buttons
- alter JanitorAI's localStorage promotion counters
- modify network requests, subscription state, or account functionality
- interact with adblockers

## App-promotion banner removal

The app-promotion banner detector removes the whole promotional card that JanitorAI inserts into web chats to push users toward its mobile app. It is intentionally narrow:

- It targets the promotional component as a whole, not just the words "Get the app" or the button inside it.
- Detection is primarily structural, using common app-promotion container class patterns; text is used as a confirming signal, not as the only gate.
- The text confirmation accepts several typical "continue in the app" phrases rather than one exact string, but it still requires an app-oriented phrase before anything is removed.
- Ordinary chat messages that mention phrases such as "get the app" are not treated as banners and are not removed.

Because the live banner's exact DOM structure was not independently verified from repository evidence, the detector is deliberately conservative. If JanitorAI changes the markup or adds a new app-promotion layout, include the affected page and current DOM structure in a bug report.

## Verification and limitations

Local browser fixtures verified early CSS suppression, delayed insertion, recreated modals, app-banner removal, and preservation of unrelated dialogs, chat content, and page controls. Static inspection verified the selectors and portal behavior against JanitorAI's production entry bundle:

`https://assets.janitorai.com/index-C11jBagP.js`

Authenticated live testing was not available. The following remain unverified:

- behavior inside a real logged-in chat
- differences between free and paid accounts
- route-specific or code-split promotions not implemented with the shared Plus surface
- JanitorAI markup that does not use the expected app-promotion container patterns
- future JanitorAI refactors that rename the semantic CSS-module classes

This project does not claim to suppress unverified surfaces. If JanitorAI changes its markup, please include the affected page and current DOM structure in a bug report.

## Development model

This project is “2D-printed”: I specify the behavior, AI workers fabricate the implementation, and I test, inspect, refine, and iterate the result.

Run the minimal Node.js test suite with `npm test`.

## License

[MIT](LICENSE)
