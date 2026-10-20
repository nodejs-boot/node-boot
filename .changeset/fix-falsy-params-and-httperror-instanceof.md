---
"@nodeboot/engine": patch
"@nodeboot/error": patch
---

Fixed two bugs affecting controllers and custom errors.

-   Controller methods now receive their parameters in the right positions. Previously, an absent optional parameter or a falsy value (`undefined`, `null`, `0`, `false`, `""`) was dropped, so every parameter after it shifted one position left and received the wrong value.
-   Custom classes that extend `HttpError` (or any built-in HTTP error) now pass `instanceof` checks for their own class without having to reset the prototype by hand.
