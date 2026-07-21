---
'@kouji-ui/core': minor
'@kouji-ui/components': minor
---

Field errors that never shift the layout, and server-error helpers for forms.

- `KjFieldError` gains `kjFieldErrorReserve` (core) / `kj-field-error` gains `kjReserve` (components): the error line keeps a one-line box while the field is valid (`data-hidden` + `visibility: hidden`) instead of `display: none`, so error text appearing/disappearing never repositions the surrounding fields. Default behaviour unchanged.
- New `kjApplyServerErrors(form, fields, options?)` in core: applies backend field-error maps (`{ path: message | messages[] }`) onto a `FormGroup` — merges `{ server: string[] }` into each matching control's errors, marks it touched, and returns the unmatched paths so callers can surface them globally. `kjServerErrorsOf(control)` reads them back for templates.
