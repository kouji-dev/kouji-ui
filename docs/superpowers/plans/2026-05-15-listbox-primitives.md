# Listbox Primitives Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract 5 reusable primitives (`KjListNavigator`, `KjListItem`, `KjSelectionModel<T>`, `KjFilterableList<T>`, `KjTypeAhead`) into `packages/core/src/primitives/list/` and migrate `KjSelect`, `KjCommandPalette`, and `KjCombobox` to compose them. No public API changes.

**Architecture:** Container directive (`KjListNavigator`) owns `aria-activedescendant` + keyboard nav, hosted on the listbox panel (select / command-palette) or the input (combobox). Child directive (`KjListItem`) owns id, label, value, hidden, `aria-selected`/`aria-disabled`/`aria-posinset`/`aria-setsize`, click+enter+space activation. Consumer root provides `KJ_LIST_NAVIGATOR_CONFIG` by exposing a `contentChildren(KjListItem)` signal. Selection / filter / type-ahead are provider services injected per consumer.

**Tech Stack:** Angular 21 (signals, `contentChildren`, `hostDirectives`), Vitest, `@testing-library/angular`, `jest-axe`.

**Spec:** `docs/superpowers/specs/2026-05-15-listbox-primitives-design.md`

---

## Conventions for every task

- Commands run from repo root unless noted.
- Tests use Vitest. Run a single primitive's spec: `pnpm --filter @kouji-ui/core vitest run src/primitives/list/<name>.spec.ts`.
- Run all core tests: `pnpm --filter @kouji-ui/core test`.
- Run lint: `pnpm --filter @kouji-ui/core lint`.
- Commit message style (matches recent history): `feat(core/primitives): …`, `refactor(core/select): …`, etc. Always include the `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>` trailer.
- Class naming rule (project): omit `Directive` / `Service` / `Component` suffix unless two classes in the same folder would otherwise share a name.
- Every WCAG-affecting change includes an `axe` integration test where rendering markup is involved.

---

## Phase 1 — Scaffolding

### Task 1: Folder + tokens + inject helpers + barrel

**Files:**
- Create: `packages/core/src/primitives/list/tokens.ts`
- Create: `packages/core/src/primitives/list/inject-helpers.ts`
- Create: `packages/core/src/primitives/list/index.ts`
- Modify: `packages/core/src/primitives/index.ts`

- [ ] **Step 1: Create `tokens.ts`**

```ts
// packages/core/src/primitives/list/tokens.ts
import { InjectionToken, Signal } from '@angular/core';
import type { KjListItem } from './item';

/**
 * Shared context the consumer root directive (KjSelect / KjCombobox /
 * KjCommandPalette / …) provides so KjListNavigator and KjFilterableList
 * can read the items without each one running its own DOM/DI registry.
 */
export interface KjListNavigatorConfig {
  /** All registered items in DOM order. */
  readonly items: Signal<readonly KjListItem<unknown>[]>;
  /** Filter-aware visible subset. Falls back to `items` when omitted. */
  readonly visibleItems?: Signal<readonly KjListItem<unknown>[]>;
}

export const KJ_LIST_NAVIGATOR_CONFIG =
  new InjectionToken<KjListNavigatorConfig>('KJ_LIST_NAVIGATOR_CONFIG');

export type KjListOrientation = 'vertical' | 'horizontal' | 'both';
export type KjListSelectionMode = 'single' | 'multi';
export type KjFilterFn = (query: string, haystacks: readonly string[]) => number;
export type KjCompareFn<T> = (a: T, b: T) => boolean;
```

- [ ] **Step 2: Create `inject-helpers.ts`**

```ts
// packages/core/src/primitives/list/inject-helpers.ts
import { inject } from '@angular/core';
import { KjListItem } from './item';
import { KjSelectionModel } from './selection';
import { KjFilterableList } from './filterable-list';

/** Typed sugar over `inject(KjListItem)` — runtime is unchanged, type is narrowed. */
export const injectListItem = <T>() => inject(KjListItem) as KjListItem<T>;

/** Typed sugar over `inject(KjSelectionModel)`. Falls back to `unknown` if not provided. */
export const injectSelectionModel = <T>() => inject(KjSelectionModel) as KjSelectionModel<T>;

/** Typed sugar over `inject(KjFilterableList)`. */
export const injectFilterableList = <T>() => inject(KjFilterableList) as KjFilterableList<T>;
```

- [ ] **Step 3: Create `index.ts`** (forward-declares — files added in later tasks)

```ts
// packages/core/src/primitives/list/index.ts
export * from './tokens';
export { KjListItem } from './item';
export { KjListNavigator } from './navigator';
export { KjSelectionModel } from './selection';
export { KjFilterableList } from './filterable-list';
export { KjTypeAhead } from './type-ahead';
export { injectListItem, injectSelectionModel, injectFilterableList } from './inject-helpers';
```

- [ ] **Step 4: Wire into the primitives barrel**

Modify `packages/core/src/primitives/index.ts` — append one line:

```ts
export * from './list/index';
```

- [ ] **Step 5: Verify TypeScript compile fails as expected**

Run: `pnpm --filter @kouji-ui/core vitest run src/primitives/list/ 2>&1 | head -20`
Expected: errors about `Cannot find module './item'`, `./navigator`, etc. — the index files reference modules we haven't built yet. This is OK; subsequent tasks add them.

- [ ] **Step 6: Do NOT commit yet** — wait until Task 2 lands a real primitive so the barrel resolves. (Tasks 2–6 land together with one commit each.)

---

## Phase 2 — Primitives (TDD, one per task)

### Task 2: `KjListItem`

**Files:**
- Create: `packages/core/src/primitives/list/item.ts`
- Create: `packages/core/src/primitives/list/item.spec.ts`

- [ ] **Step 1: Write failing tests**

