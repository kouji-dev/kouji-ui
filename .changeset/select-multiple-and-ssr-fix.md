---
'@kouji-ui/core': patch
'@kouji-ui/components': patch
'@kouji-ui/themes': patch
---

- `<kj-select>` now exposes `[multiple]`, forwarding to the underlying
  `KjSelectTrigger`'s `kjMultiple` input. The wrapper's display label
  joins array values into a comma-separated list when multi mode is
  on (placeholder shown when empty). Fills the gap that previously
  required dropping to the headless directives for multi-select.
- `KjTimePickerSegment` reflect-effect now guards the `document`
  reference so server-side rendering no longer throws
  `ReferenceError: document is not defined` while pre-rendering the
  time-picker.
