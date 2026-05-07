# Accessibility

Target: WCAG 2.1 AAA.

Before implementing any interactive element: check W3C spec + inspect how established libraries handle it.

## Sources (check in order)

1. **WAI-ARIA Authoring Practices** — https://www.w3.org/WAI/ARIA/apg/patterns/ — keyboard, roles, ARIA per pattern
2. **WCAG 2.1** — https://www.w3.org/TR/WCAG21/ — criteria reference
3. **MDN Accessibility** — https://developer.mozilla.org/en-US/docs/Web/Accessibility — browser behaviour
4. **a11y-101** — https://www.a11y-101.com — practical examples
5. **Deque University** — https://dequeuniversity.com/rules/axe — axe rule explanations

## Cross-check UI libraries
See what they implemented for the same component:
- Angular Material — https://material.angular.dev
- Radix UI — https://www.radix-ui.com (headless, closest to our approach)
- React Aria / Adobe — https://react-spectrum.adobe.com/react-aria
- ng-primitives — https://angularprimitives.com

## A11y primitives

| Directive | Purpose |
|---|---|
| `KjFocusTrap` | Trap focus in container |
| `KjLiveRegion` | Screen reader announcements |
| `KjRovingTabindex` | Composite widget navigation |
| `KjVisuallyHidden` | Hidden visually, accessible to SR |
| `KjAriaDescribedBy` | Cross-element `aria-describedby` |

## After every change
Run accessibility review per CLAUDE.md.