```ts
// packages/core/src/primitives/list/item.spec.ts
import { Component } from '@angular/core';
import { render } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { describe, it, expect } from 'vitest';
import { KjListItem } from './item';

expect.extend(toHaveNoViolations);

describe('KjListItem', () => {
  it('mints a stable id at construction (no afterNextRender race)', async () => {
    const { container } = await render(
      `<div role="option" kjListItem [kjItemValue]="'a'">A</div>`,
      { imports: [KjListItem] },
    );
    const el = container.querySelector('[kjListItem]')!;
    expect(el.id).toMatch(/^kj-list-item-\d+$/);
  });

  it('reflects aria-disabled from composed KjDisabled', async () => {
    const { container } = await render(
      `<div role="option" kjListItem [kjDisabled]="true" [kjItemValue]="'a'">A</div>`,
      { imports: [KjListItem] },
    );
    expect(container.querySelector('[kjListItem]')!.getAttribute('aria-disabled')).toBe('true');
  });

  it('omits aria-selected when no KjSelectionModel is provided', async () => {
    const { container } = await render(
      `<div role="option" kjListItem [kjItemValue]="'a'">A</div>`,
      { imports: [KjListItem] },
    );
    expect(container.querySelector('[kjListItem]')!.hasAttribute('aria-selected')).toBe(false);
  });

  it('emits activate on click with the value', async () => {
    @Component({
      standalone: true,
      imports: [KjListItem],
      template: `<div role="option" kjListItem [kjItemValue]="'apple'" (activate)="last = $event">A</div>`,
    })
    class Host { last: unknown = null; }
    const { container, fixture } = await render(Host);
    (container.querySelector('[kjListItem]') as HTMLElement).click();
    expect(fixture.componentInstance.last).toBe('apple');
  });

  it('does NOT emit activate when disabled', async () => {
    @Component({
      standalone: true,
      imports: [KjListItem],
      template: `<div role="option" kjListItem [kjDisabled]="true" [kjItemValue]="'apple'" (activate)="fired = true">A</div>`,
    })
    class Host { fired = false; }
    const { container, fixture } = await render(Host);
    (container.querySelector('[kjListItem]') as HTMLElement).click();
    expect(fixture.componentInstance.fired).toBe(false);
  });

  it('responds to Enter and Space', async () => {
    @Component({
      standalone: true,
      imports: [KjListItem],
      template: `<div role="option" kjListItem [kjItemValue]="'a'" (activate)="count = count + 1">A</div>`,
    })
    class Host { count = 0; }
    const { container, fixture } = await render(Host);
    const el = container.querySelector('[kjListItem]') as HTMLElement;
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    el.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    expect(fixture.componentInstance.count).toBe(2);
  });

  it('exposes label fallback from text content when kjItemLabel is empty', async () => {
    const { container } = await render(
      `<div role="option" kjListItem #i="kjListItem" [kjItemValue]="'a'">  Apple </div>
       <span data-test>{{ i.label() }}</span>`,
      { imports: [KjListItem] },
    );
    expect(container.querySelector('[data-test]')!.textContent).toBe('Apple');
  });

  it('hides element via [hidden] when setVisible(false)', async () => {
    const { container, fixture } = await render(
      `<div role="option" kjListItem #i="kjListItem" [kjItemValue]="'a'">A</div>`,
      { imports: [KjListItem] },
    );
    const item = (fixture.debugElement.children[0].references as any)['i'];
    item.setVisible(false);
    fixture.detectChanges();
    expect(container.querySelector('[kjListItem]')!.hasAttribute('hidden')).toBe(true);
  });

  it('binds aria-keyshortcuts when kjShortcut is set', async () => {
    const { container } = await render(
      `<div role="option" kjListItem [kjItemValue]="'a'" [kjShortcut]="'Mod+P'">A</div>`,
      { imports: [KjListItem] },
    );
    expect(container.querySelector('[kjListItem]')!.getAttribute('aria-keyshortcuts')).toBe('Mod+P');
  });

  it('passes axe accessibility audit', async () => {
    const { container } = await render(
      `<ul role="listbox">
         <li role="option" kjListItem [kjItemValue]="'a'">A</li>
       </ul>`,
      { imports: [KjListItem] },
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
```

- [ ] **Step 2: Run tests — they must FAIL**

Run: `pnpm --filter @kouji-ui/core vitest run src/primitives/list/item.spec.ts`
Expected: all 10 tests fail with "Cannot find module './item'".

- [ ] **Step 3: Implement `item.ts`**

```ts
// packages/core/src/primitives/list/item.ts
import {
  AfterContentInit,
  Directive,
  ElementRef,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { KjDisabled } from '../interaction/disabled';
import { KjSelectionModel } from './selection';

let _id = 0;

/**
 * Behavior primitive for any item rendered inside a listbox / menu / tree.
 * Composes `KjDisabled`; mints a stable id; exposes value/label/haystacks;
 * binds `aria-disabled`, `aria-selected` (via injected `KjSelectionModel`),
 * `aria-posinset`/`aria-setsize` (stamped by `KjFilterableList`), and
 * `aria-keyshortcuts`. Activation (click / Enter / Space) fires an
 * `activate` output the consumer subscribes to. Role is set by the
 * consumer's outer directive — varies per cluster.
 *
 * @doc-category Core/Primitives
 */
@Directive({
  selector: '[kjListItem]',
  exportAs: 'kjListItem',
  standalone: true,
  hostDirectives: [{ directive: KjDisabled, inputs: ['kjDisabled'] }],
  host: {
    '[id]': 'id',
    '[hidden]': 'visible() ? null : ""',
    '[attr.tabindex]': '"-1"',
    '[attr.aria-disabled]': 'disabled() ? "true" : null',
    '[attr.aria-selected]': 'ariaSelected()',
    '[attr.aria-posinset]': 'posInSet()',
    '[attr.aria-setsize]': 'setSize()',
    '[attr.aria-keyshortcuts]': 'kjShortcut() || null',
    '(click)': '_activate()',
    '(keydown.enter)': '$event.preventDefault(); _activate()',
    '(keydown.space)': '$event.preventDefault(); _activate()',
  },
})
export class KjListItem<T = unknown> implements AfterContentInit {
  readonly kjItemValue    = input<T | undefined>(undefined);
  readonly kjItemLabel    = input<string>('');
  readonly kjItemKeywords = input<readonly string[]>([]);
  readonly kjShortcut     = input<string | null>(null);

  readonly activate = output<T | undefined>();

  readonly id = `kj-list-item-${++_id}`;

  private readonly el = inject(ElementRef<HTMLElement>);
  readonly disabled = inject(KjDisabled).disabled;

  private readonly _elText = signal('');
  readonly value     = computed<T | undefined>(() => this.kjItemValue());
  readonly label     = computed(() => (this.kjItemLabel() || this._elText()).trim());
  readonly haystacks = computed<readonly string[]>(() => [this.label(), ...this.kjItemKeywords()]);

  private readonly _visible = signal(true);
  readonly visible = this._visible.asReadonly();
  setVisible(v: boolean): void { this._visible.set(v); }

  readonly posInSet = signal<number | null>(null);
  readonly setSize  = signal<number | null>(null);

  private readonly selection = inject<KjSelectionModel<T> | null>(KjSelectionModel, { optional: true });
  readonly ariaSelected = computed<'true' | 'false' | null>(() => {
    if (!this.selection) return null;
    const v = this.value();
    if (v === undefined) return null;
    return this.selection.isSelected(v) ? 'true' : 'false';
  });

  ngAfterContentInit(): void {
    this._elText.set(this.el.nativeElement.textContent ?? '');
  }

  _activate(): void {
    if (this.disabled()) return;
    this.activate.emit(this.value());
  }
}
```

- [ ] **Step 4: Run tests — they must PASS**

Run: `pnpm --filter @kouji-ui/core vitest run src/primitives/list/item.spec.ts`
Expected: all 10 tests pass.

> If the `selection` injection fails because `KjSelectionModel` doesn't exist yet, declare a forward stub: temporarily change the import to `// import { KjSelectionModel } from './selection';` and uncomment after Task 3 lands. Better: do Task 3 first and come back. Adjust order if you prefer.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/primitives/list/tokens.ts \
        packages/core/src/primitives/list/inject-helpers.ts \
        packages/core/src/primitives/list/index.ts \
        packages/core/src/primitives/list/item.ts \
        packages/core/src/primitives/list/item.spec.ts \
        packages/core/src/primitives/index.ts
git commit -m "$(cat <<'EOF'
feat(core/primitives): KjListItem + list scaffolding

Adds KjListItem hostDirective, the typed inject helpers, and the
KJ_LIST_NAVIGATOR_CONFIG token. KjListItem owns the stable id,
aria-disabled/selected/posinset/setsize/keyshortcuts bindings, hidden
attr, and click+Enter+Space activation. Role is left to the consumer.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: `KjSelectionModel<T>`

**Files:**
- Create: `packages/core/src/primitives/list/selection.ts`
- Create: `packages/core/src/primitives/list/selection.spec.ts`

- [ ] **Step 1: Write failing tests**

```ts
// packages/core/src/primitives/list/selection.spec.ts
import { TestBed } from '@angular/core/testing';
import { describe, it, expect } from 'vitest';
import { KjSelectionModel } from './selection';

describe('KjSelectionModel', () => {
  function setup<T>() {
    TestBed.configureTestingModule({ providers: [KjSelectionModel] });
    return TestBed.inject(KjSelectionModel) as KjSelectionModel<T>;
  }

  it('defaults to single mode with null value', () => {
    const m = setup<string>();
    expect(m.mode()).toBe('single');
    expect(m.value()).toBeNull();
  });

  it('isSelected uses Object.is by default', () => {
    const m = setup<string>();
    m.setValue('a');
    expect(m.isSelected('a')).toBe(true);
    expect(m.isSelected('b')).toBe(false);
  });

  it('toggle in single mode replaces value and returns closeRequested=true', () => {
    const m = setup<string>();
    const r = m.toggle('a');
    expect(m.value()).toBe('a');
    expect(r.closeRequested).toBe(true);
  });

  it('toggle in multi mode adds/removes and returns closeRequested=false', () => {
    const m = setup<string>();
    m.setMode('multi');
    m.toggle('a');
    m.toggle('b');
    expect(m.value()).toEqual(['a', 'b']);

    const r = m.toggle('a');
    expect(m.value()).toEqual(['b']);
    expect(r.closeRequested).toBe(false);
  });

  it('clear in single mode sets null, in multi mode sets []', () => {
    const m = setup<string>();
    m.setValue('a');
    m.clear();
    expect(m.value()).toBeNull();

    m.setMode('multi');
    m.setValue(['a', 'b']);
    m.clear();
    expect(m.value()).toEqual([]);
  });

  it('compareBy custom fn — by id field', () => {
    type Item = { id: string; label: string };
    const m = setup<Item>();
    m.setCompareBy((a, b) => a.id === b.id);
    m.setValue({ id: 'fr', label: 'France' });
    expect(m.isSelected({ id: 'fr', label: 'France (canonical)' })).toBe(true);
    expect(m.isSelected({ id: 'de', label: 'Germany' })).toBe(false);
  });

  it('isSelected returns false when value is null', () => {
    const m = setup<string>();
    expect(m.isSelected('a')).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests — they must FAIL**

Run: `pnpm --filter @kouji-ui/core vitest run src/primitives/list/selection.spec.ts`
Expected: all 7 tests fail (module not found).

- [ ] **Step 3: Implement `selection.ts`**

```ts
// packages/core/src/primitives/list/selection.ts
import { Injectable, signal } from '@angular/core';
import type { KjCompareFn, KjListSelectionMode } from './tokens';

/**
 * Selection state shared by a list-style consumer (KjSelect, KjCombobox).
 * Provided once per consumer root via DI. Defaults to single mode + Object.is
 * comparison. The consumer's root directive pushes user-supplied compareBy
 * (typically a `kjCompareBy` input) through {@link setCompareBy}.
 *
 * @doc-category Core/Primitives
 */
@Injectable()
export class KjSelectionModel<T = unknown> {
  private readonly _mode  = signal<KjListSelectionMode>('single');
  private readonly _value = signal<T | readonly T[] | null>(null);
  private _compareBy: KjCompareFn<T> = Object.is as KjCompareFn<T>;

  readonly mode  = this._mode.asReadonly();
  readonly value = this._value.asReadonly();

  setMode(mode: KjListSelectionMode): void {
    this._mode.set(mode);
  }

  setValue(v: T | readonly T[] | null): void {
    this._value.set(v);
  }

  setCompareBy(fn: KjCompareFn<T>): void {
    this._compareBy = fn;
  }

  isSelected(target: T): boolean {
    const v = this._value();
    if (v === null) return false;
    if (this._mode() === 'multi') {
      return Array.isArray(v) && v.some(x => this._compareBy(x, target));
    }
    return this._compareBy(v as T, target);
  }

  toggle(target: T): { closeRequested: boolean } {
    if (this._mode() === 'multi') {
      const current = this._value();
      const arr = Array.isArray(current) ? [...current] : [];
      const idx = arr.findIndex(x => this._compareBy(x, target));
      if (idx >= 0) arr.splice(idx, 1);
      else arr.push(target);
      this._value.set(arr);
      return { closeRequested: false };
    }
    this._value.set(target);
    return { closeRequested: true };
  }

  clear(): void {
    this._value.set(this._mode() === 'multi' ? [] : null);
  }
}
```

- [ ] **Step 4: Run tests — must PASS**

Run: `pnpm --filter @kouji-ui/core vitest run src/primitives/list/selection.spec.ts`
Expected: all 7 tests pass.

- [ ] **Step 5: Run full primitives suite to confirm no regressions**

Run: `pnpm --filter @kouji-ui/core vitest run src/primitives/`
Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/primitives/list/selection.ts \
        packages/core/src/primitives/list/selection.spec.ts
git commit -m "$(cat <<'EOF'
feat(core/primitives): KjSelectionModel<T>

Shared single/multi selection service with Object.is default and an
overridable compareBy. toggle returns { closeRequested } so consumers
decide overlay behavior.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: `KjTypeAhead`

**Files:**
- Create: `packages/core/src/primitives/list/type-ahead.ts`
- Create: `packages/core/src/primitives/list/type-ahead.spec.ts`

- [ ] **Step 1: Write failing tests**

```ts
// packages/core/src/primitives/list/type-ahead.spec.ts
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { KjTypeAhead } from './type-ahead';
import type { KjListItem } from './item';

function item(id: string, label: string, disabled = false): KjListItem<unknown> {
  return {
    id,
    label: () => label,
    disabled: () => disabled,
  } as unknown as KjListItem<unknown>;
}

describe('KjTypeAhead', () => {
  let ta: KjTypeAhead;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [KjTypeAhead] });
    ta = TestBed.inject(KjTypeAhead);
  });

  it('returns the first item whose label starts with the typed char', () => {
    const items = [item('1', 'Apple'), item('2', 'Banana')];
    expect(ta.match('b', items)).toBe('2');
  });

  it('buffers consecutive chars within the debounce window', () => {
    const items = [item('1', 'Apple'), item('2', 'Apricot'), item('3', 'Avocado')];
    expect(ta.match('a', items)).toBe('1');     // matches Apple (first starting with 'a')
    expect(ta.match('p', items)).toBe('1');     // 'ap' — Apple still matches first
    expect(ta.match('r', items)).toBe('2');     // 'apr' — Apricot
  });

  it('resets the buffer after the debounce window', () => {
    const items = [item('1', 'Apple'), item('2', 'Banana')];
    ta.debounceMs.set(10);
    expect(ta.match('a', items)).toBe('1');
    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
    return sleep(20).then(() => {
      expect(ta.match('b', items)).toBe('2');
    });
  });

  it('skips disabled items', () => {
    const items = [item('1', 'Apple', true), item('2', 'Apricot')];
    expect(ta.match('a', items)).toBe('2');
  });

  it('returns null when nothing matches', () => {
    const items = [item('1', 'Apple')];
    expect(ta.match('z', items)).toBeNull();
  });

  it('reset() clears the buffer', () => {
    const items = [item('1', 'Apple'), item('2', 'Banana')];
    ta.match('a', items);
    ta.reset();
    expect(ta.match('b', items)).toBe('2');
  });
});
```

- [ ] **Step 2: Run — must FAIL**

Run: `pnpm --filter @kouji-ui/core vitest run src/primitives/list/type-ahead.spec.ts`

- [ ] **Step 3: Implement `type-ahead.ts`**

```ts
// packages/core/src/primitives/list/type-ahead.ts
import { Injectable, signal } from '@angular/core';
import type { KjListItem } from './item';

