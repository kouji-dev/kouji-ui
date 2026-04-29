# kouji-ui — Phase 2: Core Shared Primitives

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement all shared primitive directives and a11y utilities in `@kouji-ui/core` that other component directives depend on. No component-level directives yet — only the reusable behaviors and accessibility utilities that will be composed via `hostDirectives` in Plan 3.

**Architecture:** All code lives in `packages/core/src/`. Primitives (disabled, focus-ring) go in `primitives/`. A11y utilities go in `a11y/`. Every directive is standalone, uses only signals and `inject()`, and is fully TSDoc'd. Each directive gets TDD — write failing test, confirm fail, implement, confirm pass, commit.

**Tech Stack:** Angular 21, Angular CDK, Vitest, @testing-library/angular, jest-axe

**This is Plan 2 of 4.** Runs consecutively — Plan 3 depends on these primitives.

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `packages/core/src/primitives/disabled.directive.ts` | Create | `KjDisabledDirective` — disabled state behavior |
| `packages/core/src/primitives/disabled.directive.spec.ts` | Create | Tests for KjDisabledDirective |
| `packages/core/src/primitives/focus-ring.directive.ts` | Create | `KjFocusRingDirective` — focus-visible detection via CDK |
| `packages/core/src/primitives/focus-ring.directive.spec.ts` | Create | Tests for KjFocusRingDirective |
| `packages/core/src/primitives/index.ts` | Create | Barrel for primitives |
| `packages/core/src/a11y/visually-hidden.directive.ts` | Create | `KjVisuallyHiddenDirective` |
| `packages/core/src/a11y/visually-hidden.directive.spec.ts` | Create | Tests |
| `packages/core/src/a11y/focus-trap.directive.ts` | Create | `KjFocusTrapDirective` — CDK FocusTrap wrapper |
| `packages/core/src/a11y/focus-trap.directive.spec.ts` | Create | Tests |
| `packages/core/src/a11y/live-region.directive.ts` | Create | `KjLiveRegionDirective` — CDK LiveAnnouncer wrapper |
| `packages/core/src/a11y/live-region.directive.spec.ts` | Create | Tests |
| `packages/core/src/a11y/roving-tabindex.directive.ts` | Create | `KjRovingTabindexDirective` + `KjRovingTabindexItemDirective` |
| `packages/core/src/a11y/roving-tabindex.directive.spec.ts` | Create | Tests |
| `packages/core/src/a11y/aria-describedby.directive.ts` | Create | `KjAriaDescribedByDirective` |
| `packages/core/src/a11y/aria-describedby.directive.spec.ts` | Create | Tests |
| `packages/core/src/a11y/index.ts` | Create | Barrel for a11y utilities |
| `packages/core/src/public-api.ts` | Modify | Export all primitives and a11y |

---

## Task 1: Folder Structure + Setup

**Files:**
- Create: `packages/core/src/primitives/` (directory)
- Create: `packages/core/src/a11y/` (directory)

- [ ] **Step 1: Create directories**

```bash
mkdir -p packages/core/src/primitives
mkdir -p packages/core/src/a11y
```

- [ ] **Step 2: Verify CDK is resolvable from core**

```bash
cd packages/core && pnpm exec tsc --noEmit 2>&1 | head -5
```

Expected: No errors (or only minor warnings).

- [ ] **Step 3: Commit**

```bash
git add packages/core/src
git commit -m "chore: scaffold primitives and a11y directories in core"
```

---

## Task 2: KjDisabledDirective (TDD)

**Files:**
- Create: `packages/core/src/primitives/disabled.directive.ts`
- Create: `packages/core/src/primitives/disabled.directive.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/core/src/primitives/disabled.directive.spec.ts`:

