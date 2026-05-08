import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  model,
  output,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import {
  KjCascadeSelectOption,
  KjCascadeSelectPanel,
  KjCascadeSelectSubPanel,
  KjCascadeSelectTrigger,
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
 */
@Component({
  selector: 'kj-cascade-select',
  standalone: true,
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
      #panel="kjCascadeSelectPanel"
      class="kj-cascade-panel"
      [kjFor]="trigger"
      [kjSelectValue]="kjValue()"
      (kjSelectValueChange)="kjValue.set($event)"
      [kjCascadePath]="kjCascadePath()"
      (kjCascadePathChange)="onPathChange($event)"
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

  /** Two-way bindable selected leaf value. */
  readonly kjValue = model<unknown>(undefined);

  /** Two-way bindable path of values from root to selected leaf. */
  readonly kjCascadePath = model<readonly unknown[]>([]);

  /** Emitted when the cascade path changes. */
  readonly kjCascadePathChange = output<readonly unknown[]>();

  private readonly panel = viewChild<KjCascadeSelectPanel>('panel');

  constructor() {
    // Mirror outward: when the panel commits a value, sync our model.
    effect(() => {
      const p = this.panel();
      if (!p) return;
      const v = p.value();
      if (v !== this.kjValue()) this.kjValue.set(v);
    });
  }

  /** @internal */
  onPathChange(path: readonly unknown[]): void {
    this.kjCascadePath.set(path);
    this.kjCascadePathChange.emit(path);
  }

  /** @internal */
  readonly displayLabel = computed(() => {
    const v = this.kjValue() as string | null | undefined;
    if (v === undefined || v === null || v === '') return this.placeholder();
    return String(v);
  });
}

/**
 * A single option row in a `<kj-cascade-select>`. Renders the option label
 * with an optional selection checkmark and a chevron glyph for branch options.
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
