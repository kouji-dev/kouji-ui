# kouji-ui

See [RULES.md](./RULES.md) for an index of all rules. Detailed rules live in [`rules/`](./rules/):
- [`rules/stack.md`](./rules/stack.md) — tech stack, no-CDK policy
- [`rules/code_style.md`](./rules/code_style.md) — design process, naming, signals, lifecycle, TSDoc
- [`rules/architecture.md`](./rules/architecture.md) — packages, directive patterns, file conventions
- [`rules/accessibility.md`](./rules/accessibility.md) — WCAG 2.1 AAA, keyboard contracts, ARIA
- [`rules/tsdoc.md`](./rules/tsdoc.md) — TSDoc format, `@doc*` tags, themed example design references, inline comment policy
- [`rules/agent_orchestration.md`](./rules/agent_orchestration.md) — agent strategy

## Accessibility Verification After Every Directive/Component Change

After every change to a directive or component, **always perform an accessibility review** against [WCAG 2.1](https://www.w3.org/TR/WCAG21/) and prompt suggestions if issues are found.

**What to check after each change:**

1. **Keyboard navigation** — Is the element reachable by Tab? Are arrow keys, Enter, Space, and Escape handled where applicable? Is focus order logical?
2. **ARIA semantics** — Does the element have a correct `role`? Are `aria-label`, `aria-labelledby`, `aria-describedby`, `aria-expanded`, `aria-selected`, `aria-disabled`, `aria-controls`, `aria-haspopup` set where required?
3. **Focus management** — Is focus trapped in modals (`CdkFocusTrap`)? Is focus restored when overlays close? Is `tabindex` correct (avoid positive tabindex)?
4. **Color & contrast** — Does text meet WCAG 2.1 AA contrast ratio (4.5:1 normal, 3:1 large text)? AAA is the target (7:1 / 4.5:1).
5. **Touch targets** — Are interactive elements at least 44×44px (WCAG 2.5.5)?
6. **Dynamic content** — Are live regions (`aria-live`, CDK `LiveAnnouncer`) used for status updates, toasts, and loading states?
7. **Form inputs** — Are labels programmatically associated? Are error messages linked via `aria-describedby`? Is `aria-invalid` toggled on validation failure?
8. **Images & icons** — Are decorative icons `aria-hidden="true"`? Do informative icons have `aria-label` or visually hidden text?

**How to prompt suggestions:**

After the change, output a brief **Accessibility Review** section listing:
- Any WCAG criteria that may be violated (e.g. `1.3.1 Info and Relationships`, `2.1.1 Keyboard`, `4.1.2 Name, Role, Value`)
- The specific fix needed (e.g. "add `aria-expanded` binding", "wire `aria-labelledby` to heading id")
- If everything looks correct, confirm with: "✓ Accessibility: no issues found."

Target: **WCAG 2.1 AAA** for all components (see [`rules/accessibility.md`](./rules/accessibility.md)).

## Class Naming Rule

Omit the Angular type suffix (`Directive`, `Component`, `Service`, `Pipe`) from class names **unless** two things in the same feature would otherwise share the same base name.

- ✅ `KjTableHeader` — not `KjTableHeaderDirective`
- ✅ `KjButton` — not `KjButtonDirective`
- ✅ `KjToastService` — kept because `KjToast` already names the directive
- ✅ `KjDialogService` — kept because `KjDialog` already names the directive

**When a collision exists**, keep the suffix on the less-primary class (usually the service or a secondary directive), and drop it from the primary one. If it's unclear which is primary, discuss before deciding.

The same rule applies to **file names**: name files after what they contain or do, omitting the Angular type suffix (`.directive`, `.component`, `.service`, `.pipe`) unless two files in the same folder would otherwise share the same base name.

- ✅ `table.ts` — not `table.directive.ts`
- ✅ `button.ts` — not `button.directive.ts`
- ✅ `toast.service.ts` — kept because `toast.ts` already names the directive file
- ✅ `dialog.service.ts` — kept because `dialog.ts` already names the directive file
- ✅ `dialog.example.ts`, `dialog.retro.example.ts` — multi-part suffixes that describe purpose are fine

Spec and test files follow the same base name as the file they test: `table.spec.ts` not `table.directive.spec.ts`.
