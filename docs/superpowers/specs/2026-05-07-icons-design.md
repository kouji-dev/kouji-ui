# Icon System Design

**Date:** 2026-05-07
**Status:** Draft (awaiting user review)
**Worktree:** `worktree-icons`

## Problem

`@kouji-ui/components` has no shared icon primitive. Today, every example and consumer inlines raw `<svg>` markup (see `packages/components/src/button/button.icon.example.ts`). This means:

- No consistent sizing, color, or accessibility behavior across components.
- No way for consumers to register an icon set once and reference icons by name.
- No path for shipping a first-party icon adapter (e.g. Lucide) without coupling the core to a specific icon library.
- Decorative vs meaningful icon a11y rules are left to each consumer to remember.

## Goals

1. A provider-agnostic icon layer in `@kouji-ui/core` that handles registration, resolution, rendering, and accessibility.
2. A pluggable adapter pattern so any icon set (Lucide, Heroicons, Phosphor, Iconify, font icons) can be wired in.
3. A first-party Lucide adapter shipped from `@kouji-ui/components`.
4. WCAG 1.1.1 / 1.4.1 / 1.4.11 compliance enforced by the directive (not delegated to consumers).
5. Pure-projection composition with existing components (button, alert, etc.) — components remain icon-agnostic.

## Non-goals (v1)

- Multi-color SVGs (the CSS mask-image approach is monochrome). Future `@inline.` mode may address this.
- SVG sprite sheets (`<use href="#id">`). Future `@sprite.` mode.
- Async loader retry/error UI / suspense integration. v1 ships the loader token + a simple resolution cache only.
- Runtime contrast measurement. Contrast is guaranteed via design tokens, not measured.
- Any `<kj-icon>` standalone component. Directive-only.

## Architecture

### Package layout

```
@kouji-ui/core/icon                  ← new sub-entry, zero icon-set deps
  KjIconDirective                    selector: [kjIcon]
  KJ_ICON_REGISTRY                   InjectionToken<Map<string, string>>
  KJ_ICON_RESOLVER                   InjectionToken<IconResolver>
  KJ_ICON_LOADER                     InjectionToken<IconLoader | null>
  provideIcons(map)
  provideIconResolver(fn)
  provideIconLoader(fn)
  kjInjectIconResolver()
  IconResolver, IconLoader, KjIconColor, KjIconSize types
  icon.css                           ships in core, imported by consumers

@kouji-ui/components/icon/lucide     ← first-party adapter
  provideLucideIcons(set)            depends on lucide-static
```

Core has zero runtime dependency on any icon set. The Lucide adapter lives in `components` and depends on `lucide-static` (raw SVG strings). Apps can use `provideLucideIcons()` from `components`, or write their own adapter against the core types without ever importing `components`.

### Rendering model (CSS, not DOM)

Inspired by Taiga UI's `TuiIcons` directive. The directive does not inject SVG markup or set `innerHTML`. Instead it writes a CSS custom property on the host element, and a stylesheet uses `mask-image` (for SVG/CSS icons) or `content` (for font icons) to render.

**Why:** no `DomSanitizer`, no parsing, no async loader needed for the common path (browser fetches the URL itself), and the icon is naturally tinted by `currentColor`.

### Resolution model

Icons are referenced by name (string). The name is resolved to a single string value — either a `url(...)` for SVG/CSS-mask mode, or a `'<glyph>'` for font mode.

Mode is encoded in the name by convention:
- `@font.<rest>` → font mode (CSS `content`)
- anything else → svg mode (CSS `mask-image`)

The resolver layered DI tokens, checked in this order:
1. **`KJ_ICON_REGISTRY`** — eager `Map<string, string>` populated by `provideIcons({...})`. Direct lookup. Synchronous.
2. **`KJ_ICON_LOADER`** — optional async `(name) => Promise<string>` for "download or whatever" cases. Result is memoized into a runtime cache, and the directive re-evaluates when the cache fills. Until then, the directive renders no icon (host stays empty).
3. **`KJ_ICON_RESOLVER`** — synchronous default `(name) => string` for URL synthesis (e.g. `/assets/icons/${name}.svg`). The fallback when no registry entry and no loader exist.

## Public API

### Types

```ts
export type IconResolver = (name: string) => string;            // sync, returns URL or '@font.glyph'
export type IconLoader   = (name: string) => Promise<string>;   // async escape hatch

export type KjIconColor = 'inherit' | 'muted' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
export type KjIconSize  = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
```

### Tokens

```ts
export const KJ_ICON_REGISTRY: InjectionToken<Map<string, string>>;
export const KJ_ICON_RESOLVER: InjectionToken<IconResolver>;
export const KJ_ICON_LOADER:   InjectionToken<IconLoader | null>;
```

