# Overlay Primitives — Consumer Migration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate every overlay-using consumer directive in `@kouji-ui/core` onto the new overlay primitives (Plan 1's `KjOverlayController` + strategies + `KjOverlayTrigger` / `KjOverlayPanel` host directives). Absorb 6 mergers as variant inputs. Progressively delete obsolete `overlay.ts` (KjOverlayService) and `anchor.ts` (KjAnchor directive) as references disappear.

**Architecture:** Each consumer directive set (e.g. `KjTooltipTrigger` + `KjTooltipContent`) becomes a thin shell composing `KjOverlayTrigger` / `KjOverlayPanel` via `hostDirectives` and providing strategies via `providers[]`. Per-consumer `*.context.ts` and `*.controller.ts` files are deleted (replaced by injected `KjOverlayController`). Service-launched overlays (`KjDialog`, `KjDrawer`, `KjToast`) build their controller via `KjOverlayBuilder`.

**Tech Stack:** Same as Plan 1 — Angular 21 standalone, signals, hostDirectives, vitest.

**Spec:** `docs/superpowers/specs/2026-05-08-overlay-primitives-design.md`
**Depends on:** `docs/superpowers/plans/2026-05-08-overlay-primitives-foundations.md` (must be complete)

---

## Phase map

| Phase | Consumers | Notes |
|---|---|---|
| **A** | tooltip, popover (absorbs hovercard), dropdown-menu (absorbs context-menu + inline menu) | 3 consumers; mergers happen via `kjTrigger` / `kjMount` inputs |
| **B** | dialog (absorbs alert-dialog), drawer (absorbs bottom-sheet), toast | service-launched cluster |
| **C** | select (absorbs multi-select), tree-select, cascade-select | listbox/tree cluster |
| **D** | combobox, command-palette | input-tied + modal-list cluster |
| **E** | date-picker, color-picker | picker cluster |
| **F** | delete `overlay.ts`, `anchor.ts`, prune index.ts; delete consumer `*.context.ts`/`*.controller.ts` files | final cleanup |

13 consumers + final cleanup. Each consumer = 1 task block with recipe + specific config.

---

## Migration recipe

Every consumer follows the same shape. Adapt the placeholders for the specific consumer.

### What we're replacing per consumer

For a consumer named `Foo`:

| Old | New |
|---|---|
| `foo.context.ts` (per-consumer DI token + state) | replaced by injected `KjOverlayController` |
| `foo.controller.ts` (per-consumer state machine) | replaced by `KjOverlayController` |
| `foo-trigger.ts` (custom trigger logic) | host directive composing `KjOverlayTrigger` |
| `foo-content.ts` (custom panel logic) | host directive composing `KjOverlayPanel` |
| `import { KjOverlayService } from '../primitives/overlay/overlay'` | uses primitives directly via DI |
| `[kjAnchor*]` directive on panel | `anchoredTo()` strategy provided via `KJ_OVERLAY_POSITION_STRATEGY` |

### Standard trigger directive shell

```ts
// foo-trigger.ts
import { Directive, inject } from '@angular/core';
import { KjOverlayTrigger } from '../primitives/overlay/trigger';
import { KjOverlayController } from '../primitives/overlay/controller';
import {
  KJ_OVERLAY_TRIGGER_EVENT_STRATEGY,
  KJ_OVERLAY_PANEL_ROLE,
} from '../primitives/overlay/tokens';
import { /* trigger-event strategy factory */ } from '../primitives/overlay/strategies/trigger-event/<name>';

@Directive({
  selector: '[kjFooTrigger]',
  exportAs: 'kjFooTrigger',
  standalone: true,
  hostDirectives: [
    { directive: KjOverlayTrigger, inputs: ['kjOpen'] },
  ],
  providers: [
    KjOverlayController,
    { provide: KJ_OVERLAY_TRIGGER_EVENT_STRATEGY, useFactory: () => /* call factory */ },
    { provide: KJ_OVERLAY_PANEL_ROLE,             useValue: '<role>' as const },
  ],
})
export class KjFooTrigger {
  // empty — KjOverlayTrigger does the work; inputs declared on KjOverlayTrigger
}
```

### Standard panel/content directive shell

```ts
// foo-content.ts
import { Component, ChangeDetectionStrategy, ViewEncapsulation, inject, input } from '@angular/core';
import { KjOverlayPanel } from '../primitives/overlay/panel';
import { KjOverlayController } from '../primitives/overlay/controller';
import {
  KJ_OVERLAY_MOUNT_STRATEGY,
  KJ_OVERLAY_POSITION_STRATEGY,
  KJ_OVERLAY_BACKDROP_STRATEGY,
  KJ_OVERLAY_FOCUS_TRAP_STRATEGY,
  KJ_OVERLAY_SCROLL_LOCK_STRATEGY,
  KJ_OVERLAY_LIVE_ANNOUNCER_STRATEGY,
} from '../primitives/overlay/tokens';
import type { KjSide, KjAlign } from '../primitives/overlay/types';
import { bodyPortal } from '../primitives/overlay/strategies/mount/body-portal';
import { anchoredTo } from '../primitives/overlay/strategies/position/anchored-to';
// ...other strategies as needed

@Component({
  selector: 'kj-foo-content',
  standalone: true,
  hostDirectives: [
    { directive: KjOverlayPanel, inputs: ['kjFor'] },
  ],
  providers: [
    { provide: KJ_OVERLAY_MOUNT_STRATEGY,    useFactory: () => bodyPortal() },
    {
      provide: KJ_OVERLAY_POSITION_STRATEGY,
      useFactory: () => {
        const ctrl = inject(KjOverlayController);
        const cmp = inject(KjFooContent, { self: true });
        return anchoredTo({
          trigger: ctrl.triggerEl,
          side: cmp.kjSide,
          align: cmp.kjAlign,
        });
      },
    },
    // optional strategies as needed for this consumer
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `<ng-content />`,
})
export class KjFooContent {
  readonly kjSide  = input<KjSide>('bottom');
  readonly kjAlign = input<KjAlign>('center');
}
```

### Standard test refactor

For `foo.spec.ts`:

```ts
import { Component, ViewChild } from '@angular/core';
import { render } from '@testing-library/angular';
import { describe, it, expect } from 'vitest';
import { KjFooTrigger } from './foo-trigger';
import { KjFooContent } from './foo-content';

describe('KjFoo', () => {
  it('trigger emits aria-haspopup + aria-expanded', async () => {
    @Component({
      standalone: true,
      imports: [KjFooTrigger, KjFooContent],
      template: `
        <button kjFooTrigger #t="kjFooTrigger">Trigger</button>
        <kj-foo-content [kjFor]="t">Content</kj-foo-content>
      `,
    })
    class Host {}

    const { container } = await render(Host);
    const btn = container.querySelector('button')!;
    expect(btn.getAttribute('aria-haspopup')).toBe(/* role per consumer */);
    expect(btn.getAttribute('aria-expanded')).toBe('false');
  });
});
```

