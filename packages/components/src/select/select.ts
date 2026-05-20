import { Component, ChangeDetectionStrategy, ViewEncapsulation, contentChildren, forwardRef, input, inject, computed } from '@angular/core';
import { KjSelect, KjSelectTrigger, KjSelectContent, KjOption } from '@kouji-ui/core';

/**
 * Select root. Two-way bind via `[(value)]`.
 *
 * Users only need `<kj-select>` and `<kj-option>`. The trigger button and
 * listbox panel are rendered internally so the consumer markup stays minimal,
 * with theme tokens, placeholder text, and keyboard navigation already wired.
 *
 * @doc-keyboard
 *   Enter|Space    — Opens the listbox from the trigger; activates the focused option when open
 *   ArrowDown      — Moves focus to the next option (clamps at the end)
 *   ArrowUp        — Moves focus to the previous option (clamps at the start)
 *   Home           — Moves focus to the first option
 *   End            — Moves focus to the last option
 *   A-Z (type-ahead) — Focuses the first option whose visible text starts with the typed character
 *   Escape         — Closes the listbox and returns focus to the trigger
 *   Tab            — Closes the listbox and moves focus to the next focusable element
 *
 * @doc-aria
 *   aria-haspopup        — set to "listbox" on the trigger button
 *   aria-expanded        — set on the trigger; reflects the open/closed state of the listbox
 *   aria-controls        — links the trigger to the panel id
 *   aria-activedescendant — set on the panel; points to the id of the currently focused option
 *   aria-multiselectable  — set on the panel to "true" when [multiple] is true
 *   role="listbox"       — on the content panel (provided via KJ_OVERLAY_PANEL_ROLE)
 *   role="option"        — on each kj-option child
 *   aria-selected        — set on each option to "true" or "false"
 *   aria-disabled        — set on options when [kjDisabled] is true
 *   data-disabled / data-multiple — mirrors of the disabled / multiple state for CSS
 *
 * @doc-css-var
 *   --kj-select-trigger-height — Height of the trigger button. Sizes (sm/md/lg) override.
 *
 * @doc-touch
 *   Default trigger height is 36px. Apply `data-size="lg"` on `<kj-select>` to bump the trigger to 2.75rem (44px) and meet WCAG 2.5.5 for touch-first layouts. Options have padding-only sizing and rely on their text affordance.
 *
 * @doc-a11y
 *   The listbox follows the WAI-ARIA combobox/listbox pattern. The panel is
 *   portalled to `document.body` so it escapes clipping ancestors while still
 *   being announced as the trigger's popup via `aria-controls`. Selection
 *   tracking uses `Object.is` so primitive and reference values both work.
 *   In single-select mode the panel closes on activation; in multi mode
 *   ([multiple]="true") the panel stays open and `aria-multiselectable="true"`
 *   is exposed for assistive tech.
 *
 * @doc-related combobox,cascade-select,radio-group
 *
 * @doc-example Default
 *   A single-value fruit picker — the bare-minimum recipe.
 *   @doc-file select.default.example.ts
 * @doc-example Usage
 *   A walkthrough of the most common usages — placeholder, pre-selected,
 *   and disabled. Use this as the copy-paste starting point.
 *   @doc-file select.usage.example.ts
 * @doc-example With placeholder
 *   `placeholder="…"` is shown until a value is bound.
 *   @doc-file select.placeholder.example.ts
 * @doc-example Disabled
 *   `[disabled]="true"` removes the trigger from the tab order.
 *   @doc-file select.disabled.example.ts
 * @doc-example Grouped options
 *   Cluster options under headings for richer listbox menus.
 *   @doc-file select.grouped.example.ts
 * @doc-category Library/Data input
 * @doc
 * @doc-name select
 * @doc-description Themed dropdown select with a trigger button, listbox panel, and keyboard navigation.
 * @doc-is-main
 */
@Component({
  selector: 'kj-select',
  standalone: true,
  hostDirectives: [
    { directive: KjSelect, inputs: ['kjSelectValue: value'], outputs: ['kjSelectValueChange: valueChange'] },
  ],
  imports: [KjSelectTrigger, KjSelectContent],
  template: `
    <button type="button" kjSelectTrigger #trig="kjSelectTrigger" class="kj-select-trigger" aria-haspopup="listbox" [disabled]="disabled() || null" [kjMultiple]="multiple()">
      <span class="kj-select-trigger-label">{{ displayLabel() }}</span>
      <span class="kj-select-trigger-caret" aria-hidden="true">▾</span>
    </button>
    <kj-select-content [kjFor]="trig" class="kj-select-content">
      <ng-content />
    </kj-select-content>
  `,
  styleUrl: './select.css',
  encapsulation: ViewEncapsulation.None,
  host: {
    'class': 'kj-select',
    '[attr.data-disabled]': "disabled() ? '' : null",
    '[attr.data-multiple]': "multiple() ? '' : null",
    '[attr.data-size]': "kjSize() === 'md' ? null : kjSize()",
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjSelectComponent {
  readonly placeholder = input<string>('Select…');
  readonly disabled = input(false);
  readonly multiple = input(false);
  readonly kjSize = input<'xs' | 'sm' | 'md' | 'lg'>('md');

  private readonly select = inject(KjSelect);

  /**
   * Trigger element signal — sourced from the headless `KjSelect` root,
   * which is set the moment the inner `KjSelectTrigger` directive
   * constructs. No view-query lifecycle wait, so callers reading this
   * inside an `effect()` see it resolve as soon as the select is mounted.
   */
  readonly triggerEl = this.select.triggerEl;

  /** Focus the trigger button. Delegates to the headless root. */
  focus(): void {
    this.select.focus();
  }

  /** Direct projection-child query — every `<kj-option>` placed inside this
   *  `<kj-select>` registers here. `forwardRef` is required because
   *  `KjOptionComponent` is declared later in the same file. We resolve the
   *  trigger label by matching the active value against each option's
   *  `value` input, not by reading `KjListItem.label()` from the select's
   *  deeper content (which doesn't reliably descend into a projected
   *  component's view). */
  private readonly options = contentChildren<KjOptionComponent>(
    forwardRef(() => KjOptionComponent) as unknown as typeof KjOptionComponent,
  );

  /** Resolve a value to its matching option's label. Falls back to
   *  `String(v)` only when no option has registered for that value yet. */
  private labelFor(v: unknown): string {
    for (const opt of this.options()) {
      if (Object.is(opt.value(), v)) {
        const explicit = opt.kjLabel();
        return explicit || String(v);
      }
    }
    return String(v);
  }

  readonly displayLabel = computed(() => {
    const v = this.select.value();
    if (v === undefined || v === null || v === '') return this.placeholder();
    if (Array.isArray(v)) {
      return v.length === 0
        ? this.placeholder()
        : v.map((entry) => this.labelFor(entry)).join(', ');
    }
    return this.labelFor(v);
  });
}

/**
 * Single option row.
 * @doc
 * @doc-name select
 */
@Component({
  selector: 'kj-option',
  standalone: true,
  imports: [KjOption],
  template: `<div kjOption [kjOptionValue]="value()" [kjOptionLabel]="kjLabel()" class="kj-option"><ng-content /></div>`,
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjOptionComponent {
  readonly value = input.required<unknown>();

  /** Explicit label for the trigger's displayed text. The select wrapper
   *  reads this via its own `contentChildren(KjOptionComponent)` query for
   *  reliable label resolution that doesn't depend on KjListItem's
   *  textContent-after-content-init lifecycle. */
  readonly kjLabel = input<string>('');
}
