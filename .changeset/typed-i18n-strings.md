---
'@kouji-ui/core': minor
---

Add i18n — typed translation strings for the library's visible / assistive-text
surface, built on the locale provider.

`KjTranslateService` resolves strings from typed, tree-shakable per-locale
catalogs, selecting the active catalog from `KjLocale.locale()` (exact tag →
bare language subtag → `en`) with a guaranteed fallback to the English source so
the UI never blanks out on a missing key. Values support `{name}` interpolation.
The `KjTranslate` directive writes a localized string into its host — either the
text content or a named attribute (e.g. `kjTranslateAttr="aria-label"`) — fully
reactive to locale changes via signals (no pipe, no CDK).

Ships the typed `EN_CATALOG` (source of truth; the `KjTranslationKey` union is
derived from it, so misspelled keys fail `tsc`) covering the named strings —
toast close, dialog close, pagination labels, and a11y live-region
announcements — plus a `FR_CATALOG` (French) as proof. Register alternates with
`provideKjTranslations({ fr: FR_CATALOG })`. `KjToastClose` now carries a
localized default `aria-label` from the `'toast.close'` key (overridable via
`kjToastCloseLabel`).

Deferred to follow-ups: retrofitting every component's static config token
(pagination, breadcrumb, dialog, table announcements) to source from the
catalog, ICU plural / select formatting, a shipped language-switch UI, and async
catalog loading.