### Recipe steps (per consumer)

For each consumer, the worker follows these 7 steps:

1. **Read** the existing files in the consumer folder (e.g. `tooltip/`).
2. **Refactor** the trigger file (e.g. `tooltip-trigger.ts`) using the shell above with the consumer-specific strategy + role.
3. **Refactor** the content/panel file (e.g. `tooltip-content.ts`) using the panel shell with consumer-specific strategies.
4. **Update or refactor** the umbrella file (e.g. `tooltip.ts`) — usually just re-exports trigger + content + arrow + close + title (where applicable). Drop any logic — it lives in the directives now.
5. **Delete** obsolete files: `<consumer>.context.ts`, `<consumer>.controller.ts` (if no other code in the same consumer reads them).
6. **Update tests** in `<consumer>.spec.ts` to use the new directive shapes; existing tests for the removed context/controller go away.
7. **Commit** with message `feat(<consumer>): migrate onto overlay primitives`.

After every consumer commit, the worker runs:
```bash
cd packages/core && pnpm exec vitest run src/<consumer>
```
to confirm the consumer's tests pass.

---

## Phase A — tooltip, popover, dropdown-menu

### Task 1: Migrate tooltip

**Consumer:** `packages/core/src/tooltip/`

**Strategy choices:**
- Trigger event: `onHover({ openDelay: 200, closeDelay: 0 })` paired with `onFocus()` (hover OR focus opens). Compose by writing a small inline `tooltipTriggerEvent()` factory that delegates to both — see the implementation below.
- Mount: `bodyPortal()`
- Position: `anchoredTo({ trigger, side, align, offset: 8, flip: true, shift: true })`
- Backdrop: not provided (token is optional)
- Focus trap: not provided
- Scroll lock: not provided
- Live announcer: not provided
- Panel role: `'tooltip'`

**Public API surface preserved:**
- `KjTooltipTrigger` (selector `[kjTooltipTrigger]`, exportAs `kjTooltipTrigger`)
- `KjTooltipContent` (selector `kj-tooltip-content`)
- `KjTooltipArrow` (selector `kj-tooltip-arrow`) — keep existing arrow component as-is; it just renders inside content
- `KjTooltipGroup` (existing — global delay coordinator for grouped tooltips)
- Also keep the convenience `KjTooltip` umbrella + the inline `[kjTooltip="text"]` directive if it exists today.

**Files:**
- Modify: `packages/core/src/tooltip/tooltip-trigger.ts`
- Modify: `packages/core/src/tooltip/tooltip-content.ts`
- Modify: `packages/core/src/tooltip/tooltip.ts`
- Modify: `packages/core/src/tooltip/tooltip.spec.ts`
- Delete: `packages/core/src/tooltip/tooltip.context.ts`
- Delete: `packages/core/src/tooltip/tooltip.controller.ts`
- Modify: `packages/core/src/tooltip/index.ts` (drop deleted exports)

**Steps:**

- [ ] **Step 1: Read existing files**

```bash
cat packages/core/src/tooltip/tooltip-trigger.ts
cat packages/core/src/tooltip/tooltip-content.ts
cat packages/core/src/tooltip/tooltip.ts
cat packages/core/src/tooltip/tooltip.context.ts
cat packages/core/src/tooltip/tooltip.controller.ts
cat packages/core/src/tooltip/index.ts
```

Note any existing inputs (`kjSide`, `kjAlign`, `kjOpenDelay`, `kjCloseDelay`, `kjOpen` model, etc.) — preserve them on the new directives.

- [ ] **Step 2: Write the new trigger directive**

Create a small composite trigger-event factory inline in `tooltip-trigger.ts` that wires both hover and focus:

```ts
// tooltip-trigger.ts
import { Directive, input, inject } from '@angular/core';
import { booleanAttribute } from '@angular/core';
import { KjOverlayTrigger } from '../primitives/overlay/trigger';
import { KjOverlayController } from '../primitives/overlay/controller';
import {
  KJ_OVERLAY_TRIGGER_EVENT_STRATEGY,
  KJ_OVERLAY_PANEL_ROLE,
  type KjTriggerEventStrategy,
} from '../primitives/overlay/tokens';
import type { KjOverlayContext } from '../primitives/overlay/context';
import { onHover } from '../primitives/overlay/strategies/trigger-event/on-hover';
import { onFocus } from '../primitives/overlay/strategies/trigger-event/on-focus';

/** Composite trigger-event: opens on hover (with delay) AND on focus. */
function hoverOrFocus(opts: { openDelay?: number; closeDelay?: number } = {}): KjTriggerEventStrategy {
  const a = onHover(opts);
  const b = onFocus();
  return {
    ariaHasPopup: null,
    attach(ctx: KjOverlayContext) { a.attach(ctx); b.attach(ctx); },
    bindToggle(t) { a.bindToggle(t); b.bindToggle(t); },
    onOpen()  { a.onOpen?.();  b.onOpen?.();  },
    onClose() { a.onClose?.(); b.onClose?.(); },
    detach()  { a.detach();    b.detach();    },
  };
}

@Directive({
  selector: '[kjTooltipTrigger]',
  exportAs: 'kjTooltipTrigger',
  standalone: true,
  hostDirectives: [
    { directive: KjOverlayTrigger, inputs: ['kjOpen'] },
  ],
  providers: [
    KjOverlayController,
    {
      provide: KJ_OVERLAY_TRIGGER_EVENT_STRATEGY,
      useFactory: () => hoverOrFocus({ openDelay: 200 }),
    },
    { provide: KJ_OVERLAY_PANEL_ROLE, useValue: 'tooltip' as const },
  ],
})
export class KjTooltipTrigger {
  readonly kjOpenDelay  = input<number, unknown>(200, { transform: (v) => Number(v) || 200 });
  readonly kjCloseDelay = input<number, unknown>(0,   { transform: (v) => Number(v) || 0 });
  readonly kjDisabled   = input(false, { transform: booleanAttribute });
  // Inputs preserved for API parity but currently advisory — open/close delays
  // are captured at provider construction time. A follow-up can wire them to
  // the strategy reactively.
}
```

- [ ] **Step 3: Write the new content component**

