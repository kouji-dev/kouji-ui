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
 *   The default playground — an unpressed toggle with an icon-only label.
 *   @doc-file toggle.default.example.ts
 * @doc-example Usage
 *   A walkthrough of the most common toggle usages — two-way `[(pressed)]`,
 *   disabled, with a text label, and the switch appearance.
 *   @doc-file toggle.usage.example.ts
 * @doc-example Checked
 *   Pre-pressed state via `[pressed]="true"` — flips `aria-pressed`.
 *   @doc-file toggle.checked.example.ts
 * @doc-example Disabled
 *   `[disabled]="true"` removes the toggle from the tab order.
 *   @doc-file toggle.disabled.example.ts
 * @doc-example With label
 *   Project a text label next to the toggle for non-icon contexts.
 *   @doc-file toggle.with-label.example.ts
 *
 * @doc-keyboard
 *   Enter|Space — Flips the pressed state and fires `(pressedChange)`
 *   Tab         — Moves focus to the next focusable element
 *
 * @doc-aria
 *   role="switch"   — applied by the headless `KjToggle` directive
 *   aria-pressed    — reflects the two-way `[(pressed)]` model
 *   aria-disabled   — reflected when `[disabled]="true"`
 *   aria-label      — required for icon-only toggles (dev-mode enforces it)
 *   data-size       — Mirrors the resolved size for theme hooks
 *   data-appearance — Mirrors `'press'` vs `'switch'` for CSS hooks
 *
 * @doc-touch
 *   `md` (default) and `lg` meet WCAG 2.5.5 (≥ 44×44). `sm` density retains
 *   the floor via padding — only horizontal padding shrinks.
 *
 * @doc-a11y
 *   Renders a real `<button role="switch">` so AT announces the pressed
 *   state and the native focus ring lights up on `:focus-visible`. The
 *   switch appearance is purely visual — the same `role="switch"` semantics
 *   apply, so consumers can swap chrome without re-wiring AT.
 *
 * @doc-related checkbox,button,radio
 *
 * @doc-css-var
 *   --kj-toggle-bg          — Unpressed background fill.
 *   --kj-toggle-bg-pressed  — Pressed-state background fill. Defaults to --kj-bg-primary.
 *   --kj-toggle-fg          — Unpressed foreground (label/icon) color.
 *   --kj-toggle-fg-pressed  — Pressed-state foreground color.
 *   --kj-toggle-radius      — Corner radius. Inherits --kj-radius-field.
 *   --kj-toggle-padding-x   — Horizontal padding. Sizes override.
 *   --kj-toggle-padding-y   — Vertical padding. Sizes override.
 *   --kj-toggle-font-size   — Font size. Sizes (sm/md/lg) override.
 *   --kj-switch-w           — Switch-appearance track width. Default 44px.
 *   --kj-switch-h           — Switch-appearance track height. Default 24px.
 *   --kj-switch-thumb       — Switch-appearance thumb diameter. Default 18px.
 *   --kj-switch-pad         — Inner padding between thumb and track. Default 2px.
 *
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
