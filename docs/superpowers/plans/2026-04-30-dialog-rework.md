# Dialog Rework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the wrapper-based dialog API with a trigger-ref pattern: `[kjDialogTrigger]="tplRef"` on the button, `kjDialogOverlay` + `kjDialog` inside the template.

**Architecture:** `KjDialogTriggerDirective` becomes the context provider (provides `KJ_DIALOG`, owns CDK Dialog lifecycle). `KjDialogDirective` moves inside the user's template onto the panel element — it injects context and auto-wires ARIA. `KjDialogOverlayDirective` is a new backdrop directive inside the template. All 4 examples are rewritten to the new pattern.

**Tech Stack:** Angular 21 signals, `input()`, `output()`, `computed()`, Angular CDK `Dialog`, `@testing-library/angular`, `jest-axe`

---

## File Map

| File | Change |
|---|---|
| `packages/core/src/dialog/dialog.context.ts` | Rewrite — new `KjDialogContext` interface (no `registerTemplate`/`show`/`hide`, adds `close`, `closeOnEscape`, `closeOnBackdrop`) |
| `packages/core/src/dialog/dialog.directive.ts` | Full rewrite — 5 directives: `KjDialogTriggerDirective`, `KjDialogDirective`, `KjDialogOverlayDirective`, `KjDialogTitleDirective`, `KjDialogCloseDirective` |
| `packages/core/src/dialog/dialog.directive.spec.ts` | Rewrite — tests for new API |
| `packages/core/src/dialog/index.ts` | Update exports — remove `KjDialogContentDirective` + `KjDialogDescriptionDirective` |
| `packages/core/src/dialog/dialog.example.ts` | Rewrite to new pattern |
| `packages/core/src/dialog/dialog.retro.example.ts` | Rewrite to new pattern |
| `packages/core/src/dialog/dialog.finance.example.ts` | Rewrite to new pattern |
| `packages/core/src/dialog/dialog.confirm.example.ts` | Rewrite using `(kjDialogClosed)` output + `#dlg="kjDialog"` |
| `packages/core/src/dialog/dialog.service.ts` | No change |

---

## Task 1: Rewrite dialog.context.ts

**Files:**
- Modify: `packages/core/src/dialog/dialog.context.ts`

- [ ] **Step 1: Replace the entire file**

```typescript
import { InjectionToken, Signal } from '@angular/core';

export interface KjDialogContext {
  readonly open: Signal<boolean>;
  readonly dialogId: string;
  readonly closeOnEscape: Signal<boolean>;
  readonly closeOnBackdrop: Signal<boolean>;
  close(result?: unknown): void;
}

export const KJ_DIALOG = new InjectionToken<KjDialogContext>('KjDialog');
```

- [ ] **Step 2: Commit**

```bash
git add packages/core/src/dialog/dialog.context.ts
git commit -m "refactor(dialog): new KjDialogContext interface — trigger-ref pattern"
```

---

## Task 2: Rewrite dialog.directive.ts

**Files:**
- Modify: `packages/core/src/dialog/dialog.directive.ts`

- [ ] **Step 1: Replace the entire file**

