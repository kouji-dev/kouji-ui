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
 *   @doc-file cascade-select.example.ts
 * @doc-example Data-driven
 *   @doc-file cascade-select.data-driven.example.ts
 * @doc-example Path output
 *   @doc-file cascade-select.path.example.ts
 * @doc-example In a field
 *   @doc-file cascade-select.field.example.ts
 * @doc-example Disabled options
 *   @doc-file cascade-select.disabled.example.ts
 * @category Library/Data input
 * @doc
 * @doc-name cascade-select
 * @doc-description Hierarchical select control for multi-level option trees — each level opens a sub-panel on hover or arrow key, the selected leaf value is two-way bindable, and the full selection path is available via `(kjCascadePathChange)`.
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
