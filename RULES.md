# kouji-ui Rules

Rules live in `rules/`:

- [stack.md](rules/stack.md) — tech stack, no-CDK policy, approved deps
- [code_style.md](rules/code_style.md) — naming, signals, lifecycle, design process
- [architecture.md](rules/architecture.md) — packages, signal-context, hostDirectives, file layout
- [accessibility.md](rules/accessibility.md) — WCAG 2.1 AAA, keyboard, ARIA, a11y primitives
- [tsdoc.md](rules/tsdoc.md) — TSDoc format, `@doc*` tags, inline comment policy
- [agent_orchestration.md](rules/agent_orchestration.md) — caveman prompts, parallel vs sequential strategy
- [docs.md](rules/docs.md) — `apps/docs` must use `@kouji-ui/components`, not raw HTML
- [worktree.md](rules/worktree.md) — worktree location + merge-back-to-main flow

## What CI checks, and what it cannot

A rule nothing enforces drifts. Most of these files describe judgement a
linter cannot have, but the mechanical clauses are wired up — if you change
one of the rules below, change its check in the same commit.

| Rule | Check |
| --- | --- |
| `kj` prefix on every selector | `@angular-eslint/directive-selector`, `@angular-eslint/component-selector` |
| `kj` prefix on every public binding in `@kouji-ui/core` | `kouji/binding-prefix` (`tools/eslint/rules/binding-prefix.js`), with a documented allowlist of published names |
| Component CSS is global, layered and in a `.css` file | `kouji/component-styles-layered` + `kouji/layered` / `kouji/known-tokens` in `stylelint.config.mjs` (`pnpm lint:css`) |
| Every selector is anchored in the `kj` namespace | `kouji/namespaced` (`tools/stylelint/index.mjs`, `pnpm lint:css`) — a selector must be anchored by a `.kj-*` class, a `kj-*` element, a `[data-*]` hook, `:root`, `:host` or `::backdrop`; no allowlist, because the library is at zero |
| No unguarded `document` / `window` / `navigator` / web storage | `no-restricted-globals`, scoped to library sources |
| No hard-coded accessible name in shipped markup | `pnpm check:aria-labels` (`scripts/check-aria-label-literals.mjs`), with a shrink-only debt list |
| Every boolean `input()` coerces with a `transform` | `kouji/boolean-input-transform` (`tools/eslint/rules/boolean-input-transform.js`); `model()` is exempt because `ModelOptions` has no `transform` slot — its contract is a mandatory TSDoc line instead |
| Signal inputs/queries, not `@Input()` / `@ViewChild` / `@HostListener`; no lifecycle hook bodies | `no-restricted-syntax`, scoped to library sources; the registration-ordering exception is a constructor, not a hook |
| One directive per file | `packages/core/src/architecture.spec.ts`, with a shrink-only list of the files still over the line (three or more declarations; the rule's "tightly-coupled pair" exception makes two unprovable) |
| Class / file naming, and no compat alias under an old name | `packages/components/src/class-naming.spec.ts` — scans both packages for an unearned `Component` / `Directive` / `Service` / `Pipe` suffix, for any `export { Foo as FooComponent }`, and for a symbol exported by two feature barrels |
| Diagnostics are `ngDevMode`-guarded, one message shape, and name both ends of a broken composition | `packages/core/src/architecture.spec.ts` (no `isDevMode()`, no `console.warn` outside `kjDevWarn`, no `inject(TOKEN) as Class`, parent contexts read through `injectParent`) |
| One `ControlValueAccessor`, in `primitives/forms/` | `kouji/no-bespoke-value-accessor` (`tools/eslint/rules/no-bespoke-value-accessor.js`), no exemptions |
| `rules/tsdoc.md` in full | **not enforced** — [PR checklist](.github/pull_request_template.md) |
| Design process, WAI-ARIA reading, token choice | **not enforceable** — [PR checklist](.github/pull_request_template.md) |

## The half CI cannot check

Every clause in the two **not enforced** rows above is a line in
[`.github/pull_request_template.md`](.github/pull_request_template.md), so a
reviewer is asked about it on every PR rather than being expected to remember
the rules file. Keep the two in step: a rule that becomes checkable moves *out*
of the template and into the table; a new unenforceable clause goes *into* the
template in the same commit that writes it down.

The prose stays in `rules/`. The template asks whether you did the thing; the
rules file is where you go to find out what the thing is (which APG pattern,
which libraries to cross-check, what a `@doc-description` may not say), and
deleting that reference material to leave "only enforceable statements" would
cost more than the tidiness is worth.

Local rules live in `tools/eslint/`, are wired up (and scoped) in
`eslint.config.js`, and are plain CommonJS with no package of their own.
Where a rule carries an exemption list, every entry names the file and the
reason: it is debt to pay down, not a menu.