```typescript
import {
  Directive, DestroyRef, TemplateRef, ViewContainerRef,
  computed, inject, input, output, signal,
} from '@angular/core';
import { Dialog, DialogRef } from '@angular/cdk/dialog';
import { KJ_DIALOG, KjDialogContext } from './dialog.context';

let _dialogIdCounter = 0;

/**
 * Trigger that opens the dialog. Place on any button or interactive element.
 * Takes a `TemplateRef` input that defines the full overlay structure.
 *
 * The template should contain `[kjDialogOverlay]` (backdrop) wrapping `[kjDialog]` (panel).
 * Inside the panel use `[kjDialogTitle]` and `[kjDialogClose]`.
 * Export `kjDialog` as a template ref (`#dlg="kjDialog"`) to call `dlg.close(result?)`.
 *
 * @example
 * ```html
 * <button kjButton [kjDialogTrigger]="myDialog" (kjDialogClosed)="onResult($event)">Open</button>
 *
 * <ng-template #myDialog>
 *   <div kjDialogOverlay>
 *     <div kjDialog #dlg="kjDialog">
 *       <h2 kjDialogTitle>Title</h2>
 *       <button kjDialogClose>Cancel</button>
 *       <button (click)="dlg.close('saved')">Save</button>
 *     </div>
 *   </div>
 * </ng-template>
 * ```
 * @doc
 *  @doc-example Basic
 *    @doc-theme default
 *      @doc-file dialog.example.ts
 *    @doc-theme retro
 *      @doc-file dialog.retro.example.ts
 *    @doc-theme finance
 *      @doc-file dialog.finance.example.ts
 *  @doc-example Confirmation
 *    @doc-file dialog.confirm.example.ts
 * @category Core/Overlays/Dialog
 */
@Directive({
  selector: '[kjDialogTrigger]',
  standalone: true,
  providers: [{ provide: KJ_DIALOG, useExisting: KjDialogTriggerDirective }],
  host: {
    '[attr.aria-haspopup]': '"dialog"',
    '[attr.aria-expanded]': 'open().toString()',
    '(click)': 'openDialog()',
  },
})
export class KjDialogTriggerDirective implements KjDialogContext {
  private readonly cdkDialog = inject(Dialog);
  private readonly vcr = inject(ViewContainerRef);
  private readonly destroyRef = inject(DestroyRef);

  readonly kjDialogTrigger = input.required<TemplateRef<unknown>>();
  readonly kjDialogCloseOnEscape = input<boolean>(true);
  readonly kjDialogCloseOnBackdrop = input<boolean>(true);
  readonly kjDialogClosed = output<unknown>();

  readonly dialogId = `kj-dialog-${++_dialogIdCounter}`;

  private readonly _open = signal(false);
  readonly open = this._open.asReadonly();
  readonly closeOnEscape = computed(() => this.kjDialogCloseOnEscape());
  readonly closeOnBackdrop = computed(() => this.kjDialogCloseOnBackdrop());

  private dialogRef?: DialogRef<unknown>;

  openDialog(): void {
    if (this._open()) return;
    this.dialogRef = this.cdkDialog.open(this.kjDialogTrigger(), {
      viewContainerRef: this.vcr,
      disableClose: !this.kjDialogCloseOnEscape(),
      backdropClass: 'kj-dialog-backdrop',
      panelClass: 'kj-dialog-panel',
      autoFocus: 'first-tabbable',
      restoreFocus: true,
    });
    this._open.set(true);
    this.dialogRef.closed.subscribe(result => {
      this._open.set(false);
      this.kjDialogClosed.emit(result);
    });
    this.destroyRef.onDestroy(() => this.dialogRef?.close());
  }

  close(result?: unknown): void {
    this.dialogRef?.close(result);
    this._open.set(false);
  }
}

/**
 * Panel container for the dialog. Place inside the template provided to `[kjDialogTrigger]`.
 * Auto-sets `role="dialog"`, `aria-modal`, and `aria-labelledby` (requires `[kjDialogTitle]` inside).
 * Export as `#dlg="kjDialog"` to call `dlg.close(result?)` from event handlers.
 *
 * @category Core/Overlays/Dialog
 */
@Directive({
  selector: '[kjDialog]',
  standalone: true,
  exportAs: 'kjDialog',
  host: {
    '[attr.role]': '"dialog"',
    '[attr.aria-modal]': '"true"',
    '[attr.aria-labelledby]': 'ctx.dialogId + "-title"',
    '(click)': '$event.stopPropagation()',
  },
})
export class KjDialogDirective {
  readonly ctx = inject(KJ_DIALOG);

  close(result?: unknown): void {
    this.ctx.close(result);
  }
}

/**
 * Backdrop/overlay element. Place inside the template wrapping `[kjDialog]`.
 * Closes the dialog on click when `[kjDialogOverlayCloseOnClick]` is true (default).
 *
 * @category Core/Overlays/Dialog
 */
