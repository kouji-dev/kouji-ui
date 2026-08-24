---
"@kouji-ui/core": patch
"@kouji-ui/components": patch
---

Respect `provideKjButton` defaults and button-group cascade everywhere.

- `KjVariant`/`KjSize` gain an optional fallback context (`KJ_VARIANT_FALLBACK`/`KJ_SIZE_FALLBACK`): explicit input > enclosing group cascade > `provideKj*` default > library default.
- Element wrappers (`kj-button`, `kj-badge`, breadcrumb, chat, link, pagination, progress-bar, spinner, textarea) no longer hardcode `variant`/`size` defaults that clobbered the provider config — a bare `<kj-button>` now honors `provideKjButton({ defaults })`.
- `kj-button-group` cascades its `kjVariant`/`kjSize`/`kjDisabled` to child buttons (both `<button kjButton>` and `<kj-button>` forms).
