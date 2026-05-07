# Overlay Primitives — Foundations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the overlay primitive foundation (services, strategies, controller, core directives) on `feat/overlay-primitives` without touching consumers yet. Old `KjOverlayService` and `KjAnchor` directive remain in parallel — they'll be removed in the cleanup plan.

**Architecture:** Per-overlay `KjOverlayController` orchestrates lifecycle via 7 strategy interfaces wired by DI tokens. Pure factory functions for stateless strategies; class instances for DOM-coordinating ones. Strategies are internal infrastructure — never exposed to library users.

**Tech Stack:** Angular 21 (standalone, signals, hostDirectives), TypeScript strict, vitest + @testing-library/angular, no CDK.

**Spec:** `docs/superpowers/specs/2026-05-08-overlay-primitives-design.md`

---

## File structure to create

```
packages/core/src/primitives/overlay/
├── id.ts                                  // KjId service (cat 7 dep, used by panel)
├── id.spec.ts
├── types.ts                               // KjSide, KjAlign, KjOverlayState, KjPanelRole
├── context.ts                             // KjOverlayContext interface
├── tokens.ts                              // all KJ_OVERLAY_* DI tokens + strategy interfaces
├── stack.ts                               // KjOverlayStack service (esc + outside-click)
├── stack.spec.ts
├── scroll-lock.ts                         // KjScrollLock service
├── scroll-lock.spec.ts
├── live-announcer.ts                      // KjLiveAnnouncerService
├── live-announcer.spec.ts
├── controller.ts                          // KjOverlayController class
├── controller.spec.ts
├── builder.ts                             // KjOverlayBuilder service
├── builder.spec.ts
├── trigger.ts                             // KjOverlayTrigger directive
├── trigger.spec.ts
├── panel.ts                               // KjOverlayPanel directive
├── panel.spec.ts
├── focus-trap.ts                          // KjFocusTrap directive (declarative)
├── focus-trap.spec.ts
├── backdrop.ts                            // KjBackdrop component
├── backdrop.spec.ts
└── strategies/
    ├── index.ts                           // re-exports
    ├── mount/
    │   ├── body-portal.ts          + spec
    │   ├── in-place.ts             + spec
    │   └── in-container.ts         + spec
    ├── position/
    │   ├── anchored-to.ts          + spec  (ports KjAnchor logic)
    │   ├── viewport-centered.ts    + spec
    │   ├── edge-sheet.ts           + spec
    │   ├── point-at.ts             + spec
    │   ├── corner.ts               + spec
    │   └── in-place-sibling.ts     + spec
    ├── backdrop/
    │   ├── solid.ts                + spec
    │   ├── blurred.ts              + spec
    │   └── none.ts                 + spec
    ├── focus-trap/
    │   ├── tab-cycle.ts            + spec
    │   ├── inert-based.ts          + spec
    │   └── no-trap.ts              + spec
    ├── scroll-lock/
    │   ├── html-overflow.ts        + spec
    │   ├── css-clip.ts             + spec
    │   └── none.ts                 + spec
    ├── live-announcer/
    │   ├── polite.ts               + spec
    │   ├── assertive.ts            + spec
    │   └── silent.ts               + spec
    └── trigger-event/
        ├── on-click.ts             + spec
        ├── on-hover.ts             + spec
        ├── on-focus.ts             + spec
        ├── on-context-menu.ts      + spec
        ├── on-hotkey.ts            + spec
        ├── on-focus-or-input.ts    + spec
        └── programmatic.ts         + spec
```

Existing `overlay.ts` (KjOverlayService) and `anchor.ts` (KjAnchor) **stay** until the cleanup plan deletes them.

`packages/core/src/primitives/overlay/index.ts` will re-export the new symbols **alongside** the old ones throughout this plan. Final cleanup plan removes the old exports.

## Conventions used in tasks

- All Angular pieces are **standalone**.
- All state is **signals**; no RxJS unless interfacing with external observables.
- All services are `@Injectable({ providedIn: 'root' })` unless they need per-overlay scoping.
- Tests use vitest + `@testing-library/angular`; existing patterns in `packages/core/src/primitives/overlay/overlay.spec.ts` are the reference.
- SSR: every `document` / `window` access wrapped in `isPlatformBrowser(inject(PLATFORM_ID))`.
- Run a single spec with: `pnpm --filter @kouji-ui/core test -- path/to/file.spec.ts`. Run the package: `pnpm --filter @kouji-ui/core test`.

## Phase map

| Phase | Tasks | Output |
|---|---|---|
| **A** | 1–8 | tokens, types, context, KjId, KjOverlayStack, KjScrollLock, KjLiveAnnouncerService — testable foundation services |
| **B** | 9–34 | 26 strategy implementations (one per task) |
| **C** | 35–36 | KjOverlayController + KjOverlayBuilder |
| **D** | 37–40 | KjOverlayTrigger, KjOverlayPanel, KjFocusTrap, KjBackdrop |

---

## Phase A — Foundation services

### Task 1: Create types module

**Files:**
- Create: `packages/core/src/primitives/overlay/types.ts`

- [ ] **Step 1: Write the file**

```ts
/** Side on which a floating element is placed relative to its anchor. */
export type KjSide = 'top' | 'bottom' | 'left' | 'right';

/** Alignment of the floating element along the cross-axis of its side. */
export type KjAlign = 'start' | 'center' | 'end';

/** Resolved (post-flip / post-shift) placement. */
export interface KjPlacement {
  side: KjSide;
  align: KjAlign;
}

/** Lifecycle state of an overlay. */
export type KjOverlayState = 'closed' | 'opening' | 'open' | 'closing';

/** ARIA role applied to the panel element. */
export type KjPanelRole =
  | 'dialog' | 'alertdialog'
  | 'tooltip'
  | 'menu' | 'listbox' | 'tree'
  | 'status' | 'alert';

/** Reason a close was requested. */
export type KjCloseReason = 'esc' | 'outside' | 'programmatic';
```

- [ ] **Step 2: Commit**

```bash
git add packages/core/src/primitives/overlay/types.ts
git commit -m "feat(overlay): add types module"
```

---

### Task 2: Create context interface

**Files:**
- Create: `packages/core/src/primitives/overlay/context.ts`

- [ ] **Step 1: Write the file**

```ts
import type { Signal } from '@angular/core';
import type { KjOverlayState, KjCloseReason } from './types';
import type { KjOverlayStack } from './stack';

/** Runtime context every strategy receives via `attach(ctx)`. */
export interface KjOverlayContext {
  readonly state: Signal<KjOverlayState>;
  readonly isOpen: Signal<boolean>;
  readonly triggerEl: Signal<HTMLElement | null>;
  readonly panelEl: Signal<HTMLElement | null>;
  readonly stack: KjOverlayStack;
  readonly platform: { isBrowser: boolean };
  requestClose(reason: KjCloseReason): void;
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/core/src/primitives/overlay/context.ts
git commit -m "feat(overlay): add KjOverlayContext interface"
```

---

### Task 3: Create DI tokens + strategy interfaces

**Files:**
- Create: `packages/core/src/primitives/overlay/tokens.ts`

- [ ] **Step 1: Write the file**

