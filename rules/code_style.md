# Code Style & Design Process

## Design Process — Before Writing Any Directive

Before implementing a new directive or modifying an existing one:

### 1. Check WCAG 2.1
Read the relevant pattern at https://www.w3.org/TR/WCAG21/ and the WAI-ARIA Authoring Practices at https://www.w3.org/WAI/ARIA/apg/patterns/. Identify:
- The correct ARIA `role` for the element
- All required and recommended ARIA attributes (`aria-expanded`, `aria-selected`, `aria-controls`, etc.)
- Required keyboard interactions (Tab, Arrow keys, Enter, Space, Escape, Home, End)
- Focus management expectations (where focus goes on open, close, select)

### 2. Reference Established Libraries
Inspect how leading Angular libraries implement the same component. Use these as behavioral reference — not for API copying, but to understand what edge cases matter and what users expect:
- **Angular Material:** https://material.angular.dev
- **PrimeNG:** https://primeng.org
- **Ant Design for Angular:** https://ng.ant.design/docs/introduce/en
- **ng-primitives:** https://angularprimitives.com (closest to our headless approach)

### 3. Design the API
The directive API must be:
- **Atomic** — one directive, one responsibility. Compose via `hostDirectives`.
- **Simple** — fewest inputs needed to cover the real use cases. No config objects, no optional overloads for edge cases that don't exist yet (YAGNI).
- **Consistent** — follow the patterns already established in the codebase. Inputs use `kj` prefix. Boolean inputs are `input<boolean>(false)`. Context tokens are `KJ_UPPERCASE`.

## Naming Conventions

### Class Names
Omit the Angular type suffix (`Directive`, `Component`, `Service`, `Pipe`) unless two things in the same feature would share the same base name after removal.

- ✅ `KjButton` — not `KjButtonDirective`
- ✅ `KjToastService` — kept because `KjToast` already names the directive
- When collision exists: keep the suffix on the less-primary class (usually the service)

### File Names
Same rule applied to files — omit `.directive`, `.component`, `.service` unless it would create a name collision in the same folder.

- ✅ `button.ts` — not `button.directive.ts`
- ✅ `toast.service.ts` — kept because `toast.ts` is the directive file
- ✅ `dialog.example.ts`, `dialog.retro.example.ts` — descriptive multi-part suffixes are fine
- Spec files: `button.spec.ts` not `button.directive.spec.ts`

### Selectors & Tokens
All directive selectors, class names, and injection tokens use the `kj` prefix:
- Selectors: `[kjButton]`, `[kjSelect]`, `[kjOption]`
- Classes: `KjButton`, `KjSelect`, `KjOption`
- Tokens: `KJ_SELECT`, `KJ_DIALOG`, `KJ_TABS`

### Inputs, Outputs, and Models — `kj` prefix is mandatory

Every `input()`, `output()`, and `model()` declaration on a kouji directive
or component must expose a `kj`-prefixed external binding name. This applies
to both the directive layer (`KjButton`, `KjSelect`, …) and the styled
wrapper layer (`KjButtonComponent`, `KjSelectComponent`, …).

**Why:** prevents collisions with native HTML attributes (`disabled`, `type`,
`size`, `loading`, `value`, `name`, …), other directives on the same element,
and the parent component's own properties when read inside template
expressions. Without the prefix, `<button kjButton [disabled]="busy()">` is
ambiguous — both the native button's `disabled` and `KjButton`'s `disabled`
input could plausibly receive the binding.

**Two equivalent shapes are accepted:**

```ts
// (A) Property name carries the prefix — simplest when the directive has a
// matching selector.
readonly kjVariant = input<string>('default');

// (B) Internal property name is short, external binding is aliased.
readonly disabled = input<boolean>(false, { alias: 'kjDisabled' });
```

Pick (A) by default. Use (B) when the internal property is read often inside
the class body and a short name improves readability — but the external
alias is still mandatory.

**Outputs and models follow the same rule:**

```ts
readonly kjPressedChange = output<boolean>();
readonly kjPressed = model<boolean | undefined>(undefined);
```

**`hostDirectives` input forwarding** preserves the prefix on the consumer's
host element. A consumer composing `KjVariant` re-exposes the input to its
own consumer, prefixed:

```ts
hostDirectives: [
  { directive: KjVariant, inputs: ['kjVariant'] },           // pass through
  { directive: KjSize,    inputs: ['kjSize: kjButtonSize'] }, // alias-rename, still prefixed
],
```

A consumer-facing alias that drops the `kj` prefix is a violation of this
rule.

**Wrapper component example:**

