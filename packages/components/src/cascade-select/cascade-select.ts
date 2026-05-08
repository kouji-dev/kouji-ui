import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  model,
  ViewEncapsulation,
} from '@angular/core';
import {
  KjCascadeSelect,
  KjCascadeSelectOption,
  KjCascadeSelectPanel,
  KjCascadeSelectSubPanel,
} from '@kouji-ui/core';
import { KjSelectTrigger } from '@kouji-ui/core';
import { KJ_SELECT } from '@kouji-ui/core';

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
  hostDirectives: [
    {
      directive: KjCascadeSelect,
      inputs: ['kjCascadePath'],
      outputs: ['kjCascadePathChange'],
    },
  ],
  imports: [KjSelectTrigger, KjCascadeSelectPanel],
  template: `
    <button
      type="button"
      kjSelectTrigger
      class="kj-cascade-trigger"
      aria-haspopup="tree"
      [disabled]="disabled() || null"
    >
      <span class="kj-cascade-trigger-label">{{ displayLabel() }}</span>
      <span class="kj-cascade-trigger-caret" aria-hidden="true">▾</span>
    </button>
    <div kjCascadeSelectPanel class="kj-cascade-panel">
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

  /** Two-way bindable selected leaf value. */
  readonly kjValue = model<unknown>(undefined);

  private readonly select = inject(KJ_SELECT);

  constructor() {
    // Sync kjValue model ↔ KjSelect (which is two levels deep via hostDirectives)
    // Sync outward: when KjSelect commits a leaf, update our kjValue model
    effect(() => {
      const v = this.select.value();
      if (v !== this.kjValue()) this.kjValue.set(v);
    });
    // Sync inward: when kjValue is set programmatically, push to KjSelect
    effect(() => {
      const v = this.kjValue();
      if (v !== this.select.value()) this.select.select(v);
    });
  }

  /** @internal */
  readonly displayLabel = computed(() => {
    const v = this.select.value() as string | null | undefined;
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
  hostDirectives: [
    {
      directive: KjCascadeSelectOption,
      inputs: ['kjValue', 'kjLabel', 'kjDisabled'],
    },
  ],
  template: `
    <span class="kj-cascade-option-label"><ng-content /></span>
    <span class="kj-cascade-option-chevron" aria-hidden="true">›</span>
  `,
  encapsulation: ViewEncapsulation.None,
  host: {
    'class': 'kj-cascade-option',
    'style': 'display: contents;',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjCascadeOptionComponent {}

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
