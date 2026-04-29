# kouji-ui — Phase 3: Core Component Directives

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement all component directives in `@kouji-ui/core`. Each group gets a dedicated folder under `packages/core/src/`. All directives use TDD, are fully TSDoc'd, and compose the shared primitives from Phase 2.

**Architecture:** Directive-only, signals everywhere, signal-context pattern for parent/child coordination. Overlays handle their own show/hide state via ARIA + `hidden` attribute (CDK Overlay portal is the UI layer's responsibility). Foundation components compose `KjDisabledDirective` and `KjFocusRingDirective` via `hostDirectives`.

**Tech Stack:** Angular 21, Angular CDK (`FocusKeyManager`, `LiveAnnouncer`), TanStack Table, ECharts, Vitest, jest-axe

**Parallelism:** All groups in Tasks 2–18 are independent and can be executed in parallel after Task 1 completes.

---

## File Map

Each component group creates:
- `packages/core/src/<component>/<component>.directive.ts` — implementation
- `packages/core/src/<component>/<component>.directive.spec.ts` — tests
- `packages/core/src/<component>/index.ts` — barrel export
- (context file if signal-context is needed)

Plus final wiring:
- `packages/core/src/index.ts` — master barrel
- `packages/core/src/public-api.ts` — update to include all components

---

## Task 1: Create Component Directories (MUST RUN FIRST)

All other tasks depend on this completing first.

- [ ] **Create all directories:**

```bash
mkdir -p packages/core/src/button
mkdir -p packages/core/src/input
mkdir -p packages/core/src/checkbox
mkdir -p packages/core/src/radio
mkdir -p packages/core/src/toggle
mkdir -p packages/core/src/badge
mkdir -p packages/core/src/avatar
mkdir -p packages/core/src/dialog
mkdir -p packages/core/src/tooltip
mkdir -p packages/core/src/popover
mkdir -p packages/core/src/menu
mkdir -p packages/core/src/toast
mkdir -p packages/core/src/table
mkdir -p packages/core/src/form
mkdir -p packages/core/src/tabs
mkdir -p packages/core/src/accordion
mkdir -p packages/core/src/select
mkdir -p packages/core/src/chart
```

- [ ] **Commit:**

```bash
git add packages/core/src
git commit -m "chore: scaffold component directories in core"
```

---

## Task 2: Button Directive (parallel)

**Files:**
- `packages/core/src/button/button.directive.ts`
- `packages/core/src/button/button.directive.spec.ts`
- `packages/core/src/button/index.ts`

- [ ] **Write failing test** — Create `packages/core/src/button/button.directive.spec.ts`:

```ts
import { render, fireEvent } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { KjButtonDirective } from './button.directive';
import { KjDisabledDirective } from '../primitives/disabled.directive';

expect.extend(toHaveNoViolations);

describe('KjButtonDirective', () => {
  it('renders a button element', async () => {
    const { getByRole } = await render(
      `<button kjButton>Click</button>`,
      { imports: [KjButtonDirective] },
    );
    expect(getByRole('button')).toBeInTheDocument();
  });

  it('sets data-variant attribute', async () => {
    const { getByRole } = await render(
      `<button kjButton [kjVariant]="'destructive'">Delete</button>`,
      { imports: [KjButtonDirective] },
    );
    expect(getByRole('button')).toHaveAttribute('data-variant', 'destructive');
  });

  it('sets data-size attribute', async () => {
    const { getByRole } = await render(
      `<button kjButton [kjSize]="'sm'">Small</button>`,
      { imports: [KjButtonDirective] },
    );
    expect(getByRole('button')).toHaveAttribute('data-size', 'sm');
  });

  it('sets aria-disabled when disabled', async () => {
    const { getByRole } = await render(
      `<button kjButton [kjDisabled]="true">Disabled</button>`,
      { imports: [KjButtonDirective] },
    );
    expect(getByRole('button')).toHaveAttribute('aria-disabled', 'true');
  });

  it('passes axe audit', async () => {
    const { container } = await render(
      `<button kjButton>Action</button>`,
      { imports: [KjButtonDirective] },
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
```

- [ ] **Run to confirm fails**

- [ ] **Implement** — Create `packages/core/src/button/button.directive.ts`:

```ts
import { Directive, input } from '@angular/core';
import { KjDisabledDirective } from '../primitives/disabled.directive';
import { KjFocusRingDirective } from '../primitives/focus-ring.directive';

/** Visual variants for the button. */
export type KjButtonVariant = 'default' | 'destructive' | 'outline' | 'ghost' | 'link';

/** Size variants for the button. */
export type KjButtonSize = 'sm' | 'md' | 'lg' | 'icon';

/**
 * Enhances a native `<button>` element with variant, size, disabled state, and focus-ring behavior.
 * Composes `KjDisabledDirective` and `KjFocusRingDirective` via `hostDirectives`.
 *
 * @example
 * ```html
 * <button kjButton [kjVariant]="'destructive'" [kjDisabled]="isLoading()">
 *   Delete
 * </button>
 * ```
 */
@Directive({
  selector: '[kjButton]',
  standalone: true,
  hostDirectives: [
    { directive: KjDisabledDirective, inputs: ['disabled: kjDisabled'] },
    KjFocusRingDirective,
  ],
  host: {
    '[attr.data-variant]': 'kjVariant()',
    '[attr.data-size]': 'kjSize()',
  },
})
export class KjButtonDirective {
  /** The visual variant of the button. Defaults to `'default'`. */
  kjVariant = input<KjButtonVariant>('default');

  /** The size of the button. Defaults to `'md'`. */
  kjSize = input<KjButtonSize>('md');
}
```

- [ ] **Create barrel** — Create `packages/core/src/button/index.ts`:

```ts
export { KjButtonDirective, type KjButtonVariant, type KjButtonSize } from './button.directive';
```

- [ ] **Run to confirm passes**

- [ ] **Commit:**
```bash
git add packages/core/src/button/
git commit -m "feat(core): add KjButtonDirective"
```

---

## Task 3: Input Directive (parallel)

**Files:**
- `packages/core/src/input/input.directive.ts`
- `packages/core/src/input/input.directive.spec.ts`
- `packages/core/src/input/index.ts`

- [ ] **Write failing test** — Create `packages/core/src/input/input.directive.spec.ts`:

```ts
import { render } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { KjInputDirective } from './input.directive';

expect.extend(toHaveNoViolations);

describe('KjInputDirective', () => {
  it('renders without error', async () => {
    const { container } = await render(
      `<input kjInput type="text" />`,
      { imports: [KjInputDirective] },
    );
    expect(container.querySelector('input')).toBeInTheDocument();
  });

  it('sets data-invalid when invalid', async () => {
    const { container } = await render(
      `<input kjInput [kjInvalid]="true" />`,
      { imports: [KjInputDirective] },
    );
    expect(container.querySelector('input')).toHaveAttribute('aria-invalid', 'true');
    expect(container.querySelector('input')).toHaveAttribute('data-invalid', '');
  });

  it('sets aria-disabled and data-disabled when disabled', async () => {
    const { container } = await render(
      `<input kjInput [kjDisabled]="true" />`,
      { imports: [KjInputDirective] },
    );
    expect(container.querySelector('input')).toHaveAttribute('aria-disabled', 'true');
  });

  it('passes axe audit', async () => {
    const { container } = await render(
      `<label for="name">Name</label><input id="name" kjInput type="text" />`,
      { imports: [KjInputDirective] },
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
```

- [ ] **Run to confirm fails**

- [ ] **Implement** — Create `packages/core/src/input/input.directive.ts`:

```ts
import { Directive, input } from '@angular/core';
import { KjDisabledDirective } from '../primitives/disabled.directive';
import { KjFocusRingDirective } from '../primitives/focus-ring.directive';

/**
 * Enhances a native `<input>` element with disabled state, invalid state, and focus-ring behavior.
 *
 * @example
 * ```html
 * <input kjInput type="email" [kjInvalid]="hasError()" [kjDisabled]="isLoading()" />
 * ```
 */
@Directive({
  selector: '[kjInput]',
  standalone: true,
  hostDirectives: [
    { directive: KjDisabledDirective, inputs: ['disabled: kjDisabled'] },
    KjFocusRingDirective,
  ],
  host: {
    '[attr.aria-invalid]': 'kjInvalid() ? "true" : null',
    '[attr.data-invalid]': 'kjInvalid() ? "" : null',
  },
})
export class KjInputDirective {
  /** Whether the input is in an invalid state. Reflects via `aria-invalid` and `data-invalid`. */
  kjInvalid = input<boolean>(false);
}
```

- [ ] **Create barrel** — Create `packages/core/src/input/index.ts`:
```ts
export { KjInputDirective } from './input.directive';
```

- [ ] **Run to confirm passes**

- [ ] **Commit:**
```bash
git add packages/core/src/input/
git commit -m "feat(core): add KjInputDirective"
```

---

## Task 4: Checkbox Directive (parallel)

**Files:**
- `packages/core/src/checkbox/checkbox.directive.ts`
- `packages/core/src/checkbox/checkbox.directive.spec.ts`
- `packages/core/src/checkbox/index.ts`

- [ ] **Write failing test** — Create `packages/core/src/checkbox/checkbox.directive.spec.ts`:

```ts
import { render, fireEvent } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { KjCheckboxDirective } from './checkbox.directive';

expect.extend(toHaveNoViolations);

describe('KjCheckboxDirective', () => {
  it('sets role=checkbox', async () => {
    const { getByRole } = await render(
      `<div kjCheckbox tabindex="0">Check</div>`,
      { imports: [KjCheckboxDirective] },
    );
    expect(getByRole('checkbox')).toBeInTheDocument();
  });

  it('sets aria-checked to false by default', async () => {
    const { getByRole } = await render(
      `<div kjCheckbox tabindex="0">Check</div>`,
      { imports: [KjCheckboxDirective] },
    );
    expect(getByRole('checkbox')).toHaveAttribute('aria-checked', 'false');
  });

  it('toggles checked on click', async () => {
    const { getByRole } = await render(
      `<div kjCheckbox tabindex="0">Check</div>`,
      { imports: [KjCheckboxDirective] },
    );
    const el = getByRole('checkbox');
    fireEvent.click(el);
    expect(el).toHaveAttribute('aria-checked', 'true');
    expect(el).toHaveAttribute('data-checked', '');
  });

  it('toggles checked on Space key', async () => {
    const { getByRole } = await render(
      `<div kjCheckbox tabindex="0">Check</div>`,
      { imports: [KjCheckboxDirective] },
    );
    const el = getByRole('checkbox');
    fireEvent.keyDown(el, { key: ' ' });
    expect(el).toHaveAttribute('aria-checked', 'true');
  });

  it('passes axe audit', async () => {
    const { container } = await render(
      `<div kjCheckbox tabindex="0" aria-label="Accept terms">Check</div>`,
      { imports: [KjCheckboxDirective] },
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
```

- [ ] **Run to confirm fails**

- [ ] **Implement** — Create `packages/core/src/checkbox/checkbox.directive.ts`:

```ts
import { Directive, model } from '@angular/core';
import { KjDisabledDirective } from '../primitives/disabled.directive';
import { KjFocusRingDirective } from '../primitives/focus-ring.directive';

/**
 * Adds checkbox behavior to any element. Use on native `<input type="checkbox">` or
 * a custom element that needs checkbox semantics.
 *
 * @example
 * ```html
 * <div kjCheckbox tabindex="0" aria-label="Accept terms" [(kjChecked)]="accepted">
 *   Accept
 * </div>
 * ```
 */
@Directive({
  selector: '[kjCheckbox]',
  standalone: true,
  hostDirectives: [
    { directive: KjDisabledDirective, inputs: ['disabled: kjDisabled'] },
    KjFocusRingDirective,
  ],
  host: {
    role: 'checkbox',
    '[attr.aria-checked]': 'kjChecked().toString()',
    '[attr.data-checked]': 'kjChecked() ? "" : null',
    '(click)': 'toggle()',
    '(keydown.space)': 'onSpace($event)',
  },
})
export class KjCheckboxDirective {
  /** Whether the checkbox is checked. Supports two-way binding. */
  kjChecked = model<boolean>(false);

  /** @internal */
  toggle(): void {
    this.kjChecked.set(!this.kjChecked());
  }

  /** @internal */
  onSpace(event: Event): void {
    event.preventDefault();
    this.toggle();
  }
}
```

- [ ] **Create barrel** — Create `packages/core/src/checkbox/index.ts`:
```ts
export { KjCheckboxDirective } from './checkbox.directive';
```

- [ ] **Run to confirm passes**

- [ ] **Commit:**
```bash
git add packages/core/src/checkbox/
git commit -m "feat(core): add KjCheckboxDirective"
```

---

## Task 5: Radio Directives (parallel)

**Files:**
- `packages/core/src/radio/radio.context.ts`
- `packages/core/src/radio/radio.directive.ts`
- `packages/core/src/radio/radio.directive.spec.ts`
- `packages/core/src/radio/index.ts`

- [ ] **Write failing test** — Create `packages/core/src/radio/radio.directive.spec.ts`:

```ts
import { render, fireEvent } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { KjRadioGroupDirective, KjRadioDirective } from './radio.directive';

expect.extend(toHaveNoViolations);

const template = `
  <div kjRadioGroup [(kjValue)]="selected" aria-label="Options">
    <div kjRadio [kjRadioValue]="'a'" tabindex="0">Option A</div>
    <div kjRadio [kjRadioValue]="'b'" tabindex="-1">Option B</div>
  </div>`;
const imports = [KjRadioGroupDirective, KjRadioDirective];

describe('KjRadioGroupDirective', () => {
  it('renders a radiogroup', async () => {
    const { getByRole } = await render(template, { imports,
      componentProperties: { selected: 'a' } });
    expect(getByRole('radiogroup')).toBeInTheDocument();
  });

  it('radio items have role=radio', async () => {
    const { getAllByRole } = await render(template, { imports,
      componentProperties: { selected: 'a' } });
    expect(getAllByRole('radio')).toHaveLength(2);
  });

  it('selected radio has aria-checked=true', async () => {
    const { getAllByRole } = await render(template, { imports,
      componentProperties: { selected: 'a' } });
    const [radioA] = getAllByRole('radio');
    expect(radioA).toHaveAttribute('aria-checked', 'true');
  });

  it('clicking a radio selects it', async () => {
    const { getAllByRole } = await render(template, { imports,
      componentProperties: { selected: 'a' } });
    const [, radioB] = getAllByRole('radio');
    fireEvent.click(radioB);
    expect(radioB).toHaveAttribute('aria-checked', 'true');
  });

  it('passes axe audit', async () => {
    const { container } = await render(template, { imports,
      componentProperties: { selected: 'a' } });
    expect(await axe(container)).toHaveNoViolations();
  });
});
```

- [ ] **Run to confirm fails**

- [ ] **Create context** — Create `packages/core/src/radio/radio.context.ts`:

```ts
import { InjectionToken, Signal, WritableSignal } from '@angular/core';

/** Context shared between KjRadioGroupDirective and KjRadioDirective. */
export interface KjRadioContext {
  value: Signal<unknown>;
  select: (value: unknown) => void;
}

/** Injection token for radio group context. */
export const KJ_RADIO_GROUP = new InjectionToken<KjRadioContext>('KjRadioGroup');
```

- [ ] **Implement** — Create `packages/core/src/radio/radio.directive.ts`:

```ts
import { Directive, computed, inject, input, model } from '@angular/core';
import { KJ_RADIO_GROUP, KjRadioContext } from './radio.context';
import { KjDisabledDirective } from '../primitives/disabled.directive';
import { KjFocusRingDirective } from '../primitives/focus-ring.directive';

/**
 * Container for a group of radio buttons. Manages the selected value.
 *
 * @example
 * ```html
 * <div kjRadioGroup [(kjValue)]="size" aria-label="T-shirt size">
 *   <div kjRadio [kjRadioValue]="'s'">Small</div>
 *   <div kjRadio [kjRadioValue]="'m'">Medium</div>
 * </div>
 * ```
 */
@Directive({
  selector: '[kjRadioGroup]',
  standalone: true,
  providers: [{ provide: KJ_RADIO_GROUP, useExisting: KjRadioGroupDirective }],
  host: { role: 'radiogroup' },
})
export class KjRadioGroupDirective implements KjRadioContext {
  /** The currently selected value. Supports two-way binding. */
  kjValue = model<unknown>(undefined);

  readonly value = this.kjValue.asReadonly();

  select(val: unknown): void {
    this.kjValue.set(val);
  }
}

/**
 * Individual radio button within a `[kjRadioGroup]`.
 *
 * @example
 * ```html
 * <div kjRadio [kjRadioValue]="'option-a'" tabindex="0">Option A</div>
 * ```
 */
@Directive({
  selector: '[kjRadio]',
  standalone: true,
  hostDirectives: [
    { directive: KjDisabledDirective, inputs: ['disabled: kjDisabled'] },
    KjFocusRingDirective,
  ],
  host: {
    role: 'radio',
    '[attr.aria-checked]': 'checked().toString()',
    '[attr.data-checked]': 'checked() ? "" : null',
    '(click)': 'select()',
    '(keydown.space)': 'onSpace($event)',
    '(keydown.enter)': 'select()',
  },
})
export class KjRadioDirective {
  private readonly group = inject(KJ_RADIO_GROUP);

  /** The value this radio represents. */
  kjRadioValue = input.required<unknown>();

  /** Whether this radio is selected. */
  readonly checked = computed(() => this.group.value() === this.kjRadioValue());

  /** @internal */
  select(): void {
    this.group.select(this.kjRadioValue());
  }

  /** @internal */
  onSpace(event: Event): void {
    event.preventDefault();
    this.select();
  }
}
```

- [ ] **Create barrel** — Create `packages/core/src/radio/index.ts`:
```ts
export { KjRadioGroupDirective, KjRadioDirective } from './radio.directive';
export { KJ_RADIO_GROUP, type KjRadioContext } from './radio.context';
```

- [ ] **Run to confirm passes**

- [ ] **Commit:**
```bash
git add packages/core/src/radio/
git commit -m "feat(core): add KjRadioGroupDirective and KjRadioDirective"
```

---

## Task 6: Toggle Directive (parallel)

**Files:**
- `packages/core/src/toggle/toggle.directive.ts`
- `packages/core/src/toggle/toggle.directive.spec.ts`
- `packages/core/src/toggle/index.ts`

- [ ] **Write failing test** — Create `packages/core/src/toggle/toggle.directive.spec.ts`:

```ts
import { render, fireEvent } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { KjToggleDirective } from './toggle.directive';

expect.extend(toHaveNoViolations);

describe('KjToggleDirective', () => {
  it('has aria-pressed=false by default', async () => {
    const { getByRole } = await render(
      `<button kjToggle>Bold</button>`,
      { imports: [KjToggleDirective] },
    );
    expect(getByRole('button')).toHaveAttribute('aria-pressed', 'false');
  });

  it('toggles aria-pressed on click', async () => {
    const { getByRole } = await render(
      `<button kjToggle>Bold</button>`,
      { imports: [KjToggleDirective] },
    );
    const btn = getByRole('button');
    fireEvent.click(btn);
    expect(btn).toHaveAttribute('aria-pressed', 'true');
    expect(btn).toHaveAttribute('data-pressed', '');
  });

  it('passes axe audit', async () => {
    const { container } = await render(
      `<button kjToggle>Bold</button>`,
      { imports: [KjToggleDirective] },
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
```

- [ ] **Run to confirm fails**

- [ ] **Implement** — Create `packages/core/src/toggle/toggle.directive.ts`:

```ts
import { Directive, model } from '@angular/core';
import { KjDisabledDirective } from '../primitives/disabled.directive';
import { KjFocusRingDirective } from '../primitives/focus-ring.directive';

/**
 * Adds toggle (press) behavior to a button. Manages `aria-pressed` state.
 *
 * @example
 * ```html
 * <button kjToggle [(kjPressed)]="isBold" aria-label="Bold">B</button>
 * ```
 */
@Directive({
  selector: '[kjToggle]',
  standalone: true,
  hostDirectives: [
    { directive: KjDisabledDirective, inputs: ['disabled: kjDisabled'] },
    KjFocusRingDirective,
  ],
  host: {
    '[attr.aria-pressed]': 'kjPressed().toString()',
    '[attr.data-pressed]': 'kjPressed() ? "" : null',
    '(click)': 'toggle()',
  },
})
export class KjToggleDirective {
  /** Whether the toggle is pressed. Supports two-way binding. */
  kjPressed = model<boolean>(false);

  /** @internal */
  toggle(): void {
    this.kjPressed.set(!this.kjPressed());
  }
}
```

- [ ] **Create barrel** — Create `packages/core/src/toggle/index.ts`:
```ts
export { KjToggleDirective } from './toggle.directive';
```

- [ ] **Run to confirm passes**

- [ ] **Commit:**
```bash
git add packages/core/src/toggle/
git commit -m "feat(core): add KjToggleDirective"
```

---

## Task 7: Badge & Avatar Directives (parallel)

**Files:**
- `packages/core/src/badge/badge.directive.ts`
- `packages/core/src/badge/badge.directive.spec.ts`
- `packages/core/src/badge/index.ts`
- `packages/core/src/avatar/avatar.directive.ts`
- `packages/core/src/avatar/avatar.directive.spec.ts`
- `packages/core/src/avatar/index.ts`

- [ ] **Write failing tests** — Create `packages/core/src/badge/badge.directive.spec.ts`:

```ts
import { render } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { KjBadgeDirective } from './badge.directive';

expect.extend(toHaveNoViolations);

describe('KjBadgeDirective', () => {
  it('sets data-variant attribute', async () => {
    const { container } = await render(
      `<span kjBadge [kjBadgeVariant]="'destructive'">New</span>`,
      { imports: [KjBadgeDirective] },
    );
    expect(container.querySelector('span')).toHaveAttribute('data-variant', 'destructive');
  });

  it('passes axe audit', async () => {
    const { container } = await render(
      `<span kjBadge>Beta</span>`,
      { imports: [KjBadgeDirective] },
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
```

Create `packages/core/src/avatar/avatar.directive.spec.ts`:

```ts
import { render } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { KjAvatarDirective, KjAvatarImageDirective, KjAvatarFallbackDirective } from './avatar.directive';

expect.extend(toHaveNoViolations);

const imports = [KjAvatarDirective, KjAvatarImageDirective, KjAvatarFallbackDirective];

describe('KjAvatarDirective', () => {
  it('renders avatar container', async () => {
    const { container } = await render(
      `<span kjAvatar>
        <img kjAvatarImage src="/photo.jpg" alt="John" />
        <span kjAvatarFallback>JD</span>
      </span>`,
      { imports },
    );
    expect(container.querySelector('[kjAvatar]')).toBeInTheDocument();
  });

  it('passes axe audit', async () => {
    const { container } = await render(
      `<span kjAvatar>
        <img kjAvatarImage src="/photo.jpg" alt="John Doe" />
        <span kjAvatarFallback aria-hidden="true">JD</span>
      </span>`,
      { imports },
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
```

- [ ] **Run to confirm they fail**

- [ ] **Implement badge** — Create `packages/core/src/badge/badge.directive.ts`:

```ts
import { Directive, input } from '@angular/core';

/** Visual variants for the badge. */
export type KjBadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

/**
 * Adds badge styling semantics to any inline element via data attributes.
 *
 * @example
 * ```html
 * <span kjBadge [kjBadgeVariant]="'destructive'">Critical</span>
 * ```
 */
@Directive({
  selector: '[kjBadge]',
  standalone: true,
  host: {
    '[attr.data-variant]': 'kjBadgeVariant()',
  },
})
export class KjBadgeDirective {
  /** The visual variant of the badge. Defaults to `'default'`. */
  kjBadgeVariant = input<KjBadgeVariant>('default');
}
```

- [ ] **Implement avatar** — Create `packages/core/src/avatar/avatar.directive.ts`:

```ts
import { Directive, InjectionToken, inject, signal } from '@angular/core';

/** Context for avatar image load state. */
export interface KjAvatarContext {
  imageLoaded: ReturnType<typeof signal<boolean>>;
}

/** Injection token for avatar context. */
export const KJ_AVATAR = new InjectionToken<KjAvatarContext>('KjAvatar');

/**
 * Container directive for avatar components. Tracks image load state
 * to show/hide fallback content.
 *
 * @example
 * ```html
 * <span kjAvatar>
 *   <img kjAvatarImage src="/photo.jpg" alt="Jane" />
 *   <span kjAvatarFallback>JD</span>
 * </span>
 * ```
 */
@Directive({
  selector: '[kjAvatar]',
  standalone: true,
  providers: [{ provide: KJ_AVATAR, useExisting: KjAvatarDirective }],
})
export class KjAvatarDirective implements KjAvatarContext {
  readonly imageLoaded = signal(false);
}

/**
 * Image element within a `[kjAvatar]` container.
 * Hides itself if the image fails to load, allowing the fallback to show.
 *
 * @example
 * ```html
 * <img kjAvatarImage [src]="userPhotoUrl" [alt]="user.name" />
 * ```
 */
@Directive({
  selector: '[kjAvatarImage]',
  standalone: true,
  host: {
    '(load)': 'onLoad()',
    '(error)': 'onError()',
    '[attr.data-loaded]': 'ctx.imageLoaded() ? "" : null',
  },
})
export class KjAvatarImageDirective {
  readonly ctx = inject(KJ_AVATAR);

  /** @internal */
  onLoad(): void { this.ctx.imageLoaded.set(true); }
  /** @internal */
  onError(): void { this.ctx.imageLoaded.set(false); }
}

/**
 * Fallback content shown when the avatar image is unavailable.
 *
 * @example
 * ```html
 * <span kjAvatarFallback aria-hidden="true">JD</span>
 * ```
 */
@Directive({
  selector: '[kjAvatarFallback]',
  standalone: true,
  host: {
    '[attr.data-visible]': '!ctx.imageLoaded() ? "" : null',
  },
})
export class KjAvatarFallbackDirective {
  readonly ctx = inject(KJ_AVATAR);
}
```

- [ ] **Create barrels**:

`packages/core/src/badge/index.ts`:
```ts
export { KjBadgeDirective, type KjBadgeVariant } from './badge.directive';
```

`packages/core/src/avatar/index.ts`:
```ts
export { KjAvatarDirective, KjAvatarImageDirective, KjAvatarFallbackDirective, KJ_AVATAR } from './avatar.directive';
```

- [ ] **Run to confirm passes**

- [ ] **Commit:**
```bash
git add packages/core/src/badge/ packages/core/src/avatar/
git commit -m "feat(core): add KjBadgeDirective and KjAvatarDirective"
```

---

## Task 8: Tabs Directives (parallel)

**Files:**
- `packages/core/src/tabs/tabs.context.ts`
- `packages/core/src/tabs/tabs.directive.ts`
- `packages/core/src/tabs/tabs.directive.spec.ts`
- `packages/core/src/tabs/index.ts`

- [ ] **Write failing test** — Create `packages/core/src/tabs/tabs.directive.spec.ts`:

```ts
import { render, fireEvent } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { KjTabsDirective, KjTabListDirective, KjTabDirective, KjTabPanelDirective } from './tabs.directive';

expect.extend(toHaveNoViolations);

const imports = [KjTabsDirective, KjTabListDirective, KjTabDirective, KjTabPanelDirective];
const template = `
  <div kjTabs [kjTabsValue]="'tab1'">
    <div kjTabList aria-label="Demo tabs">
      <button kjTab [kjTabValue]="'tab1'">Tab 1</button>
      <button kjTab [kjTabValue]="'tab2'">Tab 2</button>
    </div>
    <div kjTabPanel [kjPanelFor]="'tab1'">Content 1</div>
    <div kjTabPanel [kjPanelFor]="'tab2'">Content 2</div>
  </div>`;

describe('KjTabsDirective', () => {
  it('active tab has aria-selected=true', async () => {
    const { getAllByRole } = await render(template, { imports });
    const tabs = getAllByRole('tab');
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[1]).toHaveAttribute('aria-selected', 'false');
  });

  it('active panel is visible', async () => {
    const { getByText } = await render(template, { imports });
    expect(getByText('Content 1')).not.toHaveAttribute('hidden');
  });

  it('inactive panel is hidden', async () => {
    const { getByText } = await render(template, { imports });
    expect(getByText('Content 2').closest('[kjTabPanel]')).toHaveAttribute('hidden', '');
  });

  it('clicking a tab activates it', async () => {
    const { getAllByRole } = await render(template, { imports });
    const tabs = getAllByRole('tab');
    fireEvent.click(tabs[1]);
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
  });

  it('passes axe audit', async () => {
    const { container } = await render(template, { imports });
    expect(await axe(container)).toHaveNoViolations();
  });
});
```

- [ ] **Run to confirm fails**

- [ ] **Create context** — Create `packages/core/src/tabs/tabs.context.ts`:

```ts
import { InjectionToken, Signal } from '@angular/core';

/** Context shared between tabs directives. */
export interface KjTabsContext {
  value: Signal<string>;
  activate: (value: string) => void;
}

/** Injection token for tabs context. */
export const KJ_TABS = new InjectionToken<KjTabsContext>('KjTabs');
```

- [ ] **Implement** — Create `packages/core/src/tabs/tabs.directive.ts`:

```ts
import { Directive, computed, inject, input, model } from '@angular/core';
import { KJ_TABS, KjTabsContext } from './tabs.context';

/**
 * Root container for the tabs component. Manages the active tab value.
 *
 * @example
 * ```html
 * <div kjTabs [(kjTabsValue)]="activeTab">
 *   <div kjTabList>...</div>
 * </div>
 * ```
 */
@Directive({
  selector: '[kjTabs]',
  standalone: true,
  providers: [{ provide: KJ_TABS, useExisting: KjTabsDirective }],
})
export class KjTabsDirective implements KjTabsContext {
  /** The currently active tab value. Supports two-way binding. */
  kjTabsValue = model<string>('');
  readonly value = this.kjTabsValue.asReadonly();
  activate(val: string): void { this.kjTabsValue.set(val); }
}

/**
 * Container for the list of tab triggers. Sets `role="tablist"`.
 *
 * @example
 * ```html
 * <div kjTabList aria-label="Settings tabs">...</div>
 * ```
 */
@Directive({
  selector: '[kjTabList]',
  standalone: true,
  host: { role: 'tablist' },
})
export class KjTabListDirective {}

/**
 * Individual tab trigger button. Sets `role="tab"` and manages `aria-selected`.
 *
 * @example
 * ```html
 * <button kjTab [kjTabValue]="'profile'">Profile</button>
 * ```
 */
@Directive({
  selector: '[kjTab]',
  standalone: true,
  host: {
    role: 'tab',
    '[attr.aria-selected]': 'active().toString()',
    '[attr.data-active]': 'active() ? "" : null',
    '[attr.tabindex]': 'active() ? "0" : "-1"',
    '(click)': 'activate()',
  },
})
export class KjTabDirective {
  private readonly ctx = inject(KJ_TABS);

  /** The value identifying this tab. Must match the corresponding panel's `kjPanelFor`. */
  kjTabValue = input.required<string>();

  /** Whether this tab is currently active. */
  readonly active = computed(() => this.ctx.value() === this.kjTabValue());

  /** @internal */
  activate(): void { this.ctx.activate(this.kjTabValue()); }
}

/**
 * Tab panel content area. Hidden when its corresponding tab is not active.
 *
 * @example
 * ```html
 * <div kjTabPanel [kjPanelFor]="'profile'">Profile content</div>
 * ```
 */
@Directive({
  selector: '[kjTabPanel]',
  standalone: true,
  host: {
    role: 'tabpanel',
    '[attr.hidden]': 'hidden() ? "" : null',
  },
})
export class KjTabPanelDirective {
  private readonly ctx = inject(KJ_TABS);

  /** The tab value this panel belongs to. Must match a tab's `kjTabValue`. */
  kjPanelFor = input.required<string>();

  /** Whether this panel is hidden. */
  readonly hidden = computed(() => this.ctx.value() !== this.kjPanelFor());
}
```

- [ ] **Create barrel** — Create `packages/core/src/tabs/index.ts`:
```ts
export { KjTabsDirective, KjTabListDirective, KjTabDirective, KjTabPanelDirective } from './tabs.directive';
export { KJ_TABS, type KjTabsContext } from './tabs.context';
```

- [ ] **Run to confirm passes**

- [ ] **Commit:**
```bash
git add packages/core/src/tabs/
git commit -m "feat(core): add KjTabsDirective, KjTabListDirective, KjTabDirective, KjTabPanelDirective"
```

---

## Task 9: Accordion Directives (parallel)

**Files:**
- `packages/core/src/accordion/accordion.context.ts`
- `packages/core/src/accordion/accordion.directive.ts`
- `packages/core/src/accordion/accordion.directive.spec.ts`
- `packages/core/src/accordion/index.ts`

- [ ] **Write failing test** — Create `packages/core/src/accordion/accordion.directive.spec.ts`:

```ts
import { render, fireEvent } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { KjAccordionDirective, KjAccordionItemDirective, KjAccordionTriggerDirective, KjAccordionContentDirective } from './accordion.directive';

expect.extend(toHaveNoViolations);

const imports = [KjAccordionDirective, KjAccordionItemDirective, KjAccordionTriggerDirective, KjAccordionContentDirective];
const template = `
  <div kjAccordion>
    <div kjAccordionItem [kjItemValue]="'item-1'">
      <button kjAccordionTrigger>Section 1</button>
      <div kjAccordionContent>Content 1</div>
    </div>
  </div>`;

describe('KjAccordionDirective', () => {
  it('content is hidden by default', async () => {
    const { container } = await render(template, { imports });
    expect(container.querySelector('[kjAccordionContent]')).toHaveAttribute('hidden', '');
  });

  it('clicking trigger expands the item', async () => {
    const { container } = await render(template, { imports });
    fireEvent.click(container.querySelector('[kjAccordionTrigger]')!);
    expect(container.querySelector('[kjAccordionContent]')).not.toHaveAttribute('hidden');
  });

  it('trigger has aria-expanded=false when closed', async () => {
    const { container } = await render(template, { imports });
    expect(container.querySelector('[kjAccordionTrigger]')).toHaveAttribute('aria-expanded', 'false');
  });

  it('trigger has aria-expanded=true when open', async () => {
    const { container } = await render(template, { imports });
    fireEvent.click(container.querySelector('[kjAccordionTrigger]')!);
    expect(container.querySelector('[kjAccordionTrigger]')).toHaveAttribute('aria-expanded', 'true');
  });

  it('passes axe audit', async () => {
    const { container } = await render(template, { imports });
    expect(await axe(container)).toHaveNoViolations();
  });
});
```

- [ ] **Run to confirm fails**

- [ ] **Create context** — Create `packages/core/src/accordion/accordion.context.ts`:

```ts
import { InjectionToken, Signal } from '@angular/core';

/** Context for the accordion root. */
export interface KjAccordionContext {
  openItems: Signal<Set<string>>;
  toggle: (value: string) => void;
}
export const KJ_ACCORDION = new InjectionToken<KjAccordionContext>('KjAccordion');

/** Context for an individual accordion item. */
export interface KjAccordionItemContext {
  open: Signal<boolean>;
  itemValue: Signal<string>;
}
export const KJ_ACCORDION_ITEM = new InjectionToken<KjAccordionItemContext>('KjAccordionItem');
```

- [ ] **Implement** — Create `packages/core/src/accordion/accordion.directive.ts`:

```ts
import { Directive, InjectionToken, Signal, computed, inject, input, signal } from '@angular/core';
import { KJ_ACCORDION, KJ_ACCORDION_ITEM, KjAccordionContext, KjAccordionItemContext } from './accordion.context';

/**
 * Root container for accordion. Manages which items are expanded.
 * Supports single or multiple open items via `kjAccordionType`.
 *
 * @example
 * ```html
 * <div kjAccordion [kjAccordionType]="'single'">...</div>
 * ```
 */
@Directive({
  selector: '[kjAccordion]',
  standalone: true,
  providers: [{ provide: KJ_ACCORDION, useExisting: KjAccordionDirective }],
})
export class KjAccordionDirective implements KjAccordionContext {
  /** Whether multiple items can be open simultaneously. */
  kjAccordionType = input<'single' | 'multiple'>('single');

  private readonly _openItems = signal<Set<string>>(new Set());
  readonly openItems = this._openItems.asReadonly();

  toggle(value: string): void {
    this._openItems.update((items) => {
      const next = new Set(items);
      if (next.has(value)) {
        next.delete(value);
      } else {
        if (this.kjAccordionType() === 'single') next.clear();
        next.add(value);
      }
      return next;
    });
  }
}

/**
 * Individual accordion item. Tracks its open state via the root context.
 *
 * @example
 * ```html
 * <div kjAccordionItem [kjItemValue]="'faq-1'">...</div>
 * ```
 */
@Directive({
  selector: '[kjAccordionItem]',
  standalone: true,
  providers: [{ provide: KJ_ACCORDION_ITEM, useExisting: KjAccordionItemDirective }],
})
export class KjAccordionItemDirective implements KjAccordionItemContext {
  private readonly accordion = inject(KJ_ACCORDION);

  /** The unique value identifying this item. */
  kjItemValue = input.required<string>();
  readonly itemValue = this.kjItemValue.asReadonly();

  /** Whether this item is currently open. */
  readonly open = computed(() => this.accordion.openItems().has(this.kjItemValue()));
}

/**
 * Trigger button for an accordion item. Controls expand/collapse.
 *
 * @example
 * ```html
 * <button kjAccordionTrigger>Section title</button>
 * ```
 */
@Directive({
  selector: '[kjAccordionTrigger]',
  standalone: true,
  host: {
    '[attr.aria-expanded]': 'item.open().toString()',
    '[attr.data-open]': 'item.open() ? "" : null',
    '(click)': 'toggle()',
  },
})
export class KjAccordionTriggerDirective {
  readonly item = inject(KJ_ACCORDION_ITEM);
  private readonly accordion = inject(KJ_ACCORDION);

  /** @internal */
  toggle(): void {
    this.accordion.toggle(this.item.itemValue());
  }
}

/**
 * Content panel of an accordion item. Hidden when the item is collapsed.
 *
 * @example
 * ```html
 * <div kjAccordionContent>Panel content</div>
 * ```
 */
@Directive({
  selector: '[kjAccordionContent]',
  standalone: true,
  host: {
    '[attr.hidden]': '!item.open() ? "" : null',
    '[attr.data-open]': 'item.open() ? "" : null',
  },
})
export class KjAccordionContentDirective {
  readonly item = inject(KJ_ACCORDION_ITEM);
}
```

- [ ] **Create barrel** — Create `packages/core/src/accordion/index.ts`:
```ts
export {
  KjAccordionDirective,
  KjAccordionItemDirective,
  KjAccordionTriggerDirective,
  KjAccordionContentDirective,
} from './accordion.directive';
export { KJ_ACCORDION, KJ_ACCORDION_ITEM } from './accordion.context';
```

- [ ] **Run to confirm passes**

- [ ] **Commit:**
```bash
git add packages/core/src/accordion/
git commit -m "feat(core): add KjAccordionDirective"
```

---

## Task 10: Dialog Directives (parallel)

**Files:**
- `packages/core/src/dialog/dialog.context.ts`
- `packages/core/src/dialog/dialog.directive.ts`
- `packages/core/src/dialog/dialog.directive.spec.ts`
- `packages/core/src/dialog/index.ts`

- [ ] **Write failing test** — Create `packages/core/src/dialog/dialog.directive.spec.ts`:

```ts
import { render, fireEvent } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { KjDialogDirective, KjDialogTriggerDirective, KjDialogContentDirective } from './dialog.directive';

expect.extend(toHaveNoViolations);

const imports = [KjDialogDirective, KjDialogTriggerDirective, KjDialogContentDirective];
const template = `
  <div kjDialog>
    <button kjDialogTrigger>Open dialog</button>
    <div kjDialogContent role="dialog" aria-label="Test dialog" aria-modal="true">
      <button>Close</button>
    </div>
  </div>`;

describe('KjDialogDirective', () => {
  it('content is hidden by default', async () => {
    const { container } = await render(template, { imports });
    expect(container.querySelector('[kjDialogContent]')).toHaveAttribute('hidden', '');
  });

  it('trigger opens the dialog', async () => {
    const { container } = await render(template, { imports });
    fireEvent.click(container.querySelector('[kjDialogTrigger]')!);
    expect(container.querySelector('[kjDialogContent]')).not.toHaveAttribute('hidden');
  });

  it('Escape closes the dialog', async () => {
    const { container } = await render(template, { imports });
    fireEvent.click(container.querySelector('[kjDialogTrigger]')!);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(container.querySelector('[kjDialogContent]')).toHaveAttribute('hidden', '');
  });

  it('trigger has aria-expanded', async () => {
    const { container } = await render(template, { imports });
    expect(container.querySelector('[kjDialogTrigger]')).toHaveAttribute('aria-expanded', 'false');
  });

  it('passes axe audit when closed', async () => {
    const { container } = await render(template, { imports });
    expect(await axe(container)).toHaveNoViolations();
  });
});
```

- [ ] **Run to confirm fails**

- [ ] **Create context** — Create `packages/core/src/dialog/dialog.context.ts`:

```ts
import { InjectionToken, Signal } from '@angular/core';

/** Context shared between dialog directives. */
export interface KjDialogContext {
  open: Signal<boolean>;
  show: () => void;
  hide: () => void;
}

/** Injection token for dialog context. */
export const KJ_DIALOG = new InjectionToken<KjDialogContext>('KjDialog');
```

- [ ] **Implement** — Create `packages/core/src/dialog/dialog.directive.ts`:

```ts
import { Directive, DestroyRef, inject, signal } from '@angular/core';
import { afterNextRender } from '@angular/core';
import { KJ_DIALOG, KjDialogContext } from './dialog.context';

/**
 * Root container for a dialog. Manages open/close state and Escape key handling.
 *
 * @example
 * ```html
 * <div kjDialog>
 *   <button kjDialogTrigger>Open</button>
 *   <div kjDialogContent role="dialog" aria-label="My dialog" aria-modal="true">...</div>
 * </div>
 * ```
 */
@Directive({
  selector: '[kjDialog]',
  standalone: true,
  providers: [{ provide: KJ_DIALOG, useExisting: KjDialogDirective }],
})
export class KjDialogDirective implements KjDialogContext {
  private readonly destroyRef = inject(DestroyRef);
  private readonly _open = signal(false);
  readonly open = this._open.asReadonly();

  show(): void { this._open.set(true); }
  hide(): void { this._open.set(false); }

  constructor() {
    afterNextRender(() => {
      const onKeydown = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && this._open()) this.hide();
      };
      document.addEventListener('keydown', onKeydown);
      this.destroyRef.onDestroy(() => document.removeEventListener('keydown', onKeydown));
    });
  }
}

/**
 * Trigger that opens the dialog on click. Sets `aria-expanded`.
 *
 * @example
 * ```html
 * <button kjDialogTrigger>Open dialog</button>
 * ```
 */
@Directive({
  selector: '[kjDialogTrigger]',
  standalone: true,
  host: {
    '[attr.aria-expanded]': 'ctx.open().toString()',
    '[attr.data-open]': 'ctx.open() ? "" : null',
    '(click)': 'ctx.show()',
  },
})
export class KjDialogTriggerDirective {
  readonly ctx = inject(KJ_DIALOG);
}

/**
 * Dialog content panel. Hidden when the dialog is closed.
 * Add `role="dialog"`, `aria-label`, and `aria-modal="true"` to the host element.
 *
 * @example
 * ```html
 * <div kjDialogContent role="dialog" aria-label="Settings" aria-modal="true">...</div>
 * ```
 */
@Directive({
  selector: '[kjDialogContent]',
  standalone: true,
  host: {
    '[attr.hidden]': '!ctx.open() ? "" : null',
    '[attr.data-open]': 'ctx.open() ? "" : null',
  },
})
export class KjDialogContentDirective {
  readonly ctx = inject(KJ_DIALOG);
}
```

- [ ] **Create barrel** — Create `packages/core/src/dialog/index.ts`:
```ts
export { KjDialogDirective, KjDialogTriggerDirective, KjDialogContentDirective } from './dialog.directive';
export { KJ_DIALOG, type KjDialogContext } from './dialog.context';
```

- [ ] **Run to confirm passes**

- [ ] **Commit:**
```bash
git add packages/core/src/dialog/
git commit -m "feat(core): add KjDialogDirective with Escape key support"
```

---

## Task 11: Tooltip Directive (parallel)

**Files:**
- `packages/core/src/tooltip/tooltip.directive.ts`
- `packages/core/src/tooltip/tooltip.directive.spec.ts`
- `packages/core/src/tooltip/index.ts`

- [ ] **Write failing test** — Create `packages/core/src/tooltip/tooltip.directive.spec.ts`:

```ts
import { render, fireEvent } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { KjTooltipDirective, KjTooltipTriggerDirective } from './tooltip.directive';

expect.extend(toHaveNoViolations);

const imports = [KjTooltipDirective, KjTooltipTriggerDirective];

describe('KjTooltipDirective', () => {
  it('tooltip content is hidden by default', async () => {
    const { container } = await render(
      `<div kjTooltip>
        <button kjTooltipTrigger aria-describedby="tip">Hover me</button>
        <span role="tooltip" id="tip" kjTooltipContent>Tooltip text</span>
      </div>`,
      { imports },
    );
    expect(container.querySelector('[kjTooltipContent]')).toHaveAttribute('hidden', '');
  });

  it('tooltip shows on mouseenter', async () => {
    const { container } = await render(
      `<div kjTooltip>
        <button kjTooltipTrigger>Hover me</button>
        <span role="tooltip" kjTooltipContent>Tooltip text</span>
      </div>`,
      { imports },
    );
    fireEvent.mouseEnter(container.querySelector('[kjTooltipTrigger]')!);
    expect(container.querySelector('[kjTooltipContent]')).not.toHaveAttribute('hidden');
  });

  it('tooltip hides on mouseleave', async () => {
    const { container } = await render(
      `<div kjTooltip>
        <button kjTooltipTrigger>Hover me</button>
        <span role="tooltip" kjTooltipContent>Tooltip text</span>
      </div>`,
      { imports },
    );
    fireEvent.mouseEnter(container.querySelector('[kjTooltipTrigger]')!);
    fireEvent.mouseLeave(container.querySelector('[kjTooltipTrigger]')!);
    expect(container.querySelector('[kjTooltipContent]')).toHaveAttribute('hidden', '');
  });

  it('passes axe audit when shown', async () => {
    const { container } = await render(
      `<div kjTooltip>
        <button kjTooltipTrigger aria-describedby="t1">Info</button>
        <span role="tooltip" id="t1" kjTooltipContent>More information</span>
      </div>`,
      { imports },
    );
    fireEvent.mouseEnter(container.querySelector('[kjTooltipTrigger]')!);
    expect(await axe(container)).toHaveNoViolations();
  });
});
```

- [ ] **Run to confirm fails**

- [ ] **Implement** — Create `packages/core/src/tooltip/tooltip.directive.ts`:

```ts
import { Directive, InjectionToken, inject, signal } from '@angular/core';

/** Context for tooltip state. */
export interface KjTooltipContext {
  visible: ReturnType<typeof signal<boolean>>;
}

/** Injection token for tooltip context. */
export const KJ_TOOLTIP = new InjectionToken<KjTooltipContext>('KjTooltip');

/**
 * Root tooltip container. Manages visibility state shared between trigger and content.
 *
 * @example
 * ```html
 * <div kjTooltip>
 *   <button kjTooltipTrigger aria-describedby="tip-id">Info</button>
 *   <span role="tooltip" id="tip-id" kjTooltipContent>Helpful text</span>
 * </div>
 * ```
 */
@Directive({
  selector: '[kjTooltip]',
  standalone: true,
  providers: [{ provide: KJ_TOOLTIP, useExisting: KjTooltipDirective }],
})
export class KjTooltipDirective implements KjTooltipContext {
  readonly visible = signal(false);
}

/**
 * Trigger element that shows/hides the tooltip on hover and focus.
 */
@Directive({
  selector: '[kjTooltipTrigger]',
  standalone: true,
  host: {
    '(mouseenter)': 'ctx.visible.set(true)',
    '(mouseleave)': 'ctx.visible.set(false)',
    '(focus)': 'ctx.visible.set(true)',
    '(blur)': 'ctx.visible.set(false)',
  },
})
export class KjTooltipTriggerDirective {
  readonly ctx = inject(KJ_TOOLTIP);
}

/**
 * Tooltip content. Hidden unless the trigger is hovered or focused.
 * Add `role="tooltip"` and a matching `id` to the host element.
 */
@Directive({
  selector: '[kjTooltipContent]',
  standalone: true,
  host: {
    '[attr.hidden]': '!ctx.visible() ? "" : null',
  },
})
export class KjTooltipContentDirective {
  readonly ctx = inject(KJ_TOOLTIP);
}
```

- [ ] **Create barrel** — Create `packages/core/src/tooltip/index.ts`:
```ts
export { KjTooltipDirective, KjTooltipTriggerDirective, KjTooltipContentDirective, KJ_TOOLTIP } from './tooltip.directive';
```

- [ ] **Run to confirm passes**

- [ ] **Commit:**
```bash
git add packages/core/src/tooltip/
git commit -m "feat(core): add KjTooltipDirective"
```

---

## Task 12: Popover Directives (parallel)

**Files:**
- `packages/core/src/popover/popover.directive.ts`
- `packages/core/src/popover/popover.directive.spec.ts`
- `packages/core/src/popover/index.ts`

- [ ] **Write failing test** — Create `packages/core/src/popover/popover.directive.spec.ts`:

```ts
import { render, fireEvent } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { KjPopoverDirective, KjPopoverTriggerDirective, KjPopoverContentDirective } from './popover.directive';

expect.extend(toHaveNoViolations);

const imports = [KjPopoverDirective, KjPopoverTriggerDirective, KjPopoverContentDirective];
const template = `
  <div kjPopover>
    <button kjPopoverTrigger>Open popover</button>
    <div kjPopoverContent>Popover content</div>
  </div>`;

describe('KjPopoverDirective', () => {
  it('content is hidden by default', async () => {
    const { container } = await render(template, { imports });
    expect(container.querySelector('[kjPopoverContent]')).toHaveAttribute('hidden', '');
  });

  it('trigger toggles content', async () => {
    const { container } = await render(template, { imports });
    fireEvent.click(container.querySelector('[kjPopoverTrigger]')!);
    expect(container.querySelector('[kjPopoverContent]')).not.toHaveAttribute('hidden');
  });

  it('trigger sets aria-expanded', async () => {
    const { container } = await render(template, { imports });
    const trigger = container.querySelector('[kjPopoverTrigger]')!;
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });

  it('Escape closes the popover', async () => {
    const { container } = await render(template, { imports });
    fireEvent.click(container.querySelector('[kjPopoverTrigger]')!);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(container.querySelector('[kjPopoverContent]')).toHaveAttribute('hidden', '');
  });

  it('passes axe audit', async () => {
    const { container } = await render(template, { imports });
    expect(await axe(container)).toHaveNoViolations();
  });
});
```

- [ ] **Run to confirm fails**

- [ ] **Implement** — Create `packages/core/src/popover/popover.directive.ts`:

```ts
import { Directive, DestroyRef, InjectionToken, inject, signal } from '@angular/core';
import { afterNextRender } from '@angular/core';

/** Context for popover state. */
export const KJ_POPOVER = new InjectionToken<{ open: ReturnType<typeof signal<boolean>>; hide: () => void }>('KjPopover');

/**
 * Root container for a popover. Manages open state and Escape key handling.
 *
 * @example
 * ```html
 * <div kjPopover>
 *   <button kjPopoverTrigger>Options</button>
 *   <div kjPopoverContent>Popover body</div>
 * </div>
 * ```
 */
@Directive({
  selector: '[kjPopover]',
  standalone: true,
  providers: [{ provide: KJ_POPOVER, useExisting: KjPopoverDirective }],
})
export class KjPopoverDirective {
  private readonly destroyRef = inject(DestroyRef);
  readonly open = signal(false);
  hide(): void { this.open.set(false); }
  toggle(): void { this.open.update(v => !v); }

  constructor() {
    afterNextRender(() => {
      const handler = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && this.open()) this.hide();
      };
      document.addEventListener('keydown', handler);
      this.destroyRef.onDestroy(() => document.removeEventListener('keydown', handler));
    });
  }
}

/**
 * Trigger button for the popover. Toggles the popover on click and sets `aria-expanded`.
 */
@Directive({
  selector: '[kjPopoverTrigger]',
  standalone: true,
  host: {
    '[attr.aria-expanded]': 'ctx.open().toString()',
    '(click)': 'ctx.toggle()',
  },
})
export class KjPopoverTriggerDirective {
  readonly ctx = inject(KjPopoverDirective);
}

/**
 * Popover content panel. Hidden when closed.
 */
@Directive({
  selector: '[kjPopoverContent]',
  standalone: true,
  host: {
    '[attr.hidden]': '!ctx.open() ? "" : null',
    '[attr.data-open]': 'ctx.open() ? "" : null',
  },
})
export class KjPopoverContentDirective {
  readonly ctx = inject(KjPopoverDirective);
}
```

- [ ] **Create barrel** — Create `packages/core/src/popover/index.ts`:
```ts
export { KjPopoverDirective, KjPopoverTriggerDirective, KjPopoverContentDirective, KJ_POPOVER } from './popover.directive';
```

- [ ] **Run to confirm passes**

- [ ] **Commit:**
```bash
git add packages/core/src/popover/
git commit -m "feat(core): add KjPopoverDirective"
```

---

## Task 13: Menu Directives (parallel)

**Files:**
- `packages/core/src/menu/menu.context.ts`
- `packages/core/src/menu/menu.directive.ts`
- `packages/core/src/menu/menu.directive.spec.ts`
- `packages/core/src/menu/index.ts`

- [ ] **Write failing test** — Create `packages/core/src/menu/menu.directive.spec.ts`:

```ts
import { render, fireEvent } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { KjMenuDirective, KjMenuTriggerDirective, KjMenuItemDirective } from './menu.directive';

expect.extend(toHaveNoViolations);

const imports = [KjMenuDirective, KjMenuTriggerDirective, KjMenuItemDirective];
const template = `
  <div kjMenu>
    <button kjMenuTrigger>Actions</button>
    <div role="menu" kjMenuContent>
      <button kjMenuItem role="menuitem">Edit</button>
      <button kjMenuItem role="menuitem">Delete</button>
    </div>
  </div>`;

describe('KjMenuDirective', () => {
  it('menu content is hidden by default', async () => {
    const { container } = await render(template, { imports });
    expect(container.querySelector('[kjMenuContent]')).toHaveAttribute('hidden', '');
  });

  it('trigger opens menu', async () => {
    const { container } = await render(template, { imports });
    fireEvent.click(container.querySelector('[kjMenuTrigger]')!);
    expect(container.querySelector('[kjMenuContent]')).not.toHaveAttribute('hidden');
  });

  it('Escape closes menu', async () => {
    const { container } = await render(template, { imports });
    fireEvent.click(container.querySelector('[kjMenuTrigger]')!);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(container.querySelector('[kjMenuContent]')).toHaveAttribute('hidden', '');
  });

  it('menu items have data-menu-item attribute', async () => {
    const { container } = await render(template, { imports });
    const items = container.querySelectorAll('[kjMenuItem]');
    expect(items.length).toBe(2);
  });

  it('passes axe audit when open', async () => {
    const { container } = await render(template, { imports });
    fireEvent.click(container.querySelector('[kjMenuTrigger]')!);
    expect(await axe(container)).toHaveNoViolations();
  });
});
```

- [ ] **Run to confirm fails**

- [ ] **Implement** — Create `packages/core/src/menu/menu.directive.ts`:

```ts
import { Directive, DestroyRef, InjectionToken, inject, signal } from '@angular/core';
import { afterNextRender } from '@angular/core';

/** Context for menu state. */
export const KJ_MENU = new InjectionToken<KjMenuDirective>('KjMenu');

/**
 * Root container for a dropdown menu. Manages open state and Escape key handling.
 *
 * @example
 * ```html
 * <div kjMenu>
 *   <button kjMenuTrigger>Options</button>
 *   <div role="menu" kjMenuContent>
 *     <button kjMenuItem role="menuitem">Edit</button>
 *   </div>
 * </div>
 * ```
 */
@Directive({
  selector: '[kjMenu]',
  standalone: true,
  providers: [{ provide: KJ_MENU, useExisting: KjMenuDirective }],
})
export class KjMenuDirective {
  private readonly destroyRef = inject(DestroyRef);
  readonly open = signal(false);
  show(): void { this.open.set(true); }
  hide(): void { this.open.set(false); }
  toggle(): void { this.open.update(v => !v); }

  constructor() {
    afterNextRender(() => {
      const handler = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && this.open()) this.hide();
      };
      document.addEventListener('keydown', handler);
      this.destroyRef.onDestroy(() => document.removeEventListener('keydown', handler));
    });
  }
}

/**
 * Trigger button for the menu. Toggles the menu and sets `aria-expanded` and `aria-haspopup`.
 */
@Directive({
  selector: '[kjMenuTrigger]',
  standalone: true,
  host: {
    'aria-haspopup': 'menu',
    '[attr.aria-expanded]': 'ctx.open().toString()',
    '(click)': 'ctx.toggle()',
  },
})
export class KjMenuTriggerDirective {
  readonly ctx = inject(KJ_MENU);
}

/**
 * Menu content panel. Hidden when the menu is closed.
 * Add `role="menu"` to the host element.
 */
@Directive({
  selector: '[kjMenuContent]',
  standalone: true,
  host: {
    '[attr.hidden]': '!ctx.open() ? "" : null',
  },
})
export class KjMenuContentDirective {
  readonly ctx = inject(KJ_MENU);
}

/**
 * Individual menu item. Closes the menu when activated.
 * Add `role="menuitem"` to the host element.
 *
 * @example
 * ```html
 * <button kjMenuItem role="menuitem">Delete</button>
 * ```
 */
@Directive({
  selector: '[kjMenuItem]',
  standalone: true,
  host: {
    '[attr.data-menu-item]': '""',
    '(click)': 'ctx.hide()',
  },
})
export class KjMenuItemDirective {
  readonly ctx = inject(KJ_MENU);
}
```

- [ ] **Create barrel** — Create `packages/core/src/menu/index.ts`:
```ts
export { KjMenuDirective, KjMenuTriggerDirective, KjMenuContentDirective, KjMenuItemDirective, KJ_MENU } from './menu.directive';
```

- [ ] **Run to confirm passes**

- [ ] **Commit:**
```bash
git add packages/core/src/menu/
git commit -m "feat(core): add KjMenuDirective"
```

---

## Task 14: Toast Directive (parallel)

**Files:**
- `packages/core/src/toast/toast.directive.ts`
- `packages/core/src/toast/toast.directive.spec.ts`
- `packages/core/src/toast/index.ts`

- [ ] **Write failing test** — Create `packages/core/src/toast/toast.directive.spec.ts`:

```ts
import { render } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { KjToastDirective } from './toast.directive';

expect.extend(toHaveNoViolations);

describe('KjToastDirective', () => {
  it('renders with role=status by default', async () => {
    const { container } = await render(
      `<div kjToast>Toast message</div>`,
      { imports: [KjToastDirective] },
    );
    expect(container.querySelector('[kjToast]')).toHaveAttribute('role', 'status');
  });

  it('renders with role=alert for destructive variant', async () => {
    const { container } = await render(
      `<div kjToast [kjToastVariant]="'destructive'">Error!</div>`,
      { imports: [KjToastDirective] },
    );
    expect(container.querySelector('[kjToast]')).toHaveAttribute('role', 'alert');
  });

  it('sets aria-live=polite by default', async () => {
    const { container } = await render(
      `<div kjToast>Message</div>`,
      { imports: [KjToastDirective] },
    );
    expect(container.querySelector('[kjToast]')).toHaveAttribute('aria-live', 'polite');
  });

  it('passes axe audit', async () => {
    const { container } = await render(
      `<div kjToast>Saved successfully</div>`,
      { imports: [KjToastDirective] },
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
```

- [ ] **Run to confirm fails**

- [ ] **Implement** — Create `packages/core/src/toast/toast.directive.ts`:

```ts
import { Directive, computed, input } from '@angular/core';

/** Visual variants for the toast. */
export type KjToastVariant = 'default' | 'destructive' | 'success' | 'warning';

/**
 * Marks an element as a toast notification. Sets the appropriate ARIA live region
 * attributes based on the variant's severity.
 *
 * @example
 * ```html
 * <div kjToast [kjToastVariant]="'destructive'">Failed to save changes.</div>
 * ```
 */
@Directive({
  selector: '[kjToast]',
  standalone: true,
  host: {
    '[attr.role]': 'role()',
    '[attr.aria-live]': 'ariaLive()',
    '[attr.aria-atomic]': '"true"',
    '[attr.data-variant]': 'kjToastVariant()',
  },
})
export class KjToastDirective {
  /** The visual and semantic variant of the toast. Defaults to `'default'`. */
  kjToastVariant = input<KjToastVariant>('default');

  /** @internal */
  readonly role = computed(() =>
    this.kjToastVariant() === 'destructive' ? 'alert' : 'status',
  );

  /** @internal */
  readonly ariaLive = computed(() =>
    this.kjToastVariant() === 'destructive' ? 'assertive' : 'polite',
  );
}
```

- [ ] **Create barrel** — Create `packages/core/src/toast/index.ts`:
```ts
export { KjToastDirective, type KjToastVariant } from './toast.directive';
```

- [ ] **Run to confirm passes**

- [ ] **Commit:**
```bash
git add packages/core/src/toast/
git commit -m "feat(core): add KjToastDirective"
```

---

## Task 15: Select Directives (parallel)

**Files:**
- `packages/core/src/select/select.context.ts`
- `packages/core/src/select/select.directive.ts`
- `packages/core/src/select/select.directive.spec.ts`
- `packages/core/src/select/index.ts`

- [ ] **Write failing test** — Create `packages/core/src/select/select.directive.spec.ts`:

```ts
import { render, fireEvent } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { KjSelectDirective, KjSelectTriggerDirective, KjSelectContentDirective, KjOptionDirective } from './select.directive';

expect.extend(toHaveNoViolations);

const imports = [KjSelectDirective, KjSelectTriggerDirective, KjSelectContentDirective, KjOptionDirective];
const template = `
  <div kjSelect [(kjSelectValue)]="val">
    <button kjSelectTrigger aria-haspopup="listbox">Select fruit</button>
    <div kjSelectContent role="listbox">
      <div kjOption [kjOptionValue]="'apple'" role="option">Apple</div>
      <div kjOption [kjOptionValue]="'banana'" role="option">Banana</div>
    </div>
  </div>`;

describe('KjSelectDirective', () => {
  it('listbox is hidden by default', async () => {
    const { container } = await render(template, { imports, componentProperties: { val: '' } });
    expect(container.querySelector('[kjSelectContent]')).toHaveAttribute('hidden', '');
  });

  it('trigger opens the listbox', async () => {
    const { container } = await render(template, { imports, componentProperties: { val: '' } });
    fireEvent.click(container.querySelector('[kjSelectTrigger]')!);
    expect(container.querySelector('[kjSelectContent]')).not.toHaveAttribute('hidden');
  });

  it('clicking an option selects it', async () => {
    const { container } = await render(template, { imports, componentProperties: { val: '' } });
    fireEvent.click(container.querySelector('[kjSelectTrigger]')!);
    fireEvent.click(container.querySelector('[kjOption]')!);
    const option = container.querySelector('[kjOption]')!;
    expect(option).toHaveAttribute('aria-selected', 'true');
  });

  it('passes axe audit', async () => {
    const { container } = await render(template, { imports, componentProperties: { val: '' } });
    expect(await axe(container)).toHaveNoViolations();
  });
});
```

- [ ] **Run to confirm fails**

- [ ] **Create context** — Create `packages/core/src/select/select.context.ts`:

```ts
import { InjectionToken, Signal } from '@angular/core';

/** Context shared between select directives. */
export interface KjSelectContext {
  value: Signal<unknown>;
  open: Signal<boolean>;
  select: (value: unknown) => void;
  toggle: () => void;
  hide: () => void;
}

/** Injection token for select context. */
export const KJ_SELECT = new InjectionToken<KjSelectContext>('KjSelect');
```

- [ ] **Implement** — Create `packages/core/src/select/select.directive.ts`:

```ts
import { Directive, computed, inject, input, model, signal } from '@angular/core';
import { KJ_SELECT, KjSelectContext } from './select.context';

/**
 * Root container for a select/combobox. Manages selected value and open state.
 *
 * @example
 * ```html
 * <div kjSelect [(kjSelectValue)]="selectedFruit">
 *   <button kjSelectTrigger aria-haspopup="listbox">Choose fruit</button>
 *   <div kjSelectContent role="listbox">
 *     <div kjOption [kjOptionValue]="'apple'" role="option">Apple</div>
 *   </div>
 * </div>
 * ```
 */
@Directive({
  selector: '[kjSelect]',
  standalone: true,
  providers: [{ provide: KJ_SELECT, useExisting: KjSelectDirective }],
})
export class KjSelectDirective implements KjSelectContext {
  /** The currently selected value. Supports two-way binding. */
  kjSelectValue = model<unknown>(undefined);

  readonly value = this.kjSelectValue.asReadonly();
  private readonly _open = signal(false);
  readonly open = this._open.asReadonly();

  select(val: unknown): void {
    this.kjSelectValue.set(val);
    this._open.set(false);
  }

  toggle(): void { this._open.update(v => !v); }
  hide(): void { this._open.set(false); }
}

/**
 * Trigger button that opens/closes the select listbox.
 */
@Directive({
  selector: '[kjSelectTrigger]',
  standalone: true,
  host: {
    '[attr.aria-expanded]': 'ctx.open().toString()',
    '(click)': 'ctx.toggle()',
  },
})
export class KjSelectTriggerDirective {
  readonly ctx = inject(KJ_SELECT);
}

/**
 * Listbox container for options. Hidden when the select is closed.
 */
@Directive({
  selector: '[kjSelectContent]',
  standalone: true,
  host: {
    '[attr.hidden]': '!ctx.open() ? "" : null',
  },
})
export class KjSelectContentDirective {
  readonly ctx = inject(KJ_SELECT);
}

/**
 * Individual option within a select. Sets `aria-selected` based on the current value.
 *
 * @example
 * ```html
 * <div kjOption [kjOptionValue]="'apple'" role="option">Apple</div>
 * ```
 */
@Directive({
  selector: '[kjOption]',
  standalone: true,
  host: {
    '[attr.aria-selected]': 'selected().toString()',
    '[attr.data-selected]': 'selected() ? "" : null',
    '(click)': 'select()',
  },
})
export class KjOptionDirective {
  private readonly ctx = inject(KJ_SELECT);

  /** The value this option represents. */
  kjOptionValue = input.required<unknown>();

  /** Whether this option is currently selected. */
  readonly selected = computed(() => this.ctx.value() === this.kjOptionValue());

  /** @internal */
  select(): void { this.ctx.select(this.kjOptionValue()); }
}
```

- [ ] **Create barrel** — Create `packages/core/src/select/index.ts`:
```ts
export {
  KjSelectDirective,
  KjSelectTriggerDirective,
  KjSelectContentDirective,
  KjOptionDirective,
} from './select.directive';
export { KJ_SELECT, type KjSelectContext } from './select.context';
```

- [ ] **Run to confirm passes**

- [ ] **Commit:**
```bash
git add packages/core/src/select/
git commit -m "feat(core): add KjSelectDirective with listbox pattern"
```

---

## Task 16: Form Directives (parallel)

**Files:**
- `packages/core/src/form/form.context.ts`
- `packages/core/src/form/form.directive.ts`
- `packages/core/src/form/form.directive.spec.ts`
- `packages/core/src/form/index.ts`

- [ ] **Write failing test** — Create `packages/core/src/form/form.directive.spec.ts`:

```ts
import { render } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { KjFormFieldDirective, KjFormErrorDirective, KjFormLabelDirective } from './form.directive';

expect.extend(toHaveNoViolations);

const imports = [KjFormFieldDirective, KjFormErrorDirective, KjFormLabelDirective];

describe('KjFormFieldDirective', () => {
  it('sets data-invalid when field is invalid', async () => {
    const { container } = await render(
      `<div kjFormField [kjFieldInvalid]="true">
        <label kjFormLabel for="f">Name</label>
        <input id="f" type="text" />
        <span kjFormError>Required</span>
      </div>`,
      { imports },
    );
    expect(container.querySelector('[kjFormField]')).toHaveAttribute('data-invalid', '');
  });

  it('error message visible when invalid', async () => {
    const { getByText } = await render(
      `<div kjFormField [kjFieldInvalid]="true">
        <label kjFormLabel for="f">Name</label>
        <input id="f" type="text" />
        <span kjFormError>Required field</span>
      </div>`,
      { imports },
    );
    expect(getByText('Required field')).not.toHaveAttribute('hidden');
  });

  it('error message hidden when valid', async () => {
    const { getByText } = await render(
      `<div kjFormField [kjFieldInvalid]="false">
        <label kjFormLabel for="f">Name</label>
        <input id="f" type="text" />
        <span kjFormError>Required field</span>
      </div>`,
      { imports },
    );
    expect(getByText('Required field').closest('[kjFormError]')).toHaveAttribute('hidden', '');
  });

  it('passes axe audit', async () => {
    const { container } = await render(
      `<div kjFormField [kjFieldInvalid]="false">
        <label kjFormLabel for="email">Email</label>
        <input id="email" type="email" />
      </div>`,
      { imports },
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
```

- [ ] **Run to confirm fails**

- [ ] **Create context** — Create `packages/core/src/form/form.context.ts`:

```ts
import { InjectionToken, Signal } from '@angular/core';

/** Context shared between form field directives. */
export interface KjFormFieldContext {
  invalid: Signal<boolean>;
}

/** Injection token for form field context. */
export const KJ_FORM_FIELD = new InjectionToken<KjFormFieldContext>('KjFormField');
```

- [ ] **Implement** — Create `packages/core/src/form/form.directive.ts`:

```ts
import { Directive, inject, input } from '@angular/core';
import { KJ_FORM_FIELD, KjFormFieldContext } from './form.context';

/**
 * Container for a form field. Groups label, input, and error message.
 * Manages invalid state shared between child directives.
 *
 * @example
 * ```html
 * <div kjFormField [kjFieldInvalid]="nameControl.invalid && nameControl.touched">
 *   <label kjFormLabel for="name">Name</label>
 *   <input id="name" kjInput type="text" />
 *   <span kjFormError>Name is required</span>
 * </div>
 * ```
 */
@Directive({
  selector: '[kjFormField]',
  standalone: true,
  providers: [{ provide: KJ_FORM_FIELD, useExisting: KjFormFieldDirective }],
  host: {
    '[attr.data-invalid]': 'kjFieldInvalid() ? "" : null',
  },
})
export class KjFormFieldDirective implements KjFormFieldContext {
  /** Whether the field is in an invalid state. */
  kjFieldInvalid = input<boolean>(false);
  readonly invalid = this.kjFieldInvalid.asReadonly();
}

/**
 * Label element within a form field. Styled contextually via `data-invalid`.
 */
@Directive({
  selector: '[kjFormLabel]',
  standalone: true,
  host: {
    '[attr.data-invalid]': 'ctx.invalid() ? "" : null',
  },
})
export class KjFormLabelDirective {
  readonly ctx = inject(KJ_FORM_FIELD);
}

/**
 * Error message element within a form field. Visible only when the field is invalid.
 * Announces errors to screen readers via `role="alert"`.
 *
 * @example
 * ```html
 * <span kjFormError>Email is invalid</span>
 * ```
 */
@Directive({
  selector: '[kjFormError]',
  standalone: true,
  host: {
    role: 'alert',
    'aria-live': 'polite',
    '[attr.hidden]': '!ctx.invalid() ? "" : null',
  },
})
export class KjFormErrorDirective {
  readonly ctx = inject(KJ_FORM_FIELD);
}
```

- [ ] **Create barrel** — Create `packages/core/src/form/index.ts`:
```ts
export { KjFormFieldDirective, KjFormLabelDirective, KjFormErrorDirective } from './form.directive';
export { KJ_FORM_FIELD, type KjFormFieldContext } from './form.context';
```

- [ ] **Run to confirm passes**

- [ ] **Commit:**
```bash
git add packages/core/src/form/
git commit -m "feat(core): add KjFormFieldDirective, KjFormLabelDirective, KjFormErrorDirective"
```

---

## Task 17: Table Directive (parallel)

**Files:**
- `packages/core/src/table/table.directive.ts`
- `packages/core/src/table/table.directive.spec.ts`
- `packages/core/src/table/index.ts`

- [ ] **Write failing test** — Create `packages/core/src/table/table.directive.spec.ts`:

```ts
import { render } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { KjTableDirective, KjTableHeaderDirective, KjTableRowDirective, KjTableCellDirective } from './table.directive';

expect.extend(toHaveNoViolations);

const imports = [KjTableDirective, KjTableHeaderDirective, KjTableRowDirective, KjTableCellDirective];

describe('KjTableDirective', () => {
  it('renders a table', async () => {
    const { getByRole } = await render(
      `<table kjTable>
        <thead>
          <tr><th kjTableHeader scope="col">Name</th></tr>
        </thead>
        <tbody>
          <tr kjTableRow>
            <td kjTableCell>Alice</td>
          </tr>
        </tbody>
      </table>`,
      { imports },
    );
    expect(getByRole('table')).toBeInTheDocument();
  });

  it('header sets aria-sort when sorted', async () => {
    const { container } = await render(
      `<table kjTable>
        <thead><tr>
          <th kjTableHeader scope="col" [kjSortDirection]="'asc'">Name</th>
        </tr></thead>
        <tbody><tr kjTableRow><td kjTableCell>Alice</td></tr></tbody>
      </table>`,
      { imports },
    );
    expect(container.querySelector('[kjTableHeader]')).toHaveAttribute('aria-sort', 'ascending');
  });

  it('passes axe audit', async () => {
    const { container } = await render(
      `<table kjTable>
        <caption>User list</caption>
        <thead><tr><th kjTableHeader scope="col">Name</th></tr></thead>
        <tbody><tr kjTableRow><td kjTableCell>Alice</td></tr></tbody>
      </table>`,
      { imports },
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
```

- [ ] **Run to confirm fails**

- [ ] **Implement** — Create `packages/core/src/table/table.directive.ts`:

```ts
import { Directive, computed, input } from '@angular/core';

/** Sort direction for table columns. */
export type KjSortDirection = 'asc' | 'desc' | 'none';

/**
 * Marks a `<table>` element as a kouji-ui data table.
 *
 * @example
 * ```html
 * <table kjTable>...</table>
 * ```
 */
@Directive({ selector: '[kjTable]', standalone: true })
export class KjTableDirective {}

/**
 * Marks a `<th>` element as a sortable column header.
 * Sets `aria-sort` based on the current sort direction.
 *
 * @example
 * ```html
 * <th kjTableHeader scope="col" [kjSortDirection]="sortDir" (click)="sort()">Name</th>
 * ```
 */
@Directive({
  selector: '[kjTableHeader]',
  standalone: true,
  host: {
    '[attr.aria-sort]': 'ariaSort()',
    '[attr.data-sort]': 'kjSortDirection()',
  },
})
export class KjTableHeaderDirective {
  /** Current sort direction. Defaults to `'none'`. */
  kjSortDirection = input<KjSortDirection>('none');

  /** @internal */
  readonly ariaSort = computed(() => {
    const dir = this.kjSortDirection();
    if (dir === 'asc') return 'ascending';
    if (dir === 'desc') return 'descending';
    return null;
  });
}

/**
 * Marks a `<tr>` element as a data row.
 */
@Directive({
  selector: '[kjTableRow]',
  standalone: true,
  host: { '[attr.data-row]': '""' },
})
export class KjTableRowDirective {}

/**
 * Marks a `<td>` element as a data cell.
 */
@Directive({
  selector: '[kjTableCell]',
  standalone: true,
  host: { '[attr.data-cell]': '""' },
})
export class KjTableCellDirective {}
```

- [ ] **Create barrel** — Create `packages/core/src/table/index.ts`:
```ts
export {
  KjTableDirective,
  KjTableHeaderDirective,
  KjTableRowDirective,
  KjTableCellDirective,
  type KjSortDirection,
} from './table.directive';
```

- [ ] **Run to confirm passes**

- [ ] **Commit:**
```bash
git add packages/core/src/table/
git commit -m "feat(core): add KjTableDirective with sortable header support"
```

---

## Task 18: Chart Directive (parallel)

**Files:**
- `packages/core/src/chart/chart.directive.ts`
- `packages/core/src/chart/chart.directive.spec.ts`
- `packages/core/src/chart/index.ts`

- [ ] **Write failing test** — Create `packages/core/src/chart/chart.directive.spec.ts`:

```ts
import { render } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { KjChartDirective } from './chart.directive';

expect.extend(toHaveNoViolations);

describe('KjChartDirective', () => {
  it('renders the host element', async () => {
    const { container } = await render(
      `<div kjChart [kjChartOption]="{}"></div>`,
      { imports: [KjChartDirective] },
    );
    expect(container.querySelector('[kjChart]')).toBeInTheDocument();
  });

  it('sets role=img and aria-label', async () => {
    const { container } = await render(
      `<div kjChart [kjChartOption]="option" kjChartLabel="Sales chart"></div>`,
      { imports: [KjChartDirective] },
    );
    const el = container.querySelector('[kjChart]')!;
    expect(el).toHaveAttribute('role', 'img');
    expect(el).toHaveAttribute('aria-label', 'Sales chart');
  });

  it('passes axe audit', async () => {
    const { container } = await render(
      `<div kjChart [kjChartOption]="{}" kjChartLabel="Revenue chart"></div>`,
      { imports: [KjChartDirective] },
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
```

- [ ] **Run to confirm fails**

- [ ] **Implement** — Create `packages/core/src/chart/chart.directive.ts`:

```ts
import { Directive, DestroyRef, ElementRef, inject, input, afterNextRender, afterRender } from '@angular/core';
import type { EChartsOption } from 'echarts';

/**
 * Wraps Apache ECharts in a headless Angular directive.
 * Initializes the chart after the first render and updates options reactively.
 * Disposes the chart instance on destroy.
 *
 * Always provide a descriptive `kjChartLabel` for accessibility.
 *
 * @example
 * ```html
 * <div
 *   kjChart
 *   [kjChartOption]="chartOption()"
 *   kjChartLabel="Monthly revenue"
 *   style="height:300px"
 * ></div>
 * ```
 */
@Directive({
  selector: '[kjChart]',
  standalone: true,
  host: {
    role: 'img',
    '[attr.aria-label]': 'kjChartLabel() || null',
  },
})
export class KjChartDirective {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  /** ECharts option object defining the chart. */
  kjChartOption = input.required<EChartsOption>();

  /** Accessible label for the chart. Required for WCAG compliance. */
  kjChartLabel = input<string>('');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private chart: any;

  constructor() {
    afterNextRender(async () => {
      const echarts = await import('echarts');
      this.chart = echarts.init(this.el.nativeElement);
      this.chart.setOption(this.kjChartOption());
      this.destroyRef.onDestroy(() => this.chart?.dispose());
    });

    afterRender(() => {
      if (this.chart) {
        this.chart.setOption(this.kjChartOption());
      }
    });
  }
}
```

- [ ] **Create barrel** — Create `packages/core/src/chart/index.ts`:
```ts
export { KjChartDirective } from './chart.directive';
```

- [ ] **Run to confirm passes**

- [ ] **Commit:**
```bash
git add packages/core/src/chart/
git commit -m "feat(core): add KjChartDirective wrapping ECharts"
```

---

## Task 19: Wire All Exports into public-api.ts (consecutive — after all above complete)

- [ ] **Update public-api.ts** — Replace `packages/core/src/public-api.ts` with:

```ts
// Public API for @kouji-ui/core

export const KJ_CORE_VERSION = '0.0.1';

// Shared primitive directives
export * from './primitives/index';

// Accessibility utilities
export * from './a11y/index';

// Foundation components
export * from './button/index';
export * from './input/index';
export * from './checkbox/index';
export * from './radio/index';
export * from './toggle/index';
export * from './badge/index';
export * from './avatar/index';

// Overlay components
export * from './dialog/index';
export * from './tooltip/index';
export * from './popover/index';
export * from './menu/index';
export * from './toast/index';

// Data components
export * from './table/index';
export * from './form/index';
export * from './tabs/index';
export * from './accordion/index';
export * from './select/index';

// Charts
export * from './chart/index';
```

- [ ] **Run full tests:**
```bash
pnpm test
```
Expected: All tests pass.

- [ ] **Build core:**
```bash
pnpm build:core
```
Expected: Build succeeds.

- [ ] **Commit:**
```bash
git add packages/core/src/public-api.ts
git commit -m "feat(core): wire all component exports in public-api"
```

---

## Task 20: Final Verification

- [ ] **Run full test suite:**
```bash
pnpm test
```
Expected: All tests pass (70+ tests).

- [ ] **Run full build:**
```bash
pnpm build
```
Expected: All 3 packages build successfully.

- [ ] **Final commit:**
```bash
git add .
git diff --staged --quiet || git commit -m "chore: Phase 3 complete — all core component directives implemented"
```