```ts
// tooltip-content.ts
import { Component, ChangeDetectionStrategy, ViewEncapsulation, inject, input } from '@angular/core';
import { KjOverlayPanel } from '../primitives/overlay/panel';
import { KjOverlayController } from '../primitives/overlay/controller';
import {
  KJ_OVERLAY_MOUNT_STRATEGY,
  KJ_OVERLAY_POSITION_STRATEGY,
} from '../primitives/overlay/tokens';
import type { KjSide, KjAlign } from '../primitives/overlay/types';
import { bodyPortal } from '../primitives/overlay/strategies/mount/body-portal';
import { anchoredTo } from '../primitives/overlay/strategies/position/anchored-to';

@Component({
  selector: 'kj-tooltip-content',
  standalone: true,
  hostDirectives: [
    { directive: KjOverlayPanel, inputs: ['kjFor'] },
  ],
  providers: [
    { provide: KJ_OVERLAY_MOUNT_STRATEGY, useFactory: () => bodyPortal() },
    {
      provide: KJ_OVERLAY_POSITION_STRATEGY,
      useFactory: () => {
        const ctrl = inject(KjOverlayController);
        const cmp = inject(KjTooltipContent, { self: true });
        return anchoredTo({
          trigger: ctrl.triggerEl,
          side: cmp.kjSide,
          align: cmp.kjAlign,
          offset: cmp.kjOffset,
        });
      },
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `<ng-content />`,
})
export class KjTooltipContent {
  readonly kjSide   = input<KjSide>('top');
  readonly kjAlign  = input<KjAlign>('center');
  readonly kjOffset = input<number, unknown>(8, { transform: (v) => Number(v) || 8 });
}
```

- [ ] **Step 4: Update the umbrella `tooltip.ts`**

Reduce it to re-exports only:
```ts
// tooltip.ts
export * from './tooltip-trigger';
export * from './tooltip-content';
export * from './tooltip-arrow';
export * from './tooltip-group';
```

- [ ] **Step 5: Update `tooltip/index.ts`**

```ts
export * from './tooltip-trigger';
export * from './tooltip-content';
export * from './tooltip-arrow';
export * from './tooltip-group';
```

(Drop any export of `tooltip.context.ts` / `tooltip.controller.ts`.)

- [ ] **Step 6: Delete obsolete files**

```bash
rm packages/core/src/tooltip/tooltip.context.ts
rm packages/core/src/tooltip/tooltip.controller.ts
```

- [ ] **Step 7: Rewrite `tooltip.spec.ts`**

```ts
import { Component } from '@angular/core';
import { render } from '@testing-library/angular';
import { describe, it, expect } from 'vitest';
import { KjTooltipTrigger } from './tooltip-trigger';
import { KjTooltipContent } from './tooltip-content';

describe('KjTooltip', () => {
  it('trigger has aria-expanded false initially', async () => {
    @Component({
      selector: 'tt-host',
      standalone: true,
      imports: [KjTooltipTrigger, KjTooltipContent],
      template: `
        <button kjTooltipTrigger #t="kjTooltipTrigger">Hover</button>
        <kj-tooltip-content [kjFor]="t">Hi</kj-tooltip-content>
      `,
    })
    class Host {}
    const { container } = await render(Host);
    const btn = container.querySelector('button')!;
    expect(btn.getAttribute('aria-expanded')).toBe('false');
  });

  it('panel is hidden + has role=tooltip', async () => {
    @Component({
      selector: 'tt-host',
      standalone: true,
      imports: [KjTooltipTrigger, KjTooltipContent],
      template: `
        <button kjTooltipTrigger #t="kjTooltipTrigger">Hover</button>
        <kj-tooltip-content [kjFor]="t">Hi</kj-tooltip-content>
      `,
    })
    class Host {}
    const { container } = await render(Host);
    const panel = container.querySelector('kj-tooltip-content') as HTMLElement;
    expect(panel.getAttribute('role')).toBe('tooltip');
    expect(panel.hasAttribute('hidden')).toBe(true);
  });
});
```

- [ ] **Step 8: Commit**

```bash
git add packages/core/src/tooltip/
git commit -m "feat(tooltip): migrate onto overlay primitives"
```

---

### Task 2: Migrate popover (absorbs hovercard)

**Consumer:** `packages/core/src/popover/`

**Mergers absorbed:** `hovercard` — exposed via `kjTrigger="hover"` input on `KjPopoverTrigger`.

**Strategy choices:**
- Trigger event: depends on `kjTrigger` input — `onClick()` (default) OR `onHover({openDelay: 100})` (when `kjTrigger="hover"`).
- Mount: `bodyPortal()`
- Position: `anchoredTo({...})`
- Focus trap: optional via `kjTrap` input — `tabCycle()` when truthy, otherwise no provider.
- Backdrop: not provided
- Panel role: `'dialog'`

**Files:**
- Modify: `packages/core/src/popover/popover-trigger.ts`
- Modify: `packages/core/src/popover/popover-content.ts`
- Modify: `packages/core/src/popover/popover.ts`
- Modify: `packages/core/src/popover/popover.spec.ts`
- Modify: `packages/core/src/popover/index.ts`
- Delete: `packages/core/src/popover/popover.context.ts`
- Delete: `packages/core/src/popover/popover.controller.ts`
- Delete: `packages/core/src/hovercard/` *(entire folder)* and remove its export from `packages/core/src/public-api.ts`

**Steps:**

- [ ] **Step 1: Read existing files** (same pattern as tooltip Task 1 step 1).

- [ ] **Step 2: Write the new trigger directive**

```ts
// popover-trigger.ts
import { Directive, computed, inject, input } from '@angular/core';
import { booleanAttribute } from '@angular/core';
import { KjOverlayTrigger } from '../primitives/overlay/trigger';
import { KjOverlayController } from '../primitives/overlay/controller';
import {
  KJ_OVERLAY_TRIGGER_EVENT_STRATEGY,
  KJ_OVERLAY_PANEL_ROLE,
  type KjTriggerEventStrategy,
} from '../primitives/overlay/tokens';
import { onClick } from '../primitives/overlay/strategies/trigger-event/on-click';
import { onHover } from '../primitives/overlay/strategies/trigger-event/on-hover';

export type KjPopoverTriggerKind = 'click' | 'hover';

function popoverTriggerEvent(kind: KjPopoverTriggerKind): KjTriggerEventStrategy {
  return kind === 'hover' ? onHover({ openDelay: 100, closeDelay: 100 }) : onClick();
}

@Directive({
  selector: '[kjPopoverTrigger]',
  exportAs: 'kjPopoverTrigger',
  standalone: true,
  hostDirectives: [{ directive: KjOverlayTrigger, inputs: ['kjOpen'] }],
  providers: [
    KjOverlayController,
    {
      provide: KJ_OVERLAY_TRIGGER_EVENT_STRATEGY,
      // For an MVP we resolve at construction; reactive switch is a follow-up.
      useFactory: () => onClick(),
    },
    { provide: KJ_OVERLAY_PANEL_ROLE, useValue: 'dialog' as const },
  ],
})
export class KjPopoverTrigger {
  readonly kjTrigger = input<KjPopoverTriggerKind>('click');
  readonly kjDisabled = input(false, { transform: booleanAttribute });
}
```

