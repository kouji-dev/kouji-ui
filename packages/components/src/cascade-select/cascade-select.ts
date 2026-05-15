import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  ViewEncapsulation,
} from '@angular/core';
import {
  KjCascadeSelect,
  KjCascadeSelectOption,
  KjCascadeSelectPanel,
  KjCascadeSelectSubPanel,
  KjCascadeSelectTrigger,
  KjIconDirective,
} from '@kouji-ui/core';

/**
 * Cascade-select root wrapper. Renders a trigger button + caret, the root
 * panel, and projects sub-tree options supplied by the consumer.
 *
 * Bind the selected leaf value via `[(kjValue)]`. Listen for the full path
 * via `(kjCascadePathChange)`.
 *
 * @doc-example Default
 *   The default playground — three-level country/state/city tree.
 *   @doc-file cascade-select.example.ts
 * @doc-example Usage
 *   The common shape — controlled leaf value with a path listener. Use this as
 *   the copy-paste starting point.
 *   @doc-file cascade-select.usage.example.ts
 * @doc-example Data-driven
 *   Build the option tree from a `TreeNode[]` source so it can be hydrated
 *   from an API response.
 *   @doc-file cascade-select.data-driven.example.ts
 * @doc-example Path output
 *   Bind `[(kjCascadePath)]` to mirror the full ancestor chain into the form.
 *   @doc-file cascade-select.path.example.ts
 * @doc-example In a field
 *   Wraps the trigger in `<kj-field>` for label / hint / error wiring.
 *   @doc-file cascade-select.field.example.ts
 * @doc-example Disabled options
 *   Mark an option `disabled` to skip it in navigation and prevent selection.
 *   @doc-file cascade-select.disabled.example.ts
 *
 * @doc-keyboard
 *   Enter|Space    — Opens the panel from the trigger; activates the focused option
 *   ArrowDown      — Moves focus to the next option in the current panel
 *   ArrowUp        — Moves focus to the previous option in the current panel
 *   ArrowRight     — Opens a branch option's sub-panel
 *   ArrowLeft      — Closes the current sub-panel and returns focus to its owner
 *   Home|End       — Jumps to the first / last option in the current panel
 *   Escape         — Closes all panels and returns focus to the trigger
 *
 * @doc-aria
 *   role                 — `combobox` on the trigger; each panel is `listbox`; options are `option`
 *   aria-haspopup        — `"listbox"` on the trigger
 *   aria-expanded        — Reflected on the trigger; flips with the panel open state
 *   aria-controls        — Trigger references the root panel id
 *   aria-activedescendant — Trigger references the currently-focused option id
 *   aria-disabled        — Reflected on disabled options
 *
 * @doc-touch
 *   The trigger inherits `<kj-button>` sizing — default `md` is ≥ 36px tall;
 *   bump to `lg` for touch-first surfaces. Option rows are full-width and
 *   meet WCAG 2.5.5 on the default padding.
 *
 * @doc-a11y
 *   Implements the WAI-ARIA APG Combobox + nested Listbox pattern. The panel
 *   is portalled via the shared overlay primitive so it escapes clipping
 *   ancestors. Selection emits at the leaf level via `[(kjValue)]`; the full
 *   ancestor chain is available via `[(kjCascadePath)]` for forms that need
 *   the breadcrumb.
 *
 * @doc-related select,tree-select,combobox
 *
 * @doc-category Library/Data input
 * @doc
 * @doc-name cascade-select
 * @doc-description Themed hierarchical select for multi-level option trees with hover or arrow-key sub-panel navigation.
 * @doc-is-main
 */
@Component({
  selector: 'kj-cascade-select',
  standalone: true,
  // Compose the umbrella KjCascadeSelect directive on the wrapper element.
  // Forwarding `kjValue`/`kjCascadePath` so the consumer can bind via
  // `[(value)]`/`[(cascadePath)]` on `<kj-cascade-select>`. The directive
  // provides `KJ_CASCADE_SELECT` (+ `KJ_SELECT`) at this element so
  // projected options/sub-panels resolve the same context via DI.
  hostDirectives: [
    {
      directive: KjCascadeSelect,
      inputs: ['kjValue', 'kjCascadePath'],
      outputs: ['kjValueChange', 'kjCascadePathChange'],
    },
  ],
  imports: [KjCascadeSelectTrigger, KjCascadeSelectPanel],
  template: `
    <button
      type="button"
      kjCascadeSelectTrigger
      #trigger="kjCascadeSelectTrigger"
      class="kj-cascade-trigger"
      [disabled]="disabled() || null"
    >
      <span class="kj-cascade-trigger-label">{{ displayLabel() }}</span>
      <span class="kj-cascade-trigger-caret" aria-hidden="true">▾</span>
    </button>
    <div
      kjCascadeSelectPanel
      class="kj-cascade-panel"
      [kjFor]="trigger"
    >
      <ng-content />
    </div>
  `,
  styleUrl: './cascade-select.css',
  encapsulation: ViewEncapsulation.None,
  host: {
    'class': 'kj-cascade-select',
    '[attr.data-disabled]': "disabled() ? '' : null",
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjCascadeSelectComponent {
  /** Placeholder shown when no value is selected. */
  readonly placeholder = input<string>('Select…');

  /** Whether the trigger is disabled. */
  readonly disabled = input(false);

  /** @internal — read the composed root directive's value for the label. */
  private readonly cascade = inject(KjCascadeSelect);

  /** @internal */
  readonly displayLabel = computed(() => {
    const v = this.cascade.value() as string | null | undefined;
    if (v === undefined || v === null || v === '') return this.placeholder();
    return String(v);
  });
}

/**
 * A single option row in a `<kj-cascade-select>`. Renders the option label
 * with an optional selection checkmark and a chevron glyph for branch options.
 * @doc
 * @doc-name cascade-select
 */
@Component({
  selector: 'kj-cascade-option',
  standalone: true,
  imports: [KjIconDirective],
  hostDirectives: [
    {
      directive: KjCascadeSelectOption,
      inputs: ['kjValue', 'kjLabel', 'kjDisabled'],
    },
  ],
  template: `
    <span class="kj-cascade-option-label">{{ option.kjLabel() }}</span>
    <i class="kj-cascade-option-chevron" kjIcon="chevron-right"></i>
    <ng-content />
  `,
  encapsulation: ViewEncapsulation.None,
  host: {
    'class': 'kj-cascade-option',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjCascadeOptionComponent {
  /** @internal — read kjLabel from the composed host directive for rendering. */
  protected readonly option = inject(KjCascadeSelectOption);
}

/**
 * Sub-panel container for child options of a `<kj-cascade-option>`.
 * Projects `<kj-cascade-option>` rows for the next level of the hierarchy.
 * @doc
 * @doc-name cascade-select
 */
@Component({
  selector: 'kj-cascade-sub-panel',
  standalone: true,
  hostDirectives: [
    {
      directive: KjCascadeSelectSubPanel,
      inputs: ['kjOwnerOptionId'],
    },
  ],
  template: `<ng-content />`,
  encapsulation: ViewEncapsulation.None,
  host: {
    'class': 'kj-cascade-sub-panel',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjCascadeSubPanelComponent {}
