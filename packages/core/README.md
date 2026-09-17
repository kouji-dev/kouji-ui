# @kouji-ui/core

Headless Angular UI primitives — signal-driven directives with WCAG 2.1 AAA semantics, no CDK, and a handful of opt-in global stylesheets.

You write the markup. You write the styles. The library wires up keyboard navigation, ARIA, focus management, and state.

[Documentation](https://kouji-ui.onrender.com) · [GitHub](https://github.com/kouji-dev/kouji-ui)

## Install

```bash
pnpm add @kouji-ui/core
```

Peer dependencies: `@angular/common` `@angular/core` `@angular/forms` — all `^22.0.0`. No `@angular/cdk`.

### Optional peers

`echarts` (`KjChart`), `monaco-editor` (`KjEditor`) and `lexical` + the
`@lexical/*` packages (`KjRichTextEditor`) are **optional** peers: nothing
imports them unless you use those three features, and each is loaded through a
dynamic `import()`, so they never enter the main bundle.

One caveat if you build with `skipLibCheck: false` (Angular CLI's generated
`tsconfig.json` sets it to `true`, which is where most projects are): the
package ships a single rolled-up `.d.ts`, so its *type* references to `echarts`,
`lexical` and `monaco-editor` are present whether or not you use those
features, and a strict lib check will report them as missing modules. Install
the peer you are missing, or leave `skipLibCheck` at its default. Splitting
those three areas into secondary entry points is the real fix and is tracked as
lazy F-8; `packages/components/src/package-exports.spec.ts` holds the current
set of leaked peer names so it can shrink but never grow.

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
| A11y primitives  | `KjFocusTrap` (+ `createFocusTrap`, `tabbableElements`, `focusInitialIn`, `returnFocusFrom`), `KjFocusRing`, `KjLiveRegion`, `KjRovingTabindex`, `KjVisuallyHidden`, `KjAriaDescribedBy` |

Every primitive ships with examples and an inputs reference at [kouji-ui.onrender.com](https://kouji-ui.onrender.com).

## Design principles

- **Headless** — directives, not components. You own the DOM and CSS.
- **WCAG 2.1 AAA target** — keyboard contracts, focus management, ARIA, and contrast all designed for AAA.
- **No CDK** — overlay, focus trap, list navigation and roving tabindex are the library's own framework-free primitives; `@angular/cdk` is not a peer.
- **Signals-first** — public APIs use `input()` / `signal()` / `effect()`.
- **Zero runtime CSS** — no shipped stylesheet. Bring your own design system.

## License

MIT © [kouji-dev](https://github.com/kouji-dev)
