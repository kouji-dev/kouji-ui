# Locale Provider — Design Spec

**Date:** 2026-07-07
**Status:** Approved
**Branch:** `feat/locale`
**Roadmap:** `apps/docs/src/app/pages/roadmap/items/v0.2-locale.md`

## Goal

One DI-provided source of truth for **how locale-sensitive data renders** across
the library — number / currency / date formatting and the logical text
**direction** (`ltr` / `rtl`). Every locale-aware primitive (NumberInput,
DatePicker, TimePicker, Calendar, currency display) reads it instead of drilling
a `kjLocale` prop through every component or re-reading `LOCALE_ID` ad hoc.

This provider is the **shared dependency** that the future **RTL switch** and
**i18n string-catalog** features build on. Its public contract is therefore kept
small, forward-looking, and stable.

## Non-goals (deferred — YAGNI)

- **Translation of visible-text labels / message catalogs** — separate i18n
  roadmap ticket. This provider is about *rendering the same data*, not
  translating copy.
- **Full alternate calendar systems** (Islamic, Buddhist, Japanese, Hebrew) —
  the config reserves a `calendar` field shape but MVP only threads the Gregorian
  `Intl` default. Calendar arithmetic stays in the Calendar primitive.
- **A rendered RTL toggle UI / `<html dir>` mutation** — the RTL switch ticket
  owns the visible control and writing `document.documentElement.dir`. This
  provider only *models* direction as signals + setters the switch will call.
- **Per-component formatting option surface** — components keep their own
  `Intl.*Format` option inputs; the provider supplies the default `locale` /
  `currency` / `direction` they fall back to.

## Public API

Exported from `@kouji-ui/core`.

### `provideKjLocale(config?): EnvironmentProviders`

Application-scope (or route-scope) provider. Seeds the initial locale config.
Mirrors `provideIcons` — `makeEnvironmentProviders`, so it is discovered by the
docs `provider-fn` detector.

```ts
bootstrapApplication(App, {
  providers: [
    provideKjLocale({ locale: 'de-DE', currency: 'EUR', direction: 'auto' }),
  ],
});
```

### `KjLocaleConfig`

```ts
interface KjLocaleConfig {
  /** BCP-47 tag (e.g. 'de-DE'). Defaults to Angular's LOCALE_ID. */
  locale?: string;
  /** 'ltr' | 'rtl' | 'auto'. 'auto' derives from the locale script, then
   *  falls back to the document's <html dir> (KjDirectionality). Default 'auto'. */
  direction?: KjDirection | 'auto';
  /** ISO 4217 default currency for currency formatting (e.g. 'EUR'). */
  currency?: string;
}
```

### `KjLocale` service (`providedIn: 'root'`)

The injectable every primitive reads. Seeds writable state from
`KJ_LOCALE_CONFIG`; exposes read-only signals + `Intl`-backed helpers +
runtime setters (the RTL switch / a language menu call the setters).

```ts
class KjLocale {
  // ── resolved state (signals) ──
  readonly locale:    Signal<string>;        // config.locale || LOCALE_ID
  readonly direction: Signal<KjDirection>;   // resolved ltr|rtl
  readonly currency:  Signal<string | undefined>;
  readonly isRtl:     Signal<boolean>;

  // ── runtime mutation (for RTL switch / language menu) ──
  setLocale(tag: string): void;
  setDirection(dir: KjDirection | 'auto'): void;
  setCurrency(code: string | undefined): void;

  // ── Intl-backed formatting (use resolved locale by default) ──
  formatNumber(value: number, options?: Intl.NumberFormatOptions): string;
  formatCurrency(value: number, currency?: string, options?: Intl.NumberFormatOptions): string;
  formatDate(value: Date, options?: Intl.DateTimeFormatOptions): string;
  numberFormat(options?: Intl.NumberFormatOptions): Intl.NumberFormat;
  dateTimeFormat(options?: Intl.DateTimeFormatOptions): Intl.DateTimeFormat;
}
```

### `KJ_LOCALE_CONFIG`

`InjectionToken<KjLocaleConfig>` with a default factory yielding `{}` — so
`KjLocale` works with zero configuration (everything falls back to `LOCALE_ID`
and `<html dir>`).

## Direction resolution

`direction: 'auto'` (the default) resolves in order:

1. `Intl.Locale(tag).getTextInfo?.().direction` (or the legacy `.textInfo`) —
   e.g. `ar`, `he`, `fa`, `ur` → `'rtl'`.
2. Fallback RTL-script allow-list for engines without `getTextInfo`.
3. `KjDirectionality.current()` — the existing primitive that reads `<html dir>`.

An explicit `'ltr'` / `'rtl'` in config or via `setDirection` wins over `'auto'`.

**Relationship to `KjDirectionality`:** that primitive is the low-level *reader*
of `<html dir>`. `KjLocale.direction` is the *policy* signal primitives consume —
it layers locale-derived + app-configured direction on top of the raw DOM read.
Primitives should read `KjLocale.direction`; only `KjLocale` reads
`KjDirectionality`.

## What it feeds (MVP proof wiring)

- **NumberInput** — replaces the bare `LOCALE_ID` fallback so `kjLocale` /
  `kjCurrency` default to the provider. Explicit directive inputs still win.
- **DatePicker** — `locale` computed falls back to `KjLocale.locale()` instead of
  `LOCALE_ID`.

Remaining primitives (TimePicker, Calendar, Slider, currency Tag, etc.) are left
with a clear TODO — same one-line swap (`inject(LOCALE_ID)` →
`inject(KjLocale).locale()`), deferred to keep this PR to a demonstrable contract.

## Why this shape

- **Signals, not props** — one injected source; components fall back to it, so no
  prop-drilling and runtime locale/direction switches propagate reactively.
- **Setters up front** — the RTL switch and a language menu are the next
  consumers; giving them `setDirection` / `setLocale` now avoids a breaking
  reshape later.
- **`EnvironmentProviders` + `@doc`** — matches `provideIcons`, auto-surfaces in
  docs, and is app/route-scoped (locale is a global concern).
- **`Intl` only** — no new deps (stack rule), SSR-safe, and anything
  `LOCALE_ID` supports works with zero config.

## Accessibility

- `direction` / `isRtl` give primitives a correct logical direction to emit
  `dir` / choose arrow-key handlers (WCAG 1.3.2 Meaningful Sequence, 1.4.10
  Reflow).
- Formatting helpers produce locale-correct digit grouping / currency symbols so
  `aria-valuetext` and visible text agree (WCAG 1.3.1).
- No focusable UI is introduced here; the visible RTL control (and its keyboard
  contract) belongs to the RTL switch ticket.