### Provider helpers

```ts
export function provideIcons(map: Record<string, string>): EnvironmentProviders;
export function provideIconResolver(fn: IconResolver): EnvironmentProviders;
export function provideIconLoader(fn: IconLoader): EnvironmentProviders;
```

`provideIcons` is multi-merge-safe: calling it multiple times merges into the same registry map. Last-wins on key collision.

**Registry value format:** the string stored under each key is the *fully formatted CSS value* that will be written to `--kj-icon`. For svg mode that's `url("...")` (including the `url(...)` wrapper). For font mode that's the quoted glyph (e.g. `"\\f013"`). This keeps the directive's render path branch-free — it just reads the registry value verbatim and assigns it to the custom property. Adapter authors (e.g. `provideLucideIcons`) are responsible for the wrapping.

### Resolution helper

```ts
export function kjInjectIconResolver(): (name: string) => string | null;
```

Returns a unified resolver fn that walks registry → loader cache (kicking off load if missing) → resolver fallback. Returns `null` while an async load is pending.

### Directive

```ts
@Directive({
  selector: '[kjIcon]',
  standalone: true,
  host: {
    'class': 'kj-icon',
    '[style.--kj-icon]':           'iconValue()',
    '[style.color]':               'colorVar()',
    '[style.font-size]':           'sizeVar()',
    '[attr.data-kj-icon-mode]':    'mode()',
    '[attr.aria-hidden]':          'ariaHidden()',
    '[attr.role]':                 'role()',
    '[attr.aria-label]':           'kjIconLabel()',
  },
})
export class KjIconDirective {
  readonly kjIcon      = input.required<string>();
  readonly kjIconLabel = input<string | null>(null);
  readonly kjIconColor = input<KjIconColor | null>(null);
  readonly kjIconSize  = input<KjIconSize | null>(null);

  // Computed signals (sketch)
  protected readonly iconValue = computed(() => /* resolved() ? format() : null */);
  protected readonly mode      = computed(() => getIconMode(this.kjIcon()));
  protected readonly ariaHidden = computed(() => this.kjIconLabel() ? null : 'true');
  protected readonly role      = computed(() => this.kjIconLabel() ? 'img' : null);
  protected readonly colorVar  = computed(() => {
    const c = this.kjIconColor();
    return c && c !== 'inherit' ? `var(--kj-color-icon-${c})` : null;
  });
  protected readonly sizeVar   = computed(() => {
    const s = this.kjIconSize();
    return s ? `var(--kj-icon-size-${s})` : null;
  });
}
```

### Stylesheet (`@kouji-ui/core/icon/icon.css`)

```css
.kj-icon {
  display: inline-block;
  width: 1em;
  height: 1em;
  flex-shrink: 0;
  line-height: 1;
}
.kj-icon[data-kj-icon-mode="svg"] {
  background-color: currentColor;
  mask-image: var(--kj-icon);
  -webkit-mask-image: var(--kj-icon);
  mask-size: contain;
  -webkit-mask-size: contain;
  mask-repeat: no-repeat;
  -webkit-mask-repeat: no-repeat;
  mask-position: center;
  -webkit-mask-position: center;
}
.kj-icon[data-kj-icon-mode="font"] {
  font-family: var(--kj-icon-font, inherit);
}
.kj-icon[data-kj-icon-mode="font"]::before {
  content: var(--kj-icon);
}
```

The stylesheet is shipped with `@kouji-ui/core` and imported once by the consuming app (or auto-imported via the existing kouji theme bundle — TBD during implementation; align with how core ships `divider.css` etc. today).

## Accessibility model

The directive owns all icon a11y attributes. Consumers never write `aria-hidden`, `role`, or `aria-label` on icons themselves.

| Mode | Triggered by | `aria-hidden` | `role` | `aria-label` |
|---|---|---|---|---|
| Decorative (default) | `[kjIcon]="x"` only | `"true"` | — | — |
| Meaningful | `[kjIconLabel]="text"` set | — | `"img"` | `text` |

This satisfies WCAG 1.1.1 (every non-text element either has a name or is hidden).

**Color tokens and WCAG 1.4.11 (3:1 contrast for meaningful icons):**
The semantic color tokens (`danger`, `success`, `warning`, `info`, `primary`) are theme-validated to meet 3:1 against their semantic background pairings. Consumers using these tokens get contrast compliance by construction. Custom CSS color overrides are the consumer's responsibility.