```ts
import { InjectionToken, type Signal } from '@angular/core';
import type { KjOverlayContext } from './context';
import type { KjPanelRole, KjPlacement } from './types';

/** Common shape for every overlay strategy. */
export interface KjStrategy {
  attach(ctx: KjOverlayContext): void;
  onOpen?(): void;
  onClose?(): void;
  detach(): void;
}

export interface KjMountStrategy extends KjStrategy {
  resolveContainer(): HTMLElement;
  readonly portalled: boolean;
}

export interface KjPositionStrategy extends KjStrategy {
  update(): void;
  readonly placement?: Signal<KjPlacement | null>;
}

export interface KjBackdropStrategy extends KjStrategy {
  readonly inertSiblings: boolean;
  readonly closeOnClick: boolean;
}

export interface KjFocusTrapStrategy extends KjStrategy {
  focusFirst(): void;
  restoreFocus(): void;
}

export interface KjScrollLockStrategy extends KjStrategy {}

export interface KjLiveAnnouncerStrategy extends KjStrategy {
  announce(message: string): void;
}

export type KjAriaHasPopup = 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog' | null;

export interface KjTriggerEventStrategy extends KjStrategy {
  readonly ariaHasPopup: KjAriaHasPopup;
}

export const KJ_OVERLAY_MOUNT_STRATEGY          = new InjectionToken<KjMountStrategy>('KJ_OVERLAY_MOUNT_STRATEGY');
export const KJ_OVERLAY_POSITION_STRATEGY       = new InjectionToken<KjPositionStrategy>('KJ_OVERLAY_POSITION_STRATEGY');
export const KJ_OVERLAY_BACKDROP_STRATEGY       = new InjectionToken<KjBackdropStrategy | null>('KJ_OVERLAY_BACKDROP_STRATEGY');
export const KJ_OVERLAY_FOCUS_TRAP_STRATEGY     = new InjectionToken<KjFocusTrapStrategy>('KJ_OVERLAY_FOCUS_TRAP_STRATEGY');
export const KJ_OVERLAY_SCROLL_LOCK_STRATEGY    = new InjectionToken<KjScrollLockStrategy>('KJ_OVERLAY_SCROLL_LOCK_STRATEGY');
export const KJ_OVERLAY_LIVE_ANNOUNCER_STRATEGY = new InjectionToken<KjLiveAnnouncerStrategy>('KJ_OVERLAY_LIVE_ANNOUNCER_STRATEGY');
export const KJ_OVERLAY_TRIGGER_EVENT_STRATEGY  = new InjectionToken<KjTriggerEventStrategy>('KJ_OVERLAY_TRIGGER_EVENT_STRATEGY');
export const KJ_OVERLAY_PANEL_ROLE              = new InjectionToken<KjPanelRole>('KJ_OVERLAY_PANEL_ROLE');
```

- [ ] **Step 2: Commit**

```bash
git add packages/core/src/primitives/overlay/tokens.ts
git commit -m "feat(overlay): add strategy interfaces and DI tokens"
```

---

### Task 4: KjId service (stable id minter)

**Files:**
- Create: `packages/core/src/primitives/overlay/id.ts`
- Create: `packages/core/src/primitives/overlay/id.spec.ts`

- [ ] **Step 1: Write the failing test**

```ts
// id.spec.ts
import { TestBed } from '@angular/core/testing';
import { describe, it, expect } from 'vitest';
import { KjId } from './id';

describe('KjId', () => {
  it('mints unique ids with default prefix', () => {
    const svc = TestBed.inject(KjId);
    expect(svc.mint()).not.toBe(svc.mint());
  });

  it('honours custom prefix', () => {
    const svc = TestBed.inject(KjId);
    expect(svc.mint('panel')).toMatch(/^kj-panel-\d+$/);
  });

  it('produces deterministic sequence within an injector', () => {
    const svc = TestBed.inject(KjId);
    const a = svc.mint('x');
    const b = svc.mint('x');
    const aN = Number(a.split('-').at(-1));
    const bN = Number(b.split('-').at(-1));
    expect(bN).toBe(aN + 1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @kouji-ui/core test -- packages/core/src/primitives/overlay/id.spec.ts`
Expected: FAIL — "Cannot find module './id'"

- [ ] **Step 3: Write minimal implementation**

```ts
// id.ts
import { Injectable } from '@angular/core';

/**
 * Stable id minter. Used by overlay panels, form fields, and any other
 * primitive that needs deterministic ids (including across SSR boundaries).
 *
 * Counter is per-application; pair an app-level provider override with a
 * deterministic seed if you need cross-render stability beyond a single render.
 */
@Injectable({ providedIn: 'root' })
export class KjId {
  private _counter = 0;
  mint(prefix = ''): string {
    const id = ++this._counter;
    return prefix ? `kj-${prefix}-${id}` : `kj-${id}`;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @kouji-ui/core test -- packages/core/src/primitives/overlay/id.spec.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/primitives/overlay/id.ts packages/core/src/primitives/overlay/id.spec.ts
git commit -m "feat(overlay): add KjId service for stable id minting"
```

---

### Task 5: KjOverlayStack service (Esc + outside-click router)

**Files:**
- Create: `packages/core/src/primitives/overlay/stack.ts`
- Create: `packages/core/src/primitives/overlay/stack.spec.ts`

- [ ] **Step 1: Write the failing test**

```ts
// stack.spec.ts
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, vi } from 'vitest';
import { KjOverlayStack } from './stack';

describe('KjOverlayStack', () => {
  it('register returns a handle with isTopmost=true for newly registered', () => {
    const stack = TestBed.inject(KjOverlayStack);
    const onClose = vi.fn();
    const handle = stack.register('a', { onClose });
    expect(handle.isTopmost()).toBe(true);
    handle.unregister();
  });

  it('only the topmost receives Escape', () => {
    const stack = TestBed.inject(KjOverlayStack);
    const closeA = vi.fn();
    const closeB = vi.fn();
    const ha = stack.register('a', { onClose: closeA });
    const hb = stack.register('b', { onClose: closeB });

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(closeB).toHaveBeenCalledTimes(1);
    expect(closeA).not.toHaveBeenCalled();
    ha.unregister(); hb.unregister();
  });

  it('outside pointerdown calls onClose only when not inside contentEl', () => {
    const stack = TestBed.inject(KjOverlayStack);
    const onClose = vi.fn();
    const inside = document.createElement('div');
    document.body.appendChild(inside);
    const handle = stack.register('a', { onClose });
    stack.markContentEl('a', inside);

    inside.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(onClose).not.toHaveBeenCalled();

    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(onClose).toHaveBeenCalledTimes(1);

    handle.unregister();
    inside.remove();
  });

  it('respects closeOnEsc=false and closeOnOutside=false', () => {
    const stack = TestBed.inject(KjOverlayStack);
    const onClose = vi.fn();
    const handle = stack.register('a', { onClose, closeOnEsc: false, closeOnOutside: false });
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(onClose).not.toHaveBeenCalled();
    handle.unregister();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @kouji-ui/core test -- packages/core/src/primitives/overlay/stack.spec.ts`
Expected: FAIL — "Cannot find module './stack'"

- [ ] **Step 3: Write minimal implementation**

