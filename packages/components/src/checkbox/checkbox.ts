import { Component, ChangeDetectionStrategy, ViewEncapsulation, model, input, viewChild, ElementRef } from '@angular/core';
import { KjCheckbox } from '@kouji-ui/core';

let checkboxIdCounter = 0;

/**
 * Styled wrapper around the headless `KjCheckbox` directive.
 *
 * The host renders a `<label>` wrapping the checkbox box and any projected
 * content (label text). Clicking anywhere on the label checks/unchecks the
 * box. When `disabled` is set, both the box and label text dim via
 * `[data-disabled]` on the host.
 *
 * @doc-example Default
 *   The default checkbox bound to a `signal<boolean>` via `[(checked)]`.
 *   @doc-file checkbox.default.example.ts
 * @doc-example Usage
 *   A walkthrough of the most common checkbox usages — checked binding,
 *   indeterminate parent, size variants, and disabled.
 *   @doc-file checkbox.usage.example.ts
 * @doc-example Checked
 *   Pre-selected on first render. Two-way bind to persist user changes.
 *   @doc-file checkbox.checked.example.ts
 * @doc-example Indeterminate
 *   Tri-state "some-of-many" parent for a select-all row.
 *   @doc-file checkbox.indeterminate.example.ts
 * @doc-example Disabled
 *   `[disabled]="true"` dims the box + label and removes pointer events.
 *   @doc-file checkbox.disabled.example.ts
 *
 * @doc-keyboard
 *   Space — Toggles the checked state
 *   Tab   — Moves focus to the next focusable element
 *
 * @doc-aria
 *   role="checkbox"     — Applied to the inner focusable box by the headless directive
 *   aria-checked        — Reflects `true`, `false`, or `"mixed"` for indeterminate
 *   aria-disabled       — Reflected when `[disabled]` is true
 *   aria-labelledby     — Auto-wired to the projected label span
 *   data-disabled       — Mirrors the disabled posture for theme/scope hooks
 *   data-indeterminate  — Reflects the indeterminate posture for the dash glyph
 *
 * @doc-css-var
 *   --kj-checkbox-size         — Box edge length. `data-size="sm|lg"` overrides; default 1rem.
 *   --kj-checkbox-bg           — Unchecked background fill. Defaults to --kj-bg-body.
 *   --kj-checkbox-bg-checked   — Background when checked or indeterminate. Defaults to --kj-bg-primary.
 *   --kj-checkbox-fg-checked   — Checkmark/dash color. Defaults to --kj-fg-on-primary.
 *   --kj-checkbox-border       — Border color when unchecked. Defaults to --kj-border-default.
 *   --kj-checkbox-radius       — Corner radius of the box. Inherits --kj-radius-selector.
 *
 * @doc-touch
 *   The wrapping label is the click target — its width plus the `lg` size keeps
 *   the touch surface ≥ 44×44px. For dense form rows, `sm` / `md` rely on the
 *   inline-text-link exception (WCAG 2.5.5).
 *
 * @doc-a11y
 *   The visible label and the box share a single click region — the label
 *   forwards taps to the inner focusable span (which is the actual checkbox
 *   per the WAI-ARIA Checkbox pattern). Focus is restricted to the box;
 *   `:focus-visible` shows a 2px ring. Indeterminate is a presentation-only
 *   tri-state — committing to a value still flips between checked/unchecked.
 *
 * @doc-related toggle,radio,field
 *
 * @doc-category Library/Data input
 * @doc
 * @doc-name checkbox
 * @doc-description Themed checkbox with label, indeterminate state, and size variants for use in forms.
 * @doc-is-main
 */
@Component({
  selector: 'kj-checkbox',
  standalone: true,
  imports: [KjCheckbox],
  template: `
    <!-- Click-region wrapper. The focusable element is the inner kjCheckbox span
         (role="checkbox", tabindex, Space handler); this div only proxies pointer
         events from the label area, so the lint rules below don't apply. -->
    <!-- eslint-disable-next-line @angular-eslint/template/click-events-have-key-events, @angular-eslint/template/interactive-supports-focus -->
    <div class="kj-checkbox-inner" (click)="onLabelClick($event)">
      <span
        #box
        kjCheckbox
        tabindex="0"
        class="kj-checkbox-box"
        [(kjChecked)]="checked"
        [kjDisabled]="disabled()"
        [attr.data-size]="size()"
        [attr.data-indeterminate]="indeterminate() ? '' : null"
        [attr.aria-labelledby]="labelId"
      ></span>
      <span class="kj-checkbox-label" [id]="labelId"><ng-content /></span>
    </div>
  `,
  styleUrl: './checkbox.css',
  encapsulation: ViewEncapsulation.None,
  host: {
    'class': 'kj-checkbox',
    '[attr.data-disabled]': "disabled() ? '' : null",
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjCheckboxComponent {
  readonly checked = model<boolean>(false);
  readonly disabled = input(false);
  readonly indeterminate = input(false);
  readonly size = input<'sm' | 'md' | 'lg'>('md');

  protected readonly labelId = `kj-checkbox-${++checkboxIdCounter}`;

  private readonly box = viewChild.required<ElementRef<HTMLElement>>('box');

  /** Forward label-area clicks to the checkbox box. The box itself bubbles
   *  through, so we early-return to avoid a double-toggle. */
  protected onLabelClick(e: MouseEvent): void {
    if (this.disabled()) return;
    const boxEl = this.box().nativeElement;
    const target = e.target as Node;
    if (target === boxEl || boxEl.contains(target)) return;
    boxEl.click();
  }
}