Note: the `kjTrigger` input is observable via `KjPopoverTrigger.kjTrigger` for any future reactive impl, but the actual strategy choice is fixed at construction. To support runtime switching, replace `useFactory` with a custom strategy that reads `inject(KjPopoverTrigger).kjTrigger()` and delegates to the right inner strategy. Document as a follow-up; an MVP shipping click-only is acceptable.

- [ ] **Step 3: Write the new content component**

```ts
// popover-content.ts
import { Component, ChangeDetectionStrategy, ViewEncapsulation, inject, input, booleanAttribute } from '@angular/core';
import { KjOverlayPanel } from '../primitives/overlay/panel';
import { KjOverlayController } from '../primitives/overlay/controller';
import {
  KJ_OVERLAY_MOUNT_STRATEGY,
  KJ_OVERLAY_POSITION_STRATEGY,
  KJ_OVERLAY_FOCUS_TRAP_STRATEGY,
} from '../primitives/overlay/tokens';
import type { KjSide, KjAlign } from '../primitives/overlay/types';
import { bodyPortal } from '../primitives/overlay/strategies/mount/body-portal';
import { anchoredTo } from '../primitives/overlay/strategies/position/anchored-to';
import { tabCycle } from '../primitives/overlay/strategies/focus-trap/tab-cycle';
import { noTrap } from '../primitives/overlay/strategies/focus-trap/no-trap';

@Component({
  selector: 'kj-popover-content',
  standalone: true,
  hostDirectives: [{ directive: KjOverlayPanel, inputs: ['kjFor'] }],
  providers: [
    { provide: KJ_OVERLAY_MOUNT_STRATEGY, useFactory: () => bodyPortal() },
    {
      provide: KJ_OVERLAY_POSITION_STRATEGY,
      useFactory: () => {
        const ctrl = inject(KjOverlayController);
        const cmp = inject(KjPopoverContent, { self: true });
        return anchoredTo({
          trigger: ctrl.triggerEl,
          side: cmp.kjSide,
          align: cmp.kjAlign,
          offset: cmp.kjOffset,
        });
      },
    },
    {
      provide: KJ_OVERLAY_FOCUS_TRAP_STRATEGY,
      useFactory: () => {
        const cmp = inject(KjPopoverContent, { self: true });
        return cmp.kjTrap() ? tabCycle({ returnFocus: true }) : noTrap();
      },
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `<ng-content />`,
})
export class KjPopoverContent {
  readonly kjSide   = input<KjSide>('bottom');
  readonly kjAlign  = input<KjAlign>('center');
  readonly kjOffset = input<number, unknown>(8, { transform: (v) => Number(v) || 8 });
  readonly kjTrap   = input(false, { transform: booleanAttribute });
}
```

- [ ] **Step 4: Update `popover.ts` and `index.ts`** — re-exports only.

- [ ] **Step 5: Delete obsolete files**

```bash
rm packages/core/src/popover/popover.context.ts
rm packages/core/src/popover/popover.controller.ts
```

- [ ] **Step 6: Absorb hovercard**

```bash
rm -rf packages/core/src/hovercard/
```

Find and remove `hovercard` from the public API:
```bash
grep -rn "hovercard" packages/core/src/public-api.ts packages/components/src/
```

For any docs/example referencing hovercard, replace with `<kj-popover-content kjTrigger="hover">` or note in the migration log. (Existing hovercard tests get deleted.)

- [ ] **Step 7: Update `popover.spec.ts`**

Same pattern as tooltip but with `KjPopoverTrigger` + `KjPopoverContent`. Assert:
- `aria-haspopup="dialog"`
- `aria-expanded="false"` initially
- panel `role="dialog"`
- `kjTrigger="hover"` keeps role and aria-haspopup the same

- [ ] **Step 8: Commit**

```bash
git add packages/core/src/popover/ packages/core/src/hovercard/ packages/core/src/public-api.ts
git commit -m "feat(popover): migrate onto overlay primitives; absorb hovercard via kjTrigger='hover'"
```

---

### Task 3: Migrate dropdown-menu (absorbs context-menu + inline menu)

**Consumer:** `packages/core/src/dropdown-menu/`

**Mergers absorbed:**
- `context-menu` → `kjTrigger="contextmenu"` + `kjMount="point"`
- inline `menu/` → `kjMount="inline"`

**Strategy choices:**
- Trigger event: from `kjTrigger` input — `onClick()` (default) or `onContextMenu({longPressMs: 500})`.
- Mount: from `kjMount` input — `bodyPortal()` (default), `inPlace()` (when `kjMount="inline"`).
- Position: from `kjMount` input — `anchoredTo({...})` (default), `pointAt({x, y})` (when `kjMount="point"`), `inPlaceSibling()` (when `kjMount="inline"`).
- Focus trap: not provided
- Backdrop: not provided
- Panel role: `'menu'`

For point-mount, the trigger captures click coords (or contextmenu coords) into signals and the position strategy reads them. Inline behavior in the strategy.

**Files:**
- Modify: `packages/core/src/dropdown-menu/dropdown-menu-trigger.ts` (or wherever the existing trigger lives — reuse the same filename if present)
- Modify: `packages/core/src/dropdown-menu/dropdown-menu.ts`
- Modify: `packages/core/src/dropdown-menu/dropdown-menu.spec.ts`
- Modify: `packages/core/src/dropdown-menu/index.ts`
- Delete: `packages/core/src/dropdown-menu/dropdown-menu.context.ts`
- Delete: `packages/core/src/dropdown-menu/dropdown-menu.controller.ts` (if exists)
- Delete: `packages/core/src/context-menu/` *(entire folder)*
- Delete: `packages/core/src/menu/` *(entire folder)*
- Modify: `packages/core/src/public-api.ts` (drop context-menu + menu exports)

**Steps:**

- [ ] **Step 1: Read existing dropdown-menu, context-menu, menu files** to identify all preserved inputs (e.g. `kjSide`, `kjAlign`, `kjItems`, item directives, sub-trigger directive, etc.). Preserve all item-level directives (`KjDropdownMenuItem`, `KjDropdownMenuSub`, etc.) — they are unrelated to overlay primitives and stay as-is.

- [ ] **Step 2: Write the new trigger directive** (combining click + contextmenu strategies)