**WCAG 1.4.1 (don't rely on color alone):**
Documented guidance — meaningful icons must be recognizable by *shape* as well as color. The directive does not enforce this (it can't); the design system docs and component examples model the pattern.

## Composition with components (pure projection)

Components do not know about the icon system. Consumers compose by projecting `[kjIcon]` elements into the component's content slot. Component CSS uses standard layout (`display: flex; gap: ...`) to position projected icons; no special slot directives or content-children queries are required.

```html
<!-- decorative icon next to text -->
<kj-button>
  <span kjIcon="settings"></span>
  Save
</kj-button>

<!-- icon-only button: button is labeled, icon stays decorative -->
<kj-button kjAriaLabel="Settings">
  <span kjIcon="settings"></span>
</kj-button>

<!-- meaningful icon inside an alert -->
<kj-alert kjVariant="warning">
  <span kjIcon="alert-triangle" kjIconLabel="Warning"></span>
  Disk almost full.
</kj-alert>

<!-- token-driven color and size -->
<span kjIcon="check-circle" kjIconColor="success" kjIconSize="lg"></span>
```

Existing examples in `packages/components/src/**/*.example.ts` will be migrated from inlined `<svg>` to `[kjIcon]` as part of implementation.

## Lucide adapter

Lives in `@kouji-ui/components/icon/lucide`. Depends on `lucide-static` (raw SVG strings, not the Angular component package).

```ts
// @kouji-ui/components/icon/lucide
import { Settings, Trash2, AlertTriangle /* ... tree-shaken */ } from 'lucide-static';
import { provideIcons } from '@kouji-ui/core/icon';

export function provideLucideIcons(
  set: Record<string, string>,
): EnvironmentProviders {
  const map = Object.fromEntries(
    Object.entries(set).map(([name, svg]) => [
      name,
      `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`,
    ]),
  );
  return provideIcons(map);
}
```

**Why `lucide-static` and not `lucide-angular`:** `lucide-angular` ships icons as Angular components, which is incompatible with the CSS-mask rendering model. `lucide-static` is the raw-SVG-string export used internally by all Lucide framework wrappers.

**Why `data:` URIs:** `mask-image` requires a URL. Wrapping the SVG string as a `data:image/svg+xml,utf8,...` URI keeps the icon inline in the bundle (no network round-trip) while satisfying the CSS contract. Lucide is monochrome, which is exactly what `mask-image` + `currentColor` supports.

Consumer usage:
```ts
import { Settings, Trash2 } from 'lucide-static';
import { provideLucideIcons } from '@kouji-ui/components/icon/lucide';

bootstrapApplication(AppComponent, {
  providers: [
    provideLucideIcons({ settings: Settings, 'trash-2': Trash2 }),
  ],
});
```

## File-by-file plan (high level)

```
packages/core/src/icon/
  index.ts
  icon.directive.ts        KjIconDirective
  icon.tokens.ts           KJ_ICON_REGISTRY, KJ_ICON_RESOLVER, KJ_ICON_LOADER
  icon.providers.ts        provideIcons, provideIconResolver, provideIconLoader
  icon.resolver.ts         kjInjectIconResolver
  icon.types.ts            IconResolver, IconLoader, KjIconColor, KjIconSize
  icon.css                 stylesheet shipped with package
  icon.spec.ts             unit tests

packages/core/src/public-api.ts                          export * from './icon'
packages/core/ng-package.json                            sub-entry config (if needed)

packages/components/src/icon/lucide/
  index.ts
  provide-lucide-icons.ts
  provide-lucide-icons.spec.ts

packages/components/src/<component>/<component>.example.ts   migrate inlined <svg> to [kjIcon]
```

## Testing

- **Unit:** directive sets correct CSS custom property, mode attr, and aria attrs given various input combinations. Resolver order (registry → loader → fallback) matches contract. Loader cache de-dupes concurrent calls for the same name.
- **Visual:** existing component examples migrated to `[kjIcon]` render identically (Storybook visual diff).
- **E2E:** at least one app-level smoke test verifies an icon-only button with `kjAriaLabel` is announced correctly by axe-core. Per global rules, every new feature gets E2E coverage.
- **A11y:** axe-core assertions in unit tests for both decorative and labeled modes.

## Open questions

None remaining at design time. The following are deferred to implementation:

- Whether `icon.css` is auto-imported via the existing kouji theme bundle, or requires an explicit import. Decide by inspecting how `divider.css` etc. ship today.
- Whether `KJ_ICON_REGISTRY` is a `Map` or a plain `Record`. `Map` is friendlier for runtime mutation by the loader cache; settle in the implementation plan.

## Out-of-scope follow-ups

- `@sprite.id` mode — `<svg><use href="#id">` for sprite sheets.
- `@inline.` escape hatch for multi-color SVGs that need direct DOM injection.
- Iconify CSS adapter (`@iconify/json` → `data:` URIs at build time).
- Async loader observability (loading state, error UI, retry).
- ESLint rule that flags `[kjIcon]` without `kjIconLabel` inside icon-only buttons.
