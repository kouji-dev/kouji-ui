---
'@kouji-ui/core': minor
---

Add the locale provider — one DI source of truth for locale-sensitive rendering.

`provideKjLocale({ locale, direction, currency })` seeds a root `KjLocale`
service exposing `locale` / `direction` / `isRtl` / `currency` signals, runtime
setters (`setLocale` / `setDirection` / `setCurrency` — the seam the RTL switch
and language menu build on), and `Intl`-backed `formatNumber` / `formatCurrency`
/ `formatDate` helpers. `direction: 'auto'` derives ltr/rtl from the locale
script, falling back to the document's `<html dir>` via `KjDirectionality`.

`KjNumberInput` and `KjDatePicker` now fall back to the provider for their
locale (and NumberInput for its default currency) instead of the bare
`LOCALE_ID`; explicit `kjLocale` / `kjCurrency` inputs still win. Remaining
locale-sensitive primitives (TimePicker, Calendar, Slider) are unchanged and
can adopt the same one-line fallback next.

Deferred to separate roadmap items: the visible RTL toggle UI + `<html dir>`
mutation (RTL switch), alternate calendar systems, and translation-string
catalogs (i18n).
