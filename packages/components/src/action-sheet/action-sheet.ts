import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  inject,
} from '@angular/core';
import { KjSheet, KjSheetRef, SHEET_DATA, KjIconDirective } from '@kouji-ui/core';
import type { KjActionSheetAction, KjActionSheetOptions } from './action-sheet.service';

/**
 * Render body for an action sheet. Rendered programmatically by
 * {@link import('./action-sheet.service').KjActionSheetService} inside the
 * bottom-sheet primitive; reads its config from `SHEET_DATA` and resolves the
 * chosen action's `value` through the {@link KjSheetRef}.
 *
 * The action list is `role="menu"` with `role="menuitem"` rows; each row is a
 * ≥ 44px touch target.
 *
 * @internal
 */
@Component({
  selector: 'kj-action-sheet',
  standalone: true,
  imports: [KjSheet, KjIconDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <kj-sheet class="kj-action-sheet">
      @if (config.title) {
        <h2 class="kj-action-sheet__title">{{ config.title }}</h2>
      }
      @if (config.description) {
        <p class="kj-action-sheet__description">{{ config.description }}</p>
      }
      <div class="kj-action-sheet__list" role="menu" [attr.aria-label]="config.title ?? 'Actions'">
        @for (action of config.actions; track action.value) {
          <button
            type="button"
            role="menuitem"
            class="kj-action-sheet__item"
            [class.is-destructive]="action.role === 'destructive'"
            [disabled]="action.disabled ? true : null"
            (click)="select(action)"
          >
            @if (action.icon) {
              <i class="kj-action-sheet__icon" [kjIcon]="action.icon" aria-hidden="true"></i>
            }
            <span class="kj-action-sheet__label">{{ action.label }}</span>
          </button>
        }
      </div>
      @if (cancelLabel !== null) {
        <button
          type="button"
          class="kj-action-sheet__cancel"
          (click)="cancel()"
        >{{ cancelLabel }}</button>
      }
    </kj-sheet>
  `,
})
export class KjActionSheet<V = unknown> {
  /** Config injected via `SHEET_DATA` by the action-sheet service. */
  protected readonly config = inject<KjActionSheetOptions<V>>(SHEET_DATA);
  private readonly ref = inject<KjSheetRef<KjActionSheet<V>, V>>(KjSheetRef);

  protected get cancelLabel(): string | null {
    return this.config.cancelLabel === undefined ? 'Cancel' : this.config.cancelLabel;
  }

  /** Resolve the chosen action's value and close. */
  protected select(action: KjActionSheetAction<V>): void {
    if (action.disabled) return;
    this.ref.close(action.value);
  }

  /** Dismiss with `undefined`. */
  protected cancel(): void {
    this.ref.close(undefined);
  }
}

/**
 * Service-launched **action sheet** — a data-driven, iOS-style list of actions
 * presented in a bottom sheet. Inject `KjActionSheetService` and call `open()`
 * with a list of actions; selecting one resolves its `value`. Built entirely
 * on the bottom-sheet primitive, so it inherits the same focus trap, scroll
 * lock, drag-to-dismiss, and Escape handling. The wrapper component exists to
 * host this documentation page.
 *
 * @doc
 * @doc-name action-sheet
 * @doc-is-main
 * @doc-example Default
 *   A titled action sheet with a destructive action and a cancel row.
 *   @doc-file action-sheet.example.ts
 * @doc-example With icons
 *   Actions with leading icons; the selected value resolves through the ref.
 *   @doc-file action-sheet.icons.example.ts
 *
 * @doc-keyboard
 *   Escape        — Dismisses the sheet (resolves undefined)
 *   Tab / Shift+Tab — Cycles focus across the action rows (focus trap)
 *   Enter / Space — Activates the focused action row
 *
 * @doc-aria
 *   role      — Panel is "dialog"; the action list is "menu" with "menuitem" rows
 *   aria-label — The sheet is named by its title (or "Actions" fallback)
 *
 * @doc-touch
 *   Every action row and the cancel row is a ≥ 44px touch target (WCAG 2.5.5).
 *   The bottom sheet's grab handle dismisses via drag.
 *
 * @doc-a11y
 *   Inherits the bottom sheet's a11y contract: focus trapped and restored to
 *   the trigger on close, siblings inert while open, only the topmost overlay
 *   receives Escape and outside-click. Destructive rows use `--kj-danger-*`
 *   tokens which meet AAA contrast in both themes.
 *
 * @doc-related sheet,dialog,dropdown-menu
 *
 * @doc-category Library/Overlay
 */
@Component({
  selector: 'kj-action-sheet-shell',
  standalone: true,
  template: `<ng-content />`,
  styleUrl: './action-sheet.css',
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjActionSheetComponent {}