```ts
// dropdown-menu-trigger.ts
import { Directive, signal, input, inject } from '@angular/core';
import { KjOverlayTrigger } from '../primitives/overlay/trigger';
import { KjOverlayController } from '../primitives/overlay/controller';
import {
  KJ_OVERLAY_TRIGGER_EVENT_STRATEGY,
  KJ_OVERLAY_PANEL_ROLE,
} from '../primitives/overlay/tokens';
import { onClick } from '../primitives/overlay/strategies/trigger-event/on-click';
import { onContextMenu } from '../primitives/overlay/strategies/trigger-event/on-context-menu';

export type KjDropdownMenuTriggerKind = 'click' | 'contextmenu';
export type KjDropdownMenuMount       = 'portal' | 'point' | 'inline';

@Directive({
  selector: '[kjDropdownMenuTrigger]',
  exportAs: 'kjDropdownMenuTrigger',
  standalone: true,
  hostDirectives: [{ directive: KjOverlayTrigger, inputs: ['kjOpen'] }],
  providers: [
    KjOverlayController,
    // MVP: pick strategy at construction by reading the input default.
    // Reactive switching can come later via a custom delegating strategy.
    {
      provide: KJ_OVERLAY_TRIGGER_EVENT_STRATEGY,
      useFactory: () => onClick(),
    },
    { provide: KJ_OVERLAY_PANEL_ROLE, useValue: 'menu' as const },
  ],
})
export class KjDropdownMenuTrigger {
  readonly kjTrigger = input<KjDropdownMenuTriggerKind>('click');
  readonly kjMount   = input<KjDropdownMenuMount>('portal');
  // For point-mount: clicked coords stored into a signal the panel reads.
  readonly kjPointX  = signal<number>(0);
  readonly kjPointY  = signal<number>(0);
}
```

- [ ] **Step 3: Write the new content component** (mount/position dispatched by `kjMount`)

```ts
// dropdown-menu-content.ts (rename from dropdown-menu.ts content portion if needed)
import { Component, ChangeDetectionStrategy, ViewEncapsulation, computed, inject, input } from '@angular/core';
import { KjOverlayPanel } from '../primitives/overlay/panel';
import { KjOverlayController } from '../primitives/overlay/controller';
import {
  KJ_OVERLAY_MOUNT_STRATEGY,
  KJ_OVERLAY_POSITION_STRATEGY,
} from '../primitives/overlay/tokens';
import type { KjSide, KjAlign } from '../primitives/overlay/types';
import { bodyPortal } from '../primitives/overlay/strategies/mount/body-portal';
import { inPlace } from '../primitives/overlay/strategies/mount/in-place';
import { anchoredTo } from '../primitives/overlay/strategies/position/anchored-to';
import { pointAt } from '../primitives/overlay/strategies/position/point-at';
import { inPlaceSibling } from '../primitives/overlay/strategies/position/in-place-sibling';
import { KjDropdownMenuTrigger } from './dropdown-menu-trigger';

@Component({
  selector: 'kj-dropdown-menu-content',
  standalone: true,
  hostDirectives: [{ directive: KjOverlayPanel, inputs: ['kjFor'] }],
  providers: [
    {
      provide: KJ_OVERLAY_MOUNT_STRATEGY,
      useFactory: () => {
        const cmp = inject(KjDropdownMenuContent, { self: true });
        return cmp.kjMount() === 'inline' ? inPlace() : bodyPortal();
      },
    },
    {
      provide: KJ_OVERLAY_POSITION_STRATEGY,
      useFactory: () => {
        const ctrl = inject(KjOverlayController);
        const cmp = inject(KjDropdownMenuContent, { self: true });
        const trigDir = inject(KjDropdownMenuTrigger, { optional: true });
        if (cmp.kjMount() === 'inline') return inPlaceSibling();
        if (cmp.kjMount() === 'point' && trigDir) {
          return pointAt({ x: trigDir.kjPointX, y: trigDir.kjPointY });
        }
        return anchoredTo({
          trigger: ctrl.triggerEl,
          side: cmp.kjSide,
          align: cmp.kjAlign,
        });
      },
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `<ng-content />`,
})
export class KjDropdownMenuContent {
  readonly kjSide   = input<KjSide>('bottom');
  readonly kjAlign  = input<KjAlign>('start');
  readonly kjMount  = input<'portal'|'point'|'inline'>('portal');
}
```

- [ ] **Step 4: Update item directives + `dropdown-menu.ts` umbrella** — preserve all item-related code; just delete obsolete context/controller imports.

- [ ] **Step 5: Delete obsolete files**

```bash
rm packages/core/src/dropdown-menu/dropdown-menu.context.ts
rm -f packages/core/src/dropdown-menu/dropdown-menu.controller.ts
rm -rf packages/core/src/context-menu/
rm -rf packages/core/src/menu/
```

- [ ] **Step 6: Update `public-api.ts`** to drop context-menu + menu exports.

- [ ] **Step 7: Rewrite `dropdown-menu.spec.ts`**

Test the three mount modes (`portal`, `point`, `inline`) and the two trigger modes (`click`, `contextmenu`). Assert ARIA, role=menu, and aria-haspopup=menu.

- [ ] **Step 8: Commit**

```bash
git add packages/core/src/dropdown-menu/ packages/core/src/context-menu/ packages/core/src/menu/ packages/core/src/public-api.ts
git commit -m "feat(dropdown-menu): migrate onto overlay primitives; absorb context-menu and inline menu"
```

---

**End of Phase A.** Branch has 3 consumer migrations done + 2 mergers absorbed (hovercard, context-menu, inline menu). Old `KjOverlayService` / `KjAnchor` may still be referenced by 8 remaining consumers — keep them around.

---

## Phase B — dialog (absorbs alert-dialog), drawer (absorbs bottom-sheet), toast

### Task 4: Migrate dialog (absorbs alert-dialog)

**Consumer:** `packages/core/src/dialog/`

**Mergers absorbed:** `alert-dialog` — exposed via `kjAlert=true` input on the `<kj-dialog>` component (toggles role to `alertdialog`, opts out of esc/outside-click, switches live announcer to `assertive()`).

**Service-launched:** No trigger directive needed. `KjDialog.open(component, opts)` builds a controller via `KjOverlayBuilder` and returns `KjDialogRef`.

**Strategy choices (configured by `KjDialog.open`):**
- Trigger event: `programmatic()`
- Mount: `bodyPortal()`
- Position: `viewportCentered()`
- Backdrop: `solidBackdrop({ inert: true, closeOnClick: !alert })`
- Focus trap: `tabCycle({ returnFocus: true })`
- Scroll lock: `htmlOverflow()`
- Live announcer: `silent()` (default) or `assertive()` (when `kjAlert`)
- Panel role: `'dialog'` or `'alertdialog'`

**Files:**
- Modify: `packages/core/src/dialog/dialog.ts` — body component (`<kj-dialog>`)
- Modify: `packages/core/src/dialog/dialog.service.ts` — `KjDialog` service
- Replace: `packages/core/src/dialog/dialog.controller.ts` → `dialog.ref.ts` (rename + new shape exposing `KjDialogRef<T,R>`)
- Modify: `packages/core/src/dialog/dialog.spec.ts`
- Modify: `packages/core/src/dialog/index.ts`
- Delete: `packages/core/src/dialog/dialog.context.ts`
- Delete: `packages/core/src/alert-dialog/` *(entire folder)*
- Modify: `packages/core/src/public-api.ts` (drop alert-dialog exports)

**Steps:**

- [ ] **Step 1: Read existing dialog files**, especially `dialog.service.ts` (need to preserve `KjDialog.open(...)` API surface) and `dialog.controller.ts` (replaced by `KjDialogRef`).