@Directive({
  selector: '[kjDialogOverlay]',
  standalone: true,
  host: {
    '(click)': 'onOverlayClick()',
  },
})
export class KjDialogOverlayDirective {
  private readonly ctx = inject(KJ_DIALOG);
  readonly kjDialogOverlayCloseOnClick = input<boolean>(true);

  onOverlayClick(): void {
    if (this.ctx.closeOnBackdrop() && this.kjDialogOverlayCloseOnClick()) {
      this.ctx.close();
    }
  }
}

/**
 * Marks the dialog title. Sets `id` for `aria-labelledby` wiring on `[kjDialog]`.
 *
 * @category Core/Overlays/Dialog
 */
@Directive({
  selector: '[kjDialogTitle]',
  standalone: true,
  host: {
    '[attr.id]': 'ctx.dialogId + "-title"',
  },
})
export class KjDialogTitleDirective {
  readonly ctx = inject(KJ_DIALOG);
}

/**
 * Closes the dialog on click without a result value.
 * For closing with a result, use `#dlg="kjDialog"` then `(click)="dlg.close(value)"`.
 *
 * @category Core/Overlays/Dialog
 */
@Directive({
  selector: '[kjDialogClose]',
  standalone: true,
  host: {
    '(click)': 'ctx.close()',
  },
})
export class KjDialogCloseDirective {
  readonly ctx = inject(KJ_DIALOG);
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run from `C:\Users\narut\Desktop\projects\kouji`:
```
pnpm --filter @kouji-ui/core exec tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/dialog/dialog.directive.ts
git commit -m "refactor(dialog): trigger-ref pattern — KjDialogTriggerDirective as context provider"
```

---

## Task 3: Rewrite dialog.directive.spec.ts

**Files:**
- Modify: `packages/core/src/dialog/dialog.directive.spec.ts`

- [ ] **Step 1: Replace the entire file**

```typescript
import { render, fireEvent } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import {
  KjDialogTriggerDirective, KjDialogDirective, KjDialogOverlayDirective,
  KjDialogTitleDirective, KjDialogCloseDirective,
} from './dialog.directive';

expect.extend(toHaveNoViolations);

const imports = [
  KjDialogTriggerDirective, KjDialogDirective, KjDialogOverlayDirective,
  KjDialogTitleDirective, KjDialogCloseDirective,
];

describe('KjDialogTriggerDirective', () => {
  it('renders trigger button', async () => {
    const { getByRole } = await render(
      `<button [kjDialogTrigger]="dlg">Open</button>
       <ng-template #dlg>
         <div kjDialogOverlay><div kjDialog><h2 kjDialogTitle>T</h2></div></div>
       </ng-template>`,
      { imports },
    );
    expect(getByRole('button', { name: 'Open' })).toBeInTheDocument();
  });

  it('trigger has aria-haspopup=dialog', async () => {
    const { getByRole } = await render(
      `<button [kjDialogTrigger]="dlg">Open</button>
       <ng-template #dlg>
         <div kjDialogOverlay><div kjDialog><h2 kjDialogTitle>T</h2></div></div>
       </ng-template>`,
      { imports },
    );
    expect(getByRole('button', { name: 'Open' })).toHaveAttribute('aria-haspopup', 'dialog');
  });

  it('trigger has aria-expanded=false initially', async () => {
    const { getByRole } = await render(
      `<button [kjDialogTrigger]="dlg">Open</button>
       <ng-template #dlg>
         <div kjDialogOverlay><div kjDialog><h2 kjDialogTitle>T</h2></div></div>
       </ng-template>`,
      { imports },
    );
    expect(getByRole('button', { name: 'Open' })).toHaveAttribute('aria-expanded', 'false');
  });

  it('passes axe audit on trigger', async () => {
    const { container } = await render(
      `<button [kjDialogTrigger]="dlg">Open dialog</button>
       <ng-template #dlg>
         <div kjDialogOverlay><div kjDialog><h2 kjDialogTitle>Settings</h2></div></div>
       </ng-template>`,
      { imports },
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
```

- [ ] **Step 2: Run tests**

Run from `C:\Users\narut\Desktop\projects\kouji`:
```
pnpm test -- --filter @kouji-ui/core
```
Expected: all 4 tests pass.

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/dialog/dialog.directive.spec.ts
git commit -m "test(dialog): update spec for trigger-ref API"
```

---

## Task 4: Update index.ts

**Files:**
- Modify: `packages/core/src/dialog/index.ts`

- [ ] **Step 1: Replace the entire file**

```typescript
export {
  KjDialogTriggerDirective,
  KjDialogDirective,
  KjDialogOverlayDirective,
  KjDialogTitleDirective,
  KjDialogCloseDirective,
} from './dialog.directive';
export { KJ_DIALOG, type KjDialogContext } from './dialog.context';
export { KjDialogService, DIALOG_DATA, type KjDialogOpenConfig } from './dialog.service';
```

- [ ] **Step 2: Verify TypeScript compiles**

```
pnpm --filter @kouji-ui/core exec tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/dialog/index.ts
git commit -m "refactor(dialog): update public exports — remove Content/Description directives"
```

---

## Task 5: Rewrite dialog examples (all 4)

**Files:**
- Modify: `packages/core/src/dialog/dialog.example.ts`
- Modify: `packages/core/src/dialog/dialog.retro.example.ts`
- Modify: `packages/core/src/dialog/dialog.finance.example.ts`
- Modify: `packages/core/src/dialog/dialog.confirm.example.ts`

- [ ] **Step 1: Replace dialog.example.ts**

```typescript
import { Component } from '@angular/core';
import {
  KjDialogTriggerDirective, KjDialogDirective, KjDialogOverlayDirective,
  KjDialogTitleDirective, KjDialogCloseDirective,
} from './dialog.directive';
import { KjButtonDirective } from '../button/button.directive';

@Component({
  selector: 'kj-example-dialog-basic',
  standalone: true,
  imports: [
    KjDialogTriggerDirective, KjDialogDirective, KjDialogOverlayDirective,
    KjDialogTitleDirective, KjDialogCloseDirective,
    KjButtonDirective,
  ],
  styles: [`
    :host { display: flex; align-items: center; justify-content: center; padding: 3rem 2rem; background: #0c0c0c; font-family: 'JetBrains Mono', monospace; min-height: 160px; }
    button[kjButton] { padding: 0.5rem 1.5rem; border: none; cursor: pointer; font-family: inherit; font-size: 0.875rem; transition: opacity 0.15s; }
    [data-variant="default"] { background: #b8f500; color: #0c0c0c; }
    [data-variant="outline"] { background: transparent; color: #f0ede6; border: 1px solid #444; }
    ::ng-deep .kj-dialog-backdrop { background: rgba(0,0,0,0.75); }
    ::ng-deep .kj-dialog-panel { background: transparent; box-shadow: none; }
    ::ng-deep [kjDialogOverlay] { display: flex; align-items: center; justify-content: center; position: fixed; inset: 0; }
    ::ng-deep [kjDialog] { background: #1a1a1a; border: 1px solid #333; padding: 1.5rem; min-width: 20rem; color: #f0ede6; font-family: 'JetBrains Mono', monospace; }
    ::ng-deep [kjDialogTitle] { margin: 0 0 0.5rem; font-size: 1.125rem; color: #f0ede6; }
    ::ng-deep .dialog-body { margin: 0 0 1.5rem; font-size: 0.875rem; color: #888; line-height: 1.6; }
    ::ng-deep .dialog-actions { display: flex; gap: 0.75rem; justify-content: flex-end; }
    ::ng-deep .dialog-actions button[kjButton] { padding: 0.4rem 1rem; font-size: 0.8125rem; }
  `],
  template: `
    <button kjButton [kjVariant]="'default'" [kjDialogTrigger]="myDialog">Open Dialog</button>

    <ng-template #myDialog>
      <div kjDialogOverlay>
        <div kjDialog>
          <h2 kjDialogTitle>Edit Profile</h2>
          <p class="dialog-body">Make changes to your profile settings here.</p>
          <div class="dialog-actions">
            <button kjButton [kjVariant]="'outline'" kjDialogClose>Cancel</button>
            <button kjButton [kjVariant]="'default'" kjDialogClose>Save Changes</button>
          </div>
        </div>
      </div>
    </ng-template>
  `,
})
export class DialogBasicExample {}
```

- [ ] **Step 2: Replace dialog.retro.example.ts**

```typescript
import { Component } from '@angular/core';
import {
  KjDialogTriggerDirective, KjDialogDirective, KjDialogOverlayDirective,
  KjDialogTitleDirective, KjDialogCloseDirective,
} from './dialog.directive';

@Component({
  selector: 'kj-example-dialog-retro',
  standalone: true,
  imports: [
    KjDialogTriggerDirective, KjDialogDirective, KjDialogOverlayDirective,
    KjDialogTitleDirective, KjDialogCloseDirective,
  ],
  styles: [`
    :host { display: flex; align-items: center; justify-content: center; padding: 3rem 2rem; background: #fef9c3; font-family: 'Courier New', monospace; min-height: 160px; color: #000; }
    button {
      padding: 0.4rem 1rem; font-family: 'Courier New', monospace; font-size: 0.8rem; font-weight: 700;
      letter-spacing: 0.06em; text-transform: uppercase; background: #000; color: #fef9c3;
      border: 2px solid #000; cursor: pointer;
      box-shadow: 3px 3px 0 #000; transition: transform 0.08s, box-shadow 0.08s;
    }
    button:hover { transform: translate(-1px, -1px); box-shadow: 4px 4px 0 #000; }
    ::ng-deep .kj-dialog-backdrop { background: rgba(0,0,0,0.6); }
    ::ng-deep .kj-dialog-panel { background: transparent; box-shadow: none; }
    ::ng-deep [kjDialogOverlay] { display: flex; align-items: center; justify-content: center; position: fixed; inset: 0; }
    ::ng-deep [kjDialog] { background: #fef9c3; border: 2px solid #000; padding: 1.5rem; min-width: 20rem; box-shadow: 6px 6px 0 #000; font-family: 'Courier New', monospace; color: #000; }
    ::ng-deep [kjDialogTitle] { margin: 0 0 0.5rem; font-size: 1rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; border-bottom: 2px solid #000; padding-bottom: 0.5rem; color: #000; }
    ::ng-deep .dialog-body { margin: 0.75rem 0 1.5rem; font-size: 0.8rem; color: #444; line-height: 1.6; }
    ::ng-deep .dialog-actions { display: flex; gap: 0.5rem; justify-content: flex-end; }
    ::ng-deep [kjDialogOverlay] button { font-size: 0.75rem; padding: 0.3rem 0.875rem; box-shadow: 2px 2px 0 #000; }
    ::ng-deep [kjDialogOverlay] button:hover { box-shadow: 3px 3px 0 #000; }
    ::ng-deep .btn-primary { background: #16a34a; color: #fff; }
  `],
  template: `
    <button [kjDialogTrigger]="myDialog">Open Dialog</button>

    <ng-template #myDialog>
      <div kjDialogOverlay>
        <div kjDialog>
          <h2 kjDialogTitle>Edit Profile</h2>
          <p class="dialog-body">Make changes to your profile settings here.</p>
          <div class="dialog-actions">
            <button kjDialogClose>Cancel</button>
            <button class="btn-primary" kjDialogClose>Save Changes</button>
          </div>
        </div>
      </div>
    </ng-template>
  `,
})
export class DialogRetroExample {}
```

- [ ] **Step 3: Replace dialog.finance.example.ts**

```typescript
import { Component } from '@angular/core';
import {
  KjDialogTriggerDirective, KjDialogDirective, KjDialogOverlayDirective,
  KjDialogTitleDirective, KjDialogCloseDirective,
} from './dialog.directive';

@Component({
  selector: 'kj-example-dialog-finance',
  standalone: true,
  imports: [
    KjDialogTriggerDirective, KjDialogDirective, KjDialogOverlayDirective,
    KjDialogTitleDirective, KjDialogCloseDirective,
  ],
  styles: [`
    :host { display: flex; align-items: center; justify-content: center; padding: 3rem 2rem; background: #f9fafb; font-family: system-ui, -apple-system, sans-serif; min-height: 160px; }
    button {
      padding: 0.45rem 1.125rem; background: #3b82f6; color: #fff; border: 1px solid #3b82f6;
      border-radius: 6px; cursor: pointer; font-family: inherit; font-size: 0.875rem; font-weight: 500;
    }
    button:hover { background: #2563eb; }
    ::ng-deep .kj-dialog-backdrop { background: rgba(0,0,0,0.4); }
    ::ng-deep .kj-dialog-panel { background: transparent; box-shadow: none; }
    ::ng-deep [kjDialogOverlay] { display: flex; align-items: center; justify-content: center; position: fixed; inset: 0; }
    ::ng-deep [kjDialog] { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 1.5rem; min-width: 22rem; box-shadow: 0 20px 60px rgba(0,0,0,0.12); font-family: system-ui, -apple-system, sans-serif; color: #111827; }
    ::ng-deep [kjDialogTitle] { margin: 0 0 0.375rem; font-size: 1.0625rem; font-weight: 600; color: #111827; }
    ::ng-deep .dialog-body { margin: 0 0 1.5rem; font-size: 0.875rem; color: #6b7280; line-height: 1.6; }
    ::ng-deep .dialog-actions { display: flex; gap: 0.5rem; justify-content: flex-end; }
    ::ng-deep [kjDialogOverlay] button { padding: 0.4rem 1rem; font-size: 0.8125rem; font-weight: 500; border-radius: 6px; }
    ::ng-deep .btn-cancel { background: #fff; color: #374151; border: 1px solid #d1d5db; }
    ::ng-deep .btn-cancel:hover { background: #f9fafb; }
    ::ng-deep .btn-primary { background: #3b82f6; color: #fff; border: 1px solid #3b82f6; }
    ::ng-deep .btn-primary:hover { background: #2563eb; }
  `],
  template: `
    <button [kjDialogTrigger]="myDialog">Open Dialog</button>

    <ng-template #myDialog>
      <div kjDialogOverlay>
        <div kjDialog>
          <h2 kjDialogTitle>Edit Profile</h2>
          <p class="dialog-body">Make changes to your profile settings here.</p>
          <div class="dialog-actions">
            <button class="btn-cancel" kjDialogClose>Cancel</button>
            <button class="btn-primary" kjDialogClose>Save Changes</button>
          </div>
        </div>
      </div>
    </ng-template>
  `,
})
export class DialogFinanceExample {}
```

- [ ] **Step 4: Replace dialog.confirm.example.ts**

```typescript
import { Component, signal } from '@angular/core';
import {
  KjDialogTriggerDirective, KjDialogDirective, KjDialogOverlayDirective,
  KjDialogTitleDirective, KjDialogCloseDirective,
} from './dialog.directive';
import { KjButtonDirective } from '../button/button.directive';

@Component({
  selector: 'kj-example-dialog-confirm',
  standalone: true,
  imports: [
    KjDialogTriggerDirective, KjDialogDirective, KjDialogOverlayDirective,
    KjDialogTitleDirective, KjDialogCloseDirective,
    KjButtonDirective,
  ],
  styles: [`
    :host { display: flex; align-items: center; justify-content: center; gap: 1rem; padding: 3rem 2rem; background: #0c0c0c; font-family: 'JetBrains Mono', monospace; min-height: 160px; flex-direction: column; }
    .status { font-size: 0.8125rem; color: #666; min-height: 1.25rem; }
    .status.confirmed { color: #b8f500; }
    .status.cancelled { color: #ef4444; }
    button[kjButton] { padding: 0.5rem 1.5rem; border: none; cursor: pointer; font-family: inherit; font-size: 0.875rem; }
    [data-variant="destructive"] { background: #ef4444; color: #fff; }
    [data-variant="outline"] { background: transparent; color: #f0ede6; border: 1px solid #444; }
    ::ng-deep .kj-dialog-backdrop { background: rgba(0,0,0,0.75); }
    ::ng-deep .kj-dialog-panel { background: transparent; box-shadow: none; }
    ::ng-deep [kjDialogOverlay] { display: flex; align-items: center; justify-content: center; position: fixed; inset: 0; }
    ::ng-deep [kjDialog] { background: #1a1a1a; border: 1px solid #333; padding: 1.5rem; min-width: 22rem; color: #f0ede6; font-family: 'JetBrains Mono', monospace; }
    ::ng-deep [kjDialogTitle] { margin: 0 0 0.5rem; font-size: 1.125rem; color: #f0ede6; }
    ::ng-deep .dialog-body { margin: 0 0 1.5rem; font-size: 0.875rem; color: #888; line-height: 1.6; }
    ::ng-deep .dialog-actions { display: flex; gap: 0.75rem; justify-content: flex-end; }
    ::ng-deep .dialog-actions button[kjButton] { padding: 0.4rem 1rem; font-size: 0.8125rem; }
  `],
  template: `
    <button kjButton [kjVariant]="'destructive'"
            [kjDialogTrigger]="confirmDialog"
            (kjDialogClosed)="onResult($event)">
      Delete Account
    </button>

    <ng-template #confirmDialog>
      <div kjDialogOverlay>
        <div kjDialog #dlg="kjDialog">
          <h2 kjDialogTitle>Are you absolutely sure?</h2>
          <p class="dialog-body">This action cannot be undone. All your data will be permanently removed.</p>
          <div class="dialog-actions">
            <button kjButton [kjVariant]="'outline'" (click)="dlg.close('cancelled')">Cancel</button>
            <button kjButton [kjVariant]="'destructive'" (click)="dlg.close('confirmed')">Yes, delete</button>
          </div>
        </div>
      </div>
    </ng-template>

    <span class="status"
          [class.confirmed]="result() === 'confirmed'"
          [class.cancelled]="result() === 'cancelled'">
      {{ result() === 'confirmed' ? '✓ Account deleted' : result() === 'cancelled' ? '✕ Cancelled' : '' }}
    </span>
  `,
})
export class DialogConfirmExample {
  readonly result = signal<'confirmed' | 'cancelled' | null>(null);

  onResult(value: unknown): void {
    if (value === 'confirmed' || value === 'cancelled') {
      this.result.set(value);
    }
  }
}
```

- [ ] **Step 5: Update example-components.ts — verify imports still match**

Check `packages/core/src/example-components.ts` exports the dialog examples. The component class names haven't changed, so no update needed — just verify:
```bash
grep "Dialog" packages/core/src/example-components.ts
```
Expected output (all 4 should appear):
```
export { DialogBasicExample } from './dialog/dialog.example';
export { DialogRetroExample } from './dialog/dialog.retro.example';
export { DialogFinanceExample } from './dialog/dialog.finance.example';
export { DialogConfirmExample } from './dialog/dialog.confirm.example';
```

- [ ] **Step 6: Run all tests**

```
pnpm test
```
Expected: all tests pass (the dialog spec has 4 tests).

- [ ] **Step 7: Commit**

```bash
git add packages/core/src/dialog/dialog.example.ts \
        packages/core/src/dialog/dialog.retro.example.ts \
        packages/core/src/dialog/dialog.finance.example.ts \
        packages/core/src/dialog/dialog.confirm.example.ts
git commit -m "refactor(dialog): rewrite examples to trigger-ref pattern"
```
