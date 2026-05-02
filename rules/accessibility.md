# Accessibility Rules

## Target

**WCAG 2.1 AAA** for every directive and component.

## Process (see also code_style.md)

Before implementing any directive, read the WAI-ARIA pattern for that component at https://www.w3.org/WAI/ARIA/apg/patterns/ and identify:

1. **Role** — what `role` attribute the element needs
2. **Required ARIA attributes** — `aria-expanded`, `aria-selected`, `aria-controls`, `aria-haspopup`, `aria-labelledby`, `aria-describedby`, `aria-disabled`, `aria-invalid`, `aria-live`, etc.
3. **Keyboard contract** — which keys do what (Tab, Arrow keys, Enter, Space, Escape, Home, End, Page Up/Down)
4. **Focus management** — where focus goes when overlay opens, closes, or item is selected
5. **Touch targets** — interactive elements must be at least 44×44px (WCAG 2.5.5)

## Keyboard Interaction Standards

| Pattern | Keys |
|---|---|
| Navigate items | `ArrowDown` / `ArrowUp` (vertical), `ArrowRight` / `ArrowLeft` (horizontal) |
| First / Last item | `Home` / `End` |
| Activate / Select | `Enter` or `Space` (context-dependent) |
| Dismiss overlay | `Escape` |
| Move focus out | `Tab` (never traps focus except modals) |
| Type-ahead | Any printable character — jump to matching item |

## Focus Management

- **Modals / Dialogs** — focus must be trapped inside while open (`KjFocusTrap`), restored to trigger on close
- **Menus / Popovers / Tooltips** — focus moves to first item on open; Tab dismisses and moves to next focusable element in page
- **Roving tabindex** — use `KjRovingTabindex` for composite widgets where only one item is in the tab sequence at a time (tab lists, toolbars, radio groups)
- Never use positive `tabindex` values

## ARIA Patterns Quick Reference

| Directive | Role | Key ARIA |
|---|---|---|
| Select container | `listbox` | `aria-expanded`, `aria-labelledby` |
| Select option | `option` | `aria-selected`, `aria-disabled` |
| Menu | `menu` | `aria-orientation` |
| Menu item | `menuitem` | `aria-disabled`, `aria-haspopup` (if submenu) |
| Dialog | `dialog` | `aria-modal="true"`, `aria-labelledby`, `aria-describedby` |
| Tab list | `tablist` | `aria-orientation` |
| Tab | `tab` | `aria-selected`, `aria-controls` |
| Tab panel | `tabpanel` | `aria-labelledby` |
| Accordion trigger | `button` | `aria-expanded`, `aria-controls` |
| Tooltip | `tooltip` | on trigger: `aria-describedby` pointing to tooltip id |
| Combobox input | `combobox` | `aria-expanded`, `aria-controls`, `aria-autocomplete` |

## Available A11y Primitives (`@kouji-ui/core/a11y`)

| Directive | Purpose |
|---|---|
| `KjFocusTrap` | Trap keyboard focus inside a container (modals) |
| `KjLiveRegion` | ARIA live region for screen reader announcements |
| `KjRovingTabindex` | Roving tabindex for composite widget navigation |
| `KjVisuallyHidden` | Hide content visually but keep it accessible to screen readers |
| `KjAriaDescribedBy` | Wire `aria-describedby` across elements |

## After Every Change

Run an accessibility review after every directive or component change (as specified in CLAUDE.md).
