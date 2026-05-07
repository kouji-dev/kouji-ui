# Icon Core Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the provider-agnostic `[kjIcon]` directive, DI tokens, provider helpers, async loader, stylesheet, and tests in `@kouji-ui/core`. Lucide adapter and example migrations are out of scope for this session.

**Architecture:** Directive writes a CSS custom property `--kj-icon` on its host plus `data-kj-icon-mode` and a11y attributes. A stylesheet ships in core and uses `mask-image` (svg/css mode) or `content` (font mode). Resolution walks `KJ_ICON_REGISTRY` → `KJ_ICON_LOADER` (async, fills the registry signal on success) → `KJ_ICON_RESOLVER` (sync URL synthesis). The registry is a `WritableSignal<Record<string,string>>` so the directive's computed re-runs when the loader fills a value.

**Tech Stack:** Angular 21 (signals + standalone), `@testing-library/angular`, `vitest`, `jest-axe`, `ng-packagr`. Patterns mirror `packages/core/src/divider/`.

**Spec:** `docs/superpowers/specs/2026-05-07-icons-design.md`

---

## File Structure

```
packages/core/src/icon/
  index.ts                  re-exports for public-api
  icon.types.ts             IconResolver, IconLoader, KjIconColor, KjIconSize
  icon.mode.ts              getIconMode helper (pure)
  icon.tokens.ts            KJ_ICON_ENTRIES, KJ_ICON_REGISTRY, KJ_ICON_RESOLVER, KJ_ICON_LOADER, KJ_ICON_CSS_PATH
  icon.providers.ts         provideIcons, provideIconResolver, provideIconLoader
  icon.resolver.ts          kjInjectIconResolver
  icon.directive.ts         KjIconDirective
  icon.css                  stylesheet shipped with package
  icon.mode.spec.ts
  icon.resolver.spec.ts
  icon.directive.spec.ts

packages/core/src/public-api.ts    add: export * from './icon';
```

Each file has one responsibility. Tests live next to the unit they cover.

---

## Conventions used in tests (mirrors `divider.spec.ts`)

- `import { render } from '@testing-library/angular';` for host renders.
- `import { TestBed } from '@angular/core/testing';` for pure DI tests.
- `import { axe, toHaveNoViolations } from 'jest-axe';` and `expect.extend(toHaveNoViolations);` for a11y audits.
- `flushAfterNextRender()` helper — copy/paste from `divider.spec.ts` lines 13–17 when needed.

---

### Task 1: Scaffold the icon directory and index

**Files:**
- Create: `packages/core/src/icon/index.ts`

- [ ] **Step 1: Create the directory and an empty index**

```ts
// packages/core/src/icon/index.ts
// Re-exports filled in as each unit lands.
export {};
```

- [ ] **Step 2: Wire into public-api**

Modify `packages/core/src/public-api.ts` — add this line in the "Foundation" section (after `export * from './kbd/index';` or similar; alphabetical OK):

```ts
export * from './icon/index';
```

- [ ] **Step 3: Verify the package still builds**

Run from repo root: `pnpm --filter @kouji-ui/core test`
Expected: PASS (no new tests yet, existing tests still green).

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/icon/index.ts packages/core/src/public-api.ts
git commit -m "feat(core/icon): scaffold icon module"
```

---

### Task 2: Types

**Files:**
- Create: `packages/core/src/icon/icon.types.ts`

- [ ] **Step 1: Write the types file**

```ts
// packages/core/src/icon/icon.types.ts

/**
 * Resolves an icon name to a CSS-ready value (e.g. `url("data:...")` for svg
 * mode, or a quoted glyph like `"\\f013"` for font mode). Synchronous.
 *
 * Used as a fallback when an icon is not in the registry and no async loader
 * is configured.
 */
export type IconResolver = (name: string) => string;

/**
 * Asynchronously resolves an icon name to a CSS-ready value. Result is
 * memoized into the registry so subsequent reads are synchronous.
 */
export type IconLoader = (name: string) => Promise<string>;

/**
 * Semantic color tokens for `[kjIconColor]`. Maps to
 * `var(--kj-color-icon-{token})`. `'inherit'` is the default and means
 * "use whatever the surrounding text color is" (CSS `currentColor`).
 */
export type KjIconColor =
  | 'inherit'
  | 'muted'
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info';

/**
 * Size tokens for `[kjIconSize]`. Maps to `var(--kj-icon-size-{token})`.
 * Sizes are em-relative so an icon scales with surrounding text by default.
 */
export type KjIconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
```

- [ ] **Step 2: Re-export from index**

Edit `packages/core/src/icon/index.ts`:

```ts
export type {
  IconResolver,
  IconLoader,
  KjIconColor,
  KjIconSize,
} from './icon.types';
```

- [ ] **Step 3: Verify build**

Run: `pnpm --filter @kouji-ui/core test`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/icon/icon.types.ts packages/core/src/icon/index.ts
git commit -m "feat(core/icon): add public types"
```

---

### Task 3: Mode parsing helper (TDD)