```ts
// stack.ts
import { Injectable, PLATFORM_ID, computed, inject, signal, type Signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export interface KjOverlayRegistration {
  onClose: () => void;
  closeOnOutside?: boolean;
  closeOnEsc?: boolean;
}

export interface KjOverlayHandle {
  unregister: () => void;
  isTopmost: Signal<boolean>;
}

interface StackEntry {
  id: string;
  opts: Required<KjOverlayRegistration>;
  contentEl: HTMLElement | null;
}

/**
 * Global coordinator for nested-overlay behaviour: stack ordering, Escape
 * routing, and outside-click detection. Only the topmost overlay receives
 * Esc / outside-click — prevents the double-close problem.
 *
 * SSR-safe: every DOM access guarded by isPlatformBrowser.
 */
@Injectable({ providedIn: 'root' })
export class KjOverlayStack {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly _stack = signal<StackEntry[]>([]);

  private _listenersInstalled = false;
  private readonly _onKeydown = (e: KeyboardEvent) => this.handleKeydown(e);
  private readonly _onPointerDown = (e: PointerEvent) => this.handlePointerDown(e);

  register(id: string, opts: KjOverlayRegistration): KjOverlayHandle {
    if (!this.isBrowser) {
      return { unregister: () => {}, isTopmost: computed(() => false) };
    }
    const entry: StackEntry = {
      id,
      opts: {
        onClose: opts.onClose,
        closeOnEsc: opts.closeOnEsc ?? true,
        closeOnOutside: opts.closeOnOutside ?? true,
      },
      contentEl: null,
    };
    this._stack.update(s => [...s, entry]);
    this.ensureListeners();
    const isTopmost = computed(() => {
      const s = this._stack();
      return s.length > 0 && s[s.length - 1].id === id;
    });
    return {
      unregister: () => {
        this._stack.update(s => s.filter(e => e !== entry));
        this.maybeRemoveListeners();
      },
      isTopmost,
    };
  }

  markContentEl(id: string, el: HTMLElement | null): void {
    if (!this.isBrowser) return;
    const entry = this._stack().find(e => e.id === id);
    if (entry) entry.contentEl = el;
  }

  get stackSize(): number { return this._stack().length; }

  private ensureListeners(): void {
    if (this._listenersInstalled) return;
    document.addEventListener('keydown', this._onKeydown, true);
    document.addEventListener('pointerdown', this._onPointerDown, true);
    this._listenersInstalled = true;
  }

  private maybeRemoveListeners(): void {
    if (this._stack().length > 0 || !this._listenersInstalled) return;
    document.removeEventListener('keydown', this._onKeydown, true);
    document.removeEventListener('pointerdown', this._onPointerDown, true);
    this._listenersInstalled = false;
  }

  private topmost(): StackEntry | null {
    const s = this._stack();
    return s.length ? s[s.length - 1] : null;
  }

  private handleKeydown(e: KeyboardEvent): void {
    if (e.key !== 'Escape') return;
    const top = this.topmost();
    if (!top || !top.opts.closeOnEsc) return;
    top.opts.onClose();
  }

  private handlePointerDown(e: PointerEvent): void {
    const top = this.topmost();
    if (!top || !top.opts.closeOnOutside) return;
    const target = e.target as Node | null;
    if (top.contentEl && target && top.contentEl.contains(target)) return;
    top.opts.onClose();
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @kouji-ui/core test -- packages/core/src/primitives/overlay/stack.spec.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/primitives/overlay/stack.ts packages/core/src/primitives/overlay/stack.spec.ts
git commit -m "feat(overlay): add KjOverlayStack service for esc + outside-click routing"
```

---

### Task 6: KjScrollLock service (ref-counted body scroll lock)

**Files:**
- Create: `packages/core/src/primitives/overlay/scroll-lock.ts`
- Create: `packages/core/src/primitives/overlay/scroll-lock.spec.ts`

- [ ] **Step 1: Write the failing test**

```ts
// scroll-lock.spec.ts
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, afterEach } from 'vitest';
import { KjScrollLock } from './scroll-lock';

describe('KjScrollLock', () => {
  afterEach(() => {
    document.documentElement.style.overflow = '';
    document.documentElement.style.paddingRight = '';
  });

  it('acquire sets overflow:hidden on <html>', () => {
    const svc = TestBed.inject(KjScrollLock);
    const release = svc.acquire();
    expect(document.documentElement.style.overflow).toBe('hidden');
    release();
  });

  it('multiple acquires share one lock; releases ref-counted', () => {
    const svc = TestBed.inject(KjScrollLock);
    const r1 = svc.acquire();
    const r2 = svc.acquire();
    expect(document.documentElement.style.overflow).toBe('hidden');
    r1();
    expect(document.documentElement.style.overflow).toBe('hidden');
    r2();
    expect(document.documentElement.style.overflow).toBe('');
  });

  it('release is idempotent', () => {
    const svc = TestBed.inject(KjScrollLock);
    const release = svc.acquire();
    release();
    release();
    expect(document.documentElement.style.overflow).toBe('');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @kouji-ui/core test -- packages/core/src/primitives/overlay/scroll-lock.spec.ts`
Expected: FAIL — "Cannot find module './scroll-lock'"

- [ ] **Step 3: Write minimal implementation**

```ts
// scroll-lock.ts
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Body scroll lock. Ref-counted — multiple modals share one lock.
 * Compensates for the scrollbar to prevent layout shift.
 *
 * SSR-safe: server returns a no-op release function.
 */
@Injectable({ providedIn: 'root' })
export class KjScrollLock {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private _count = 0;
  private _savedOverflow: string | null = null;
  private _savedPaddingRight: string | null = null;

  acquire(): () => void {
    if (!this.isBrowser) return () => {};
    this._count++;
    if (this._count === 1) {
      const html = document.documentElement;
      const scrollbarWidth = window.innerWidth - html.clientWidth;
      this._savedOverflow = html.style.overflow;
      this._savedPaddingRight = html.style.paddingRight;
      html.style.overflow = 'hidden';
      if (scrollbarWidth > 0) {
        const existing = parseFloat(getComputedStyle(html).paddingRight) || 0;
        html.style.paddingRight = `${existing + scrollbarWidth}px`;
      }
    }
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this._count--;
      if (this._count === 0) {
        const html = document.documentElement;
        html.style.overflow = this._savedOverflow ?? '';
        html.style.paddingRight = this._savedPaddingRight ?? '';
        this._savedOverflow = null;
        this._savedPaddingRight = null;
      }
    };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @kouji-ui/core test -- packages/core/src/primitives/overlay/scroll-lock.spec.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/primitives/overlay/scroll-lock.ts packages/core/src/primitives/overlay/scroll-lock.spec.ts
git commit -m "feat(overlay): add KjScrollLock service"
```

---

### Task 7: KjLiveAnnouncerService (polite + assertive regions)

**Files:**
- Create: `packages/core/src/primitives/overlay/live-announcer.ts`
- Create: `packages/core/src/primitives/overlay/live-announcer.spec.ts`

- [ ] **Step 1: Write the failing test**

```ts
// live-announcer.spec.ts
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, afterEach } from 'vitest';
import { KjLiveAnnouncerService } from './live-announcer';

describe('KjLiveAnnouncerService', () => {
  afterEach(() => {
    document.querySelectorAll('[data-kj-live-region]').forEach(el => el.remove());
  });

  it('announce polite creates a polite live region and writes message', () => {
    const svc = TestBed.inject(KjLiveAnnouncerService);
    svc.announce('Hello', 'polite');
    const region = document.querySelector('[data-kj-live-region="polite"]') as HTMLElement;
    expect(region).toBeTruthy();
    expect(region.getAttribute('aria-live')).toBe('polite');
    expect(region.textContent).toBe('Hello');
  });

  it('announce assertive uses the assertive region', () => {
    const svc = TestBed.inject(KjLiveAnnouncerService);
    svc.announce('Boom', 'assertive');
    const region = document.querySelector('[data-kj-live-region="assertive"]') as HTMLElement;
    expect(region.getAttribute('aria-live')).toBe('assertive');
    expect(region.textContent).toBe('Boom');
  });

  it('regions are visually hidden but in the DOM', () => {
    const svc = TestBed.inject(KjLiveAnnouncerService);
    svc.announce('x', 'polite');
    const region = document.querySelector('[data-kj-live-region="polite"]') as HTMLElement;
    const style = getComputedStyle(region);
    expect(region.getAttribute('aria-atomic')).toBe('true');
    expect(style.position).toBe('absolute');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @kouji-ui/core test -- packages/core/src/primitives/overlay/live-announcer.spec.ts`
Expected: FAIL — "Cannot find module './live-announcer'"

- [ ] **Step 3: Write minimal implementation**