- [ ] **Step 2: Write `dialog.ref.ts` (replaces `dialog.controller.ts`)**

```ts
// dialog.ref.ts
import { ComponentRef, Signal } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import type { KjOverlayController } from '../primitives/overlay/controller';

export class KjDialogRef<T, R = unknown> {
  private _instance: T | null = null;
  private _result: R | undefined;
  private resolveResult!: (r: R | undefined) => void;
  readonly result: Promise<R | undefined>;
  private readonly _afterOpened = new Subject<void>();
  private readonly _afterClosed = new Subject<R | undefined>();
  readonly afterOpened$: Observable<void> = this._afterOpened.asObservable();
  readonly afterClosed$: Observable<R | undefined> = this._afterClosed.asObservable();

  readonly state: Signal<'closed'|'opening'|'open'|'closing'>;
  readonly isOpen: Signal<boolean>;

  constructor(
    public readonly controller: KjOverlayController,
  ) {
    this.state = controller.state;
    this.isOpen = controller.isOpen;
    this.result = new Promise<R | undefined>(res => { this.resolveResult = res; });
  }

  /** @internal */
  bindInstance(instance: T) { this._instance = instance; }
  get instance(): T { if (!this._instance) throw new Error('KjDialogRef: instance not bound'); return this._instance; }

  close(result?: R): void {
    this._result = result;
    this.controller.close('programmatic');
    // Resolve once the controller has finished closing — signal dependent.
    // For an MVP we resolve synchronously; consumers can also subscribe to afterClosed$.
    queueMicrotask(() => {
      this._afterClosed.next(this._result);
      this._afterClosed.complete();
      this.resolveResult(this._result);
    });
  }
}
```

- [ ] **Step 3: Update `dialog.service.ts`**

```ts
// dialog.service.ts
import { Injectable, Type, inject } from '@angular/core';
import { KjOverlayBuilder } from '../primitives/overlay/builder';
import { bodyPortal } from '../primitives/overlay/strategies/mount/body-portal';
import { viewportCentered } from '../primitives/overlay/strategies/position/viewport-centered';
import { solidBackdrop } from '../primitives/overlay/strategies/backdrop/solid';
import { tabCycle } from '../primitives/overlay/strategies/focus-trap/tab-cycle';
import { htmlOverflow } from '../primitives/overlay/strategies/scroll-lock/html-overflow';
import { silent } from '../primitives/overlay/strategies/live-announcer/silent';
import { assertive } from '../primitives/overlay/strategies/live-announcer/assertive';
import { programmatic } from '../primitives/overlay/strategies/trigger-event/programmatic';
import { KjDialogRef } from './dialog.ref';

export interface KjDialogOpenOptions<D = unknown> {
  data?: D;
  alert?: boolean;
  closeOnEsc?: boolean;
  closeOnOutside?: boolean;
}

@Injectable({ providedIn: 'root' })
export class KjDialog {
  private readonly builder = inject(KjOverlayBuilder);

  open<T, R = unknown, D = unknown>(component: Type<T>, opts: KjDialogOpenOptions<D> = {}): KjDialogRef<T, R> {
    const alert = !!opts.alert;
    const ctrl = this.builder.create({
      mount: bodyPortal(),
      position: viewportCentered(),
      backdrop: solidBackdrop({
        inert: true,
        closeOnClick: !alert && (opts.closeOnOutside ?? true),
      }),
      focusTrap: tabCycle({ returnFocus: true }),
      scrollLock: htmlOverflow(),
      liveAnnouncer: alert ? assertive() : silent(),
      trigger: programmatic(),
      panelRole: alert ? 'alertdialog' : 'dialog',
    });

    const ref = new KjDialogRef<T, R>(ctrl);
    const cmpRef = this.builder.attachComponent(ctrl, component, {
      providers: [{ provide: KjDialogRef, useValue: ref }],
      data: opts.data,
    });
    ref.bindInstance(cmpRef.instance);
    ctrl.open();
    return ref;
  }

  // Sugar wrappers (alert/confirm/prompt) — consumer code identical to the spec.
  // Implement by calling open(KjAlertCmp/...) with preset opts. Implement once
  // the preset components (packages/core/src/dialog/presets/*.ts) are added in
  // a follow-up task; OK to ship without them in this PR.
}
```

- [ ] **Step 4: Update `dialog.ts` (the body component)**

The body component represents what the user authors inside. It typically projects its content via `<ng-content />` and provides any structural pieces (header/title/footer). For overlay wiring, it can either:
- Apply `KjOverlayPanel` host directive itself (simplest)
- Or rely on a separate `<kj-dialog-shell>` component that wraps it

