import { Component, ChangeDetectionStrategy, ModelSignal, ViewEncapsulation, input, model } from '@angular/core';
import { KjButton } from '@kouji-ui/core';

/**
 * Styled wrapper around the headless KjButton directive.
 *
 * Variant and size are user-configurable strings. Configure the allowed values
 * and defaults via `provideKjButton(…)` at the application or component scope.
 *
 * @example
 * ```html
 * <kj-button kjVariant="destructive" kjSize="lg" [kjLoading]="busy()">
 *   Delete
 * </kj-button>
 * ```
 * @doc-example Default
 *   The default playground — variant `secondary`, size `md`, no states.
 *   @doc-file button.example.ts
 * @doc-example Variants
 *   Primary / secondary / ghost / destructive — pick the visual weight that
 *   matches the action's importance.
 *   @doc-file button.variants.example.ts
 * @doc-example Sizes
 *   `sm`, `md`, `lg` — `md` is the default. `sm` keeps a 44px touch target via
 *   padding so it stays WCAG 2.5.5 compliant.
 *   @doc-file button.sizes.example.ts
 * @doc-example Disabled
 *   `[disabled]="true"` removes the button from the tab order and dims it. Use
 *   for forms where validation hasn't passed.
 *   @doc-file button.disabled.example.ts
 * @doc-example Loading
 *   Toggle `[loading]="true"` while a request is in-flight. Implies disabled —
 *   don't set both.
 *   @doc-file button.loading.example.ts
 * @doc-example Pressed (toggle)
 *   Stateful toggle via `[kjPressed]`. `aria-pressed` is wired automatically.
 *   @doc-file button.pressed.example.ts
 * @doc-example Icon-only
 *   Provide `[kjAriaLabel]` for screen readers — dev-mode enforces it.
 *   @doc-file button.icon.example.ts
 * @doc-example Anchor as button
 *   Render as `<a>` while keeping button visuals — handy for navigation that
 *   needs to look like an action.
 *   @doc-file button.anchor.example.ts
 * @doc-example Configured presets
 *   `provideKjButton({ variant: 'primary' })` sets the default for every
 *   button in the injection scope.
 *   @doc-file button.configured.example.ts
 *
 * @doc-keyboard
 *   Enter|Space — Activates the button (native click on the underlying
 *     <button>; for [kjPressed] toggles this also flips the pressed state)
 *   Tab          — Moves focus to the next focusable element
 *
 * @doc-aria
 *   aria-disabled — Reflected when [kjDisabled] or [kjLoading] is true
 *   aria-busy     — Reflected when [kjLoading] is true
 *   aria-pressed  — Reflected when used as a toggle (kjPressed is bound)
 *   aria-label    — Wired through to the inner <button>; required for icon-only
 *   data-variant  — Mirrors the resolved variant for theme/scope hooks
 *   data-size     — Mirrors the resolved size for theme/scope hooks
 *
 * @doc-touch
 *   `size="lg"` and `size="icon"` meet WCAG 2.5.5 ≥ 44×44 by default.
 *   `sm` and `md` rely on the inline-text-link exception — embed in text only.
 *
 * @doc-a11y
 *   Renders a real <button type="..."> (defaults to "button"), so the
 *   native focus ring, click semantics, and form-submission behaviour
 *   are preserved. `KjFocusRing` (from kjButton) shows the outline on
 *   `:focus-visible` only — never on mouse-down. When used as an anchor
 *   via `[routerLink]`, Enter activates per native anchor semantics.
 *
 * @doc-related button-group,link,icon
 *
 * @doc-category Library/Actions
 * @doc
 * @doc-name button
 * @doc-is-main
 * @doc-description Themed button with variants, sizes, and built-in disabled, loading, and pressed states.
 */
@Component({
  selector: 'kj-button',
  standalone: true,
  imports: [KjButton],
  template: `
    <button
      [type]="kjType()"
      kjButton
      class="kj-button"
      [kjVariant]="kjVariant()"
      [kjSize]="kjSize()"
      [kjDisabled]="kjDisabled()"
      [kjLoading]="kjLoading()"
      [kjFullWidth]="kjFullWidth()"
      [(kjPressed)]="kjPressed"
      [attr.aria-label]="kjAriaLabel()"
    >
      @if (kjLoading()) {
        <span class="kj-button__spinner" aria-hidden="true"></span>
      }
      <ng-content />
    </button>
  `,
  styleUrl: './button.css',
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjButtonComponent {
  readonly kjVariant = input('default');
  readonly kjSize = input('md');
  readonly kjDisabled = input(false);
  readonly kjLoading = input(false);
  readonly kjFullWidth = input(false);
  // Field annotation matches the directive's — ng-packagr otherwise narrows
  // both sides to ModelSignal<boolean>, breaking the [(kjPressed)] binding.
  readonly kjPressed: ModelSignal<boolean | undefined> = model<boolean | undefined>(undefined);
  readonly kjType = input<'button' | 'submit' | 'reset'>('button');
  readonly kjAriaLabel = input<string | undefined>(undefined);
}