```ts
@Component({ selector: 'kj-button', /* ... */ })
export class KjButtonComponent {
  readonly kjVariant = input<string>('default');
  readonly kjSize = input<string>('md');
  readonly kjDisabled = input<boolean>(false);
  readonly kjLoading = input<boolean>(false);
  readonly kjPressed = model<boolean | undefined>(undefined);
  readonly kjType = input<'button' | 'submit' | 'reset'>('button');
  readonly kjAriaLabel = input<string | undefined>(undefined);
}
```

Consumers of the wrapper bind through prefixed names too:

```html
<kj-button kjVariant="destructive" [(kjPressed)]="on">Toggle</kj-button>
```

### Prefer TypeScript inference for input / output / model types

Don't write explicit generic arguments on `input()`, `output()`, or `model()`
calls when TypeScript can infer them from the initial value, the transform,
or the surrounding usage. Explicit generics add noise, defeat the docs
extractor's source-text type detection (it ends up showing the raw generic
string instead of a clean type), and create churn whenever the inferred type
is correct but slightly differently spelled.

Justified exceptions — only these:

- **Inference produces the wrong type.** E.g. an empty array literal `[]`
  infers `never[]`; pin with `input<MyItem[]>([])`.
- **ng-packagr emits a narrower type than intended.** Document the
  workaround inline (we hit this once with `model<boolean | undefined>` for
  toggle-state inputs — the field-type annotation is required to keep the
  emitted `.d.ts` from collapsing the write type).
- **The default cannot be expressed without a generic.** E.g.
  `input.required<MyComplexType>()` — required inputs have no initial value,
  so the type must come from the generic.

```ts
// ✅ inferred
readonly kjVariant = input(this.preset.default, {
  transform: (v?: string) => v || this.preset.default,
});
readonly kjDisabled = input(false);
readonly kjLabel = input('');

// ❌ explicit when inferable — noisy and confuses the docs extractor
readonly kjVariant = input<string, string | undefined>(this.preset.default, {
  transform: (v: string | undefined) => v || this.preset.default,
});
readonly kjDisabled = input<boolean>(false);
```

## Signals — Use Everywhere

- **Signal inputs/outputs:** `input()`, `input.required()`, `model()`, `output()` — never `@Input()` or `@Output()`
- **State:** `signal()`, `computed()`, `effect()`, `linkedSignal()`, `resource()` — no `BehaviorSubject`, no Observables for local state
- **Always use `inject()`** — never constructor injection parameters
- **Prefer `effect()` and `computed()`** over manual subscription management

## Lifecycle — No Lifecycle Interfaces

- **Never use** `AfterViewInit`, `AfterContentInit`, `OnInit`, `OnDestroy` interfaces or their methods
- **DOM access after render:** `afterNextRender()` (first render only) or `afterRender()` (every render)
- **Cleanup:** `DestroyRef` + `destroyRef.onDestroy()` — never `ngOnDestroy()`
- **Initialization logic** belongs in the `constructor()` using `inject()` and the hooks above

```ts
// ✅ correct
constructor() {
  const destroyRef = inject(DestroyRef);
  afterNextRender(() => {
    // DOM access here
    destroyRef.onDestroy(() => { /* cleanup */ });
  });
}

// ❌ never
ngAfterViewInit() { ... }
ngOnDestroy() { ... }
```

## TSDoc & Comments

See [`rules/tsdoc.md`](./tsdoc.md) for the full TSDoc and inline comment rules, including the custom `@doc`, `@doc-example`, `@doc-theme`, `@doc-file`, and `@category` tags used by the docs extractor. Use `packages/core/src/button/button.ts` as the canonical reference.

Key rules:
- Every exported directive, input, output, and method needs TSDoc
- Single-line `/** */` for inputs/outputs
- No inline comments unless the WHY is non-obvious
- No multi-line `/* */` blocks in source — only `/** */` for TSDoc and `//` for rare inline notes

## General Code Style

- `standalone: true` always — no NgModules
- Prefer `const` over `let`; never `var`
- No barrel re-exports beyond `index.ts` per package/feature

## What NOT to Build

Do not create directives that only add `data-*` attributes with no behaviour. A directive must do at least one of:
- Manage state (signals, context)
- Implement keyboard interaction
- Apply ARIA semantics
- Expose a useful API (methods, outputs)
- Compose behaviours via `hostDirectives`

**Examples of useless directives:**
- `KjTableRow` that only sets `[attr.data-row]=""` — pointless; use CSS `tr` selector
- `KjTableCell` that only sets `[attr.data-cell]=""` — same
