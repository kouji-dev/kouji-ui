---
'@kouji-ui/core': minor
---

Remove `kjApplyServerErrors` / `kjServerErrorsOf` (and their types) from core/form, introduced in 0.4.0. Mapping backend error payloads onto a `FormGroup` is application logic, not a UI primitive — the library keeps only the display side (`kj-field-error` with `kjReserve`, `[kjInvalid]`); consumers own the wiring from their API's error shape to control errors.