/**
 * Char-buffered type-ahead matcher used by `KjListNavigator` on
 * single-character key presses. Buffers characters within a debounce
 * window so users can type "ap" to jump to "Apricot" instead of just
 * "Apple". Matches case-insensitive prefix against `KjListItem.label()`.
 * Skips disabled items.
 *
 * @doc-category Core/Primitives
 */
@Injectable()
export class KjTypeAhead {
  readonly debounceMs = signal(500);

  private _buffer = '';
  private _lastKeyAt = 0;

  /**
   * Append `key` to the buffer (reset if outside debounce window), then
   * return the id of the first non-disabled item whose label starts with
   * the buffered prefix. Returns `null` if no item matches.
   */
  match(key: string, items: readonly KjListItem<unknown>[]): string | null {
    if (key.length !== 1) return null;
    const now = performance.now();
    if (now - this._lastKeyAt > this.debounceMs()) this._buffer = '';
    this._buffer += key.toLowerCase();
    this._lastKeyAt = now;

    const needle = this._buffer;
    const hit = items.find(
      i => !i.disabled() && i.label().toLowerCase().startsWith(needle),
    );
    return hit?.id ?? null;
  }

  reset(): void {
    this._buffer = '';
    this._lastKeyAt = 0;
  }
}
```

- [ ] **Step 4: Run — must PASS**

Run: `pnpm --filter @kouji-ui/core vitest run src/primitives/list/type-ahead.spec.ts`

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/primitives/list/type-ahead.ts \
        packages/core/src/primitives/list/type-ahead.spec.ts
git commit -m "$(cat <<'EOF'
feat(core/primitives): KjTypeAhead

Char-buffered prefix matcher; debounce window resets the buffer; skips
disabled items.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: `KjListNavigator`

**Files:**
- Create: `packages/core/src/primitives/list/navigator.ts`
- Create: `packages/core/src/primitives/list/navigator.spec.ts`

- [ ] **Step 1: Write failing tests**

```ts
// packages/core/src/primitives/list/navigator.spec.ts
import { Component, ElementRef, inject, signal } from '@angular/core';
import { render } from '@testing-library/angular';
import { describe, it, expect } from 'vitest';
import { KjListItem } from './item';
import { KjListNavigator } from './navigator';
import { KjTypeAhead } from './type-ahead';
import { KJ_LIST_NAVIGATOR_CONFIG } from './tokens';

/** Fake item shaped like the parts of KjListItem the navigator reads. */
function fakeItem(id: string, label: string, disabled = false) {
  let activated = 0;
  return {
    id,
    label: () => label,
    disabled: () => disabled,
    _activate: () => { activated++; },
    get activated() { return activated; },
  } as unknown as KjListItem<unknown> & { activated: number; _activate: () => void };
}

@Component({
  standalone: true,
  imports: [KjListNavigator],
  template: `<div kjListNavigator #n="kjListNavigator"></div>`,
})
class Host {
  readonly el = inject(ElementRef<HTMLElement>);
}

function setup(items: ReturnType<typeof fakeItem>[]) {
  return render(Host, {
    providers: [
      KjTypeAhead,
      {
        provide: KJ_LIST_NAVIGATOR_CONFIG,
        useValue: { items: signal(items) },
      },
    ],
  });
}

