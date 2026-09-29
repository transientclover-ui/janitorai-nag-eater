# Changelog

All notable changes to this project will be documented in this file.

## [0.2.2] - 2026-09-28

### Fixed

- Made the existing Plus-only CSS suppression reversible: release overlay markers when the target closes, moves, disappears, or changes class.
- Preserve site-owned nodes, children, state, event listeners, and accessibility attributes; no longer set persistent `aria-hidden` or `inert` on overlays.
- Separate the `:has()` CSS rule from the surface/marker rule so unsupported selector parsing cannot discard the fallback.
- Observe class and open-state changes as well as child-list changes; continue counting each surface once.

### Testing and scope

- All 12 Chromium browser tests pass, including node identity/state retention, renderer-style unmounting, overlay reuse and marker-only fallback, normal controls/navigation/errors, and untouched app-banner candidates.
- No new promotional targets. The unknown app card remains unimplemented pending real DOM evidence.
- Live authenticated JanitorAI testing remains unavailable; modal focus/scroll effects are not validated or changed.

## [0.2.1] - 2026-09-28

### Fixed

- Fixed v0.2.0 hiding ordinary JanitorAI UI and chat content: concatenating comma-separated container and text selector lists emitted bare `h2`, `h3`, `p`, `div`, `span`, `a`, `button`, and `li` selectors with `display: none !important`.
- Removed the unverified app-banner suppression, restoring the pre-regression Plus-only implementation and its suppression-count menu. App banners remain visible pending safe live verification.

### Testing

- Replaced selector-agnostic DOM mocks with six Chromium browser tests covering actual visibility, chat input/button interaction, early CSS, delayed/recreated Plus surfaces, counts, and preservation of unrelated UI and app-banner containers.
- The visibility regression test fails against released v0.2.0 and passes against this patch.
- Live JanitorAI testing was blocked by the browser environment's site-safety policy; authenticated chat behavior remains unverified.

## [0.2.0] - 2026-09-28

### Added

- Removal of JanitorAI's web-chatting promotional app-banner surfaced inside chats, including copy such as "Continue this chat in the app", "Pick up right where you are", and "Get the app".
- Detection treats the whole promotional container as the unit to remove rather than deleting individual words or buttons.
- Text matching is used as a confirming signal across several common "open the app" phrases rather than one exact sentence, and is combined with structural signals so ordinary chat text that mentions similar words is not removed.
- Existing Plus-surface suppression and suppression-count menu command are preserved.

### Changed

- Updated changelog, README, and public listing description for the new behavior.
- Bumped userscript version to 0.2.0.

### Testing

- Added automated coverage for app-banner removal and for preservation of ordinary chat content that mentions app-related wording.
- All existing tests continue to pass.

## [0.1.1] - 2026-09-27

### Added

- Early, targeted CSS suppression for the confirmed JanitorAI Plus modal surface.
- Lightweight dynamic-rendering fallback for delayed popups and client-side navigation.
- Violentmonkey and Tampermonkey metadata.
- Project documentation and MIT license.