```ts
// live-announcer.ts
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type KjLivePoliteness = 'polite' | 'assertive';

const SR_ONLY_STYLE = `
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`;

/**
 * Global ARIA live regions, one polite + one assertive.
 * Lazily appended to document.body. SSR-safe (no-op on server).
 */
@Injectable({ providedIn: 'root' })
export class KjLiveAnnouncerService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly regions: Partial<Record<KjLivePoliteness, HTMLElement>> = {};

  announce(message: string, politeness: KjLivePoliteness = 'polite'): void {
    if (!this.isBrowser) return;
    const region = this.ensureRegion(politeness);
    region.textContent = '';
    // Re-set on next frame so AT picks up the change even if same string.
    requestAnimationFrame(() => { region.textContent = message; });
  }

  private ensureRegion(politeness: KjLivePoliteness): HTMLElement {
    let region = this.regions[politeness];
    if (region) return region;
    region = document.createElement('div');
    region.setAttribute('data-kj-live-region', politeness);
    region.setAttribute('aria-live', politeness);
    region.setAttribute('aria-atomic', 'true');
    region.style.cssText = SR_ONLY_STYLE;
    document.body.appendChild(region);
    this.regions[politeness] = region;
    return region;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Note: the third test reads `textContent` after `requestAnimationFrame`. Adjust the spec to await:

```ts
// In spec, replace third test's body with:
it('regions are visually hidden but in the DOM', async () => {
  const svc = TestBed.inject(KjLiveAnnouncerService);
  svc.announce('x', 'polite');
  await new Promise(r => requestAnimationFrame(() => r(undefined)));
  const region = document.querySelector('[data-kj-live-region="polite"]') as HTMLElement;
  expect(region.getAttribute('aria-atomic')).toBe('true');
  expect(region.style.position).toBe('absolute');
});
```

(Apply the same async pattern to the first two tests if their `expect(region.textContent)` checks fail under jsdom timing. Use `await new Promise(r => requestAnimationFrame(() => r(undefined)));` between `announce()` and the `expect`.)

Run: `pnpm --filter @kouji-ui/core test -- packages/core/src/primitives/overlay/live-announcer.spec.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/primitives/overlay/live-announcer.ts packages/core/src/primitives/overlay/live-announcer.spec.ts
git commit -m "feat(overlay): add KjLiveAnnouncerService"
```

---

### Task 8: Update overlay primitive index exports

**Files:**
- Modify: `packages/core/src/primitives/overlay/index.ts`

- [ ] **Step 1: Add the new exports above the existing ones**

```ts
// index.ts — at the top, BEFORE the existing 'overlay' / 'anchor' exports
export * from './types';
export * from './tokens';
export * from './context';
export { KjId } from './id';
export { KjOverlayStack } from './stack';
export type { KjOverlayRegistration, KjOverlayHandle } from './stack';
export { KjScrollLock } from './scroll-lock';
export { KjLiveAnnouncerService, type KjLivePoliteness } from './live-announcer';

// (existing exports stay)
export { KjOverlayService, KjOverlayRef } from './overlay';
export type { KjOverlayRegistration as KjOverlayServiceRegistration } from './overlay';
export { KjAnchor } from './anchor';
export type { KjAnchorSide, KjAnchorAlign, KjAnchorPlacement } from './anchor';
```

Note: rename the **old** `KjOverlayRegistration` re-export to `KjOverlayServiceRegistration` to avoid name collision. The new `KjOverlayRegistration` from `./stack` is the canonical one going forward.

- [ ] **Step 2: Run package build to confirm no broken imports**

Run: `pnpm --filter @kouji-ui/core build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/primitives/overlay/index.ts
git commit -m "feat(overlay): export new foundation primitives"
```

---

**End of Phase A.** At this point the branch has all foundation services and types but no strategies, controller, or directives yet. Existing `KjOverlayService` and `KjAnchor` still work. Branch builds; new tests pass.

---

## Phase B — Strategy implementations

Every strategy follows the same shape: a factory function that returns an object implementing one of the strategy interfaces from `tokens.ts`. The `attach(ctx)` method binds the context (stores it for later use); `onOpen()` / `onClose()` run per cycle; `detach()` releases subscriptions.

For each task: write spec asserting strategy lifecycle + behaviour → verify spec fails → implement factory + class → verify spec passes → commit.

**Important interface addition:** Trigger-event strategies need a `bindToggle(toggle: () => void)` method so `KjOverlayTrigger` (Task 37) can hand them an open/close callback. Update `KjTriggerEventStrategy` in `tokens.ts` accordingly when implementing the first trigger-event strategy (Task 30).

### Task 9: `bodyPortal()` mount strategy

**Files:** `strategies/mount/body-portal.ts` + spec

Test: assert `portalled === true`; `onOpen()` moves panel to `document.body`; `onClose()` returns it to original parent; `resolveContainer()` returns `document.body`.

Implementation: store `originalParent` + `originalNextSibling` on `onOpen`; restore on `onClose`. Guard with `ctx.platform.isBrowser`.

Commit: `feat(overlay): add bodyPortal mount strategy`

### Task 10: `inPlace()` mount strategy

**Files:** `strategies/mount/in-place.ts` + spec

Test: `portalled === false`; `onOpen/onClose` do nothing; `resolveContainer()` returns panel's parent.

Implementation: pure no-op except `resolveContainer` reads `ctx.panelEl().parentElement`.

Commit: `feat(overlay): add inPlace mount strategy`

### Task 11: `inContainer(target)` mount strategy

**Files:** `strategies/mount/in-container.ts` + spec

Test: accepts `HTMLElement` OR `() => HTMLElement`; `onOpen` moves panel to target; `onClose` restores.

Implementation: same shape as `bodyPortal` but with configurable target resolver.

Commit: `feat(overlay): add inContainer mount strategy`

### Task 12: `viewportCentered()` position strategy

**Files:** `strategies/position/viewport-centered.ts` + spec

Test: `onOpen` sets `position: fixed; left: 50%; top: 50%; transform: translate(-50%, -50%)`; `onClose` clears them.

Commit: `feat(overlay): add viewportCentered position strategy`

### Task 13: `edgeSheet({side})` position strategy

**Files:** `strategies/position/edge-sheet.ts` + spec

Test (parameterized over `'left' | 'right' | 'top' | 'bottom'`): `onOpen` sets `position: fixed` and the appropriate edge insets; `onClose` clears them.

Commit: `feat(overlay): add edgeSheet position strategy`

### Task 14: `pointAt({x, y})` position strategy

**Files:** `strategies/position/point-at.ts` + spec

Test: accepts literals or signals; `onOpen` + `update()` set `position: fixed; left: ${x}px; top: ${y}px`; signal change followed by `update()` reflects in styles.

Implementation: helper `read = v => isSignal(v) ? v() : v`.

Commit: `feat(overlay): add pointAt position strategy`

### Task 15: `corner({position, offset})` position strategy

**Files:** `strategies/position/corner.ts` + spec

Test: parameterized over four corners; honours `offset.x` / `offset.y`.

Commit: `feat(overlay): add corner position strategy`

### Task 16: `inPlaceSibling()` position strategy

**Files:** `strategies/position/in-place-sibling.ts` + spec

Test: all methods are no-ops; panel styles unchanged.

Implementation: empty methods.

Commit: `feat(overlay): add inPlaceSibling position strategy`

### Task 17: `anchoredTo({trigger, side, align, offset, flip, shift})` position strategy

**Files:** `strategies/position/anchored-to.ts` + spec

This is the largest strategy — port the manual `getBoundingClientRect()` math from `packages/core/src/primitives/overlay/anchor.ts` into a strategy class. CSS Anchor Positioning support (the `anchor-name`/`position-anchor` CSS path in the existing `KjAnchor`) is **deferred** — initial port uses manual math only; CSS path returns as a follow-up.

Tests:
1. `placement` signal exposed.
2. With trigger at fixed position, `onOpen` + `update` sets `position: fixed` and `top` greater than trigger bottom (when `side='bottom'`).
3. `placement` signal reflects resolved side after flip.
4. `detach` clears the inline styles.

Implementation: `placeManual(trigger, panel, side, align, offset, flip, shift)` helper computes left/top from `getBoundingClientRect()` of trigger + panel against `window.innerWidth/Height`. Subscribe to `window.resize` and `window.scroll` (capture) on `onOpen`, unsubscribe on `onClose`. Expose `placement = computed(() => _placement())`.

Commit: `feat(overlay): add anchoredTo position strategy (manual fallback only)`

### Task 18: `solidBackdrop({inert, closeOnClick, className})` backdrop strategy

**Files:** `strategies/backdrop/solid.ts` + spec

Test: defaults `inertSiblings=true, closeOnClick=true, className='kj-backdrop'`; honours overrides.

Implementation: pure value object — no lifecycle work; `KjBackdrop` component reads `className` to render itself.

Commit: `feat(overlay): add solidBackdrop strategy`

### Task 19: `blurredBackdrop(opts)` backdrop strategy

**Files:** `strategies/backdrop/blurred.ts` + spec

Test: default `className === 'kj-backdrop kj-backdrop--blur'`.

Implementation: thin wrapper that calls `solidBackdrop({...opts, className: opts.className ?? 'kj-backdrop kj-backdrop--blur'})`.

Commit: `feat(overlay): add blurredBackdrop strategy`

### Task 20: `noBackdrop()` backdrop strategy

**Files:** `strategies/backdrop/none.ts` + spec

Test: `inertSiblings=false, closeOnClick=false`.

Implementation: returns object with both flags `false` and no-op lifecycle.

Note: exported as `noBackdrop` (NOT `none`) to avoid collision with other "none" strategies.

Commit: `feat(overlay): add noBackdrop strategy`

### Task 21: `tabCycle({initialFocus, returnFocus})` focus-trap strategy

**Files:** `strategies/focus-trap/tab-cycle.ts` + spec

Tests:
1. `focusFirst()` focuses first focusable in panel.
2. Tab on last focusable wraps to first.
3. Shift+Tab on first focusable wraps to last.
4. `restoreFocus()` returns focus to trigger.

Implementation: install `keydown` listener on panel intercepting Tab/Shift+Tab when at boundaries. `FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'`.

