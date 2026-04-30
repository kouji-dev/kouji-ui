# Dialog Rework — Design Spec

**Date:** 2026-04-30
**Scope:** `packages/core/src/dialog/` + example files + `index.ts`

---

## Goal

Replace the current wrapper-based dialog API with a trigger-ref pattern inspired by angularprimitives.com. The `kjDialog` directive moves inside the user's template (onto the panel element), the trigger takes a `TemplateRef` input, and ARIA is wired automatically with no manual binding.

---

## New Usage Pattern

```html
<!-- Trigger — anywhere in the template, no wrapper needed -->
<button kjButton [kjDialogTrigger]="myDialog">Open</button>

<!-- Template — user owns the full overlay structure -->
<ng-template #myDialog>
  <div kjDialogOverlay>
    <div kjDialog #dlg="kjDialog">
      <h2 kjDialogTitle>Edit Profile</h2>
      <p>Make changes to your profile settings here.</p>
      <div class="dialog-footer">
        <button kjButton kjDialogClose>Cancel</button>
        <button kjButton (click)="dlg.close('saved')">Save</button>
      </div>
    </div>
  </div>
</ng-template>
```

`kjDialog` is exported as `'kjDialog'` so users can get a template ref (`#dlg="kjDialog"`) and call `dlg.close(result?)` to close with a result value. For buttons that just close without a result, `kjDialogClose` is the convenience shorthand.

---

## Directive API

### `KjDialogTriggerDirective` — `[kjDialogTrigger]`

The entry point. Holds CDK Dialog lifecycle, generates `dialogId`, provides `KJ_DIALOG` context via `ViewContainerRef` so all directives inside the template can inject it.

**Inputs:**
- `kjDialogTrigger: TemplateRef<KjDialogTemplateContext>` (required) — the template to open
- `kjDialogCloseOnEscape: boolean` (default: `true`) — whether Escape closes the dialog
- `kjDialogCloseOnBackdrop: boolean` (default: `true`) — passed through to `KjDialogOverlayDirective` via context; overlay reads this to decide whether a click closes

**Outputs:**
- `kjDialogClosed: OutputEmitterRef<unknown>` — emits the result value when the dialog closes

**Host:**
- `[attr.aria-haspopup]="'dialog'"`
- `[attr.aria-expanded]="open().toString()"`
- `(click)` → opens dialog

**Provides:** `KJ_DIALOG` token (useExisting this directive)

**Implements:** `KjDialogContext` interface — exposes `open`, `dialogId`, `close(result?)`, `closeOnEscape`, `closeOnBackdrop`

---

### `KjDialogOverlayDirective` — `[kjDialogOverlay]`

The backdrop element inside the template. Pure CSS target. Optionally closes the dialog on click.

**Inputs:**
- `kjDialogOverlayCloseOnClick: boolean` (default: `true`)

**Host:**
- `(click)` → if `kjDialogOverlayCloseOnClick`, calls `ctx.close()`

**Injects:** `KJ_DIALOG`

---

### `KjDialogDirective` — `[kjDialog]`

The panel container inside the template. Provides accessibility wiring automatically so users never write `aria-labelledby` manually.

**Inputs:** none (configuration is on the trigger)

**Exported as:** `'kjDialog'` — enables `#dlg="kjDialog"` template refs for `dlg.close(result?)`

**Host:**
- `[attr.role]="'dialog'"`
- `[attr.aria-modal]="'true'"`
- `[attr.aria-labelledby]="ctx.dialogId + '-title'"` — auto-wired; works as long as `kjDialogTitle` is present

**Injects:** `KJ_DIALOG`

---

### `KjDialogTitleDirective` — `[kjDialogTitle]`

Sets the `id` that `kjDialog` uses for `aria-labelledby`.

**Host:**
- `[attr.id]="ctx.dialogId + '-title'"`

**Injects:** `KJ_DIALOG`

---

### `KjDialogCloseDirective` — `[kjDialogClose]`

Convenience directive for buttons that close the dialog without a result value. Users who need to close with a result use `(click)="close(result)"` from the template context instead.

**Host:**
- `(click)` → `ctx.close()`

**Injects:** `KJ_DIALOG`

---

## Context Interface

```typescript
export interface KjDialogContext {
  readonly open: Signal<boolean>;
  readonly dialogId: string;
  readonly closeOnEscape: Signal<boolean>;
  readonly closeOnBackdrop: Signal<boolean>;
  close(result?: unknown): void;
}

export const KJ_DIALOG = new InjectionToken<KjDialogContext>('KjDialog');
```

---

## CDK Integration

`KjDialogTriggerDirective` calls:
```typescript
this.dialogRef = this.cdkDialog.open(this.kjDialogTrigger(), {
  viewContainerRef: this.vcr,      // preserves injection hierarchy so KJ_DIALOG is injectable inside template
  disableClose: !this.kjDialogCloseOnEscape(),  // CDK handles Escape key
  backdropClass: 'kj-dialog-backdrop',
  panelClass: 'kj-dialog-panel',
  autoFocus: 'first-tabbable',
  restoreFocus: true,
});
```

`KjDialogOverlayDirective` handles backdrop click via its own `(click)` host listener reading `ctx.closeOnBackdrop`. CDK's backdrop is not used for click-to-close — the user places `kjDialogOverlay` on their own overlay `<div>` inside the template.

---

## What Is Removed

| Removed | Reason |
|---|---|
| Wrapper `<div kjDialog>` pattern | No longer needed — trigger takes a TemplateRef |
| `KjDialogContentDirective` (`[kjDialogContent]`) | Replaced by `#myDialog` template ref on `<ng-template>` |
| `KjDialogDescriptionDirective` | `aria-describedby` is optional; users set `id` manually if needed |
| `KjDialogContext.registerTemplate()` | No longer needed — trigger owns the template ref directly |
| `KjDialogContext.show()` | Renamed to `close()` only; trigger handles open |

---

## Examples to Update

All 4 examples (`dialog.example.ts`, `dialog.retro.example.ts`, `dialog.finance.example.ts`, `dialog.confirm.example.ts`) rewritten to use the new pattern.

The confirm example uses `(kjDialogClosed)` output to capture the result and `#dlg="kjDialog"` to close with a value:
```html
<button [kjDialogTrigger]="confirmDialog" (kjDialogClosed)="onResult($event)">Delete</button>

<ng-template #confirmDialog>
  <div kjDialogOverlay>
    <div kjDialog #dlg="kjDialog">
      <h2 kjDialogTitle>Delete Account</h2>
      <p>This action cannot be undone.</p>
      <div class="dialog-footer">
        <button kjDialogClose>Cancel</button>
        <button (click)="dlg.close('confirmed')">Confirm</button>
      </div>
    </div>
  </div>
</ng-template>
```

---

## Files Touched

| File | Change |
|---|---|
| `dialog.context.ts` | New `KjDialogContext`, `KjDialogTemplateContext`, `KJ_DIALOG` |
| `dialog.directive.ts` | Full rewrite — 5 directives |
| `dialog.example.ts` | Rewrite to new pattern |
| `dialog.retro.example.ts` | Rewrite to new pattern |
| `dialog.finance.example.ts` | Rewrite to new pattern |
| `dialog.confirm.example.ts` | Rewrite using `(kjDialogClosed)` output |
| `dialog.service.ts` | No change (programmatic API stays as-is) |
| `index.ts` | Remove `KjDialogContentDirective`, update exports |
