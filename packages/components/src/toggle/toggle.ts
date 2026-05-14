import { Component, ChangeDetectionStrategy, ViewEncapsulation, model, input } from '@angular/core';
import { KjToggle } from '@kouji-ui/core';

/**
 * Styled wrapper around the headless `KjToggle` directive.
 *
 * The host `<kj-toggle>` is `display: contents`. Internally renders a real
 * `<button>` with the `kjToggle` directive applied. Two-way bind via
 * `[(pressed)]`; the wrapper exposes the same press model.
 *
 * @doc-example Default
 *   @doc-file toggle.default.example.ts
 * @doc-example Checked
 *   @doc-file toggle.checked.example.ts
 * @doc-example Disabled
 *   @doc-file toggle.disabled.example.ts
 * @doc-example With label
 *   @doc-file toggle.with-label.example.ts
 * @doc-category Library/Data input
 * @doc
 * @doc-name toggle
 * @doc-description Themed press/unpress toggle button for binary on/off controls.
 * @doc-is-main
 */
@Component({
  selector: 'kj-toggle',
  standalone: true,
  imports: [KjToggle],
  template: `
    <button
      type="button"
      kjToggle
      class="kj-toggle"
      [class.kj-toggle--switch]="appearance() === 'switch'"
      [(kjPressed)]="pressed"
      [kjDisabled]="disabled()"
      [attr.data-size]="size()"
      [attr.data-appearance]="appearance()"
      [attr.aria-label]="ariaLabel()"
    >
      @if (appearance() === 'switch') {
        <span class="kj-toggle__track" aria-hidden="true">
          <span class="kj-toggle__thumb"></span>
        </span>
      }
      <ng-content />
    </button>
  `,
  styleUrl: './toggle.css',
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjToggleComponent {
  readonly pressed = model<boolean>(false);
  readonly disabled = input(false);
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  readonly ariaLabel = input<string | undefined>(undefined);
  /**
   * `'press'` (default) renders the toggle as a press/unpress button — the
   * classic kj-toggle look. `'switch'` renders a track+thumb sliding switch
   * matching `app.css .toggle` from the design source. Both keep
   * `role="switch"` + `aria-pressed` semantics from `kjToggle`.
   */
  readonly appearance = input<'press' | 'switch'>('press');
}