Commit: `feat(overlay): add tabCycle focus trap strategy`

### Task 22: `inertBased()` focus-trap strategy

**Files:** `strategies/focus-trap/inert-based.ts` + spec

Test: `onOpen` sets `inert` on panel siblings (not panel itself); `onClose` removes it.

Implementation: track `inertedSiblings` array; restore exactly what we set.

Commit: `feat(overlay): add inertBased focus trap strategy`

### Task 23: `noTrap()` focus-trap strategy

**Files:** `strategies/focus-trap/no-trap.ts` + spec

Test: all methods are no-ops.

Commit: `feat(overlay): add noTrap focus trap strategy`

### Task 24: `htmlOverflow()` scroll-lock strategy

**Files:** `strategies/scroll-lock/html-overflow.ts` + spec

Test: `onOpen` sets `<html>` overflow to `hidden` via `KjScrollLock`; `onClose` releases.

Implementation: `attach()` calls `inject(KjScrollLock)` and stores the service; `onOpen()` calls `acquire()` and stores release fn; `onClose()` invokes the release fn.

Commit: `feat(overlay): add htmlOverflow scroll-lock strategy`

### Task 25: `cssClip()` scroll-lock strategy

**Files:** `strategies/scroll-lock/css-clip.ts` + spec

Test: `onOpen` sets `<html>` overflow to `clip`; `onClose` restores.

