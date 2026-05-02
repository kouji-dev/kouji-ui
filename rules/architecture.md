# Architecture Rules

## Package Structure

- `@kouji-ui/core` — zero CSS, zero Angular components, directives only
- `@kouji-ui/ui` — styled implementation using Tailwind v4, wraps core directives in Angular components

## Signal-Context Pattern

Inter-directive communication (Select ↔ Option, Tabs ↔ TabPanel, Dialog ↔ Close button) uses injected signal contexts via `InjectionToken`:

```ts
// 1. Define context interface + token (in <name>.context.ts)
export interface KjSelectContext {
  value: Signal<unknown>;
  open: Signal<boolean>;
  select: (value: unknown) => void;
}
export const KJ_SELECT = new InjectionToken<KjSelectContext>('KjSelect');

// 2. Root directive provides it
@Directive({
  selector: '[kjSelect]',
  providers: [{ provide: KJ_SELECT, useExisting: KjSelect }],
})
export class KjSelect implements KjSelectContext { ... }

// 3. Child directives inject it
@Directive({ selector: '[kjOption]' })
export class KjOption {
  private ctx = inject(KJ_SELECT);
}
```

## Host Directives for Behaviour Composition

Shared behaviours (disabled state, focus ring, form control, ARIA attributes) are standalone directives composed via `hostDirectives`:

```ts
@Directive({
  selector: '[kjButton]',
  hostDirectives: [KjDisabled, KjFocusRing],
})
export class KjButton { ... }
```

**Input aliasing:** All inputs forwarded via `hostDirectives` must be aliased with the `kj` prefix. Un-prefixed inputs are never part of the public API.

```ts
// ✅ correct
hostDirectives: [{ directive: KjDisabled, inputs: ['kjDisabled: kjDisabled'] }]

// ❌ wrong — exposes internal name
hostDirectives: [KjDisabled]  // exposes `kjDisabled` as-is only if the input name already matches
```

## ARIA via Host Bindings

All accessibility attributes are declared in the directive's `host` object — never set via `Renderer2` or direct DOM manipulation:

```ts
@Directive({
  selector: '[kjOption]',
  host: {
    'role': 'option',
    '[attr.aria-selected]': 'selected()',
    '[attr.aria-disabled]': 'disabled()',
  },
})
```

## Form Controls: KjFormControl Composition

All form input directives (`KjInput`, `KjCheckbox`, `KjRadio`, `KjSelect`, `KjToggle`, and any future form controls) **must** compose `KjFormControl` via `hostDirectives`.

`KjFormControl` is the single place that implements Angular's `ControlValueAccessor` and wires reactive forms / template-driven forms. It exposes signals: `value`, `disabled`, `touched`, `dirty`, `valid`, `invalid`.

## Overlay Primitive

All overlay-based components (dialog, tooltip, popover, menu, select dropdown) share position management via a custom `KjOverlayService` in `packages/core/src/primitives/overlay/`. It uses native browser APIs only (no third-party positioning library):
- Connected positioning (tooltips, popovers, menus, select) → CSS `position: fixed` + manual coordinate calculation using `getBoundingClientRect()`
- Global-center positioning (dialogs, modals) → CSS `position: fixed; inset: 0` with flex centering
- SSR-safe initialisation via `afterNextRender()`

Never reimplement overlay positioning per component.

## One Directive Per File

Each directive lives in its own file named after the directive (following the naming rule in `code_style.md`). Do not group multiple directives in one file.

**Why:** Co-located directives in one large file make it hard to find, navigate, and independently test individual directives. Each file should have one clear responsibility.

```
accordion/
  accordion.ts          ← KjAccordion only
  accordion-item.ts     ← KjAccordionItem only
  accordion-trigger.ts  ← KjAccordionTrigger only
  accordion-content.ts  ← KjAccordionContent only
  accordion.context.ts  ← shared context interface + token
  index.ts
```

**Exception:** A root directive and a tightly-coupled child directive that is never used independently may share a file only if both are short (< 30 lines each). When in doubt, split.

## File & Folder Conventions

```
packages/core/src/
  primitives/           ← shared behaviour directives (KjDisabled, KjFocusRing, KjFormControl, etc.)
    interaction/
    forms/
    overlay/
  <component>/
    <component>.ts      ← directive(s)
    <component>.context.ts   ← InjectionToken + interface (if needed)
    <component>.spec.ts
    index.ts
  a11y/                 ← accessibility utilities (KjFocusTrap, KjLiveRegion, KjRovingTabindex, etc.)
  index.ts              ← public-api.ts re-export
```