**Files:**
- Create: `packages/core/src/icon/icon.mode.spec.ts`
- Create: `packages/core/src/icon/icon.mode.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// packages/core/src/icon/icon.mode.spec.ts
import { describe, expect, it } from 'vitest';
import { getIconMode } from './icon.mode';

describe('getIconMode', () => {
  it('returns "font" when name starts with "@font."', () => {
    expect(getIconMode('@font.fa-cog')).toBe('font');
  });

  it('returns "svg" for plain names', () => {
    expect(getIconMode('settings')).toBe('svg');
  });

  it('returns "svg" for hyphenated names', () => {
    expect(getIconMode('alert-triangle')).toBe('svg');
  });

  it('returns "svg" for namespaced names that are not @font', () => {
    expect(getIconMode('lucide:settings')).toBe('svg');
  });

  it('returns "svg" for empty string', () => {
    expect(getIconMode('')).toBe('svg');
  });

  it('returns "svg" for "@font" with no trailing dot', () => {
    // Strict: must be exactly "@font." prefix; "@fontawesome" stays svg.
    expect(getIconMode('@fontawesome')).toBe('svg');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @kouji-ui/core test -- icon.mode`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the helper**

```ts
// packages/core/src/icon/icon.mode.ts

/** Render mode inferred from an icon name. */
export type IconMode = 'svg' | 'font';

const FONT_PREFIX = '@font.';

/**
 * Infer render mode from icon name. Names starting with `@font.` use the
 * font code path (CSS `content`); everything else uses the svg/css-mask
 * code path.
 */
export function getIconMode(name: string): IconMode {
  return name.startsWith(FONT_PREFIX) ? 'font' : 'svg';
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @kouji-ui/core test -- icon.mode`
Expected: PASS (6 tests).

- [ ] **Step 5: Re-export from index**

Edit `packages/core/src/icon/index.ts`:

```ts
export { getIconMode, type IconMode } from './icon.mode';
export type {
  IconResolver,
  IconLoader,
  KjIconColor,
  KjIconSize,
} from './icon.types';
```

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/icon/icon.mode.ts packages/core/src/icon/icon.mode.spec.ts packages/core/src/icon/index.ts
git commit -m "feat(core/icon): add getIconMode helper"
```

---

### Task 4: DI tokens

**Files:**
- Create: `packages/core/src/icon/icon.tokens.ts`

- [ ] **Step 1: Write the tokens file**

```ts
// packages/core/src/icon/icon.tokens.ts
import { InjectionToken, type WritableSignal, signal } from '@angular/core';
import type { IconLoader, IconResolver } from './icon.types';

/**
 * Multi-provider entries contributed by `provideIcons(...)`. Each entry is a
 * `Record<name, cssReadyValue>`. The registry factory merges all entries at
 * injection time.
 *
 * Internal — consumers use `provideIcons(...)`.
 */
export const KJ_ICON_ENTRIES = new InjectionToken<Record<string, string>>(
  'KJ_ICON_ENTRIES',
);

/**
 * Runtime icon registry. A writable signal so the async loader can fill in
 * resolved icons and any consuming directive's computed re-evaluates.
 *
 * Stored values are CSS-ready: `url("...")` for svg mode, quoted glyphs for
 * font mode. Adapter authors are responsible for the wrapping.
 */
export const KJ_ICON_REGISTRY = new InjectionToken<
  WritableSignal<Record<string, string>>
>('KJ_ICON_REGISTRY', {
  providedIn: 'root',
  factory: () => {
    // Aggregated by Angular's multi-provider machinery.
    // We can't `inject(KJ_ICON_ENTRIES, { multi: true })` directly here, so
    // the merge happens in `provideIcons` via a factory provider that
    // overrides this token's value when called. The default (no
    // `provideIcons`) is an empty registry.
    return signal<Record<string, string>>({});
  },
});

/**
 * Synchronous fallback resolver. Called when a name is not in the registry
 * and no async loader is configured. Returns a CSS-ready string.
 *
 * Default: returns the name unchanged (consumers should always either
 * register icons via `provideIcons` or set up a loader/resolver).
 */
export const KJ_ICON_RESOLVER = new InjectionToken<IconResolver>(
  'KJ_ICON_RESOLVER',
  { providedIn: 'root', factory: () => (name: string) => name },
);

/**
 * Optional async loader. When set, missing icons are loaded via this fn and
 * the result is written into `KJ_ICON_REGISTRY`. While loading, the
 * directive renders nothing for that name. If unset, the resolver fallback
 * is used instead.
 */
export const KJ_ICON_LOADER = new InjectionToken<IconLoader | null>(
  'KJ_ICON_LOADER',
  { providedIn: 'root', factory: () => null },
);

/**
 * Resolvable path to the kouji icon stylesheet. Mirrors the pattern used by
 * `KJ_PROSE_CSS_PATH` in `@kouji-ui/core/typography`.
 *
 * ```ts
 * import { KJ_ICON_CSS_PATH } from '@kouji-ui/core';
 * // or import the file directly:
 * import '@kouji-ui/core/icon/icon.css';
 * ```
 */
