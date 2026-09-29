# EXPERIMENTAL DIAGNOSTIC — specimen capture

This optional helper collects redacted structural evidence for unverified JanitorAI UI, including the mystery app card. It does not fix or suppress that card and is not a prerequisite for using stable Nag Eater. Stable v0.2.2 remains unchanged. This is a separate GitHub-only userscript, not a stable release or Greasy Fork publication.

## Install and capture

1. With Violentmonkey or Tampermonkey installed, open [the separate diagnostic userscript](https://raw.githubusercontent.com/transientclover-ui/janitorai-nag-eater/main/experimental/nag-eater-diagnostic.user.js) and confirm installation. Its name is **Nag Eater Diagnostic (EXPERIMENTAL)**. It can coexist with stable Nag Eater.
2. Reload JanitorAI. When the unwanted UI is visible, open your userscript manager menu and select **Nag Eater Diagnostic: Capture element**.
3. Move the pointer over the unwanted UI. The green outline shows the element under the pointer. Click a small card/container, preferably its padding; clicking a label selects that label. Capture again if its limited ancestors do not provide enough context. Avoid selecting the whole chat.
4. **Escape** or **Cancel capture** exits without capturing. The help panel occupies the upper-right corner; cancel and adjust the page before retrying if it covers your target. Capture mode temporarily blocks page interaction. It never activates the selected link/button.
5. Inspect the JSON report. Use **Select report for copying**, then Ctrl+C / Cmd+C (or your browser's Copy menu). Paste it into the [diagnostic issue form](https://github.com/transientclover-ui/janitorai-nag-eater/issues/new?template=diagnostic.yml) only after reviewing it. Posting is entirely manual.
6. Close with **Close** or Escape. **View last report** reopens the latest report during this page session; **Forget report** clears it. Reloading clears it too. No clipboard permission is required.

Do not paste raw HTML, full page URLs, screenshots containing chats, or private conversation text. Describe which UI you selected and the broad page type (chat/home/character/other). Captures are evidence for later investigation, never permission to suppress an element automatically.

## Exactly what is collected

- Tool/schema version; coarse page category inferred from the first path segment only. No path, IDs, query, fragment, origin, timestamp, or full URL is emitted.
- Viewport width/height and category; selected rectangle rounded to 16 pixels.
- Selected tag, up to four ancestors, eight immediate children, and one sibling on each side. Counts cap at 100. Unknown/custom tag names become `other`.
- Up to 12 class summaries per element from the first 1,024 class characters. **Raw classes are never emitted.** Only a fixed vocabulary of UI words (such as app, banner, modal, container), coarse length buckets and heuristic stability categories survive. These hints cannot reconstruct exact selectors; useful privacy takes precedence over completeness.
- Allowlisted standard roles; five allowlisted boolean ARIA/modal states. Unknown values become `redacted`. Presence only for ID, accessible-label/reference, title, URL-bearing, name, test-ID and editable attributes. All other attributes and values are omitted, including arbitrary data attributes.
- Three known-phrase booleans for “Continue this chat in the app”, “Pick up right where you are”, and “Get the app”. Text inspection is limited to the selected subtree: at most 120 visited nodes, 24 children enqueued per node, 256 characters per text node, and 2,048 characters total. No ancestor/sibling text is inspected. Raw text never enters the report; only bucketed inspected length and phrase flags survive. Form controls, editable content, scripts and styles are skipped.

Exact normalized text-node matches are used. Split or long phrases may be missed. Ordinary chat that quotes an exact phrase may set a flag; flags do not prove the element is promotional. `incomplete` indicates bounded scanning, not absence of a phrase. Generated-class classification is heuristic, not a promise of stability. Unknown semantic identifiers are deliberately lost.

The script does not read cookies, tokens, storage, account objects, form values, or chat APIs. It does not hide/remove/reparent/change the selected component, click it, or add target attributes. It adds only temporary diagnostic UI and outline elements, then removes them and their event handlers. It performs no requests, telemetry, analytics, uploads, remote logging, automatic clipboard access, or GitHub posting. Only the latest sanitized report is retained in userscript memory. The normal website and your userscript manager retain their own behavior; this helper does not stop their network activity.

## Limits and verification

Browser DOM fixtures cover privacy, phrase flags, ordinary messages, bounded large trees, URL reduction, local review/forget, no target mutation, no diagnostic network/storage calls, cancellation/reentry/pagehide cleanup and restored page interaction. The existing 12 stable Nag Eater tests run unchanged. Run `npm ci`, `npx playwright install chromium`, then `npm test`. Syntax checks: `node --check experimental/nag-eater-diagnostic.user.js` and `node --check janitorai-nag-eater.user.js`; whitespace check: `git diff --check`.

Authenticated JanitorAI and real userscript-manager integration have not been tested here. The picker supports light DOM in the top-level document; it does not traverse iframe contents or shadow roots. Native browser top-layer dialogs/fullscreen surfaces may cover its shield; cancel if the outline does not follow the target. Use a desktop pointer for the tested interaction. Capture again after site navigation if necessary. This helper does not observe the page in the background.
