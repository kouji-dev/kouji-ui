---
'@kouji-ui/core': patch
---

An overlay that starts closing stops owning Escape and outside presses once the event that closed it has finished. Since 0.13.1 the stack marks the Escape it handles (`preventDefault()`), so an Escape pressed during a popup's close animation (or while a tooltip fades out) was spent on the closing popup and never reached the app's own listeners. It now goes to the overlay beneath, or to the app.