describe('KjListNavigator', () => {
  it('starts with no active item', async () => {
    const { container } = await setup([fakeItem('1', 'A'), fakeItem('2', 'B')]);
    const host = container.querySelector('[kjListNavigator]')!;
    expect(host.hasAttribute('aria-activedescendant')).toBe(false);
  });

  it('ArrowDown moves to next item, wraps past last when kjWrap=true', async () => {
    const items = [fakeItem('1', 'A'), fakeItem('2', 'B')];
    const { container } = await setup(items);
    const host = container.querySelector('[kjListNavigator]') as HTMLElement;
    host.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(host.getAttribute('aria-activedescendant')).toBe('1');
    host.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(host.getAttribute('aria-activedescendant')).toBe('2');
    host.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(host.getAttribute('aria-activedescendant')).toBe('1');
  });

  it('ArrowUp wraps to last item from first', async () => {
    const items = [fakeItem('1', 'A'), fakeItem('2', 'B')];
    const { container } = await setup(items);
    const host = container.querySelector('[kjListNavigator]') as HTMLElement;
    host.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    expect(host.getAttribute('aria-activedescendant')).toBe('2');
  });

  it('skips disabled items during navigation', async () => {
    const items = [fakeItem('1', 'A'), fakeItem('2', 'B', true), fakeItem('3', 'C')];
    const { container } = await setup(items);
    const host = container.querySelector('[kjListNavigator]') as HTMLElement;
    host.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(host.getAttribute('aria-activedescendant')).toBe('1');
    host.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(host.getAttribute('aria-activedescendant')).toBe('3');
  });

  it('Home moves to first, End moves to last', async () => {
    const items = [fakeItem('1', 'A'), fakeItem('2', 'B'), fakeItem('3', 'C')];
    const { container } = await setup(items);
    const host = container.querySelector('[kjListNavigator]') as HTMLElement;
    host.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    expect(host.getAttribute('aria-activedescendant')).toBe('3');
    host.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    expect(host.getAttribute('aria-activedescendant')).toBe('1');
  });

  it('Enter calls _activate on the current item and preventDefaults', async () => {
    const items = [fakeItem('1', 'A'), fakeItem('2', 'B')];
    const { container } = await setup(items);
    const host = container.querySelector('[kjListNavigator]') as HTMLElement;
    host.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    const e = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    host.dispatchEvent(e);
    expect((items[0] as any).activated).toBe(1);
    expect(e.defaultPrevented).toBe(true);
  });

  it('Enter does NOT preventDefault when there is no active item', async () => {
    const items = [fakeItem('1', 'A')];
    const { container } = await setup(items);
    const host = container.querySelector('[kjListNavigator]') as HTMLElement;
    const e = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    host.dispatchEvent(e);
    expect(e.defaultPrevented).toBe(false);
    expect((items[0] as any).activated).toBe(0);
  });

  it('Space activates current item', async () => {
    const items = [fakeItem('1', 'A')];
    const { container } = await setup(items);
    const host = container.querySelector('[kjListNavigator]') as HTMLElement;
    host.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    host.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    expect((items[0] as any).activated).toBe(1);
  });

  it('PageDown moves by kjPageSize (default 10)', async () => {
    const items = Array.from({ length: 15 }, (_, i) => fakeItem(String(i + 1), 'Item ' + (i + 1)));
    const { container } = await setup(items);
    const host = container.querySelector('[kjListNavigator]') as HTMLElement;
    host.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })); // active = '1'
    host.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageDown', bubbles: true }));
    expect(host.getAttribute('aria-activedescendant')).toBe('11');
  });

  it('delegates single-char keys to KjTypeAhead and activates the match', async () => {
    const items = [fakeItem('1', 'Apple'), fakeItem('2', 'Banana')];
    const { container } = await setup(items);
    const host = container.querySelector('[kjListNavigator]') as HTMLElement;
    host.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', bubbles: true }));
    expect(host.getAttribute('aria-activedescendant')).toBe('2');
  });

  it('kjOrientation="horizontal" responds to ArrowLeft/Right not Up/Down', async () => {
    const items = [fakeItem('1', 'A'), fakeItem('2', 'B')];
    const { container, fixture } = await render(
      `<div kjListNavigator [kjOrientation]="'horizontal'"></div>`,
      {
        imports: [KjListNavigator],
        providers: [
          KjTypeAhead,
          { provide: KJ_LIST_NAVIGATOR_CONFIG, useValue: { items: signal(items) } },
        ],
      },
    );
    const host = container.querySelector('[kjListNavigator]') as HTMLElement;
    host.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(host.hasAttribute('aria-activedescendant')).toBe(false);
    host.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(host.getAttribute('aria-activedescendant')).toBe('1');
  });

  it('kjWrap=false clamps at last item instead of wrapping', async () => {
    const items = [fakeItem('1', 'A'), fakeItem('2', 'B')];
    const { container } = await render(
      `<div kjListNavigator [kjWrap]="false"></div>`,
      {
        imports: [KjListNavigator],
        providers: [
          KjTypeAhead,
          { provide: KJ_LIST_NAVIGATOR_CONFIG, useValue: { items: signal(items) } },
        ],
      },
    );
    const host = container.querySelector('[kjListNavigator]') as HTMLElement;
    host.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    host.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(host.getAttribute('aria-activedescendant')).toBe('2');  // clamped
  });
});
```

- [ ] **Step 2: Run — must FAIL**

- [ ] **Step 3: Implement `navigator.ts`**

```ts
// packages/core/src/primitives/list/navigator.ts
import {
  Directive,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { KjListItem } from './item';
import {
  KJ_LIST_NAVIGATOR_CONFIG,
  type KjListOrientation,
} from './tokens';
import { KjTypeAhead } from './type-ahead';

/**
 * Container-side keyboard / active-descendant primitive. Hosted on the
 * listbox panel (select / command-palette) or the input element
 * (combobox). Owns `aria-activedescendant` and the ArrowUp/Down /
 * Home/End / PageUp/Down / Enter / Space / type-ahead contract for the
 * APG listbox + combobox patterns.
 *
 * @doc-category Core/Primitives
 */
@Directive({
  selector: '[kjListNavigator]',
  exportAs: 'kjListNavigator',
  standalone: true,
  host: {
    '[attr.aria-activedescendant]': 'activeId()',
    '(keydown)': '_onKeydown($event)',
  },
})
export class KjListNavigator {
  readonly kjOrientation     = input<KjListOrientation>('vertical');
  readonly kjWrap            = input<boolean>(true);
  readonly kjPageSize        = input<number>(10);
  readonly kjActivateOnHover = input<boolean>(false);

  readonly kjActiveChange = output<string | null>();

  private readonly cfg = inject(KJ_LIST_NAVIGATOR_CONFIG);
  private readonly typeAhead = inject(KjTypeAhead, { optional: true });

  private readonly _activeId = signal<string | null>(null);
  readonly activeId = this._activeId.asReadonly();

  /** Visible + non-disabled items, in DOM order. */
  private readonly navigable = computed<readonly KjListItem<unknown>[]>(() => {
    const source = this.cfg.visibleItems?.() ?? this.cfg.items();
    return source.filter(i => !i.disabled());
  });

  readonly activeItem = computed<KjListItem<unknown> | null>(() => {
    const id = this._activeId();
    return id ? this.navigable().find(i => i.id === id) ?? null : null;
  });

  setActive(id: string | null): void {
    if (this._activeId() === id) return;
    this._activeId.set(id);
    this.kjActiveChange.emit(id);
  }

  moveBy(delta: number): void {
    const items = this.navigable();
    if (!items.length) return;
    const currentIdx = items.findIndex(i => i.id === this._activeId());
    let next = currentIdx + delta;
    const last = items.length - 1;
    if (this.kjWrap()) {
      next = ((next % items.length) + items.length) % items.length;
    } else {
      if (next < 0) next = 0;
      if (next > last) next = last;
    }
    this.setActive(items[next].id);
  }

  moveToFirst(): void {
    const items = this.navigable();
    if (items.length) this.setActive(items[0].id);
  }

  moveToLast(): void {
    const items = this.navigable();
    if (items.length) this.setActive(items[items.length - 1].id);
  }

  activateCurrent(): void {
    this.activeItem()?._activate();
  }

  _onKeydown(e: KeyboardEvent): void {
    const o = this.kjOrientation();
    const isV = o === 'vertical' || o === 'both';
    const isH = o === 'horizontal' || o === 'both';

    switch (e.key) {
      case 'ArrowDown':
        if (!isV) return;
        e.preventDefault();
        this.moveBy(1);
        return;
      case 'ArrowUp':
        if (!isV) return;
        e.preventDefault();
        this.moveBy(-1);
        return;
      case 'ArrowRight':
        if (!isH) return;
        e.preventDefault();
        this.moveBy(1);
        return;
      case 'ArrowLeft':
        if (!isH) return;
        e.preventDefault();
        this.moveBy(-1);
        return;
      case 'Home':
        e.preventDefault();
        this.moveToFirst();
        return;
      case 'End':
        e.preventDefault();
        this.moveToLast();
        return;
      case 'PageDown':
        e.preventDefault();
        this.moveBy(this.kjPageSize());
        return;
      case 'PageUp':
        e.preventDefault();
        this.moveBy(-this.kjPageSize());
        return;
      case 'Enter':
      case ' ':
        // Only preventDefault when we actually activate. Lets consumers
        // (e.g. combobox free-text Enter) fall through when nothing is
        // active, and lets Space type a literal space in combobox input.
        if (this.activeItem()) {
          e.preventDefault();
          this.activateCurrent();
        }
        return;
      default: {
        if (e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey) return;
        if (!this.typeAhead) return;
        const id = this.typeAhead.match(e.key, this.navigable());
        if (id) this.setActive(id);
      }
    }
  }
}
```

- [ ] **Step 4: Run — must PASS**

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/primitives/list/navigator.ts \
        packages/core/src/primitives/list/navigator.spec.ts
git commit -m "$(cat <<'EOF'
feat(core/primitives): KjListNavigator

Container-side hostDirective owning aria-activedescendant +
ArrowUp/Down/Home/End/PageUp/Down/Enter/Space + type-ahead delegation.
Honors orientation, wrap/clamp, and disabled-item skip per APG.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: `KjFilterableList<T>`

**Files:**
- Create: `packages/core/src/primitives/list/filterable-list.ts`
- Create: `packages/core/src/primitives/list/filterable-list.spec.ts`

- [ ] **Step 1: Write failing tests**

```ts
// packages/core/src/primitives/list/filterable-list.spec.ts
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { describe, it, expect, beforeEach } from 'vitest';
import { KjFilterableList } from './filterable-list';
import { KJ_LIST_NAVIGATOR_CONFIG } from './tokens';
import type { KjListItem } from './item';

function fakeItem(id: string, label: string, keywords: readonly string[] = []): KjListItem<unknown> {
  const _visible = signal(true);
  const _posInSet = signal<number | null>(null);
  const _setSize = signal<number | null>(null);
  return {
    id,
    label: () => label,
    haystacks: () => [label, ...keywords],
    disabled: () => false,
    visible: _visible,
    setVisible: (v: boolean) => _visible.set(v),
    posInSet: _posInSet,
    setSize: _setSize,
  } as unknown as KjListItem<unknown>;
}

describe('KjFilterableList', () => {
  let items: ReturnType<typeof signal<readonly KjListItem<unknown>[]>>;
  let svc: KjFilterableList;

  beforeEach(() => {
    items = signal<readonly KjListItem<unknown>[]>([
      fakeItem('1', 'Apple'),
      fakeItem('2', 'Banana'),
      fakeItem('3', 'Apricot'),
    ]);
    TestBed.configureTestingModule({
      providers: [
        KjFilterableList,
        { provide: KJ_LIST_NAVIGATOR_CONFIG, useValue: { items } },
      ],
    });
    svc = TestBed.inject(KjFilterableList);
  });

  it('default substring filter — empty query returns all items', () => {
    expect(svc.visibleItems().length).toBe(3);
  });

  it('substring filter narrows results', () => {
    svc.setQuery('ap');
    expect(svc.visibleItems().map(i => i.id)).toEqual(['1', '3']);
  });

  it('marks filtered-out items as not visible via setVisible(false)', () => {
    svc.setQuery('ap');
    const all = items();
    expect(all[0].visible()).toBe(true);   // Apple
    expect(all[1].visible()).toBe(false);  // Banana
    expect(all[2].visible()).toBe(true);   // Apricot
  });

  it('isEmpty signal flips on no-result query', () => {
    expect(svc.isEmpty()).toBe(false);
    svc.setQuery('zzz');
    expect(svc.isEmpty()).toBe(true);
  });

  it('shouldFilter=false bypasses filter and shows all', () => {
    svc.setQuery('zzz');
    svc.setShouldFilter(false);
    expect(svc.visibleItems().length).toBe(3);
  });

  it('custom filter fn is applied', () => {
    svc.setFilterFn((q, hs) => hs.some(h => h.endsWith(q)) ? 1 : 0);
    svc.setQuery('cot');
    expect(svc.visibleItems().map(i => i.id)).toEqual(['3']);
  });

  it('stamps posInSet/setSize on visible items, clears them on hidden items', () => {
    svc.setQuery('ap');
    const all = items();
    expect(all[0].posInSet()).toBe(1);
    expect(all[0].setSize()).toBe(2);
    expect(all[1].posInSet()).toBeNull();
    expect(all[2].posInSet()).toBe(2);
  });

  it('announcement signal returns "{n} results"', () => {
    svc.setQuery('ap');
    expect(svc.announcement()).toBe('2 results');
    svc.setQuery('zzz');
    expect(svc.announcement()).toBe('No results');
  });
});
```

- [ ] **Step 2: Run — must FAIL**

- [ ] **Step 3: Implement `filterable-list.ts`**

```ts
// packages/core/src/primitives/list/filterable-list.ts
import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { KJ_LIST_NAVIGATOR_CONFIG, type KjFilterFn } from './tokens';
import type { KjListItem } from './item';

const defaultSubstring: KjFilterFn = (q, hs) => {
  if (!q) return 1;
  const needle = q.toLowerCase();
  return hs.some(h => h.toLowerCase().includes(needle)) ? 1 : 0;
};

/**
 * Filter / search state for a list-style consumer (KjCombobox,
 * KjCommandPalette). Reads items from `KJ_LIST_NAVIGATOR_CONFIG` and
 * exposes `visibleItems`, `visibleCount`, `isEmpty`, plus a human
 * `announcement()` signal consumers wire into a `kjLiveRegion` so
 * WCAG 4.1.3 (Status Messages) is honored.
 *
 * @doc-category Core/Primitives
 */
@Injectable()
export class KjFilterableList<T = unknown> {
  private readonly cfg = inject(KJ_LIST_NAVIGATOR_CONFIG);

  private readonly _query    = signal<string>('');
  private readonly _filterFn = signal<KjFilterFn>(defaultSubstring);
  private readonly _shouldFilter      = signal<boolean>(true);
  private readonly _autoActivateFirst = signal<boolean>(true);

  readonly query = this._query.asReadonly();

  readonly visibleItems = computed<readonly KjListItem<T>[]>(() => {
    const all = this.cfg.items() as readonly KjListItem<T>[];
    if (!this._shouldFilter()) return all;
    const q = this._query();
    const fn = this._filterFn();
    return all.filter(i => fn(q, i.haystacks()) > 0);
  });

  readonly visibleCount = computed(() => this.visibleItems().length);
  readonly isEmpty      = computed(() => this.visibleCount() === 0);
  readonly announcement = computed(() =>
    this.isEmpty() ? 'No results' : `${this.visibleCount()} results`,
  );

  setQuery(q: string): void           { this._query.set(q); }
  setFilterFn(fn: KjFilterFn): void   { this._filterFn.set(fn); }
  setShouldFilter(b: boolean): void   { this._shouldFilter.set(b); }
  setAutoActivateFirst(b: boolean): void { this._autoActivateFirst.set(b); }
  /** Public read so KjListNavigator (or consumer effects) can react. */
  readonly autoActivateFirst = this._autoActivateFirst.asReadonly();

  constructor() {
    // Side effect 1: toggle visibility + stamp posInSet/setSize.
    effect(() => {
      const all = this.cfg.items();
      const visible = this.visibleItems() as readonly KjListItem<unknown>[];
      const visibleSet = new Set(visible.map(v => v.id));
      const total = visible.length;
      let i = 0;
      for (const item of all) {
        const isVisible = visibleSet.has(item.id);
        item.setVisible(isVisible);
        if (isVisible) {
          item.posInSet.set(++i);
          item.setSize.set(total);
        } else {
          item.posInSet.set(null);
          item.setSize.set(null);
        }
      }
    });
  }
}
```

- [ ] **Step 4: Run — must PASS**

- [ ] **Step 5: Run all primitive specs**

Run: `pnpm --filter @kouji-ui/core vitest run src/primitives/list/`
Expected: all green across all 5 primitives.

- [ ] **Step 6: Run linter**

Run: `pnpm --filter @kouji-ui/core lint`
Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add packages/core/src/primitives/list/filterable-list.ts \
        packages/core/src/primitives/list/filterable-list.spec.ts
git commit -m "$(cat <<'EOF'
feat(core/primitives): KjFilterableList<T>

Reads items from KJ_LIST_NAVIGATOR_CONFIG, applies pluggable filter fn,
stamps each item's visible/posInSet/setSize signals, and exposes an
announcement() signal consumers wire to kjLiveRegion for WCAG 4.1.3.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 3 — Migrate `KjSelect`

### Task 7: Wire primitives into `KjSelect` root

**Files:**
- Modify: `packages/core/src/select/select-root.ts`

- [ ] **Step 1: Read the current file**

The existing root owns `kjSelectValue`, `_multiple`, `isSelected`, `select`. We replace the inline selection state with `KjSelectionModel` and expose `contentChildren(KjListItem)` so navigator/type-ahead can read it.

- [ ] **Step 2: Rewrite `select-root.ts`**

```ts
// packages/core/src/select/select-root.ts
import {
  Directive,
  InjectionToken,
  contentChildren,
  effect,
  inject,
  input,
  model,
  signal,
  untracked,
} from '@angular/core';
import { KjOverlayController } from '../primitives/overlay/controller';
import {
  KJ_LIST_NAVIGATOR_CONFIG,
  KjListItem,
  KjSelectionModel,
  KjTypeAhead,
  type KjCompareFn,
  type KjListNavigatorConfig,
} from '../primitives/list';

export const KJ_SELECT = new InjectionToken<KjSelect>('KjSelect');

/**
 * Root select container. Owns the overlay controller + selection model
 * (`KjSelectionModel`) + item query (`contentChildren(KjListItem)`).
 * Trigger / panel / option composite primitives read state from this
 * root via DI tokens.
 *
 * @example see select.spec.ts
 * @doc-category Core/Inputs
 */
@Directive({
  selector: '[kjSelect]',
  standalone: true,
  exportAs: 'kjSelect',
  providers: [
    { provide: KJ_SELECT, useExisting: KjSelect },
    { provide: KJ_LIST_NAVIGATOR_CONFIG, useExisting: KjSelect },
    KjSelectionModel,
    KjTypeAhead,
    KjOverlayController,
  ],
})
export class KjSelect implements KjListNavigatorConfig {
  private readonly controller = inject(KjOverlayController);
  private readonly selection  = inject(KjSelectionModel);

  /** Two-way bindable selected value (single) or values (multi). */
  readonly kjSelectValue = model<unknown>(undefined);

  /** Optional custom equality fn. Defaults to `Object.is`. */
  readonly kjCompareBy = input<KjCompareFn<unknown>>(Object.is);

  /** @internal — written by `KjSelectTrigger`'s `kjMultiple` input. */
  readonly _multiple = signal(false);

  readonly value = this.kjSelectValue.asReadonly();
  readonly multiple = this._multiple.asReadonly();
  readonly open = this.controller.isOpen;

  /** All `KjListItem`s under this select. Source of truth for navigator + type-ahead. */
  readonly items = contentChildren(KjListItem, { descendants: true });

  constructor() {
    // Push compareBy + mode into the selection model.
    effect(() => this.selection.setCompareBy(this.kjCompareBy() as KjCompareFn<unknown>));
    effect(() => this.selection.setMode(this._multiple() ? 'multi' : 'single'));

    // Bridge: external model() -> selection model. Use untracked to avoid feedback loops.
    effect(() => {
      const external = this.kjSelectValue();
      untracked(() => this.selection.setValue(external as never));
    });
    effect(() => {
      const internal = this.selection.value();
      untracked(() => this.kjSelectValue.set(internal as unknown));
    });
  }

  /** True iff `target` is currently selected. */
  isSelected(target: unknown): boolean {
    return this.selection.isSelected(target);
  }

  /**
   * Toggle the value through the selection model. Single mode closes the
   * overlay; multi mode keeps it open. Return shape preserved for
   * backwards compat with KjSelectTrigger.
   */
  select(target: unknown): { close: boolean } {
    const { closeRequested } = this.selection.toggle(target);
    if (closeRequested) this.controller.close('programmatic');
    return { close: closeRequested };
  }
}
```

- [ ] **Step 3: Run existing select specs**

Run: `pnpm --filter @kouji-ui/core vitest run src/select/select.spec.ts`
Expected: tests still pass (we preserved `isSelected`/`select`/`multiple` API).

If any fail, **STOP** and reconcile before moving to Task 8. Likely culprit: an effect feedback loop — verify the `untracked` wraps are in place.

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/select/select-root.ts
git commit -m "$(cat <<'EOF'
refactor(core/select): route selection through KjSelectionModel

KjSelect now provides KJ_LIST_NAVIGATOR_CONFIG + KjSelectionModel +
KjTypeAhead and exposes items via contentChildren(KjListItem). Public
API (kjSelectValue, isSelected, select, _multiple) is preserved.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Migrate `KjOption` to compose `KjListItem`

**Files:**
- Modify: `packages/core/src/select/select-option.ts`

- [ ] **Step 1: Rewrite `select-option.ts`**

```ts
// packages/core/src/select/select-option.ts
import { Directive, inject } from '@angular/core';
import { KjListItem, injectListItem } from '../primitives/list';
import { KJ_SELECT } from './select-root';

/**
 * Individual option inside `<kj-select-content>`. Public input
 * (`kjOptionValue`) is preserved by aliasing into the composed
 * `KjListItem`'s `kjItemValue`. Click / Enter / Space activation is
 * owned by `KjListItem`; this directive only adapts the value back to
 * `KjSelect.select(value)` and sets the ARIA role.
 *
 * @example
 * ```html
 * <div kjOption [kjOptionValue]="'apple'">Apple</div>
 * ```
 * @doc-category Core/Inputs
 */
@Directive({
  selector: '[kjOption]',
  standalone: true,
  hostDirectives: [
    {
      directive: KjListItem,
      inputs: [
        'kjItemValue:kjOptionValue',
        'kjItemLabel',
        'kjItemKeywords',
        'kjDisabled',
      ],
    },
  ],
  host: {
    'class': 'kj-option',
    'role': 'option',
  },
})
export class KjOption {
  private readonly item = injectListItem<unknown>();
  private readonly select = inject(KJ_SELECT, { optional: true });

  /** Forward `aria-selected` from the item (driven by KjSelectionModel). */
  // Note: KjListItem already sets [attr.aria-selected]; nothing more here.

  constructor() {
    this.item.activate.subscribe(value => {
      if (this.select && value !== undefined) this.select.select(value);
    });
  }
}
```

- [ ] **Step 2: Run select specs**

Run: `pnpm --filter @kouji-ui/core vitest run src/select/`
Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/select/select-option.ts
git commit -m "$(cat <<'EOF'
refactor(core/select): KjOption composes KjListItem

Public input kjOptionValue preserved via hostDirective alias. Click /
Enter / Space / aria-disabled / aria-selected / stable id now come from
the primitive. role=option stays here because it varies per cluster.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: Migrate `KjSelectContent` to compose `KjListNavigator`

**Files:**
- Modify: `packages/core/src/select/select-content.ts`

- [ ] **Step 1: Rewrite `select-content.ts`**

```ts
// packages/core/src/select/select-content.ts
import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  inject,
} from '@angular/core';
import { KjOverlayPanel } from '../primitives/overlay/panel';
import {
  KJ_OVERLAY_MOUNT_STRATEGY,
  KJ_OVERLAY_POSITION_STRATEGY,
  KJ_OVERLAY_PANEL_ROLE,
} from '../primitives/overlay/tokens';
import type { KjSide, KjAlign } from '../primitives/overlay/types';
import { bodyPortal } from '../primitives/overlay/strategies/mount/body-portal';
import { anchoredTo } from '../primitives/overlay/strategies/position/anchored-to';
import { KjListNavigator, injectSelectionModel } from '../primitives/list';
import { input } from '@angular/core';

