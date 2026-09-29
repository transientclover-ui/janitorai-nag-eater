# JanitorAI Nag Eater

Hides JanitorAI Plus subscription promotional popups without clicking buttons, changing account or subscription state, or targeting adblock warnings.

The script uses early, narrowly targeted CSS and a small dynamic-rendering fallback. It has no telemetry, external runtime dependencies, or settings.

The userscript manager menu reports how many targeted Plus surfaces have been suppressed during the current page session.

Version 0.2.2 makes Plus overlay suppression reversible when a promotion closes or changes. It preserves site-owned DOM nodes and accessibility attributes. App-card suppression remains unimplemented pending real DOM evidence; app cards remain visible.

Authenticated chat behavior and differences between free and paid accounts have not been verified.