```ts
import { render } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { KjDisabledDirective } from './disabled.directive';

expect.extend(toHaveNoViolations);

describe('KjDisabledDirective', () => {
  it('sets aria-disabled="true" when disabled', async () => {
    const { container } = await render(
      `<button kjDisabled [kjDisabled]="true">Submit</button>`,
      { imports: [KjDisabledDirective] },
    );
    expect(container.querySelector('button')).toHaveAttribute('aria-disabled', 'true');
  });

  it('sets data-disabled attribute when disabled', async () => {
    const { container } = await render(
      `<button kjDisabled [kjDisabled]="true">Submit</button>`,
      { imports: [KjDisabledDirective] },
    );
    expect(container.querySelector('button')).toHaveAttribute('data-disabled', '');
  });

  it('removes aria-disabled when not disabled', async () => {
    const { container } = await render(
      `<button kjDisabled [kjDisabled]="false">Submit</button>`,
      { imports: [KjDisabledDirective] },
    );
    expect(container.querySelector('button')).not.toHaveAttribute('aria-disabled');
  });

  it('defaults to not disabled', async () => {
    const { container } = await render(
      `<button kjDisabled>Submit</button>`,
      { imports: [KjDisabledDirective] },
    );
    expect(container.querySelector('button')).not.toHaveAttribute('aria-disabled');
  });

  it('passes axe accessibility audit', async () => {
    const { container } = await render(
      `<button kjDisabled [kjDisabled]="true">Submit</button>`,
      { imports: [KjDisabledDirective] },
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd packages/core && pnpm test 2>&1 | grep -E "(FAIL|Cannot find|Error)" | head -5
```

Expected: Error about `KjDisabledDirective` not found.

- [ ] **Step 3: Implement KjDisabledDirective**

Create `packages/core/src/primitives/disabled.directive.ts`:

```ts
import { Directive, input } from '@angular/core';

/**
 * Applies disabled state to any element via ARIA and data attributes.
 * Compose via `hostDirectives` on other directives to add disabled behavior.
 *
 * @example
 * ```html
 * <button kjButton [kjDisabled]="isLoading()">Submit</button>
 * ```
 */
@Directive({
  selector: '[kjDisabled]',
  standalone: true,
  host: {
    '[attr.aria-disabled]': 'disabled() ? "true" : null',
    '[attr.data-disabled]': 'disabled() ? "" : null',
  },
})
export class KjDisabledDirective {
  /** Whether the element is disabled. Reflects via `aria-disabled` and `data-disabled`. */
  disabled = input<boolean>(false);
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
cd packages/core && pnpm test 2>&1 | grep -E "(PASS|Tests|✓|×)" | head -10
```

Expected: All 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/primitives/disabled.directive.ts packages/core/src/primitives/disabled.directive.spec.ts
git commit -m "feat(core): add KjDisabledDirective with aria-disabled and data-disabled"
```

---

## Task 3: KjFocusRingDirective (TDD)

**Files:**
- Create: `packages/core/src/primitives/focus-ring.directive.ts`
- Create: `packages/core/src/primitives/focus-ring.directive.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/core/src/primitives/focus-ring.directive.spec.ts`:

```ts
import { render, fireEvent } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { KjFocusRingDirective } from './focus-ring.directive';

expect.extend(toHaveNoViolations);

