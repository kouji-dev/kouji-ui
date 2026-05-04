# @kouji-ui/core

Headless Angular 21 UI primitives — directives over CDK with WCAG 2.1 AAA semantics and zero CSS.

You write the markup. You write the styles. The library wires up keyboard navigation, ARIA, focus management, and state.

[Documentation](https://kouji-ui.onrender.com) · [GitHub](https://github.com/kouji-dev/kouji-ui)

## Install

```bash
pnpm add @kouji-ui/core @angular/cdk
```

Peer dependencies: `@angular/common` `@angular/core` `@angular/cdk` — all `^21.0.0`.

## Quick start

Every primitive is a standalone directive. Import it where you use it.

```ts
import { Component } from '@angular/core';
import { KjButton } from '@kouji-ui/core';

@Component({
  selector: 'app-example',
  imports: [KjButton],
  template: `<button kjButton (click)="save()">Save</button>`,
})
export class ExampleComponent {
  save() { /* ... */ }
}
```

The directive owns the keyboard contract, ARIA roles, and focus ring — not the look. Style the host element however you want.

### A more involved example: dialog

```ts
import { Component } from '@angular/core';
import {
  KjDialog,
  KjDialogTrigger,
  KjDialogOverlay,
  KjDialogTitle,
  KjDialogClose,
} from '@kouji-ui/core';

@Component({
  selector: 'app-confirm',
  imports: [KjDialog, KjDialogTrigger, KjDialogOverlay, KjDialogTitle, KjDialogClose],
  template: `
    <button [kjDialogTrigger]="confirm">Delete</button>

    <ng-template #confirm>
      <div kjDialog>
        <div kjDialogOverlay></div>
        <h2 kjDialogTitle>Delete this item?</h2>
        <p>This action cannot be undone.</p>
        <button kjDialogClose>Cancel</button>
        <button kjDialogClose (click)="delete()">Delete</button>
      </div>
    </ng-template>
  `,
})
export class ConfirmComponent {
  delete() { /* ... */ }
}
```

Focus trap, Escape-to-close, scroll lock, ARIA wiring — all handled.

## What's included

| Domain          | Primitives                                                  |
| --------------- | ----------------------------------------------------------- |
| Buttons & inputs | `KjButton`, `KjInput`, `KjCheckbox`, `KjRadio`, `KjToggle`, `KjSelect` |
| Form composition | `KjFormField`, `KjFormLabel`, `KjFormError`                 |
| Overlays         | `KjDialog`, `KjPopover`, `KjTooltip`, `KjToast`, `KjMenu`   |
| Navigation       | `KjTabs`, `KjAccordion`                                     |
| Data display     | `KjTable`, `KjBadge`, `KjAvatar`, `KjChart`                 |
| A11y primitives  | `KjFocusTrap`, `KjFocusRing`, `KjLiveRegion`, `KjRovingTabindex`, `KjVisuallyHidden`, `KjAriaDescribedBy` |

Every primitive ships with examples and an inputs reference at [kouji-ui.onrender.com](https://kouji-ui.onrender.com).

## Design principles

- **Headless** — directives, not components. You own the DOM and CSS.
- **WCAG 2.1 AAA target** — keyboard contracts, focus management, ARIA, and contrast all designed for AAA.
- **CDK-aligned** — wraps `@angular/cdk` primitives where it makes sense (overlay, focus-trap), never reimplements from scratch.
- **Signals-first** — public APIs use `input()` / `signal()` / `effect()`.
- **Zero runtime CSS** — no shipped stylesheet. Bring your own design system.

## License

MIT © [kouji-dev](https://github.com/kouji-dev)
