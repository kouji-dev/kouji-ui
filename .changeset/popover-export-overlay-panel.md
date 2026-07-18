---
'@kouji-ui/components': patch
---

Re-export `KjOverlayPanel` and the `KjOverlayTriggerLike` type from `@kouji-ui/components`.

`KjPopoverTrigger.controller` is typed as `KjOverlayPanel`, but that symbol was only exported from `@kouji-ui/core`. Consumers that import the popover from `@kouji-ui/components` and call `trigger.controller.close()` in a template failed AOT template type-checking with `NG3004: Unable to import symbol KjOverlayPanel` (dev HMR skipped the check, so it only surfaced on a clean `ng build`). Re-exporting the type from the components entry point fixes the clean build without any runtime change.