describe('KjFocusRingDirective', () => {
  it('adds data-focus-visible on keyboard focus', async () => {
    const { container } = await render(
      `<button kjFocusRing>Click me</button>`,
      { imports: [KjFocusRingDirective] },
    );
    const btn = container.querySelector('button')!;
    fireEvent.focus(btn);
    expect(btn).toHaveAttribute('data-focus-visible', '');
  });

  it('removes data-focus-visible on blur', async () => {
    const { container } = await render(
      `<button kjFocusRing>Click me</button>`,
      { imports: [KjFocusRingDirective] },
    );
    const btn = container.querySelector('button')!;
    fireEvent.focus(btn);
    fireEvent.blur(btn);
    expect(btn).not.toHaveAttribute('data-focus-visible');
  });

  it('passes axe accessibility audit', async () => {
    const { container } = await render(
      `<button kjFocusRing>Click me</button>`,
      { imports: [KjFocusRingDirective] },
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd packages/core && pnpm test 2>&1 | grep -E "(FAIL|Cannot find|Error)" | head -5
```

Expected: Error about `KjFocusRingDirective` not found.

- [ ] **Step 3: Implement KjFocusRingDirective**

Create `packages/core/src/primitives/focus-ring.directive.ts`:

```ts
import { Directive, DestroyRef, ElementRef, inject, signal } from '@angular/core';
import { FocusMonitor } from '@angular/cdk/a11y';
import { afterNextRender } from '@angular/core';

/**
 * Tracks focus-visible state using the CDK FocusMonitor.
 * Sets `data-focus-visible` when the element is focused via keyboard or accessibility tools.
 * Compose via `hostDirectives` to add focus-ring behavior to interactive elements.
 *
 * @example
 * ```html
 * <button kjFocusRing>Focusable button</button>
 * ```
 */
@Directive({
  selector: '[kjFocusRing]',
  standalone: true,
  host: {
    '[attr.data-focus-visible]': 'focusVisible() ? "" : null',
  },
})
export class KjFocusRingDirective {
  private readonly el = inject(ElementRef);
  private readonly focusMonitor = inject(FocusMonitor);
  private readonly destroyRef = inject(DestroyRef);

  private readonly _focusVisible = signal(false);

  /** Whether the element is currently focused via keyboard or accessibility tools. */
  readonly focusVisible = this._focusVisible.asReadonly();

  constructor() {
    afterNextRender(() => {
      this.focusMonitor.monitor(this.el, false).subscribe((origin) => {
        this._focusVisible.set(origin === 'keyboard' || origin === 'program');
      });
      this.destroyRef.onDestroy(() => {
        this.focusMonitor.stopMonitoring(this.el);
      });
    });
  }
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
cd packages/core && pnpm test 2>&1 | grep -E "(PASS|Tests|✓|×)" | head -10
```

Expected: All 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/primitives/focus-ring.directive.ts packages/core/src/primitives/focus-ring.directive.spec.ts
git commit -m "feat(core): add KjFocusRingDirective with CDK FocusMonitor"
```

---

## Task 4: KjVisuallyHiddenDirective (TDD)

**Files:**
- Create: `packages/core/src/a11y/visually-hidden.directive.ts`
- Create: `packages/core/src/a11y/visually-hidden.directive.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/core/src/a11y/visually-hidden.directive.spec.ts`:

```ts
import { render } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { KjVisuallyHiddenDirective } from './visually-hidden.directive';

expect.extend(toHaveNoViolations);

describe('KjVisuallyHiddenDirective', () => {
  it('applies visually-hidden inline styles', async () => {
    const { container } = await render(
      `<span kjVisuallyHidden>Screen reader only</span>`,
      { imports: [KjVisuallyHiddenDirective] },
    );
    const el = container.querySelector('span')!;
    const style = el.getAttribute('style') ?? '';
    expect(style).toContain('position');
    expect(style).toContain('absolute');
  });

  it('content remains in the DOM for screen readers', async () => {
    const { getByText } = await render(
      `<span kjVisuallyHidden>Screen reader only</span>`,
      { imports: [KjVisuallyHiddenDirective] },
    );
    expect(getByText('Screen reader only')).toBeInTheDocument();
  });

  it('passes axe accessibility audit', async () => {
    const { container } = await render(
      `<button><span kjVisuallyHidden>Close dialog</span></button>`,
      { imports: [KjVisuallyHiddenDirective] },
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd packages/core && pnpm test 2>&1 | grep -E "(FAIL|Cannot find)" | head -5
```

- [ ] **Step 3: Implement KjVisuallyHiddenDirective**

Create `packages/core/src/a11y/visually-hidden.directive.ts`:

```ts
import { Directive } from '@angular/core';

/**
 * Visually hides an element while keeping it accessible to screen readers.
 * Uses the standard visually-hidden CSS technique via inline styles.
 *
 * @example
 * ```html
 * <button>
 *   <kj-icon name="close" />
 *   <span kjVisuallyHidden>Close dialog</span>
 * </button>
 * ```
 */
@Directive({
  selector: '[kjVisuallyHidden]',
  standalone: true,
  host: {
    style: [
      'position:absolute',
      'width:1px',
      'height:1px',
      'padding:0',
      'margin:-1px',
      'overflow:hidden',
      'clip:rect(0,0,0,0)',
      'white-space:nowrap',
      'border-width:0',
    ].join(';'),
  },
})
export class KjVisuallyHiddenDirective {}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
cd packages/core && pnpm test 2>&1 | grep -E "(PASS|Tests|✓|×)" | head -10
```

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/a11y/visually-hidden.directive.ts packages/core/src/a11y/visually-hidden.directive.spec.ts
git commit -m "feat(core): add KjVisuallyHiddenDirective"
```

---

## Task 5: KjFocusTrapDirective (TDD)

**Files:**
- Create: `packages/core/src/a11y/focus-trap.directive.ts`
- Create: `packages/core/src/a11y/focus-trap.directive.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/core/src/a11y/focus-trap.directive.spec.ts`:

```ts
import { render } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { KjFocusTrapDirective } from './focus-trap.directive';

expect.extend(toHaveNoViolations);

describe('KjFocusTrapDirective', () => {
  it('renders without error when enabled', async () => {
    const { container } = await render(
      `<div kjFocusTrap [kjFocusTrapEnabled]="true">
        <button>First</button>
        <button>Last</button>
      </div>`,
      { imports: [KjFocusTrapDirective] },
    );
    expect(container.querySelector('[kjFocusTrap]')).toBeInTheDocument();
  });

  it('renders without error when disabled', async () => {
    const { container } = await render(
      `<div kjFocusTrap [kjFocusTrapEnabled]="false">
        <button>First</button>
      </div>`,
      { imports: [KjFocusTrapDirective] },
    );
    expect(container.querySelector('[kjFocusTrap]')).toBeInTheDocument();
  });

  it('passes axe accessibility audit', async () => {
    const { container } = await render(
      `<div role="dialog" aria-label="Test dialog" kjFocusTrap [kjFocusTrapEnabled]="true">
        <button>Action</button>
      </div>`,
      { imports: [KjFocusTrapDirective] },
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd packages/core && pnpm test 2>&1 | grep -E "(FAIL|Cannot find)" | head -5
```

- [ ] **Step 3: Implement KjFocusTrapDirective**

Create `packages/core/src/a11y/focus-trap.directive.ts`:

```ts
import { Directive, DestroyRef, ElementRef, inject, input, effect } from '@angular/core';
import { FocusTrapFactory, FocusTrap } from '@angular/cdk/a11y';
import { afterNextRender } from '@angular/core';

/**
 * Traps keyboard focus within the host element. Uses Angular CDK FocusTrap internally.
 * Designed for modal dialogs, drawers, and other overlay patterns.
 *
 * @example
 * ```html
 * <div role="dialog" kjFocusTrap [kjFocusTrapEnabled]="isOpen()">
 *   <button>Action</button>
 * </div>
 * ```
 */
@Directive({
  selector: '[kjFocusTrap]',
  standalone: true,
})
export class KjFocusTrapDirective {
  private readonly el = inject(ElementRef);
  private readonly focusTrapFactory = inject(FocusTrapFactory);
  private readonly destroyRef = inject(DestroyRef);

  /** Whether the focus trap is active. Set to true when the overlay is open. */
  kjFocusTrapEnabled = input<boolean>(false);

  private trap?: FocusTrap;

  constructor() {
    afterNextRender(() => {
      this.trap = this.focusTrapFactory.create(this.el.nativeElement, false);

      effect(() => {
        if (this.kjFocusTrapEnabled()) {
          this.trap?.enable();
          this.trap?.focusFirstTabbableElementWhenReady();
        } else {
          this.trap?.disable();
        }
      });

      this.destroyRef.onDestroy(() => this.trap?.destroy());
    });
  }
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
cd packages/core && pnpm test 2>&1 | grep -E "(PASS|Tests|✓|×)" | head -10
```

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/a11y/focus-trap.directive.ts packages/core/src/a11y/focus-trap.directive.spec.ts
git commit -m "feat(core): add KjFocusTrapDirective wrapping CDK FocusTrap"
```

---

## Task 6: KjLiveRegionDirective (TDD)

**Files:**
- Create: `packages/core/src/a11y/live-region.directive.ts`
- Create: `packages/core/src/a11y/live-region.directive.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/core/src/a11y/live-region.directive.spec.ts`:

```ts
import { render } from '@testing-library/angular';
import { Component } from '@angular/core';
import { axe, toHaveNoViolations } from 'jest-axe';
import { KjLiveRegionDirective } from './live-region.directive';

expect.extend(toHaveNoViolations);

@Component({
  standalone: true,
  imports: [KjLiveRegionDirective],
  template: `<div kjLiveRegion #lr="kjLiveRegion"></div>`,
})
class TestHostComponent {}

describe('KjLiveRegionDirective', () => {
  it('renders a live region element', async () => {
    const { container } = await render(
      `<div kjLiveRegion aria-live="polite"></div>`,
      { imports: [KjLiveRegionDirective] },
    );
    expect(container.querySelector('[kjLiveRegion]')).toBeInTheDocument();
  });

  it('sets aria-live attribute', async () => {
    const { container } = await render(
      `<div kjLiveRegion [kjPoliteness]="'assertive'"></div>`,
      { imports: [KjLiveRegionDirective] },
    );
    expect(container.querySelector('div')).toHaveAttribute('aria-live', 'assertive');
  });

  it('defaults aria-live to polite', async () => {
    const { container } = await render(
      `<div kjLiveRegion></div>`,
      { imports: [KjLiveRegionDirective] },
    );
    expect(container.querySelector('div')).toHaveAttribute('aria-live', 'polite');
  });

  it('passes axe accessibility audit', async () => {
    const { container } = await render(
      `<div kjLiveRegion></div>`,
      { imports: [KjLiveRegionDirective] },
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd packages/core && pnpm test 2>&1 | grep -E "(FAIL|Cannot find)" | head -5
```

- [ ] **Step 3: Implement KjLiveRegionDirective**

Create `packages/core/src/a11y/live-region.directive.ts`:

```ts
import { Directive, inject, input, computed } from '@angular/core';
import { LiveAnnouncer } from '@angular/cdk/a11y';

/** Politeness setting for ARIA live regions. */
export type KjLivePoliteness = 'off' | 'polite' | 'assertive';

/**
 * Marks an element as an ARIA live region and exposes an `announce` method
 * for programmatically pushing announcements to screen readers via CDK LiveAnnouncer.
 *
 * @example
 * ```html
 * <div kjLiveRegion [kjPoliteness]="'polite'" #region="kjLiveRegion"></div>
 * <button (click)="region.announce('Item saved')">Save</button>
 * ```
 */
@Directive({
  selector: '[kjLiveRegion]',
  standalone: true,
  exportAs: 'kjLiveRegion',
  host: {
    '[attr.aria-live]': 'kjPoliteness()',
    '[attr.aria-atomic]': '"true"',
  },
})
export class KjLiveRegionDirective {
  private readonly liveAnnouncer = inject(LiveAnnouncer);

  /** The ARIA live politeness setting. Defaults to `'polite'`. */
  kjPoliteness = input<KjLivePoliteness>('polite');

  /**
   * Announces a message to screen readers.
   * @param message - The message to announce.
   * @param durationMs - Optional duration in ms before clearing the announcement.
   */
  announce(message: string, durationMs?: number): Promise<void> {
    return this.liveAnnouncer.announce(message, this.kjPoliteness(), durationMs);
  }
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
cd packages/core && pnpm test 2>&1 | grep -E "(PASS|Tests|✓|×)" | head -10
```

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/a11y/live-region.directive.ts packages/core/src/a11y/live-region.directive.spec.ts
git commit -m "feat(core): add KjLiveRegionDirective wrapping CDK LiveAnnouncer"
```

---

## Task 7: KjRovingTabindexDirective (TDD)

**Files:**
- Create: `packages/core/src/a11y/roving-tabindex.directive.ts`
- Create: `packages/core/src/a11y/roving-tabindex.directive.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/core/src/a11y/roving-tabindex.directive.spec.ts`:

```ts
import { render, fireEvent } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { KjRovingTabindexDirective, KjRovingTabindexItemDirective } from './roving-tabindex.directive';

expect.extend(toHaveNoViolations);

describe('KjRovingTabindexDirective', () => {
  const template = `
    <div kjRovingTabindex role="toolbar">
      <button kjRovingTabindexItem>One</button>
      <button kjRovingTabindexItem>Two</button>
      <button kjRovingTabindexItem>Three</button>
    </div>`;
  const imports = [KjRovingTabindexDirective, KjRovingTabindexItemDirective];

  it('renders all items', async () => {
    const { getAllByRole } = await render(template, { imports });
    expect(getAllByRole('button')).toHaveLength(3);
  });

  it('first item has tabindex 0, others -1', async () => {
    const { getAllByRole } = await render(template, { imports });
    const buttons = getAllByRole('button');
    expect(buttons[0]).toHaveAttribute('tabindex', '0');
    expect(buttons[1]).toHaveAttribute('tabindex', '-1');
    expect(buttons[2]).toHaveAttribute('tabindex', '-1');
  });

  it('moves tabindex on ArrowRight', async () => {
    const { getAllByRole, container } = await render(template, { imports });
    const buttons = getAllByRole('button');
    buttons[0].focus();
    fireEvent.keyDown(container.querySelector('[kjRovingTabindex]')!, { key: 'ArrowRight' });
    expect(buttons[1]).toHaveAttribute('tabindex', '0');
    expect(buttons[0]).toHaveAttribute('tabindex', '-1');
  });

  it('moves tabindex on ArrowLeft', async () => {
    const { getAllByRole, container } = await render(template, { imports });
    const buttons = getAllByRole('button');
    buttons[1].focus();
    fireEvent.keyDown(container.querySelector('[kjRovingTabindex]')!, { key: 'ArrowLeft' });
    expect(buttons[0]).toHaveAttribute('tabindex', '0');
    expect(buttons[1]).toHaveAttribute('tabindex', '-1');
  });

  it('passes axe accessibility audit', async () => {
    const { container } = await render(template, { imports });
    expect(await axe(container)).toHaveNoViolations();
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd packages/core && pnpm test 2>&1 | grep -E "(FAIL|Cannot find)" | head -5
```

- [ ] **Step 3: Implement KjRovingTabindexDirective**

Create `packages/core/src/a11y/roving-tabindex.directive.ts`:

```ts
import {
  Directive,
  ElementRef,
  inject,
  signal,
  computed,
  contentChildren,
  InjectionToken,
  effect,
} from '@angular/core';

/** Context token for roving tabindex coordination. */
export const KJ_ROVING_TABINDEX = new InjectionToken<KjRovingTabindexDirective>(
  'KjRovingTabindex',
);

/**
 * Marks an individual item within a `[kjRovingTabindex]` container.
 * Manages its own `tabindex` based on the container's active index.
 *
 * @example
 * ```html
 * <button kjRovingTabindexItem>Item</button>
 * ```
 */
@Directive({
  selector: '[kjRovingTabindexItem]',
  standalone: true,
  host: {
    '[attr.tabindex]': 'active() ? "0" : "-1"',
  },
})
export class KjRovingTabindexItemDirective {
  readonly el = inject(ElementRef<HTMLElement>);
  readonly active = signal(false);
}

/**
 * Implements the roving tabindex pattern for composite widgets (toolbars, tab lists, etc.).
 * Only one item has `tabindex="0"` at a time; arrow keys move focus between items.
 *
 * @example
 * ```html
 * <div kjRovingTabindex role="toolbar">
 *   <button kjRovingTabindexItem>Bold</button>
 *   <button kjRovingTabindexItem>Italic</button>
 * </div>
 * ```
 */
@Directive({
  selector: '[kjRovingTabindex]',
  standalone: true,
  providers: [{ provide: KJ_ROVING_TABINDEX, useExisting: KjRovingTabindexDirective }],
  host: {
    '(keydown)': 'onKeydown($event)',
  },
})
export class KjRovingTabindexDirective {
  private readonly items = contentChildren(KjRovingTabindexItemDirective);
  private readonly activeIndex = signal(0);

  constructor() {
    effect(() => {
      const all = this.items();
      all.forEach((item, i) => item.active.set(i === this.activeIndex()));
    });
  }

  /** @internal */
  onKeydown(event: KeyboardEvent): void {
    const all = this.items();
    if (!all.length) return;

    let next = this.activeIndex();

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      next = (next + 1) % all.length;
      event.preventDefault();
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      next = (next - 1 + all.length) % all.length;
      event.preventDefault();
    } else if (event.key === 'Home') {
      next = 0;
      event.preventDefault();
    } else if (event.key === 'End') {
      next = all.length - 1;
      event.preventDefault();
    } else {
      return;
    }

    this.activeIndex.set(next);
    all[next].el.nativeElement.focus();
  }
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
cd packages/core && pnpm test 2>&1 | grep -E "(PASS|Tests|✓|×)" | head -10
```

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/a11y/roving-tabindex.directive.ts packages/core/src/a11y/roving-tabindex.directive.spec.ts
git commit -m "feat(core): add KjRovingTabindexDirective for composite widget keyboard nav"
```

---

## Task 8: KjAriaDescribedByDirective (TDD)

**Files:**
- Create: `packages/core/src/a11y/aria-describedby.directive.ts`
- Create: `packages/core/src/a11y/aria-describedby.directive.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/core/src/a11y/aria-describedby.directive.spec.ts`:

```ts
import { render } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { KjAriaDescribedByDirective } from './aria-describedby.directive';

expect.extend(toHaveNoViolations);

describe('KjAriaDescribedByDirective', () => {
  it('sets aria-describedby from a single id', async () => {
    const { container } = await render(
      `<input kjAriaDescribedBy [kjDescribedBy]="'hint-1'" />
       <span id="hint-1">This is a hint</span>`,
      { imports: [KjAriaDescribedByDirective] },
    );
    expect(container.querySelector('input')).toHaveAttribute('aria-describedby', 'hint-1');
  });

  it('sets aria-describedby from multiple ids', async () => {
    const { container } = await render(
      `<input kjAriaDescribedBy [kjDescribedBy]="['hint-1', 'error-1']" />
       <span id="hint-1">Hint</span>
       <span id="error-1">Error</span>`,
      { imports: [KjAriaDescribedByDirective] },
    );
    expect(container.querySelector('input')).toHaveAttribute('aria-describedby', 'hint-1 error-1');
  });

  it('removes aria-describedby when ids are empty', async () => {
    const { container } = await render(
      `<input kjAriaDescribedBy [kjDescribedBy]="[]" />`,
      { imports: [KjAriaDescribedByDirective] },
    );
    expect(container.querySelector('input')).not.toHaveAttribute('aria-describedby');
  });

  it('passes axe accessibility audit', async () => {
    const { container } = await render(
      `<label for="f">Name</label>
       <input id="f" kjAriaDescribedBy [kjDescribedBy]="'hint'" />
       <span id="hint">Enter your full name</span>`,
      { imports: [KjAriaDescribedByDirective] },
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd packages/core && pnpm test 2>&1 | grep -E "(FAIL|Cannot find)" | head -5
```

- [ ] **Step 3: Implement KjAriaDescribedByDirective**

Create `packages/core/src/a11y/aria-describedby.directive.ts`:

```ts
import { Directive, computed, input } from '@angular/core';

/**
 * Wires `aria-describedby` to one or more element IDs.
 * Accepts a single ID string or an array of ID strings.
 * Removes the attribute when the value is empty.
 *
 * @example
 * ```html
 * <input kjAriaDescribedBy [kjDescribedBy]="['hint-id', errorId()]" />
 * <span id="hint-id">Format: DD/MM/YYYY</span>
 * ```
 */
@Directive({
  selector: '[kjAriaDescribedBy]',
  standalone: true,
  host: {
    '[attr.aria-describedby]': 'ariaDescribedBy()',
  },
})
export class KjAriaDescribedByDirective {
  /** One or more element IDs to reference via `aria-describedby`. */
  kjDescribedBy = input<string | string[]>('');

  /** @internal */
  readonly ariaDescribedBy = computed(() => {
    const val = this.kjDescribedBy();
    const ids = Array.isArray(val) ? val : [val];
    const filtered = ids.filter(Boolean);
    return filtered.length ? filtered.join(' ') : null;
  });
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
cd packages/core && pnpm test 2>&1 | grep -E "(PASS|Tests|✓|×)" | head -10
```

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/a11y/aria-describedby.directive.ts packages/core/src/a11y/aria-describedby.directive.spec.ts
git commit -m "feat(core): add KjAriaDescribedByDirective"
```

---

## Task 9: Wire Up All Exports

**Files:**
- Create: `packages/core/src/primitives/index.ts`
- Create: `packages/core/src/a11y/index.ts`
- Modify: `packages/core/src/public-api.ts`

- [ ] **Step 1: Create primitives barrel**

Create `packages/core/src/primitives/index.ts`:

```ts
export { KjDisabledDirective } from './disabled.directive';
export { KjFocusRingDirective } from './focus-ring.directive';
```

- [ ] **Step 2: Create a11y barrel**

Create `packages/core/src/a11y/index.ts`:

```ts
export { KjAriaDescribedByDirective } from './aria-describedby.directive';
export { KjFocusTrapDirective } from './focus-trap.directive';
export { KjLiveRegionDirective, type KjLivePoliteness } from './live-region.directive';
export {
  KjRovingTabindexDirective,
  KjRovingTabindexItemDirective,
  KJ_ROVING_TABINDEX,
} from './roving-tabindex.directive';
export { KjVisuallyHiddenDirective } from './visually-hidden.directive';
```

- [ ] **Step 3: Update public-api.ts**

Replace `packages/core/src/public-api.ts` with:

```ts
// Public API for @kouji-ui/core

export const KJ_CORE_VERSION = '0.0.1';

// Shared primitive directives
export * from './primitives/index';

// Accessibility utilities
export * from './a11y/index';
```

- [ ] **Step 4: Run full test suite**

```bash
cd packages/core && pnpm test
```

Expected: All tests pass (should be 20+ tests across all spec files).

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/primitives/index.ts packages/core/src/a11y/index.ts packages/core/src/public-api.ts
git commit -m "feat(core): wire up public API exports for primitives and a11y utilities"
```

---

## Task 10: Build Verification

- [ ] **Step 1: Build @kouji-ui/core**

```bash
pnpm build:core
```

Expected: Build succeeds, output in `dist/kj-core/`.

- [ ] **Step 2: Verify built package exports**

```bash
cat dist/kj-core/index.d.ts | grep "export" | head -20
```

Expected: All directives exported (`KjDisabledDirective`, `KjFocusRingDirective`, `KjFocusTrapDirective`, etc.).

- [ ] **Step 3: Run full test suite one more time**

```bash
pnpm test
```

Expected: All tests pass, exit code 0.

- [ ] **Step 4: Final commit**

```bash
git add .
git commit -m "chore: Phase 2 complete — core shared primitives and a11y utilities ready"
```

If nothing to commit, that's fine — just report scaffold is clean.
