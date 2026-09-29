# Changelog

All notable changes to this project will be documented in this file.

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