export const KJ_ICON_CSS_PATH = '@kouji-ui/core/icon/icon.css' as const;
```

- [ ] **Step 2: Re-export from index**

Edit `packages/core/src/icon/index.ts` — add:

```ts
export {
  KJ_ICON_ENTRIES,
  KJ_ICON_REGISTRY,
  KJ_ICON_RESOLVER,
  KJ_ICON_LOADER,
  KJ_ICON_CSS_PATH,
} from './icon.tokens';
```

- [ ] **Step 3: Verify build**

Run: `pnpm --filter @kouji-ui/core test`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/icon/icon.tokens.ts packages/core/src/icon/index.ts
git commit -m "feat(core/icon): add DI tokens"
```

---

### Task 5: Provider helpers (TDD)

The registry signal needs to be seeded from all `provideIcons(...)` calls. Strategy: `provideIcons(map)` registers the map under multi-token `KJ_ICON_ENTRIES` AND overrides `KJ_ICON_REGISTRY`'s factory so it merges all multi-entries when first injected.

**Files:**
- Create: `packages/core/src/icon/icon.providers.ts`
- Modify (later): `packages/core/src/icon/icon.tokens.ts` (registry factory simplification — see step 3 below)

- [ ] **Step 1: Write the failing tests**

Create `packages/core/src/icon/icon.providers.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import {
  provideIconLoader,
  provideIconResolver,
  provideIcons,
} from './icon.providers';
import {
  KJ_ICON_LOADER,
  KJ_ICON_REGISTRY,
  KJ_ICON_RESOLVER,
} from './icon.tokens';

describe('provideIcons', () => {
  it('seeds the registry with the given map', () => {
    TestBed.configureTestingModule({
      providers: [provideIcons({ settings: 'url("a")', save: 'url("b")' })],
    });
    const reg = TestBed.inject(KJ_ICON_REGISTRY);
    expect(reg()).toEqual({ settings: 'url("a")', save: 'url("b")' });
  });

  it('merges multiple provideIcons calls (last wins on collision)', () => {
    TestBed.configureTestingModule({
      providers: [
        provideIcons({ settings: 'url("first")', save: 'url("b")' }),
        provideIcons({ settings: 'url("second")', trash: 'url("c")' }),
      ],
    });
    const reg = TestBed.inject(KJ_ICON_REGISTRY);
    expect(reg()).toEqual({
      settings: 'url("second")',
      save: 'url("b")',
      trash: 'url("c")',
    });
  });

  it('default registry is empty when no provideIcons is called', () => {
    TestBed.configureTestingModule({ providers: [] });
    const reg = TestBed.inject(KJ_ICON_REGISTRY);
    expect(reg()).toEqual({});
  });
});

describe('provideIconResolver', () => {
  it('overrides the default resolver', () => {
    TestBed.configureTestingModule({
      providers: [provideIconResolver((n) => `url("/icons/${n}.svg")`)],
    });
    const fn = TestBed.inject(KJ_ICON_RESOLVER);
    expect(fn('settings')).toBe('url("/icons/settings.svg")');
  });
});

describe('provideIconLoader', () => {
  it('registers an async loader', async () => {
    const loader = async (n: string) => `url("loaded:${n}")`;
    TestBed.configureTestingModule({ providers: [provideIconLoader(loader)] });
    const fn = TestBed.inject(KJ_ICON_LOADER);
    expect(fn).not.toBeNull();
    await expect(fn!('x')).resolves.toBe('url("loaded:x")');
  });
});
```

- [ ] **Step 2: Simplify the registry token's factory to read multi-entries**

Edit `packages/core/src/icon/icon.tokens.ts` — replace the `KJ_ICON_REGISTRY` block:

```ts
import { InjectionToken, type WritableSignal, inject, signal } from '@angular/core';
import type { IconLoader, IconResolver } from './icon.types';

export const KJ_ICON_ENTRIES = new InjectionToken<Record<string, string>>(
  'KJ_ICON_ENTRIES',
);

export const KJ_ICON_REGISTRY = new InjectionToken<
  WritableSignal<Record<string, string>>
>('KJ_ICON_REGISTRY', {
  providedIn: 'root',
  factory: () => {
    const entries = inject(KJ_ICON_ENTRIES, { optional: true }) as
      | Record<string, string>[]
      | Record<string, string>
      | null;
    // When `multi: true` is used, Angular injects an array. With no
    // providers, this token resolves to `null` (we passed `optional: true`).
    const list: Record<string, string>[] = Array.isArray(entries)
      ? entries
      : entries
        ? [entries]
        : [];
    const merged = list.reduce<Record<string, string>>(
      (acc, m) => ({ ...acc, ...m }),
      {},
    );
    return signal<Record<string, string>>(merged);
  },
});

// KJ_ICON_RESOLVER and KJ_ICON_LOADER unchanged — keep their existing
// declarations from Task 4.
```

(Keep the existing `KJ_ICON_RESOLVER`, `KJ_ICON_LOADER`, and `KJ_ICON_CSS_PATH` declarations from Task 4.)

- [ ] **Step 3: Implement the provider helpers**