/**
 * Listbox panel for `KjSelect`. Composes `KjOverlayPanel` for
 * mount/position/role wiring and `KjListNavigator` for the
 * APG listbox keyboard + active-descendant contract. Reflects
 * `KjSelectionModel.mode()` as `aria-multiselectable`.
 *
 * @doc-category Core/Inputs
 */
@Component({
  selector: 'kj-select-content',
  standalone: true,
  hostDirectives: [
    { directive: KjOverlayPanel, inputs: ['kjFor'] },
    KjListNavigator,
  ],
  providers: [
    { provide: KJ_OVERLAY_PANEL_ROLE, useValue: 'listbox' as const },
    { provide: KJ_OVERLAY_MOUNT_STRATEGY, useFactory: () => bodyPortal() },
    { provide: KJ_OVERLAY_POSITION_STRATEGY, useFactory: () => anchoredTo() },
  ],
  host: {
    '[attr.aria-multiselectable]': 'selection.mode() === "multi" ? "true" : null',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `<ng-content />`,
})
export class KjSelectContent {
  protected readonly selection = injectSelectionModel<unknown>();

  readonly kjSide = input<KjSide>('bottom');
  readonly kjAlign = input<KjAlign>('start');
  readonly kjOffset = input<number, unknown>(4, {
    transform: v => Number(v) || 4,
  });

  constructor() {
    const pos = inject(KJ_OVERLAY_POSITION_STRATEGY) as ReturnType<typeof anchoredTo>;
    pos.configure({
      side: this.kjSide,
      align: this.kjAlign,
      offset: this.kjOffset,
      matchTriggerWidth: 'min',
    });
  }
}
```

- [ ] **Step 2: Run select specs**

Run: `pnpm --filter @kouji-ui/core vitest run src/select/`
Expected: all pass. The existing tests cover role/aria-multiselectable/keyboard.

If `select.spec.ts` lacks a keyboard test, **add one** asserting `aria-activedescendant` flips on ArrowDown:

```ts
it('ArrowDown sets aria-activedescendant on the panel', async () => {
  // … render as before, focus panel, dispatch ArrowDown
  // expect(panel.getAttribute('aria-activedescendant')).toMatch(/^kj-list-item-/);
});
```

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/select/select-content.ts packages/core/src/select/select.spec.ts
git commit -m "$(cat <<'EOF'
refactor(core/select): KjSelectContent composes KjListNavigator

Removes the inline querySelectorAll-based keyboard handler in favor of
the shared navigator primitive. aria-multiselectable now reads from
KjSelectionModel.mode().

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 4 — Migrate `KjCommandPalette`

### Task 10: Wire primitives into `KjCommandPalette` root

**Files:**
- Modify: `packages/core/src/command-palette/command-palette.ts`
- Keep: `packages/core/src/command-palette/command-palette.context.ts` (KJ_COMMAND_PALETTE token retained; registration ifaces dropped in Task 13)

- [ ] **Step 1: Rewrite `command-palette.ts`** to provide primitives and replace its internal items signal with `contentChildren(KjListItem)`

```ts
// packages/core/src/command-palette/command-palette.ts
import {
  Directive,
  booleanAttribute,
  computed,
  contentChildren,
  effect,
  input,
  model,
  output,
  untracked,
} from '@angular/core';
import {
  KJ_LIST_NAVIGATOR_CONFIG,
  KjFilterableList,
  KjListItem,
  KjTypeAhead,
  type KjFilterFn,
  type KjListNavigatorConfig,
} from '../primitives/list';
import { KJ_COMMAND_PALETTE, nextCommandListId } from './command-palette.context';
import type { KjCommandPaletteContext } from './command-palette.context';

export interface KjCommandActivateEvent {
  readonly value: unknown;
  readonly query: string;
}

/**
 * Root state container for the command palette. Provides
 * KJ_LIST_NAVIGATOR_CONFIG (items via contentChildren), KjFilterableList,
 * and KjTypeAhead. Keeps the KjCommandPaletteContext shape so child
 * directives need no API changes.
 *
 * @doc-category Core/Actions
 */
@Directive({
  selector: '[kjCommandPalette]',
  standalone: true,
  exportAs: 'kjCommandPalette',
  providers: [
    { provide: KJ_COMMAND_PALETTE, useExisting: KjCommandPalette },
    { provide: KJ_LIST_NAVIGATOR_CONFIG, useExisting: KjCommandPalette },
    KjFilterableList,
    KjTypeAhead,
  ],
})
export class KjCommandPalette implements KjCommandPaletteContext, KjListNavigatorConfig {
  readonly kjFilter = input<KjFilterFn | null>(null);
  readonly kjShouldFilter      = input<boolean, unknown>(true,  { transform: booleanAttribute });
  readonly kjLoading           = input<boolean, unknown>(false, { transform: booleanAttribute });
  readonly kjAutoActivateFirst = input<boolean, unknown>(true,  { transform: booleanAttribute });
  readonly kjDismissOnActivate = input<boolean, unknown>(true,  { transform: booleanAttribute });

  readonly kjValue = model<unknown>(null);
  readonly kjQuery = model<string>('');
  readonly kjActivate = output<KjCommandActivateEvent>();

  readonly listId = nextCommandListId();
  readonly items = contentChildren(KjListItem, { descendants: true });

  readonly visibleItems = computed(() => this.filter.visibleItems());
  readonly query        = computed(() => this.kjQuery());
  readonly activeValue  = computed(() => this.kjValue());
  readonly loading      = computed(() => this.kjLoading());

  private readonly filter = inject(KjFilterableList);

  constructor() {
    // Push consumer-controlled filter config into the service.
    effect(() => {
      const custom = this.kjFilter();
      if (custom) this.filter.setFilterFn(custom);
    });
    effect(() => this.filter.setShouldFilter(this.kjShouldFilter()));
    effect(() => this.filter.setAutoActivateFirst(this.kjAutoActivateFirst()));
    effect(() => {
      const q = this.kjQuery();
      untracked(() => this.filter.setQuery(q));
    });
  }

  setQuery(q: string): void {
    this.kjQuery.set(q);
  }

  activate(value: unknown): void {
    this.kjValue.set(value);
    this.kjActivate.emit({ value, query: this.kjQuery() });
  }
}
```

> The old `_items` signal + `registerItem`/`unregisterItem`/`moveActive`/`setActiveTo`/`setActiveValue` are gone. Child directives that called them must be updated in Task 11. The `KjCommandPaletteContext` interface in `command-palette.context.ts` will be slimmed in Task 13.

- [ ] **Step 2: Compile expected to BREAK** — context interface and child directives reference removed methods. That's fine; next tasks fix it.

- [ ] **Step 3: DO NOT COMMIT** until Task 11 + 12 + 13 land. Stage only after the cluster compiles.

---

### Task 11: Migrate `KjCommandItem` to compose `KjListItem`

**Files:**
- Modify: `packages/core/src/command-palette/command-item.ts`

- [ ] **Step 1: Read current** (registers via `registerItem`, owns id, exposes `resolveValue`/`haystacks`/`disabled`/`activate` to context)

- [ ] **Step 2: Rewrite to compose `KjListItem`**

```ts
// packages/core/src/command-palette/command-item.ts
import { Directive, inject } from '@angular/core';
import { KjListItem, injectListItem } from '../primitives/list';
import { KJ_COMMAND_PALETTE } from './command-palette.context';

/**
 * Single activatable row inside the command palette. Composes
 * `KjListItem` for id/value/label/keywords/disabled/click+keyboard
 * activation; this directive only wires the value into
 * `KjCommandPalette.activate()`.
 *
 * @doc-category Core/Actions
 */
@Directive({
  selector: '[kjCommandItem]',
  standalone: true,
  hostDirectives: [
    {
      directive: KjListItem,
      inputs: [
        'kjItemValue:kjCommandItemValue',
        'kjItemLabel:kjCommandItemLabel',
        'kjItemKeywords:kjCommandItemKeywords',
        'kjShortcut:kjCommandItemShortcut',
        'kjDisabled',
      ],
    },
  ],
  host: {
    'class': 'kj-command-item',
    'role': 'option',
  },
})
export class KjCommandItem {
  private readonly item = injectListItem<unknown>();
  private readonly palette = inject(KJ_COMMAND_PALETTE);

  constructor() {
    this.item.activate.subscribe(value => this.palette.activate(value));
  }
}
```

If `KjCommandItem` previously took a `kjValue` input (check current code), preserve that public name by aliasing it in the `inputs` array. Run the doc extractor cache check: `rm -rf node_modules/.cache/docs-extractor && pnpm build` to flush any stale doc data after the rename.

- [ ] **Step 3: No commit yet.**

---

### Task 12: Migrate `KjCommandList` (listbox role only) and `KjCommandInput` (hosts navigator)

Per APG combobox 1.2: `aria-activedescendant` lives on the element with
`role="combobox"` (the input), not on the listbox panel. So
`KjListNavigator` mounts on `KjCommandInput` — same pattern as
`KjCombobox`. `KjCommandList` only declares the listbox role + id.

**Files:**
- Modify: `packages/core/src/command-palette/command-list.ts`
- Modify: `packages/core/src/command-palette/command-input.ts`

- [ ] **Step 1: `command-list.ts` — listbox role + id only, no navigator**

```ts
// packages/core/src/command-palette/command-list.ts
import { Directive, inject } from '@angular/core';
import { KJ_COMMAND_PALETTE } from './command-palette.context';

@Directive({
  selector: '[kjCommandList]',
  standalone: true,
  host: {
    'role': 'listbox',
    '[id]': 'palette.listId',
    'class': 'kj-command-list',
  },
})
export class KjCommandList {
  protected readonly palette = inject(KJ_COMMAND_PALETTE);
}
```

If a previous `kjAriaLabel` input existed, preserve it on the host.

- [ ] **Step 2: `command-input.ts` — compose `KjListNavigator` on the input**

```ts
// packages/core/src/command-palette/command-input.ts
import { Directive, ElementRef, OnDestroy, OnInit, inject } from '@angular/core';
import { KjListNavigator } from '../primitives/list';
import { KJ_COMMAND_PALETTE } from './command-palette.context';

@Directive({
  selector: 'input[kjCommandInput]',
  standalone: true,
  hostDirectives: [KjListNavigator],
  host: {
    'role': 'combobox',
    'autocomplete': 'off',
    'aria-autocomplete': 'list',
    '[attr.aria-controls]': 'palette.listId',
    '[attr.aria-expanded]': '"true"',
    '[attr.aria-busy]': 'palette.loading() ? "true" : null',
    '(input)': 'palette.setQuery($event.target.value)',
  },
})
export class KjCommandInput implements OnInit, OnDestroy {
  protected readonly palette = inject(KJ_COMMAND_PALETTE);
  private readonly el = inject(ElementRef<HTMLElement>);
  private readonly nav = inject(KjListNavigator);

  ngOnInit(): void {
    this.palette._setNavigator(this.nav);
  }
  ngOnDestroy(): void {
    this.palette._setNavigator(null);
  }
}
```

`KjListNavigator`'s own host listeners already cover ArrowUp/Down /
Home / End / Enter / Space — no need for additional `(keydown)`
bindings on the input. `aria-activedescendant` is bound by the
navigator itself onto the input host.

- [ ] **Step 3: Wire `_setNavigator` on `KjCommandPalette` root**

Append to the body of `KjCommandPalette` in `command-palette.ts`:

```ts
private _nav: import('../primitives/list').KjListNavigator | null = null;
_setNavigator(n: import('../primitives/list').KjListNavigator | null): void { this._nav = n; }
readonly activeId = computed(() => this._nav?.activeId() ?? null);
```

This gives `command-palette-dialog.ts` (or any consumer reading
`palette.activeId()`) the live active descendant id.

- [ ] **Step 4: No commit yet — verify cluster compiles + tests pass after Task 13 lands.**

---

### Task 13: Clean up `KjCommandPaletteContext` + run cluster tests

**Files:**
- Modify: `packages/core/src/command-palette/command-palette.context.ts`

- [ ] **Step 1: Slim the context interface**

Remove `registerItem`, `unregisterItem`, `moveActive`, `setActiveTo`, `setActiveValue`, `_items` from the interface and from any consumers. Keep `query`, `activeValue`, `loading`, `visibleItems`, `listId`, `setQuery`, `activate`, plus the new `_setNavigator`, `activeId`.

Update `command-empty.ts`, `command-group.ts`, `command-separator.ts` if they read removed members.

- [ ] **Step 2: Run command-palette specs**

Run: `pnpm --filter @kouji-ui/core vitest run src/command-palette/`

Tests likely cover: filter results, activate emission, query change, list id binding, role=listbox. If existing tests rely on `_items` / `moveActive`, update them to use `contentChildren` + dispatching key events on the input.

- [ ] **Step 3: Commit the whole command-palette migration in one shot**

```bash
git add packages/core/src/command-palette/
git commit -m "$(cat <<'EOF'
refactor(core/command-palette): adopt list primitives

KjCommandPalette provides KJ_LIST_NAVIGATOR_CONFIG via contentChildren,
KjFilterableList for filter + WCAG 4.1.3 announcement signal, and a
single KjListNavigator mounted on KjCommandList. KjCommandItem composes
KjListItem (id / value / haystacks / activation). Public inputs and
the kjActivate output are unchanged.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 5 — Migrate `KjCombobox`

### Task 14: Wire primitives into `KjCombobox` root

**Files:**
- Modify: `packages/core/src/combobox/combobox-root.ts`

- [ ] **Step 1: Rewrite `combobox-root.ts`**

```ts
// packages/core/src/combobox/combobox-root.ts
import {
  Directive,
  booleanAttribute,
  computed,
  contentChildren,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
} from '@angular/core';
import { KjDisabled } from '../primitives';
import { KjOverlayController } from '../primitives/overlay/controller';
import {
  KJ_LIST_NAVIGATOR_CONFIG,
  KjFilterableList,
  KjListItem,
  KjSelectionModel,
  type KjFilterFn,
  type KjListNavigatorConfig,
} from '../primitives/list';
import { KJ_COMBOBOX, kjContainsFilter } from './combobox.context';
import type { KjComboboxContext } from './combobox.context';

let _idCounter = 0;
const nextId = (): string => `kj-combobox-${++_idCounter}`;

/**
 * Root combobox / autocomplete container. Provides
 * KJ_LIST_NAVIGATOR_CONFIG via contentChildren, KjSelectionModel
 * (single-mode), KjFilterableList, and the shared KjOverlayController.
 *
 * @doc-category Core/Inputs
 */
@Directive({
  selector: '[kjCombobox]',
  standalone: true,
  exportAs: 'kjCombobox',
  hostDirectives: [{ directive: KjDisabled, inputs: ['kjDisabled'] }],
  providers: [
    { provide: KJ_COMBOBOX, useExisting: KjCombobox },
    { provide: KJ_LIST_NAVIGATOR_CONFIG, useExisting: KjCombobox },
    KjSelectionModel,
    KjFilterableList,
    KjOverlayController,
  ],
})
export class KjCombobox implements KjComboboxContext, KjListNavigatorConfig {
  readonly kjValue        = model<unknown>(null);
  readonly kjQuery        = model<string>('');
  readonly kjShouldFilter = input(true,  { transform: booleanAttribute });
  readonly kjLoading      = input(false, { transform: booleanAttribute });
  readonly kjFreeText     = input(false, { transform: booleanAttribute });
  readonly kjFilter       = input<(query: string, label: string) => boolean>(kjContainsFilter);
  readonly kjAutoActivateFirst = input(true, { transform: booleanAttribute });

  readonly kjQueryChange = output<string>();
  readonly kjCommit      = output<unknown>();

  private readonly controller = inject(KjOverlayController);
  private readonly selection  = inject(KjSelectionModel);
  private readonly filter     = inject(KjFilterableList);

  readonly listboxId = nextId();
  readonly items = contentChildren(KjListItem, { descendants: true });

  readonly value         = this.kjValue.asReadonly();
  readonly query         = this.kjQuery.asReadonly();
  readonly open          = this.controller.isOpen;
  readonly loading       = this.kjLoading;
  readonly allowFreeText = this.kjFreeText;
  readonly shouldFilter  = this.kjShouldFilter;
  readonly visibleCount  = computed(() => this.filter.visibleCount());

  private readonly _inputEl = signal<HTMLElement | null>(null);
  readonly inputElement = this._inputEl.asReadonly();

  private _nav: import('../primitives/list').KjListNavigator | null = null;
  _setNavigator(n: import('../primitives/list').KjListNavigator | null): void { this._nav = n; }
  readonly activeId = computed(() => this._nav?.activeId() ?? null);

  constructor() {
    // Selection model: single mode (combobox always commits one value).
    this.selection.setMode('single');

    // Adapt the consumer's (query, label) filter into the
    // primitive's (query, haystacks) shape.
    effect(() => {
      const fn = this.kjFilter();
      const adapted: KjFilterFn = (q, hs) => (hs.some(h => fn(q, h)) ? 1 : 0);
      this.filter.setFilterFn(adapted);
    });
    effect(() => this.filter.setShouldFilter(this.kjShouldFilter()));
    effect(() => this.filter.setAutoActivateFirst(this.kjAutoActivateFirst()));
    effect(() => {
      const q = this.kjQuery();
      untracked(() => {
        this.filter.setQuery(q);
        this.kjQueryChange.emit(q);
      });
    });

    // Bridge external kjValue into the selection model and back.
    effect(() => {
      const ext = this.kjValue();
      untracked(() => this.selection.setValue(ext as never));
    });
    effect(() => {
      const int = this.selection.value();
      untracked(() => this.kjValue.set(int as unknown));
    });
  }

  setQuery(value: string): void {
    if (this.kjQuery() !== value) this.kjQuery.set(value);
    this.controller.open();
  }

  select(value: unknown): void {
    this.selection.setValue(value as never);
    this.controller.close('programmatic');
    this.kjCommit.emit(value);
  }

  show(): void   { this.controller.open(); }
  hide(): void   { this.controller.close('programmatic'); }
  toggle(): void { this.controller.toggle(); }

  move(delta: 1 | -1): void {
    if (!this.controller.isOpen()) this.controller.open();
    this._nav?.moveBy(delta);
  }

  commitActive(): void {
    const item = this._nav?.activeItem();
    if (item && !item.disabled()) {
      const v = item.value();
      if (v !== undefined) { this.select(v); return; }
    }
    if (this.kjFreeText()) this.select(this.kjQuery());
  }

  setInputElement(el: HTMLElement | null): void { this._inputEl.set(el); }
}
```

- [ ] **Step 2: No commit until Tasks 15–17 land.**

---

### Task 15: Migrate `KjComboboxOption`

**Files:**
- Modify: `packages/core/src/combobox/combobox-option.ts`

- [ ] **Step 1: Rewrite to compose `KjListItem`**

```ts
// packages/core/src/combobox/combobox-option.ts
import { Directive, inject } from '@angular/core';
import { KjListItem, injectListItem } from '../primitives/list';
import { KJ_COMBOBOX } from './combobox.context';

@Directive({
  selector: '[kjComboboxOption]',
  standalone: true,
  hostDirectives: [
    {
      directive: KjListItem,
      inputs: [
        'kjItemValue:kjOptionValue',
        'kjItemLabel:kjOptionLabel',
        'kjItemKeywords:kjOptionKeywords',
        'kjDisabled',
      ],
    },
  ],
  host: {
    'class': 'kj-combobox-option',
    'role': 'option',
  },
})
export class KjComboboxOption {
  private readonly item = injectListItem<unknown>();
  private readonly combobox = inject(KJ_COMBOBOX);

  constructor() {
    this.item.activate.subscribe(value => {
      if (value !== undefined) this.combobox.select(value);
    });
  }
}
```

- [ ] **Step 2: No commit yet.**

---

### Task 16: Migrate `KjComboboxInput` to host the navigator

**Files:**
- Modify: `packages/core/src/combobox/combobox-input.ts`

- [ ] **Step 1: Compose `KjListNavigator` on the input element**

Per APG combobox 1.2, `aria-activedescendant` and `aria-controls` live on the input — so we mount the navigator on the input, not on `KjComboboxListbox`.

```ts
// packages/core/src/combobox/combobox-input.ts
import { Directive, ElementRef, OnDestroy, OnInit, inject } from '@angular/core';
import { KjListNavigator } from '../primitives/list';
import { KJ_COMBOBOX } from './combobox.context';

@Directive({
  selector: 'input[kjComboboxInput]',
  standalone: true,
  hostDirectives: [KjListNavigator],
  host: {
    'role': 'combobox',
    'autocomplete': 'off',
    'aria-autocomplete': 'list',
    '[attr.aria-controls]': 'combobox.listboxId',
    '[attr.aria-expanded]': 'combobox.open() ? "true" : "false"',
    '[attr.aria-busy]':    'combobox.loading() ? "true" : null',
    '(input)':   'combobox.setQuery($event.target.value)',
    '(focus)':   'combobox.show()',
    '(keydown.enter)': 'onEnter($event)',
    '(keydown.escape)': '$event.preventDefault(); combobox.hide()',
  },
})
export class KjComboboxInput implements OnInit, OnDestroy {
  protected readonly combobox = inject(KJ_COMBOBOX);
  private readonly el = inject(ElementRef<HTMLElement>);
  private readonly nav = inject(KjListNavigator);

  ngOnInit(): void {
    this.combobox.setInputElement(this.el.nativeElement);
    this.combobox._setNavigator(this.nav);
  }
  ngOnDestroy(): void {
    this.combobox.setInputElement(null);
    this.combobox._setNavigator(null);
  }

  /**
   * Handle Enter for the free-text fallback case. The navigator runs
   * first (its host listener is registered before this consumer
   * directive's). If it had an active item, it called preventDefault —
   * we skip. Otherwise this is the "user typed and pressed Enter with
   * no match" case; commit the query when kjFreeText is enabled.
   */
  onEnter(e: KeyboardEvent): void {
    if (e.defaultPrevented) return;
    if (this.combobox.allowFreeText()) {
      e.preventDefault();
      this.combobox.select(this.combobox.query());
    }
  }
}
```

- [ ] **Step 2: Verify `KjComboboxListbox` only declares the listbox role + `[id]="combobox.listboxId"`** — no keyboard handling there anymore.

- [ ] **Step 3: Run all combobox specs**

Run: `pnpm --filter @kouji-ui/core vitest run src/combobox/`

- [ ] **Step 4: Drop obsolete `KjComboboxOptionRegistration` interface + `registerOption`/`unregisterOption`/`setActiveId` from `combobox.context.ts`** — items now come from `contentChildren(KjListItem)` on the root; activeId comes from the navigator.

- [ ] **Step 5: Commit the whole combobox migration**

```bash
git add packages/core/src/combobox/
git commit -m "$(cat <<'EOF'
refactor(core/combobox): adopt list primitives

KjCombobox provides KJ_LIST_NAVIGATOR_CONFIG, KjSelectionModel (single
mode), KjFilterableList, and pushes consumer (query, label) filter into
the primitive (query, haystacks) shape. KjListNavigator hosts on the
combobox input per APG 1.2. Public inputs / outputs / context API are
unchanged.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 6 — Public exports + integration sweep

### Task 17: Add usage docs + verify build

**Files:**
- Modify: `packages/core/src/public-api.ts` (no change expected — already re-exports `primitives/index`)
- Modify: `packages/core/README.md` (optional, only if it lists primitives)

- [ ] **Step 1: Confirm exports surface**

Run: `pnpm --filter @kouji-ui/core build`
Expected: clean build. Inspect `dist/.../public-api.d.ts` for `KjListNavigator`, `KjListItem`, `KjSelectionModel`, `KjFilterableList`, `KjTypeAhead`, plus `injectListItem`, `injectSelectionModel`, `injectFilterableList`, `KJ_LIST_NAVIGATOR_CONFIG`.

- [ ] **Step 2: Full repo test pass**

Run: `pnpm test`
Expected: all green across all packages.

- [ ] **Step 3: Full repo lint**

Run: `pnpm lint`

- [ ] **Step 4: Manual a11y smoke test in the docs playground**

Run dev server: `pnpm --filter @kouji-ui/docs start` (port 4200).

In Chrome via Chrome MCP, walk each consumer's playground:
- `/components/select` — open panel, arrow up/down, multi-select toggle, type-ahead "a" → first apple-like item.
- `/components/combobox` — type "a", verify `aria-activedescendant` flips per keystroke, "no results" announces via `kjLiveRegion` if wired.
- `/components/command-palette` — open via shortcut, type to filter, arrow + enter activates.

For each, inspect the active panel + items in DevTools → Accessibility tab. Expected ARIA:
- panel: `role=listbox`, optionally `aria-multiselectable=true`
- container hosting navigator: `aria-activedescendant=<id>`
- items: `role=option`, `aria-selected=true|false`, `aria-disabled=true` where applicable, `aria-posinset`/`aria-setsize` for filtered combobox/palette.

- [ ] **Step 5: Stop dev server** (taskkill the spawned process if you used `run_in_background`; or close the terminal).

- [ ] **Step 6: Commit any small fixups discovered**

If anything is off (missing role somewhere, missing label fallback), fix in this task; do not start a new feature.

```bash
git add -A
git commit -m "$(cat <<'EOF'
chore(core): finalize listbox-primitives migration

Tightens public-api exports, a11y bindings cross-checked in the docs
playground. No behavior changes.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 7: Do NOT push.** Per project policy, the user validates locally before push.

---

## Self-review checklist (for the implementer)

Before declaring done, the implementer walks this list:

1. All 5 primitives are tested (item, selection, type-ahead, navigator, filterable-list)
2. All 3 consumers' existing specs still pass (select, command-palette, combobox)
3. No `kjOptionValue` / `kjValue` / `kjQuery` public input renamed — public API unchanged
4. `aria-activedescendant` flips with ArrowDown in all 3 consumers (verified manually or in specs)
5. `aria-selected="false"` is explicitly set in multi-mode select (not null) — ARIA listbox spec requirement
6. `aria-posinset`/`aria-setsize` reflect the **visible** count after filtering in combobox + command-palette
7. `axe` integration tests included for `KjListItem` (Task 2) and don't regress for any consumer
8. `KjDisabled` is composed exactly once per item host (via `KjListItem`), never doubly
9. Stale `node_modules/.cache/docs-extractor` was flushed if any TSDoc tags moved (Task 11 reminder)
10. Lint + build + full test pass clean

---

## Out of scope (will become follow-up plans)

- Menu cluster migration (`KjDropdownMenu`, `KjMenu`, `KjTreeSelect`, `KjCascadeSelect`) — needs roving-tabindex mode on `KjListNavigator` and a small `KjPortalChildRegistry`.
- Virtualization of `aria-setsize` for huge lists.
- Centralized `KjLiveAnnouncer` service (currently consumers wire `kjLiveRegion` themselves with `KjFilterableList.announcement()`).
