<!--
The checklist below is the *unenforceable* half of `rules/`. Everything that a
linter, a typecheck or a spec can decide is already wired up — see the table in
RULES.md — and CI will tell you about it without being asked. What is left is
judgement, so it is asked for here instead.

Tick a box only when you have actually done the thing. "N/A" is a fine answer
(say why); an unticked box that should have been ticked is what this file is
for. Delete sections that do not apply to the change.
-->

## What changed, and why

<!-- One paragraph. The *why* is the part a reviewer cannot reconstruct. -->

## Reviewer checklist

### Every PR

- [ ] **Scope.** The diff does one thing. Drive-by refactors are their own PR.
- [ ] **Changeset.** `pnpm changeset` for anything a consumer can observe —
      including a rename, a removed input, or a changed DOM shape. Per
      `rules/code_style.md` § "A rename is a clean break", a rename ships
      **without** a compatibility alias, so the changeset names old → new.
- [ ] **Specs.** Every fix has a spec that fails against the code before it.
      Keyboard assertions reach focus through a real interaction, then dispatch
      from `document.activeElement` — never on an element a user cannot focus.
- [ ] **TSDoc** (`rules/tsdoc.md`, not machine-checked). Every exported
      directive, class, interface, type, method, input and output is
      documented; the block follows the structure in the file; `@doc-description`
      obeys its rule; inline comments explain *why*, never *what*.
- [ ] **No stale prose.** A comment, TSDoc line or `rules/` clause that this
      diff made untrue is updated in the same commit.

### A new or changed directive / component

- [ ] **WAI-ARIA pattern read first** (`rules/code_style.md` § "Before any new
      directive", `rules/accessibility.md` § "Sources"). Which APG pattern, and
      where this deviates from it:
      <!-- e.g. "APG Disclosure; ArrowUp also opens, matching the date-picker." -->
- [ ] **Cross-checked** against Angular Material / Radix / React Aria /
      ng-primitives for the behavioural edge cases.
- [ ] **API is atomic and minimal.** One job per directive, YAGNI on inputs,
      a name that reads the same as its siblings.
- [ ] **A11y review** (CLAUDE.md, target WCAG 2.1 AAA) — keyboard reachability
      and order, roles and ARIA state, focus management and restoration,
      contrast, 44×44 touch targets, live regions for async status, label and
      error association, decorative icons `aria-hidden`. Findings, or
      "no issues found":
      <!-- Name the SC where something is knowingly left open. -->
- [ ] **Strings.** No user-visible or assistive string is hard-coded in shipped
      markup — it comes from the i18n catalog or a config override.

### Styling

- [ ] **Base tokens first** (`rules/code_style.md` § "CSS"). A raw colour,
      length or duration in a component sheet needs a reason next to it.
- [ ] **Customization levers** are still real for this component: CSS custom
      properties on the host → `provideKj*` → a new preset value. A consumer who
      wants a brand variant does not have to fork.
- [ ] **Motion** respects `prefers-reduced-motion`.

### Dependencies and packaging

- [ ] **No new runtime dependency** without a decision (`rules/stack.md`). A
      lazily-loaded one is an *optional peer*, following the pattern in that
      file.
- [ ] **Public surface.** Every new export is reachable exactly once, from its
      feature folder's `index.ts`, re-exported by `public-api.ts` — and under
      one name only.

## Risk

<!-- What breaks if this is wrong, and what you did to find out. -->