```ts
// packages/core/src/icon/icon.providers.ts
import {
  type EnvironmentProviders,
  makeEnvironmentProviders,
} from '@angular/core';
import type { IconLoader, IconResolver } from './icon.types';
import {
  KJ_ICON_ENTRIES,
  KJ_ICON_LOADER,
  KJ_ICON_RESOLVER,
} from './icon.tokens';

/**
 * Register a map of icon names to CSS-ready values. Call multiple times to
 * compose icon sets; later calls win on key collision.
 */
export function provideIcons(
  map: Record<string, string>,
): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: KJ_ICON_ENTRIES, useValue: map, multi: true },
  ]);
}

/**
 * Override the synchronous fallback resolver used when a name is not in the
 * registry and no async loader is configured.
 */
export function provideIconResolver(fn: IconResolver): EnvironmentProviders {
  return makeEnvironmentProviders([{ provide: KJ_ICON_RESOLVER, useValue: fn }]);
}

/**
 * Register an async loader. When present, missing icons are loaded via this
 * function and cached into the registry.
 */
export function provideIconLoader(fn: IconLoader): EnvironmentProviders {
  return makeEnvironmentProviders([{ provide: KJ_ICON_LOADER, useValue: fn }]);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @kouji-ui/core test -- icon.providers`
Expected: PASS (5 tests).

- [ ] **Step 5: Re-export from index**

Edit `packages/core/src/icon/index.ts` — add:

