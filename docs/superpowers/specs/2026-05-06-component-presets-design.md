# Component Presets Architecture — Design

**Date:** 2026-05-06
**Status:** Spec — pending implementation plan
**Worktree:** `kouji-target-components` (branch `target-components-list`)

## 1. Goal

Define a single, reusable architecture for stylistic presets (today: `variant` and `size`; tomorrow extensible to `placement`, `density`, etc.) that:

- Lets app authors **configure** each component's allowed values and defaults via Angular DI (global or local), using the standard `provideKj*(…)` factory pattern.
- Centralizes the per-attribute logic — input definition, default resolution, host attribute binding, dev-mode validation — into **shared preset directives** (`KjVariant`, `KjSize`).
- Keeps the inputs **open-string typed** at compile time (no closed unions); the configured values list is an *advisory* runtime list used for defaults and dev-mode warnings only.
- Marks the preset directives as **`@internal`** so they never appear in the public docs site, even though they ship as part of the public bundle.

This is a cross-cutting design: every stylistic component (Button, Badge, Tag, Alert, …) consumes it. Component-specific designs (e.g. Button's a11y contract) live in their own specs and reference this one.

## 2. Architecture (three layers)

### Layer 1 — Preset directives (shared, `@internal`)

One directive per preset attribute. Lives at `packages/core/src/presets/`.

#### `KjVariant`

```ts
// packages/core/src/presets/variant.ts

export interface KjVariantPreset {
  values: string[];
  default: string;
}

export const KJ_VARIANT_PRESET = new InjectionToken<KjVariantPreset>('kj.variant.preset', {
  factory: () => ({ values: ['default'], default: 'default' }),
});

/**
 * Internal preset directive composed via `hostDirectives` by every stylistic
 * component to expose a configurable `variant` input that reflects to a
 * `data-variant` host attribute.
 *
 * App code never imports this directly. Configuration flows from the
 * consumer's `provideKj<Component>(…)` factory through `KJ_VARIANT_PRESET`.
 *
 * @internal
 */
@Directive({
  selector: '[kjVariant]',
  standalone: true,
  host: { '[attr.data-variant]': 'kjVariant()' },
})
export class KjVariant {
  private preset = inject(KJ_VARIANT_PRESET);
  kjVariant = input<string>(this.preset.default);

  constructor() {
    if (isDevMode()) {
      effect(() => {
        const v = this.kjVariant();
        if (!this.preset.values.includes(v)) {
          console.warn(
            `[kj] unknown variant "${v}". Allowed values: ${this.preset.values.join(', ')}.`,
          );
        }
      });
    }
  }
}
```

#### `KjSize`

Identical shape, different attribute and token:

- `KJ_SIZE_PRESET` token (`{ values, default }`).
- `kjSize = input<string>(this.preset.default)` input.
- Host binding `[attr.data-size]="kjSize()"`.
- Same `@internal` tag and dev-mode validator.

These two are the only Layer-1 directives in this spec. Future preset kinds (`KjPlacement`, `KjDensity`, …) follow the same recipe and live alongside them in `presets/`.

### Layer 2 — Per-component config (one per consumer)

Each consumer owns:

- An interface naming the config shape it cares about.
- An `InjectionToken` with a default factory pointing at kouji's shipped defaults.
- A const exporting the shipped default object (so users can spread it when extending).
- A `provideKj<Component>(…)` factory that returns `EnvironmentProviders`.

```ts
// packages/core/src/button/config.ts

export interface KjButtonConfig {
  variants: string[];
  sizes: string[];
  defaults: { variant: string; size: string };
}

export const KJ_BUTTON_DEFAULTS: KjButtonConfig = {
  variants: ['default', 'destructive', 'outline', 'ghost', 'link'],
  sizes: ['sm', 'md', 'lg', 'icon'],
  defaults: { variant: 'default', size: 'md' },
};

export const KJ_BUTTON_CONFIG = new InjectionToken<KjButtonConfig>('kj.button.config', {
  factory: () => KJ_BUTTON_DEFAULTS,
});

export function provideKjButton(config: Partial<KjButtonConfig>): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: KJ_BUTTON_CONFIG,
      useValue: { ...KJ_BUTTON_DEFAULTS, ...config },
    },
  ]);
}
```

User-supplied `variants` / `sizes` arrays **replace** (not merge) the defaults. To extend, the user spreads `KJ_BUTTON_DEFAULTS.variants`:

```ts
provideKjButton({
  variants: [...KJ_BUTTON_DEFAULTS.variants, 'brand', 'warning'],
  defaults: { variant: 'brand', size: 'md' },
})
```

### Layer 3 — Consumer directive (composes preset directives)

Each stylistic consumer:

1. Composes `KjVariant` and `KjSize` (and any a11y directives) via `hostDirectives`, **aliasing** the preset's `kjVariant` / `kjSize` inputs to friendlier names (`variant`, `size`).
2. Provides translation from its component-config token (`KJ_BUTTON_CONFIG`) into the preset tokens (`KJ_VARIANT_PRESET`, `KJ_SIZE_PRESET`).

```ts
// packages/core/src/button/button.ts

@Directive({
  selector: '[kjButton]',
  standalone: true,
  hostDirectives: [
    { directive: KjVariant, inputs: ['kjVariant: variant'] },
    { directive: KjSize,    inputs: ['kjSize: size'] },
    { directive: KjDisabled, inputs: ['kjDisabled'] },
    KjFocusRing,
    // future a11y directives slot in here
  ],
  providers: [...bindPresets(KJ_BUTTON_CONFIG)],
})
export class KjButton {}
```

A small helper `bindPresets(token)` collapses the per-token translation into one line and is reused by every consumer:

```ts
// packages/core/src/presets/bind-presets.ts

export function bindPresets<
  T extends { variants: string[]; sizes: string[]; defaults: { variant: string; size: string } },
>(configToken: InjectionToken<T>): Provider[] {
  return [
    {
      provide: KJ_VARIANT_PRESET,
      useFactory: () => {
        const c = inject(configToken);
        return { values: c.variants, default: c.defaults.variant };
      },
    },
    {
      provide: KJ_SIZE_PRESET,
      useFactory: () => {
        const c = inject(configToken);
        return { values: c.sizes, default: c.defaults.size };
      },
    },
  ];
}
```

Consumers whose config doesn't include both keys (e.g. an Alert with variants only, no sizes) can call lower-level helpers (`bindVariant(token, 'variants', 'defaults.variant')`) or write the providers inline. Implementation detail; out of scope for this spec.

## 3. End-to-end data flow

```
provideKjButton({ variants, sizes, defaults })   // optional, app-level or component-level
        │
        ▼
KJ_BUTTON_CONFIG (DI token, default factory ships kouji presets)
        │
        ▼
KjButton.providers = bindPresets(KJ_BUTTON_CONFIG)
        │
        ├─► KJ_VARIANT_PRESET = { values, default }
        │       │
        │       ▼
        │   KjVariant (composed via hostDirectives)
        │       └─► host attr  data-variant="<resolved value>"
        │
        └─► KJ_SIZE_PRESET = { values, default }
                │
                ▼
            KjSize (composed via hostDirectives)
                └─► host attr  data-size="<resolved value>"
                        │
                        ▼
                    CSS [data-variant="X"][data-size="Y"] applies token flips
                    (kj.component layer + theme overrides via [data-theme="…"])
```

## 4. Public API surface (per stylistic component)

For Button, the published surface from `@kouji-ui/core` becomes:

| Symbol | Kind | TSDoc |
|---|---|---|
| `KjButton` | Directive (consumer) | public |
| `KjButtonConfig` | Interface | public |
| `KJ_BUTTON_DEFAULTS` | Const | public |
| `KJ_BUTTON_CONFIG` | InjectionToken | public |
| `provideKjButton` | Factory | public |
| `KjVariant`, `KjSize` | Preset directives | **`@internal`** (still exported for bundle composition; not in docs) |
| `KJ_VARIANT_PRESET`, `KJ_SIZE_PRESET` | Tokens | **`@internal`** |
| `KjVariantPreset`, `KjSizePreset` | Interfaces | **`@internal`** |
| `bindPresets` | Helper | **`@internal`** (used inside core component definitions only) |

`@internal` symbols stay exported from `public-api.ts` because Angular's `hostDirectives` requires them at consumer-bundle time, but they are filtered out of the docs site by the change in §5.

## 5. Docs extractor — `@internal` filter

`apps/docs/src/lib/docs-extractor.ts` already has a fragile, partial filter at line 536 (it only matches when the input description string *starts with* `@internal`). This spec replaces that with a robust JSDoc-tag-aware check applied at three sites:

1. **Class extraction** — Skip `@Directive`, `@Component`, `@Injectable`, `@Pipe`-decorated classes whose JSDoc has an `@internal` tag.
2. **Input extraction** — Replace the existing `description.startsWith('@internal')` heuristic with a proper tag check on the property's JSDoc.
3. **Token extraction** — Skip `InjectionToken` declarations tagged `@internal`.
4. **Type alias / interface extraction** — Same skip on JSDoc.

Implementation sketch:

```ts
// In docs-extractor.ts (utility added near getJsDocDescription)

function hasInternalTag(node: ts.Node): boolean {
  return ts.getJSDocTags(node).some(t => t.tagName.text === 'internal');
}
```

Call sites:

- `extractClass(...)` → return `null` early if `hasInternalTag(cls)`.
- `extractInputs(...)` → replace `description.startsWith('@internal')` with `hasInternalTag(prop)`.
- `extractTokens(...)` → filter out tokens whose declaration has `hasInternalTag(stmt)`.
- `extractTypeAliases(...)` / `extractInterfaces(...)` → same.

The existing `categoryFallbacks` and `CATEGORY_MAP` need no change — internal symbols never reach the categorization step.

### Verification

After the filter is in, the docs sidebar should:

- Continue showing `KjButton` and its inputs (which are still public).
- *Not* show `KjVariant`, `KjSize`, `KJ_VARIANT_PRESET`, `KJ_SIZE_PRESET`, `KjVariantPreset`, `KjSizePreset`, or `bindPresets` anywhere.

A small unit test on the extractor (using a fixture file containing both internal and public symbols) locks this in.

## 6. Migration impact for existing components

Today's `KjButton` defines closed unions:

```ts
export type KjButtonVariant = 'default' | 'destructive' | 'outline' | 'ghost' | 'link';
export type KjButtonSize = 'sm' | 'md' | 'lg' | 'icon';
```

After this design these become plain `string`. The literal-union types are **removed from the public API**. Consumers narrowing on the union (e.g. `KjButtonVariant`-typed local variables) will see a TS error.

Mitigation:
- Export `KJ_BUTTON_DEFAULTS` so users wanting autocomplete on the kouji-default values can do `keyof typeof KJ_BUTTON_DEFAULTS.variants[number]` themselves, but no public-API type ships for it.
- Note in the changelog: union types removed; configure variant/size via `provideKjButton(…)` and add CSS rules for any new values.

Affected today: only `KjButton` and `KjButtonComponent` (and their `.css`). Other components either don't have presets yet (Card, Kbd, Link) or are wrapper-in-flight per `2026-05-05-components-package-expansion-design.md` and will adopt this design at wrap time.

## 7. Tests

Three test surfaces:

1. **`KjVariant` / `KjSize` unit tests** (`packages/core/src/presets/`):
   - Default value resolves from `KJ_*_PRESET.default` when input not set.
   - Host attribute reflects the input value.
   - Dev-mode warning fires once for unknown values; no warning for known values; no warning when `isDevMode()` is false.

2. **`bindPresets` test**:
   - Translates a `{ variants, sizes, defaults }` config into the two preset tokens correctly.

3. **`provideKjButton` integration test** (`packages/core/src/button/`):
   - Default factory yields `KJ_BUTTON_DEFAULTS`.
   - User override replaces (not merges) `variants`/`sizes`.
   - Resolved presets reach `KjVariant` / `KjSize` when a `KjButton` is rendered.

4. **Extractor unit test** (`apps/docs/src/lib/docs-extractor.spec.ts`):
   - Fixture with one `@internal` directive and one public directive — only the public one appears in the manifest.
   - Same for tokens and type aliases.

## 8. Out of scope

- **Button-specific design** (a11y contract: `aria-pressed`, `aria-busy`, touch target, etc.). Lives in `2026-05-06-button-design.md` (next spec).
- **Other preset kinds** (`KjPlacement`, `KjDensity`, …). Add when the first consuming component lands.
- **CSS preset packs** for non-default variants. Each consumer's `.css` already follows the `[data-variant="…"]` token-flip pattern; new variants are an "add CSS rules" task per consumer, not architectural.
- **Migration of `KjButtonComponent`** (the wrapper). It pipes `variant`/`size` through to the directive and changes the most when the directive's input becomes `string`. Tracked in the Button-specific design.

## 9. Files touched (summary)

**New** (`packages/core/src/presets/`):

- `variant.ts` — `KjVariant` directive, `KJ_VARIANT_PRESET` token, `KjVariantPreset` interface (all `@internal`).
- `size.ts` — same shape for size.
- `bind-presets.ts` — `bindPresets` helper (`@internal`).
- `index.ts` — re-exports.
- `variant.spec.ts`, `size.spec.ts`, `bind-presets.spec.ts`.

**New** (`packages/core/src/button/`):

- `config.ts` — `KjButtonConfig`, `KJ_BUTTON_DEFAULTS`, `KJ_BUTTON_CONFIG`, `provideKjButton`.
- `config.spec.ts`.

**Edited**:

- `packages/core/src/button/button.ts` — adopt `hostDirectives` for `KjVariant`/`KjSize`, drop `KjButtonVariant`/`KjButtonSize` exports, drop the now-redundant `kjVariant`/`kjSize` inputs and host bindings.
- `packages/core/src/button/index.ts`, `packages/core/src/public-api.ts` — re-exports for new symbols, removal of the dropped union types.
- `packages/components/src/button/button.ts` — change `variant`/`size` input types from `KjButtonVariant`/`KjButtonSize` to `string`.
- `apps/docs/src/lib/docs-extractor.ts` — add `hasInternalTag(node)` utility; apply at class, input, token, and type-alias extraction sites; remove the brittle `description.startsWith('@internal')` heuristic.
- `apps/docs/src/lib/docs-extractor.spec.ts` (new or extended) — fixture-based tests for the `@internal` filter.

No changes to themes, routing, theme generator, manifest watcher, or any other component.
