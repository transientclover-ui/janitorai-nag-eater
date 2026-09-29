# JanitorAI Nag Eater

Hides JanitorAI Plus subscription promotional popups and JanitorAI's in-chat "Continue this chat in the app" / "Get the app" promotional banner without clicking buttons, changing account or subscription state, or targeting adblock warnings.

The script uses early, narrowly targeted CSS and a small dynamic-rendering fallback. It has no telemetry, external dependencies, or settings.

The userscript manager menu includes a command that reports how many targeted Plus surfaces and app-promotion banners have been suppressed during the current page session.

The app-promotion banner removal is intentionally conservative: it removes the whole promotional card, uses broad app-prompt wording as a confirming signal rather than one exact phrase, and does not strip ordinary chat messages that happen to mention similar wording.

Authenticated chat behavior and differences between free and paid accounts have not been verified.