```ts
export {
  provideIcons,
  provideIconResolver,
  provideIconLoader,
} from './icon.providers';
```

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/icon
git commit -m "feat(core/icon): add provider helpers"
```

---

### Task 6: Resolver (registry + sync fallback path) (TDD)

**Files:**
- Create: `packages/core/src/icon/icon.resolver.ts`
- Create: `packages/core/src/icon/icon.resolver.spec.ts`

- [ ] **Step 1: Write the failing tests for the sync paths**

```ts
// packages/core/src/icon/icon.resolver.spec.ts
import { Injector, runInInjectionContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { provideIcons, provideIconLoader, provideIconResolver } from './icon.providers';
import { kjInjectIconResolver } from './icon.resolver';
import { KJ_ICON_REGISTRY } from './icon.tokens';

function makeResolver(providers: any[]) {
  TestBed.configureTestingModule({ providers });
  const injector = TestBed.inject(Injector);
  return runInInjectionContext(injector, () => kjInjectIconResolver());
}

describe('kjInjectIconResolver', () => {
  beforeEach(() => TestBed.resetTestingModule());

  describe('registry path', () => {
    it('returns the registry value when name is registered', () => {
      const resolve = makeResolver([
        provideIcons({ settings: 'url("a")' }),
      ]);
      expect(resolve('settings')).toBe('url("a")');
    });
  });

  describe('fallback resolver path (no loader)', () => {
    it('falls back to KJ_ICON_RESOLVER when name is missing', () => {
      const resolve = makeResolver([
        provideIconResolver((n) => `url("/icons/${n}.svg")`),
      ]);
      expect(resolve('missing')).toBe('url("/icons/missing.svg")');
    });

    it('default resolver returns name unchanged', () => {
      const resolve = makeResolver([]);
      expect(resolve('missing')).toBe('missing');
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @kouji-ui/core test -- icon.resolver`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the registry + fallback path**

```ts
// packages/core/src/icon/icon.resolver.ts
import { inject } from '@angular/core';
import {
  KJ_ICON_LOADER,
  KJ_ICON_REGISTRY,
  KJ_ICON_RESOLVER,
} from './icon.tokens';

/**
 * Returns a function that resolves an icon name to a CSS-ready value, or
 * `null` while an async load is pending.
 *
 * Lookup order:
 * 1. `KJ_ICON_REGISTRY` (eager)
 * 2. `KJ_ICON_LOADER` (async; fills registry on success, returns `null` while pending)
 * 3. `KJ_ICON_RESOLVER` (sync default, e.g. URL synthesis)
 *
 * Must be called in an injection context.
 */
export function kjInjectIconResolver(): (name: string) => string | null {
  const registry = inject(KJ_ICON_REGISTRY);
  const loader = inject(KJ_ICON_LOADER);
  const fallback = inject(KJ_ICON_RESOLVER);
  const pending = new Set<string>();

  return (name: string): string | null => {
    const map = registry();
    if (Object.prototype.hasOwnProperty.call(map, name)) return map[name];

    if (loader) {
      if (!pending.has(name)) {
        pending.add(name);
        Promise.resolve(loader(name))
          .then((value) => {
            registry.update((m) => ({ ...m, [name]: value }));
            pending.delete(name);
          })
          .catch(() => {
            pending.delete(name);
          });
      }
      return null;
    }

    return fallback(name);
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @kouji-ui/core test -- icon.resolver`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/icon/icon.resolver.ts packages/core/src/icon/icon.resolver.spec.ts
git commit -m "feat(core/icon): add resolver — registry + fallback paths"
```

---

### Task 7: Resolver — async loader path (TDD)

**Files:**
- Modify: `packages/core/src/icon/icon.resolver.spec.ts`

- [ ] **Step 1: Append failing tests for the loader path**

Add to `packages/core/src/icon/icon.resolver.spec.ts`:

```ts
  describe('loader path', () => {
    it('returns null while load is pending, then fills registry on success', async () => {
      let resolveLoad: (v: string) => void;
      const loader = vi.fn(
        (n: string) =>
          new Promise<string>((res) => {
            resolveLoad = (v) => res(v);
          }),
      );
      const resolve = makeResolver([provideIconLoader(loader)]);

      // First call kicks off the load and returns null.
      expect(resolve('settings')).toBeNull();
      expect(loader).toHaveBeenCalledTimes(1);

      // Second concurrent call must NOT trigger a second load (dedupe).
      expect(resolve('settings')).toBeNull();
      expect(loader).toHaveBeenCalledTimes(1);

      resolveLoad!('url("loaded")');
      await Promise.resolve();
      await Promise.resolve();

      expect(resolve('settings')).toBe('url("loaded")');
    });

    it('on loader rejection, removes pending so a subsequent call retries', async () => {
      let calls = 0;
      const loader = vi.fn(async (n: string) => {
        calls++;
        if (calls === 1) throw new Error('boom');
        return 'url("ok")';
      });
      const resolve = makeResolver([provideIconLoader(loader)]);

      expect(resolve('x')).toBeNull();
      await Promise.resolve();
      await Promise.resolve();
      // First load failed; pending cleared. Second call retries.
      expect(resolve('x')).toBeNull();
      expect(loader).toHaveBeenCalledTimes(2);
      await Promise.resolve();
      await Promise.resolve();
      expect(resolve('x')).toBe('url("ok")');
    });

    it('loader path takes precedence over fallback resolver', async () => {
      const loader = async () => 'url("from-loader")';
      const resolve = makeResolver([
        provideIconLoader(loader),
        provideIconResolver(() => 'url("from-fallback")'),
      ]);
      expect(resolve('x')).toBeNull(); // pending
      await Promise.resolve();
      await Promise.resolve();
      expect(resolve('x')).toBe('url("from-loader")');
    });
  });
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `pnpm --filter @kouji-ui/core test -- icon.resolver`
Expected: PASS (6 tests total).

If the rejection-retry test is flaky, add one more `await Promise.resolve()` between phases. The implementation in Task 6 already handles dedupe and rejection cleanup, so no code change is needed.

- [ ] **Step 3: Re-export resolver from index**

Edit `packages/core/src/icon/index.ts` — add:

```ts
export { kjInjectIconResolver } from './icon.resolver';
```

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/icon/icon.resolver.spec.ts packages/core/src/icon/index.ts
git commit -m "test(core/icon): cover async loader path"
```

---

### Task 8: Directive — basic svg mode + decorative defaults (TDD)

**Files:**
- Create: `packages/core/src/icon/icon.directive.ts`
- Create: `packages/core/src/icon/icon.directive.spec.ts`

- [ ] **Step 1: Write failing tests for the decorative svg path**

```ts
// packages/core/src/icon/icon.directive.spec.ts
import { render } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { describe, expect, it } from 'vitest';
import { KjIconDirective } from './icon.directive';
import { provideIcons } from './icon.providers';

expect.extend(toHaveNoViolations);

describe('KjIconDirective — svg mode (decorative default)', () => {
  it('writes --kj-icon and data-kj-icon-mode="svg"', async () => {
    const { container } = await render(`<span [kjIcon]="'settings'"></span>`, {
      imports: [KjIconDirective],
      providers: [provideIcons({ settings: 'url("a")' })],
    });
    const host = container.querySelector('span')!;
    expect(host.getAttribute('data-kj-icon-mode')).toBe('svg');
    expect(host.style.getPropertyValue('--kj-icon')).toBe('url("a")');
  });

  it('applies the .kj-icon class', async () => {
    const { container } = await render(`<span [kjIcon]="'settings'"></span>`, {
      imports: [KjIconDirective],
      providers: [provideIcons({ settings: 'url("a")' })],
    });
    expect(container.querySelector('span')!.classList.contains('kj-icon')).toBe(true);
  });

  it('default = decorative: aria-hidden="true", no role, no aria-label', async () => {
    const { container } = await render(`<span [kjIcon]="'settings'"></span>`, {
      imports: [KjIconDirective],
      providers: [provideIcons({ settings: 'url("a")' })],
    });
    const host = container.querySelector('span')!;
    expect(host.getAttribute('aria-hidden')).toBe('true');
    expect(host.hasAttribute('role')).toBe(false);
    expect(host.hasAttribute('aria-label')).toBe(false);
  });

  it('renders no --kj-icon while async loader is pending', async () => {
    const loader = () => new Promise<string>(() => {/* never resolves */});
    const { container } = await render(`<span [kjIcon]="'missing'"></span>`, {
      imports: [KjIconDirective],
      providers: [{ provide: 'KJ_ICON_LOADER_PLACEHOLDER', useValue: loader }],
    });
    // Sanity: placeholder provider does nothing; we use the actual API:
    void container;
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm --filter @kouji-ui/core test -- icon.directive`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the directive (svg + decorative only)**

```ts
// packages/core/src/icon/icon.directive.ts
import { Directive, computed, input } from '@angular/core';
import { getIconMode } from './icon.mode';
import { kjInjectIconResolver } from './icon.resolver';
import type { KjIconColor, KjIconSize } from './icon.types';

/**
 * Renders an icon on its host element via CSS custom properties. Owns icon
 * accessibility (decorative by default; meaningful when `kjIconLabel` is set).
 *
 * @example
 * ```html
 * <span [kjIcon]="'settings'"></span>
 * <span [kjIcon]="'alert-triangle'" [kjIconLabel]="'Warning'"></span>
 * <span [kjIcon]="'check'" [kjIconColor]="'success'" [kjIconSize]="'lg'"></span>
 * ```
 *
 * @category Core/Icon
 */
@Directive({
  selector: '[kjIcon]',
  standalone: true,
  host: {
    class: 'kj-icon',
    '[style.--kj-icon]': 'iconValue()',
    '[style.color]': 'colorVar()',
    '[style.font-size]': 'sizeVar()',
    '[attr.data-kj-icon-mode]': 'mode()',
    '[attr.aria-hidden]': 'ariaHidden()',
    '[attr.role]': 'roleAttr()',
    '[attr.aria-label]': 'ariaLabelAttr()',
  },
})
export class KjIconDirective {
  private readonly resolve = kjInjectIconResolver();

  /** Icon name. Names starting with `@font.` use font mode. */
  readonly kjIcon = input.required<string>();

  /**
   * Accessible name. When set, the icon is treated as meaningful:
   * `role="img"`, `aria-label` set, `aria-hidden` removed. When unset
   * (the default), the icon is decorative and `aria-hidden="true"`.
   */
  readonly kjIconLabel = input<string | null>(null);

  /** Semantic color token. Default `null` means inherit (CSS `currentColor`). */
  readonly kjIconColor = input<KjIconColor | null>(null);

  /** Size token. Default `null` means inherit from surrounding text. */
  readonly kjIconSize = input<KjIconSize | null>(null);

  protected readonly mode = computed(() => getIconMode(this.kjIcon()));
  protected readonly iconValue = computed(() => this.resolve(this.kjIcon()));

  protected readonly ariaHidden = computed(() =>
    this.kjIconLabel() ? null : 'true',
  );
  protected readonly roleAttr = computed(() =>
    this.kjIconLabel() ? 'img' : null,
  );
  protected readonly ariaLabelAttr = computed(() => this.kjIconLabel());

  protected readonly colorVar = computed(() => {
    const c = this.kjIconColor();
    return c && c !== 'inherit' ? `var(--kj-color-icon-${c})` : null;
  });
  protected readonly sizeVar = computed(() => {
    const s = this.kjIconSize();
    return s ? `var(--kj-icon-size-${s})` : null;
  });
}
```

- [ ] **Step 4: Remove the placeholder loader test (it was a stub)**

Delete the `'renders no --kj-icon while async loader is pending'` test block from the spec file — we replace it with a real loader test in Task 9.

- [ ] **Step 5: Run to verify pass**

Run: `pnpm --filter @kouji-ui/core test -- icon.directive`
Expected: PASS (3 tests).

- [ ] **Step 6: Re-export from index**

Edit `packages/core/src/icon/index.ts` — add:

```ts
export { KjIconDirective } from './icon.directive';
```

- [ ] **Step 7: Commit**

```bash
git add packages/core/src/icon
git commit -m "feat(core/icon): add KjIconDirective (svg + decorative)"
```

---

### Task 9: Directive — meaningful mode, color, size, font mode, loader pending (TDD)

**Files:**
- Modify: `packages/core/src/icon/icon.directive.spec.ts`

- [ ] **Step 1: Append tests for meaningful mode, color, size, font, and loader pending**

```ts
import { provideIconLoader } from './icon.providers';

describe('KjIconDirective — meaningful mode (kjIconLabel)', () => {
  it('removes aria-hidden, sets role="img" and aria-label', async () => {
    const { container } = await render(
      `<span [kjIcon]="'alert'" [kjIconLabel]="'Warning'"></span>`,
      {
        imports: [KjIconDirective],
        providers: [provideIcons({ alert: 'url("a")' })],
      },
    );
    const host = container.querySelector('span')!;
    expect(host.hasAttribute('aria-hidden')).toBe(false);
    expect(host.getAttribute('role')).toBe('img');
    expect(host.getAttribute('aria-label')).toBe('Warning');
  });
});

describe('KjIconDirective — color tokens', () => {
  it('inherits color by default (no inline style)', async () => {
    const { container } = await render(`<span [kjIcon]="'x'"></span>`, {
      imports: [KjIconDirective],
      providers: [provideIcons({ x: 'url("a")' })],
    });
    expect(container.querySelector('span')!.style.color).toBe('');
  });

  it('writes color: var(--kj-color-icon-{token}) for non-inherit', async () => {
    const { container } = await render(
      `<span [kjIcon]="'x'" [kjIconColor]="'danger'"></span>`,
      {
        imports: [KjIconDirective],
        providers: [provideIcons({ x: 'url("a")' })],
      },
    );
    expect(container.querySelector('span')!.style.color).toBe(
      'var(--kj-color-icon-danger)',
    );
  });

  it('"inherit" color writes no inline style', async () => {
    const { container } = await render(
      `<span [kjIcon]="'x'" [kjIconColor]="'inherit'"></span>`,
      {
        imports: [KjIconDirective],
        providers: [provideIcons({ x: 'url("a")' })],
      },
    );
    expect(container.querySelector('span')!.style.color).toBe('');
  });
});

describe('KjIconDirective — size tokens', () => {
  it('writes font-size: var(--kj-icon-size-{token})', async () => {
    const { container } = await render(
      `<span [kjIcon]="'x'" [kjIconSize]="'lg'"></span>`,
      {
        imports: [KjIconDirective],
        providers: [provideIcons({ x: 'url("a")' })],
      },
    );
    expect(container.querySelector('span')!.style.fontSize).toBe(
      'var(--kj-icon-size-lg)',
    );
  });
});

describe('KjIconDirective — font mode', () => {
  it('reflects data-kj-icon-mode="font" for @font.* names', async () => {
    const { container } = await render(
      `<span [kjIcon]="'@font.fa-cog'"></span>`,
      {
        imports: [KjIconDirective],
        providers: [provideIcons({ '@font.fa-cog': '"\\f013"' })],
      },
    );
    const host = container.querySelector('span')!;
    expect(host.getAttribute('data-kj-icon-mode')).toBe('font');
    expect(host.style.getPropertyValue('--kj-icon')).toBe('"\\f013"');
  });
});

describe('KjIconDirective — loader pending', () => {
  it('renders no --kj-icon value while async load is pending', async () => {
    const neverResolves = () =>
      new Promise<string>(() => {/* hangs forever */});
    const { container } = await render(`<span [kjIcon]="'missing'"></span>`, {
      imports: [KjIconDirective],
      providers: [provideIconLoader(neverResolves)],
    });
    const host = container.querySelector('span')!;
    expect(host.style.getPropertyValue('--kj-icon')).toBe('');
  });

  it('updates --kj-icon once loader resolves', async () => {
    let resolveLoad: (v: string) => void;
    const loader = (n: string) =>
      new Promise<string>((res) => {
        resolveLoad = res;
      });
    const { container, fixture } = await render(
      `<span [kjIcon]="'settings'"></span>`,
      {
        imports: [KjIconDirective],
        providers: [provideIconLoader(loader)],
      },
    );
    const host = container.querySelector('span')!;
    expect(host.style.getPropertyValue('--kj-icon')).toBe('');

    resolveLoad!('url("loaded")');
    await Promise.resolve();
    await Promise.resolve();
    fixture.detectChanges();

    expect(host.style.getPropertyValue('--kj-icon')).toBe('url("loaded")');
  });
});

describe('KjIconDirective — a11y audits', () => {
  it('decorative icon passes axe', async () => {
    const { container } = await render(`<span [kjIcon]="'settings'"></span>`, {
      imports: [KjIconDirective],
      providers: [provideIcons({ settings: 'url("a")' })],
    });
    expect(await axe(container)).toHaveNoViolations();
  });

  it('meaningful icon passes axe', async () => {
    const { container } = await render(
      `<span [kjIcon]="'alert'" [kjIconLabel]="'Warning'"></span>`,
      {
        imports: [KjIconDirective],
        providers: [provideIcons({ alert: 'url("a")' })],
      },
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
```

- [ ] **Step 2: Run to verify pass**

Run: `pnpm --filter @kouji-ui/core test -- icon.directive`
Expected: PASS (12 tests total).

If `host.style.color` returns the unparsed CSS variable string slightly differently in JSDOM (some versions return `''` for `var(...)`), use `host.getAttribute('style')` and assert on the substring instead. Adjust per JSDOM behavior observed.

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/icon/icon.directive.spec.ts
git commit -m "test(core/icon): cover meaningful mode, color, size, font, loader, axe"
```

---

### Task 10: Stylesheet

**Files:**
- Create: `packages/core/src/icon/icon.css`
- Modify: `packages/core/ng-package.json` (only if assets need explicit listing — verify against the existing prose.css setup before assuming)

- [ ] **Step 1: Write the stylesheet**

```css
/* packages/core/src/icon/icon.css
 *
 * Renders icons set up by `KjIconDirective`. The directive writes:
 *   --kj-icon            → CSS-ready value (`url("...")` or `"glyph"`)
 *   data-kj-icon-mode    → "svg" | "font"
 *
 * SVG / CSS-mask mode (default): uses `mask-image` + `currentColor`.
 *   Works for any monochrome SVG including data: URIs.
 * Font mode: uses pseudo-element `content`. Consumers must load the icon
 *   font and (optionally) set `--kj-icon-font` on a parent.
 */

.kj-icon {
  display: inline-block;
  width: 1em;
  height: 1em;
  flex-shrink: 0;
  line-height: 1;
  vertical-align: middle;
}

.kj-icon[data-kj-icon-mode='svg'] {
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

.kj-icon[data-kj-icon-mode='font'] {
  font-family: var(--kj-icon-font, inherit);
}

.kj-icon[data-kj-icon-mode='font']::before {
  content: var(--kj-icon);
}
```

- [ ] **Step 2: Verify CSS ships with the package**

Inspect how `prose.css` is shipped:

```bash
grep -r "prose.css" packages/core/ng-package.json packages/core/package.json 2>/dev/null
```

If `prose.css` is shipped without explicit `assets` config in `ng-package.json`, `icon.css` will ship the same way (ng-packagr copies non-TS files from `src/` into the dist). If `prose.css` is listed in an assets array, add `src/icon/icon.css` to that same list.

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/icon/icon.css
git commit -m "feat(core/icon): add icon stylesheet"
```

---

### Task 11: Final wiring + smoke build

**Files:**
- Modify (verify only): `packages/core/src/public-api.ts`
- Modify (verify only): `packages/core/src/icon/index.ts`

- [ ] **Step 1: Verify the index re-exports everything**

Final state of `packages/core/src/icon/index.ts`:

```ts
export { getIconMode, type IconMode } from './icon.mode';
export type {
  IconResolver,
  IconLoader,
  KjIconColor,
  KjIconSize,
} from './icon.types';
export {
  KJ_ICON_ENTRIES,
  KJ_ICON_REGISTRY,
  KJ_ICON_RESOLVER,
  KJ_ICON_LOADER,
  KJ_ICON_CSS_PATH,
} from './icon.tokens';
export {
  provideIcons,
  provideIconResolver,
  provideIconLoader,
} from './icon.providers';
export { kjInjectIconResolver } from './icon.resolver';
export { KjIconDirective } from './icon.directive';
```

- [ ] **Step 2: Verify public-api includes the icon module**

`packages/core/src/public-api.ts` must contain a line `export * from './icon/index';` (added in Task 1).

- [ ] **Step 3: Run full core test suite**

Run from repo root: `pnpm --filter @kouji-ui/core test`
Expected: PASS — all icon tests plus all pre-existing core tests.

- [ ] **Step 4: Run a build to verify ng-packagr is happy**

Run: `pnpm --filter @kouji-ui/core build`
Expected: clean build, no errors. The dist should contain `icon.css` (verify with `ls packages/../dist/kj-core/icon/` or equivalent based on the dest config).

If the CSS is missing from dist, add an explicit `assets` entry in `packages/core/ng-package.json`:

```json
{
  "$schema": "../../node_modules/ng-packagr/ng-package.schema.json",
  "dest": "../../dist/kj-core",
  "lib": {
    "entryFile": "src/public-api.ts"
  },
  "assets": ["src/icon/icon.css"]
}
```

- [ ] **Step 5: Commit any wiring fixes**

```bash
git add packages/core
git commit -m "chore(core/icon): wire build output for icon.css"
```

(Skip this commit if no changes were needed.)

---

### Task 12: E2E verification (per global rule "E2E tests after every feature")

The global rule requires E2E coverage. The icon system in core has no app-level UI of its own this session (no example refactor, no Lucide adapter), so the directive-level integration tests in Task 9 (axe + loader resolution end-to-end through DI) serve as the feature-level E2E. Document this explicitly so reviewers know the rule was considered, not skipped.

**Files:**
- Create: `packages/core/src/icon/E2E.md`

- [ ] **Step 1: Document E2E posture**

```md
# Icon — E2E coverage notes

The core icon layer has no consumer-visible UI in this session (no Lucide
adapter, no example refactor). The directive-level integration tests in
`icon.directive.spec.ts` cover the end-to-end path through DI:

- Eager registration via `provideIcons` → directive renders the registered value.
- Async loader path → directive renders nothing while pending, then re-renders on success.
- Decorative vs meaningful a11y modes → axe-clean.
- Mode switching (svg vs font) → correct CSS variable wrapping and `data-kj-icon-mode`.

Browser-level E2E lands with the Lucide adapter follow-up, when there's a
visible component to drive.
```

- [ ] **Step 2: Commit**

```bash
git add packages/core/src/icon/E2E.md
git commit -m "docs(core/icon): note E2E posture for core-only session"
```

---

## Self-review

**Spec coverage check:**

| Spec section | Implementing task |
|---|---|
| Package layout — `@kouji-ui/core/icon` | Tasks 1, 11 |
| Types (IconResolver, IconLoader, KjIconColor, KjIconSize) | Task 2 |
| Mode parsing (`getIconMode`) | Task 3 |
| DI tokens (REGISTRY, RESOLVER, LOADER, ENTRIES, CSS_PATH) | Tasks 4, 5 |
| Provider helpers | Task 5 |
| Resolution order (registry → loader → resolver) | Tasks 6, 7 |
| Loader cache + dedupe + retry-on-reject | Task 7 |
| Directive svg + decorative a11y default | Task 8 |
| Directive meaningful mode (kjIconLabel) | Task 9 |
| Directive color + size tokens | Task 9 |
| Directive font mode | Task 9 |
| icon.css with mask-image + content | Task 10 |
| Public API export | Tasks 1, 11 |
| Build wiring (assets) | Task 11 |
| E2E posture documented | Task 12 |

**Out of scope (per session scope):** Lucide adapter, example migrations — confirmed not in the plan.

**Type consistency check:** `IconResolver`/`IconLoader`/`KjIconColor`/`KjIconSize` — names match across types file, tokens, providers, resolver, and directive. `KJ_ICON_*` token names consistent. `provideIcons`/`provideIconResolver`/`provideIconLoader` consistent. ✓

**Placeholder scan:** No "TBD"/"TODO"/"add appropriate" patterns. Every code step has full code. ✓
