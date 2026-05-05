---
'@kouji-ui/core': patch
---

`kj-input` now supports `type="color"` and a new `value` input that forwards to the underlying native input via property binding. Includes a `data-type` host attribute (mirrors `type`) and a small built-in style normalization for color swatches (44×32px). Existing `type` values and form-control bindings continue to work unchanged.

Core fix in `kjInput`: the directive's CVA-to-DOM reflection now skips writing when the form control's value is null/undefined, so external `[value]` bindings work for non-form usage. Form-bound usage is unchanged (callers clear via `setValue('')`).

These changes power the new in-app theme generator at `/theme-generator` in the docs site — fork built-in themes, edit colors with the native picker, tweak shape/font/motion controls, save multiple drafts to localStorage, export as CSS or JSON, import JSON back.