Implementation: own ref-counted lock at module-scope (independent of `KjScrollLock` since `clip` doesn't need scrollbar-padding compensation).

Commit: `feat(overlay): add cssClip scroll-lock strategy`

### Task 26: `noScrollLock()` scroll-lock strategy

**Files:** `strategies/scroll-lock/none.ts` + spec

Test: all methods are no-ops.

Commit: `feat(overlay): add noScrollLock strategy`

### Task 27: `polite()` live-announcer strategy

**Files:** `strategies/live-announcer/polite.ts` + spec

Test: `announce(msg)` writes msg into the polite live region (assert via `[data-kj-live-region="polite"]` text content after one rAF tick).

Implementation: `attach()` calls `inject(KjLiveAnnouncerService)`; `announce(msg)` calls `svc.announce(msg, 'polite')`.

Commit: `feat(overlay): add polite live-announcer strategy`

### Task 28: `assertive()` live-announcer strategy

**Files:** `strategies/live-announcer/assertive.ts` + spec

Identical shape to `polite()`, calling `svc.announce(msg, 'assertive')`.

Commit: `feat(overlay): add assertive live-announcer strategy`

### Task 29: `silent()` live-announcer strategy

**Files:** `strategies/live-announcer/silent.ts` + spec

Test: `announce()` is a no-op (no live region created).

Commit: `feat(overlay): add silent live-announcer strategy`

### Task 30: `onClick()` trigger-event strategy + extend `KjTriggerEventStrategy` interface

**Files:**
- Modify: `packages/core/src/primitives/overlay/tokens.ts` — extend `KjTriggerEventStrategy` interface with `bindToggle(toggle: () => void): void`
- Create: `strategies/trigger-event/on-click.ts` + spec

Test: clicking trigger after `bindToggle(toggleSpy)` invokes the spy.

Implementation: `bindToggle` stores the toggle and adds a `click` listener that calls it; `detach` removes it.

`ariaHasPopup: null`.

Commit: `feat(overlay): add onClick trigger-event strategy + bindToggle hook`

### Task 31: `onHover({openDelay, closeDelay})` trigger-event strategy

**Files:** `strategies/trigger-event/on-hover.ts` + spec

Test (with `vi.useFakeTimers()`): `pointerenter` then advance `openDelay`ms triggers open; `pointerleave` then advance `closeDelay`ms triggers close.

Implementation: install `pointerenter`/`pointerleave` listeners; queue/cancel timers; call `toggle()` based on current `ctx.isOpen()`.

`ariaHasPopup: null`.

Commit: `feat(overlay): add onHover trigger-event strategy`

### Task 32: `onFocus()` trigger-event strategy

**Files:** `strategies/trigger-event/on-focus.ts` + spec

Test: `focusin` opens (when closed); `focusout` with `relatedTarget` outside panel closes; `focusout` with `relatedTarget` inside panel keeps open.

Implementation: install `focusin` / `focusout` on trigger. `focusout` checks `e.relatedTarget` against `panelEl.contains()`.

`ariaHasPopup: null`.

Commit: `feat(overlay): add onFocus trigger-event strategy`

### Task 33: `onContextMenu({longPressMs})` trigger-event strategy

**Files:** `strategies/trigger-event/on-context-menu.ts` + spec

Test: `contextmenu` event triggers + prevents default; `keydown` `Shift+F10` triggers; touchstart held for `longPressMs` triggers.

Implementation: install `contextmenu`, `keydown` (Shift+F10), `touchstart` (set timer), `touchend`/`touchcancel` (cancel timer).

`ariaHasPopup: 'menu'`.

Commit: `feat(overlay): add onContextMenu trigger-event strategy`

### Task 34: `onHotkey(chord)` trigger-event strategy

**Files:** `strategies/trigger-event/on-hotkey.ts` + spec

Test: dispatch `keydown` with `mod+k` (metaKey on Mac, ctrlKey otherwise) on `document` → toggle called and `preventDefault` called.

Implementation: parse chord into `{mod, ctrl, alt, shift, key}` parts. Install `document.addEventListener('keydown', listener)`. Match against parts (resolving `mod` → Cmd on Mac via `navigator.platform.includes('Mac')`, Ctrl elsewhere).

`ariaHasPopup: null`.

Commit: `feat(overlay): add onHotkey trigger-event strategy`

### Task 35: `onFocusOrInput()` and `programmatic()` trigger-event strategies

**Files:**
- `strategies/trigger-event/on-focus-or-input.ts` + spec
- `strategies/trigger-event/programmatic.ts` + spec

`onFocusOrInput`: opens on `focus` OR first `input` event on the trigger (used by combobox). `ariaHasPopup: 'listbox'`.

`programmatic`: no DOM listeners; `bindToggle` stores the toggle but never invokes it. Used by service-launched overlays. `ariaHasPopup: null`.

Two commits: `feat(overlay): add onFocusOrInput trigger-event strategy` and `feat(overlay): add programmatic trigger-event strategy`.

### Task 36: Strategy index re-exports + final Phase B verification

**Files:**
- Create: `packages/core/src/primitives/overlay/strategies/index.ts`

- [ ] **Step 1: Write the file**

```ts
// strategies/index.ts
export * from './mount/body-portal';
export * from './mount/in-place';
export * from './mount/in-container';

export * from './position/anchored-to';
export * from './position/viewport-centered';
export * from './position/edge-sheet';
export * from './position/point-at';
export * from './position/corner';
export * from './position/in-place-sibling';

export * from './backdrop/solid';
export * from './backdrop/blurred';
export * from './backdrop/none';

export * from './focus-trap/tab-cycle';
export * from './focus-trap/inert-based';
export * from './focus-trap/no-trap';

export * from './scroll-lock/html-overflow';
export * from './scroll-lock/css-clip';
export * from './scroll-lock/none';

export * from './live-announcer/polite';
export * from './live-announcer/assertive';
export * from './live-announcer/silent';

export * from './trigger-event/on-click';
export * from './trigger-event/on-hover';
export * from './trigger-event/on-focus';
export * from './trigger-event/on-context-menu';
export * from './trigger-event/on-hotkey';
export * from './trigger-event/on-focus-or-input';
export * from './trigger-event/programmatic';
```

- [ ] **Step 2: Run full package test**

Run: `pnpm --filter @kouji-ui/core test`
Expected: all strategy specs PASS.

- [ ] **Step 3: Run build**

Run: `pnpm --filter @kouji-ui/core build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/primitives/overlay/strategies/index.ts
git commit -m "feat(overlay): re-export all strategies from strategies/index"
```

---

**End of Phase B.** Branch has 26 strategy implementations, each with passing unit tests. No controller or directives yet — they consume the strategies in Phase C/D.

---

## Phase C — Controller + Builder

### Task 37: `KjOverlayController` class

**Files:**
- Create: `packages/core/src/primitives/overlay/controller.ts`
- Create: `packages/core/src/primitives/overlay/controller.spec.ts`

Test (10 tests):
1. starts in state `'closed'`, `isOpen=false`
2. `open()` transitions `closed → opening → open` (verify state at each step using fake timers + rAF flush)
3. `close()` transitions `open → closing → closed`
4. `open()` while opening is no-op
5. `close()` while closing is no-op
6. `open()` while closing flips to opening (cancellation)
7. `close()` while opening flips to closing
8. `bindTrigger(el)` populates `triggerEl` signal; `bindPanel(el)` populates `panelEl`
9. `attachStrategies({...})` calls `attach(ctx)` on each provided strategy in deterministic order: mount → position → backdrop → scrollLock → focusTrap → liveAnnouncer
10. `dispose()` calls `detach()` on each strategy; idempotent

Implementation outline:

```ts
import { Injectable, computed, inject, signal, type Signal, PLATFORM_ID, DestroyRef } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type { KjOverlayContext } from './context';
import type {
  KjMountStrategy, KjPositionStrategy, KjBackdropStrategy,
  KjFocusTrapStrategy, KjScrollLockStrategy, KjLiveAnnouncerStrategy,
  KjTriggerEventStrategy, KjStrategy,
} from './tokens';
import type { KjOverlayState, KjCloseReason } from './types';
import { KjOverlayStack, type KjOverlayHandle } from './stack';
import { KjId } from './id';

export interface KjOverlayStrategies {
  mount: KjMountStrategy;
  position: KjPositionStrategy;
  trigger: KjTriggerEventStrategy;
  backdrop?: KjBackdropStrategy | null;
  focusTrap?: KjFocusTrapStrategy | null;
  scrollLock?: KjScrollLockStrategy | null;
  liveAnnouncer?: KjLiveAnnouncerStrategy | null;
}

@Injectable()
export class KjOverlayController {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser  = isPlatformBrowser(this.platformId);
  private readonly stack      = inject(KjOverlayStack);
  private readonly idSvc      = inject(KjId);
  readonly id = this.idSvc.mint('overlay');

  private readonly _state     = signal<KjOverlayState>('closed');
  private readonly _trigger   = signal<HTMLElement | null>(null);
  private readonly _panel     = signal<HTMLElement | null>(null);
  readonly state              = this._state.asReadonly();
  readonly isOpen             = computed(() => this._state() === 'open' || this._state() === 'opening');
  readonly triggerEl          = this._trigger.asReadonly();
  readonly panelEl            = this._panel.asReadonly();

  readonly context: KjOverlayContext = {
    state: this.state,
    isOpen: this.isOpen,
    triggerEl: this.triggerEl,
    panelEl: this.panelEl,
    stack: this.stack,
    platform: { isBrowser: this.isBrowser },
    requestClose: (r) => this.close(r),
  };

  private strategies: KjOverlayStrategies | null = null;
  private stackHandle: KjOverlayHandle | null = null;
  private transitionDeadline = 0;
  private rafId = 0;
  private transitionListener: ((e: Event) => void) | null = null;

  bindTrigger(el: HTMLElement | null) { this._trigger.set(el); }
  bindPanel(el: HTMLElement | null)   { this._panel.set(el); }

  attachStrategies(s: KjOverlayStrategies): void {
    this.strategies = s;
    const order: (KjStrategy | null | undefined)[] = [
      s.mount, s.position, s.backdrop, s.scrollLock, s.focusTrap, s.liveAnnouncer, s.trigger,
    ];
    for (const strat of order) strat?.attach(this.context);
  }

  open(): void {
    const cur = this._state();
    if (cur === 'open' || cur === 'opening') return;
    if (cur === 'closing') { this.cancelTransition(); }
    this.beginOpen();
  }

  close(_reason?: KjCloseReason): void {
    const cur = this._state();
    if (cur === 'closed' || cur === 'closing') return;
    if (cur === 'opening') { this.cancelTransition(); }
    this.beginClose();
  }

  toggle(): void { this.isOpen() ? this.close('programmatic') : this.open(); }

  dispose(): void {
    if (this._state() !== 'closed') this.close('programmatic');
    if (!this.strategies) return;
    const s = this.strategies;
    const order: (KjStrategy | null | undefined)[] = [
      s.trigger, s.liveAnnouncer, s.focusTrap, s.scrollLock, s.backdrop, s.position, s.mount,
    ];
    for (const strat of order) strat?.detach();
    this.strategies = null;
  }

  private beginOpen(): void {
    if (!this.strategies) return;
    const s = this.strategies;
    s.mount.onOpen?.();
    s.position.onOpen?.();
    s.position.update();
    s.backdrop?.onOpen?.();
    s.scrollLock?.onOpen?.();
    this.stackHandle = this.stack.register(this.id, { onClose: () => this.close('esc') });
    if (this._panel()) this.stack.markContentEl(this.id, this._panel());
    this._state.set('opening');
    this.runTransition('open', () => {
      this._state.set('open');
      s.focusTrap?.focusFirst();
    });
  }

  private beginClose(): void {
    if (!this.strategies) return;
    const s = this.strategies;
    this._state.set('closing');
    this.runTransition('close', () => {
      s.focusTrap?.restoreFocus();
      this.stackHandle?.unregister();
      this.stackHandle = null;
      s.scrollLock?.onClose?.();
      s.backdrop?.onClose?.();
      s.position.onClose?.();
      s.mount.onClose?.();
      this._state.set('closed');
    });
  }

  private runTransition(_kind: 'open' | 'close', done: () => void): void {
    if (!this.isBrowser) { done(); return; }
    const panel = this._panel();
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const cs = panel ? getComputedStyle(panel) : null;
    const transitionMs = cs ? parseFloat(cs.transitionDuration) * 1000 : 0;
    const animationMs  = cs ? parseFloat(cs.animationDuration)  * 1000 : 0;
    const longest = Math.max(transitionMs, animationMs);
    if (reduce || longest === 0 || !panel) {
      this.rafId = requestAnimationFrame(done);
      return;
    }
    let fired = false;
    const listener = (e: Event) => {
      if (e.target !== panel) return;
      if (fired) return; fired = true;
      panel.removeEventListener('transitionend', listener);
      panel.removeEventListener('animationend', listener);
      done();
    };
    this.transitionListener = listener;
    panel.addEventListener('transitionend', listener);
    panel.addEventListener('animationend', listener);
    // Safety: if event never fires within longest+50ms, force done.
    this.transitionDeadline = window.setTimeout(() => {
      if (!fired) { fired = true; panel.removeEventListener('transitionend', listener); panel.removeEventListener('animationend', listener); done(); }
    }, longest + 50);
  }

  private cancelTransition(): void {
    if (this.rafId) { cancelAnimationFrame(this.rafId); this.rafId = 0; }
    if (this.transitionDeadline) { clearTimeout(this.transitionDeadline); this.transitionDeadline = 0; }
    if (this.transitionListener && this._panel()) {
      const p = this._panel()!;
      p.removeEventListener('transitionend', this.transitionListener);
      p.removeEventListener('animationend', this.transitionListener);
      this.transitionListener = null;
    }
  }
}
```

Two commits:
- `feat(overlay): add KjOverlayController state machine`
- `test(overlay): KjOverlayController state transitions + cancellation`

### Task 38: `KjOverlayBuilder` service

**Files:**
- Create: `packages/core/src/primitives/overlay/builder.ts`
- Create: `packages/core/src/primitives/overlay/builder.spec.ts`

Tests:
1. `create(config)` returns a controller with strategies attached.
2. `attachComponent(controller, component, opts)` mounts the component in mount strategy's container.
3. Provided `providers` in `opts` are visible to the component via DI.

Implementation:

```ts
import { ApplicationRef, ComponentRef, EnvironmentInjector, Injectable, Injector, Type, createComponent, inject, runInInjectionContext } from '@angular/core';
import { KjOverlayController, type KjOverlayStrategies } from './controller';
import type { KjPanelRole } from './types';

export interface KjOverlayBuilderConfig extends KjOverlayStrategies {
  panelRole: KjPanelRole;
  closeOnEsc?: boolean;
  closeOnOutside?: boolean;
}

export interface KjAttachOptions<D = unknown> {
  data?: D;
  providers?: Array<{ provide: unknown; useValue?: unknown }>;
}

@Injectable({ providedIn: 'root' })
export class KjOverlayBuilder {
  private readonly appRef = inject(ApplicationRef);
  private readonly env    = inject(EnvironmentInjector);

  create(config: KjOverlayBuilderConfig): KjOverlayController {
    const injector = Injector.create({
      providers: [KjOverlayController],
      parent: this.env,
    });
    const ctrl = injector.get(KjOverlayController);
    ctrl.attachStrategies(config);
    return ctrl;
  }

  attachComponent<T>(
    controller: KjOverlayController,
    component: Type<T>,
    opts: KjAttachOptions = {},
  ): ComponentRef<T> {
    const container = controller['strategies']!.mount.resolveContainer();
    const injector = Injector.create({
      providers: opts.providers as never[] ?? [],
      parent: this.env,
    });
    const ref = createComponent(component, {
      environmentInjector: this.env,
      elementInjector: injector,
      hostElement: container,
    });
    this.appRef.attachView(ref.hostView);
    controller.bindPanel(ref.location.nativeElement);
    return ref;
  }
}
```

Two commits:
- `feat(overlay): add KjOverlayBuilder service`
- `test(overlay): KjOverlayBuilder create + attachComponent`

---

**End of Phase C.** Branch has the full state machine + service builder. Strategies are wired through. Still no public-facing directives.

---

## Phase D — Core directives

### Task 39: `KjOverlayTrigger` host directive

**Files:**
- Create: `packages/core/src/primitives/overlay/trigger.ts`
- Create: `packages/core/src/primitives/overlay/trigger.spec.ts`

Tests:
1. host emits `aria-haspopup`, `aria-expanded="false"`, `data-state="closed"` initially
2. when controller transitions to `open`, host emits `aria-expanded="true"`, `data-state="open"`
3. `attachPanel(panel)` calls `controller.bindPanel(panel.host.nativeElement)` and sets `aria-controls` to the panel's id
4. trigger element ref is bound on construction
5. `kjOpen` model bidirectionally syncs with controller state

Implementation:

```ts
import { Directive, ElementRef, inject, model, computed, effect } from '@angular/core';
import { KjOverlayController } from './controller';
import { KJ_OVERLAY_TRIGGER_EVENT_STRATEGY } from './tokens';
import type { KjOverlayPanel } from './panel';

@Directive({
  selector: '[kjOverlayTrigger]',
  exportAs: 'kjOverlayTrigger',
  host: {
    '[attr.aria-haspopup]':  'ariaHasPopup() ?? null',
    '[attr.aria-expanded]':  'isOpen()',
    '[attr.aria-controls]':  'panelId() ?? null',
    '[attr.data-state]':     'state()',
  },
})
export class KjOverlayTrigger {
  private readonly host       = inject(ElementRef<HTMLElement>);
  private readonly controller = inject(KjOverlayController);
  private readonly triggerStrategy = inject(KJ_OVERLAY_TRIGGER_EVENT_STRATEGY);

  readonly kjOpen = model<boolean>(false);
  readonly state   = this.controller.state;
  readonly isOpen  = this.controller.isOpen;
  readonly panelId = computed(() => this.controller.panelEl()?.id ?? null);
  readonly ariaHasPopup = computed(() => this.triggerStrategy.ariaHasPopup);

  attachPanel(panel: KjOverlayPanel): void {
    this.controller.bindPanel(panel.host.nativeElement);
  }

  constructor() {
    this.controller.bindTrigger(this.host.nativeElement);
    this.triggerStrategy.bindToggle(() => this.controller.toggle());
    effect(() => {
      const wantOpen = this.kjOpen();
      if (wantOpen && !this.controller.isOpen()) this.controller.open();
      if (!wantOpen && this.controller.isOpen()) this.controller.close('programmatic');
    });
    effect(() => { this.kjOpen.set(this.controller.isOpen()); });
  }
}
```

Two commits:
- `feat(overlay): add KjOverlayTrigger host directive`
- `test(overlay): KjOverlayTrigger ARIA bindings + state sync`

### Task 40: `KjOverlayPanel` host directive

**Files:**
- Create: `packages/core/src/primitives/overlay/panel.ts`
- Create: `packages/core/src/primitives/overlay/panel.spec.ts`

Tests:
1. host gets `id` (minted via `KjId`)
2. host gets `role` from `KJ_OVERLAY_PANEL_ROLE` token
3. host emits `data-state="closed"` and `[hidden]` until open
4. once `[kjFor]` resolves, calls `trigger.attachPanel(this)` and `controller.attachStrategies({...})` with all injected strategies
5. `aria-modal="true"` only when backdrop strategy has `inertSiblings=true`

Implementation:

```ts
import { Directive, ElementRef, inject, input, computed, effect } from '@angular/core';
import { KjId } from './id';
import { KjOverlayController } from './controller';
import {
  KJ_OVERLAY_MOUNT_STRATEGY,
  KJ_OVERLAY_POSITION_STRATEGY,
  KJ_OVERLAY_BACKDROP_STRATEGY,
  KJ_OVERLAY_FOCUS_TRAP_STRATEGY,
  KJ_OVERLAY_SCROLL_LOCK_STRATEGY,
  KJ_OVERLAY_LIVE_ANNOUNCER_STRATEGY,
  KJ_OVERLAY_TRIGGER_EVENT_STRATEGY,
  KJ_OVERLAY_PANEL_ROLE,
} from './tokens';
import type { KjOverlayTrigger } from './trigger';

@Directive({
  selector: '[kjOverlayPanel]',
  exportAs: 'kjOverlayPanel',
  host: {
    '[id]':                  'panelId',
    '[attr.role]':           'role()',
    '[attr.aria-modal]':     'isModal() ? "true" : null',
    '[attr.data-state]':     'state()',
    '[attr.hidden]':         'state() === "closed" ? "" : null',
  },
})
export class KjOverlayPanel {
  readonly host    = inject(ElementRef<HTMLElement>);
  private readonly idSvc      = inject(KjId);
  private readonly controller = inject(KjOverlayController);
  readonly panelId  = this.idSvc.mint('panel');

  private readonly mount         = inject(KJ_OVERLAY_MOUNT_STRATEGY);
  private readonly position      = inject(KJ_OVERLAY_POSITION_STRATEGY);
  private readonly backdrop      = inject(KJ_OVERLAY_BACKDROP_STRATEGY,    { optional: true });
  private readonly focusTrap     = inject(KJ_OVERLAY_FOCUS_TRAP_STRATEGY,  { optional: true });
  private readonly scrollLock    = inject(KJ_OVERLAY_SCROLL_LOCK_STRATEGY, { optional: true });
  private readonly liveAnnouncer = inject(KJ_OVERLAY_LIVE_ANNOUNCER_STRATEGY, { optional: true });
  private readonly trigger       = inject(KJ_OVERLAY_TRIGGER_EVENT_STRATEGY);
  private readonly role_         = inject(KJ_OVERLAY_PANEL_ROLE);

  readonly kjFor = input<KjOverlayTrigger | null>(null);
  readonly role    = computed(() => this.role_);
  readonly isModal = computed(() => !!this.backdrop?.inertSiblings);
  readonly state   = computed(() => this.controller.state());

  constructor() {
    this.controller.bindPanel(this.host.nativeElement);
    this.controller.attachStrategies({
      mount: this.mount,
      position: this.position,
      backdrop: this.backdrop ?? null,
      focusTrap: this.focusTrap ?? null,
      scrollLock: this.scrollLock ?? null,
      liveAnnouncer: this.liveAnnouncer ?? null,
      trigger: this.trigger,
    });
    effect(() => {
      const t = this.kjFor();
      if (t) t.attachPanel(this);
    });
  }
}
```

Two commits:
- `feat(overlay): add KjOverlayPanel host directive`
- `test(overlay): KjOverlayPanel ARIA + strategy wiring`

### Task 41: `KjFocusTrap` directive (declarative form)

**Files:**
- Create: `packages/core/src/primitives/overlay/focus-trap.ts`
- Create: `packages/core/src/primitives/overlay/focus-trap.spec.ts`

Tests:
1. when enabled, Tab on last focusable wraps to first
2. when `kjEnabled=false`, Tab does NOT wrap

Implementation: same logic as `tabCycle()` strategy from Task 21 but driven by `host.nativeElement` instead of a context's panel. Reuse the focusable-selector + trap helper.

```ts
import { Directive, ElementRef, inject, input, booleanAttribute } from '@angular/core';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

@Directive({
  selector: '[kjFocusTrap]',
  host: { '(keydown)': 'onKey($event)' },
})
export class KjFocusTrap {
  private readonly host = inject(ElementRef<HTMLElement>);
  readonly kjEnabled = input(true, { transform: booleanAttribute });

  onKey(e: KeyboardEvent) {
    if (!this.kjEnabled()) return;
    if (e.key !== 'Tab') return;
    const els = Array.from(this.host.nativeElement.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(el => el.offsetParent !== null);
    if (els.length === 0) return;
    const first = els[0], last = els[els.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
}
```

Two commits:
- `feat(overlay): add KjFocusTrap declarative directive`
- `test(overlay): KjFocusTrap wraps Tab + shift-Tab`

### Task 42: `KjBackdrop` component

**Files:**
- Create: `packages/core/src/primitives/overlay/backdrop.ts`
- Create: `packages/core/src/primitives/overlay/backdrop.spec.ts`

Tests:
1. host gets `class` from injected backdrop strategy
2. clicking host calls `controller.requestClose('outside')` if `closeOnClick=true`
3. clicking host is a no-op if `closeOnClick=false`

Implementation:

```ts
import { Component, ChangeDetectionStrategy, computed, inject } from '@angular/core';
import { KjOverlayController } from './controller';
import { KJ_OVERLAY_BACKDROP_STRATEGY } from './tokens';

@Component({
  selector: 'kj-backdrop',
  standalone: true,
  template: '',
  host: {
    '[class]': 'klass()',
    '[attr.data-state]': 'state()',
    '(click)': 'onClick($event)',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjBackdrop {
  private readonly controller = inject(KjOverlayController);
  private readonly strategy   = inject(KJ_OVERLAY_BACKDROP_STRATEGY)!;
  readonly state = this.controller.state;
  readonly klass = computed(() => (this.strategy as { className?: string }).className ?? 'kj-backdrop');

  onClick(_e: MouseEvent) {
    if (this.strategy.closeOnClick) this.controller.close('outside');
  }
}
```

(Adjust the `solidBackdrop`/`blurredBackdrop` strategies in Phase B to expose `className` on the returned object so this component can read it.)

Two commits:
- `feat(overlay): add KjBackdrop component`
- `test(overlay): KjBackdrop click closes when allowed`

### Task 43: Final exports + verification

**Files:**
- Modify: `packages/core/src/primitives/overlay/index.ts`

- [ ] **Step 1: Append exports**

```ts
// Append to existing index.ts:
export { KjOverlayController } from './controller';
export type { KjOverlayStrategies } from './controller';
export { KjOverlayBuilder } from './builder';
export type { KjOverlayBuilderConfig, KjAttachOptions } from './builder';
export { KjOverlayTrigger } from './trigger';
export { KjOverlayPanel } from './panel';
export { KjFocusTrap } from './focus-trap';
export { KjBackdrop } from './backdrop';
export * from './strategies/index';
```

- [ ] **Step 2: Final tests**

Run: `pnpm --filter @kouji-ui/core test`
Expected: all tests pass.

- [ ] **Step 3: Final build**

Run: `pnpm --filter @kouji-ui/core build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/primitives/overlay/index.ts
git commit -m "feat(overlay): export controller, builder, directives, and all strategies"
```

---

**End of Phase D and end of Foundations plan.** Branch has:
- All foundation services (`KjId`, `KjOverlayStack`, `KjScrollLock`, `KjLiveAnnouncerService`)
- All 26 strategy implementations
- `KjOverlayController` with full state machine
- `KjOverlayBuilder` for service-launched overlays
- 4 core directives/component (`KjOverlayTrigger`, `KjOverlayPanel`, `KjFocusTrap`, `KjBackdrop`)
- Old `KjOverlayService` and `KjAnchor` directive still present in parallel

Next plan (`2026-05-08-overlay-primitives-component-migration.md`) refactors the 13 surviving components onto these primitives.