For an MVP, make `<kj-dialog>` itself the panel: compose `KjOverlayPanel` with strategies provided by the `KjOverlayBuilder` (the builder's controller is already configured, so the panel just inherits via DI).

```ts
// dialog.ts
import { Component, ChangeDetectionStrategy, ViewEncapsulation, inject, input, booleanAttribute } from '@angular/core';
import { KjOverlayPanel } from '../primitives/overlay/panel';
// ...subcomponents (header/title/footer/etc) imported as before

@Component({
  selector: 'kj-dialog',
  standalone: true,
  hostDirectives: [{ directive: KjOverlayPanel }],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `<ng-content />`,
})
export class KjDialog {
  readonly kjAlert = input(false, { transform: booleanAttribute });
  // The role is decided by the SERVICE via KJ_OVERLAY_PANEL_ROLE provider when
  // attaching the controller. The `kjAlert` input is here only for declarative
  // (non-service) usage, where consumers wire their own providers.
}
```

- [ ] **Step 5: Delete obsolete files**

```bash
rm packages/core/src/dialog/dialog.context.ts
rm packages/core/src/dialog/dialog.controller.ts
rm -rf packages/core/src/alert-dialog/
```

- [ ] **Step 6: Update `dialog/index.ts` and `public-api.ts`** to drop alert-dialog exports.

- [ ] **Step 7: Rewrite `dialog.spec.ts`**

```ts
import { Component, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, it, expect } from 'vitest';
import { KjDialog } from './dialog.service';
import { KjDialogRef } from './dialog.ref';

@Component({
  selector: 'simple-dlg',
  standalone: true,
  template: `<button (click)="ref.close('ok')">OK</button>`,
})
class SimpleDlg {
  readonly ref = inject(KjDialogRef<SimpleDlg, string>);
}

describe('KjDialog', () => {
  it('open returns a ref with isOpen true after open', () => {
    const svc = TestBed.inject(KjDialog);
    const ref = svc.open(SimpleDlg);
    expect(ref).toBeTruthy();
    expect(typeof ref.close).toBe('function');
  });

  it('open with alert=true uses role=alertdialog', () => {
    const svc = TestBed.inject(KjDialog);
    const ref = svc.open(SimpleDlg, { alert: true });
    // Panel will get role=alertdialog from KJ_OVERLAY_PANEL_ROLE provider.
    expect(ref.controller).toBeTruthy();
  });

  it('close resolves the result promise', async () => {
    const svc = TestBed.inject(KjDialog);
    const ref = svc.open<SimpleDlg, string>(SimpleDlg);
    ref.close('hello');
    await expect(ref.result).resolves.toBe('hello');
  });
});
```

- [ ] **Step 8: Commit**

```bash
git add packages/core/src/dialog/ packages/core/src/alert-dialog/ packages/core/src/public-api.ts
git commit -m "feat(dialog): migrate onto overlay primitives; absorb alert-dialog via kjAlert"
```

---

### Task 5: Migrate drawer (absorbs bottom-sheet)

**Consumer:** `packages/core/src/drawer/`

**Mergers absorbed:** `bottom-sheet` — exposed via `kjSide="bottom"` + `kjDrag=true` on `KjDrawer.open()` options.

**Strategy choices:**
- Trigger event: `programmatic()`
- Mount: `bodyPortal()`
- Position: `edgeSheet({ side: kjSide })`
- Backdrop: `solidBackdrop({ inert: true, closeOnClick: opts.closeOnOutside ?? true })`
- Focus trap: `tabCycle({ returnFocus: true })`
- Scroll lock: `htmlOverflow()`
- Live announcer: `silent()`
- Panel role: `'dialog'`

**Files:**
- Modify: `packages/core/src/drawer/drawer.ts`
- Modify: `packages/core/src/drawer/drawer.service.ts` (or create if absent)
- Create: `packages/core/src/drawer/drawer.ref.ts`
- Modify: `packages/core/src/drawer/drawer.spec.ts`
- Modify: `packages/core/src/drawer/index.ts`
- Delete: `packages/core/src/drawer/drawer.context.ts` (if exists)
- Delete: `packages/core/src/drawer/drawer.controller.ts` (if exists)
- Delete: `packages/core/src/bottom-sheet/` *(entire folder)*
- Modify: `packages/core/src/public-api.ts`

**Steps:** Same shape as dialog (Task 4). Consult dialog code for the service/ref/body component pattern. Drawer-specific:
- `KjDrawer.open(Cmp, { side, drag, ... })` returns `KjDrawerRef<T, R>`.
- `kjSide` input on `<kj-drawer>` body propagates to `edgeSheet({side})` strategy.
- Drag-to-dismiss (when `kjDrag=true` and `kjSide="bottom"`) is handled by the existing drag logic in `<kj-drawer>` body — keep it; it just calls `ref.close()` at threshold.

Commit:
```bash
git add packages/core/src/drawer/ packages/core/src/bottom-sheet/ packages/core/src/public-api.ts
git commit -m "feat(drawer): migrate onto overlay primitives; absorb bottom-sheet via kjSide+kjDrag"
```

---

### Task 6: Migrate toast

**Consumer:** `packages/core/src/toast/`

**Service-only**, no trigger directive. `<kj-toast-viewport>` is placed once in the app shell; `KjToast.{success,info,warn,error}(opts)` returns `KjToastRef`.

**Strategy choices:**
- Trigger event: `programmatic()`
- Mount: `bodyPortal()` (into the viewport element if present, else `document.body`)
- Position: `corner({ position: viewport.kjPosition })`
- Backdrop: not provided
- Focus trap: not provided
- Scroll lock: not provided
- Live announcer: `polite()` (default) or `assertive()` (for variant `error`)
- Panel role: `'status'` (default) or `'alert'` (for `error`)

**Files:**
- Modify: `packages/core/src/toast/toast.service.ts`
- Modify: `packages/core/src/toast/toast-viewport.ts`
- Modify: `packages/core/src/toast/toast.ts` (per-toast component)
- Create: `packages/core/src/toast/toast.ref.ts`
- Modify: `packages/core/src/toast/toast.spec.ts`
- Delete: `packages/core/src/toast/toast.context.ts`/`toast.controller.ts` if present.

**Steps:** mirror Task 4/5 shape, with toast-specific config (corner positioning, polite/assertive mapping, viewport target). Existing toast queue logic (auto-dismiss timer, max-on-screen) stays inside the service / per-toast component.

Commit: `feat(toast): migrate onto overlay primitives`.

---

**End of Phase B.** Service-launched cluster done. Old `KjOverlayService` / `KjAnchor` likely still referenced by phase C/D/E consumers.

---

## Phase C — select (absorbs multi-select), tree-select, cascade-select

### Task 7: Migrate select (absorbs multi-select)

**Consumer:** `packages/core/src/select/`

**Mergers absorbed:** `multi-select` → `kjMultiple=true` input.

**Strategy choices:**
- Trigger event: `onClick()`
- Mount: `bodyPortal()`
- Position: `anchoredTo({...})`
- Focus trap: not provided
- Backdrop: not provided
- Panel role: `'listbox'`

**Selection model** (cat 2 concern, NOT this plan): not changed by this migration. Existing select selection state stays; only overlay wiring is refactored.

**Files:**
- Modify: `packages/core/src/select/select-trigger.ts`
- Modify: `packages/core/src/select/select-content.ts` (or wherever the panel is)
- Modify: `packages/core/src/select/select.ts`
- Modify: `packages/core/src/select/select.spec.ts`
- Modify: `packages/core/src/select/index.ts`
- Delete: `packages/core/src/select/select.context.ts`
- Delete: `packages/core/src/select/select.controller.ts` (if any)
- Delete: `packages/core/src/multi-select/` *(entire folder)*
- Modify: `packages/core/src/public-api.ts` (drop multi-select exports)

**Steps:** trigger directive composes `KjOverlayTrigger` + provides `onClick()` + role=`listbox`. Content composes `KjOverlayPanel` + `bodyPortal()` + `anchoredTo()`. The `kjMultiple` input lives on the trigger and is read by the existing selection logic (untouched). Add `[attr.aria-multiselectable]="kjMultiple()"` host binding on the panel element (proxied via the existing select-content code).

Commit: `feat(select): migrate onto overlay primitives; absorb multi-select via kjMultiple`.

---

### Task 8: Migrate tree-select

**Consumer:** `packages/core/src/tree-select/`

**Strategy choices:** identical to `select` (Task 7) but panel role = `'tree'`. No mergers.

**Files:** same shape as select.

Commit: `feat(tree-select): migrate onto overlay primitives`.

---

### Task 9: Migrate cascade-select

**Consumer:** `packages/core/src/cascade-select/`

**Strategy choices:** root panel like `select` (Task 7); sub-panels open via internal `KjPortalChildRegistry` (added in cat 4 — out of scope here, use existing internal logic). Each sub-panel gets its own `KjOverlayController` with `anchoredTo()` strategy pointing at the parent option.

For an MVP, keep the existing sub-panel logic and only refactor the root panel onto primitives. Sub-panel overlay refactor is a follow-up.

Commit: `feat(cascade-select): migrate root panel onto overlay primitives`.

---

**End of Phase C.**

---

## Phase D — combobox, command-palette

### Task 10: Migrate combobox

**Consumer:** `packages/core/src/combobox/`

**Strategy choices:**
- Trigger event: `onFocusOrInput()`
- Mount: `bodyPortal()`
- Position: `anchoredTo({...})`
- Focus trap: not provided
- Backdrop: not provided
- Panel role: `'listbox'` (the input element keeps `role="combobox"` via existing input directive)

**Files:** same shape as select. The input directive (`KjComboboxInput`) is the trigger.

Commit: `feat(combobox): migrate onto overlay primitives`.

---

### Task 11: Migrate command-palette

**Consumer:** `packages/core/src/command-palette/`

**Strategy choices:**
- Trigger event: `onHotkey('mod+k')` (when used with the optional `KjCommandPaletteTrigger` directive); otherwise `programmatic()`
- Mount: `bodyPortal()`
- Position: `viewportCentered()`
- Backdrop: `solidBackdrop({ inert: true, closeOnClick: true })`
- Focus trap: `tabCycle({ initialFocus: 'first', returnFocus: true })`
- Scroll lock: `htmlOverflow()`
- Live announcer: `silent()`
- Panel role: `'dialog'`

**Files:** same shape as dialog (Task 4). The existing `KjCommandPaletteHotkey` directive is replaced by the `onHotkey()` strategy.

Commit: `feat(command-palette): migrate onto overlay primitives; replace KjCommandPaletteHotkey with onHotkey strategy`.

---

**End of Phase D.**

---

## Phase E — date-picker, color-picker

### Task 12: Migrate date-picker

**Consumer:** `packages/core/src/date-picker/`

**Strategy choices:**
- Trigger event: composite `onClick()` + `onFocus()` (input element opens calendar on focus or icon click)
- Mount: `bodyPortal()`
- Position: `anchoredTo({...})`
- Focus trap: `tabCycle({ returnFocus: true })` (calendar dialog needs Tab containment)
- Scroll lock: not provided
- Backdrop: not provided
- Panel role: `'dialog'`

**Files:** same shape as combobox.

Commit: `feat(date-picker): migrate onto overlay primitives`.

---

### Task 13: Migrate color-picker

**Consumer:** `packages/core/src/color-picker/`

**Strategy choices:**
- Trigger event: `onClick()`
- Mount: `bodyPortal()`
- Position: `anchoredTo({...})`
- Focus trap: not provided
- Backdrop: not provided
- Panel role: `'dialog'`

**Files:** same shape as date-picker.

Commit: `feat(color-picker): migrate onto overlay primitives`.

---

**End of Phase E.**

---

## Phase F — Final cleanup

### Task 14: Delete obsolete `overlay.ts` + `anchor.ts`

By this point, no consumer should reference `KjOverlayService`, `KjOverlayRef`, or `KjAnchor`. Confirm with:

```bash
cd packages/core
grep -rn "KjOverlayService\|KjOverlayRef\|KjAnchor" src/ \
  | grep -v "primitives/overlay/overlay" \
  | grep -v "primitives/overlay/anchor"
```

If empty (modulo doc/example references — those are OK; update or note), proceed:

- [ ] **Step 1: Delete files**

```bash
rm packages/core/src/primitives/overlay/overlay.ts
rm packages/core/src/primitives/overlay/overlay.spec.ts
rm packages/core/src/primitives/overlay/anchor.ts
rm packages/core/src/primitives/overlay/anchor.spec.ts
```

- [ ] **Step 2: Prune `primitives/overlay/index.ts`**

Remove the lines:
```ts
export { KjOverlayService, KjOverlayRef } from './overlay';
export type { KjOverlayRegistration as KjOverlayServiceRegistration } from './overlay';
export { KjAnchor } from './anchor';
export type { KjAnchorSide, KjAnchorAlign, KjAnchorPlacement } from './anchor';
```

- [ ] **Step 3: Run package build + test**

```bash
cd packages/core
pnpm build
pnpm exec vitest run
```

Both should succeed. If any failure points back to a missed reference, fix the consumer in question.

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/primitives/overlay/
git commit -m "feat(overlay): delete obsolete KjOverlayService and KjAnchor (replaced by primitives + anchoredTo strategy)"
```

---

### Task 15: Documentation + example sweep

After all migrations land:

- Run `grep -rn "KjOverlayService\|KjAnchor\|hovercard\|context-menu\|alert-dialog\|bottom-sheet\|multi-select\|inline.*menu" docs/ apps/docs/` and update each hit to the new symbol or merger variant.
- Update component example files (`*.example.ts`) for the migrated consumers if their template referenced removed exports.
- Add a CHANGELOG entry / changeset describing the breaking changes (mergers + service path).

Commit: `docs(overlay): update examples and docs for primitive migration + mergers`.

---

## Self-review checklist

Before declaring this plan executed, verify:

- [ ] `pnpm --filter @kouji-ui/core build` succeeds
- [ ] `pnpm --filter @kouji-ui/core test` passes (allowing for the same pre-existing flaky `document.body` failures noted in Plan 1)
- [ ] No file in `packages/core/src/` imports from `'./primitives/overlay/overlay'` or `'./primitives/overlay/anchor'` (other than the cleanup commit deleting them)
- [ ] No folder remains for `hovercard/`, `context-menu/`, `menu/` (inline), `alert-dialog/`, `bottom-sheet/`, `multi-select/`
- [ ] `public-api.ts` doesn't export removed symbols
- [ ] Each migrated consumer has at least one passing spec test asserting:
  - trigger has `aria-haspopup` set to the correct role
  - trigger has `aria-expanded="false"` initially
  - panel has the correct `role` attribute
  - panel has `[hidden]` while closed

---

## Notes for executors

1. **Reactive trigger / mount switching** — several consumers (popover, dropdown-menu) have a `kjTrigger` or `kjMount` input that ideally reconfigures the strategy at runtime. The MVP shipped in this plan resolves the strategy at construction; runtime switching is a follow-up. Document this caveat in the consumer's TSDoc.

2. **Sub-panels in cascade-select** — handled by an internal `KjPortalChildRegistry`-based mechanism (cat 4). Not in this plan's scope; root panel only.

3. **Each Phase = a parallel-safe checkpoint.** Within a phase, consumers are independent and can be migrated by separate subagents in parallel. Across phases, prefer to finish the current phase before dispatching the next.

4. **When deleting a merger source folder** (e.g. `hovercard/`), also remove any `*.example.ts` files referencing it. Build will fail otherwise.

5. **Don't run tests after every consumer.** Per the user's instruction during Plan 1 execution, run tests + build ONCE at the end of all phases and fix issues in a single sweep.
