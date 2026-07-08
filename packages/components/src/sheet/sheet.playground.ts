import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { KjSheet, KjSheetRef, KjSheetService, type KjSheetDetent } from '@kouji-ui/core';
import { KjButtonComponent } from '../button/button';
import type { PlaygroundFile } from '@kouji-ui/components/playground-types';

/**
 * Playground state — module-scope signals. `detent` sets the initial resting
 * height and `dismissible` toggles the grab handle + drag-to-dismiss affordance.
 */
const detent = signal<KjSheetDetent>('auto');
const dismissible = signal(true);

/** Small projected body rendered inside the bottom sheet. */
@Component({
  selector: 'kj-sheet-playground-body',
  standalone: true,
  imports: [KjSheet, KjButtonComponent],
  template: `<kj-sheet>
    <h2 class="kj-sheet__title">Bottom sheet</h2>
    <p class="kj-sheet__description">Opened at the configured detent.</p>
    <div class="kj-sheet__footer" data-align="end">
      <kj-button kjSize="lg" (click)="ref.close()">Done</kj-button>
    </div>
  </kj-sheet>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjSheetPlaygroundBody {
  protected readonly ref = inject(KjSheetRef);
}

@Component({
  selector: 'kj-sheet-playground',
  standalone: true,
  imports: [KjButtonComponent],
  template: `<kj-button (click)="open()">Open bottom sheet</kj-button>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjSheetPlaygroundDemo {
  protected readonly detent = detent;
  protected readonly dismissible = dismissible;

  private readonly sheet = inject(KjSheetService);

  protected open(): void {
    this.sheet.open(KjSheetPlaygroundBody, {
      detent: detent(),
      dismissible: dismissible(),
    });
  }
}

export const PLAYGROUND: PlaygroundFile = {
  component: KjSheetPlaygroundDemo,
  state: {
    detent: detent as unknown as ReturnType<typeof signal>,
    dismissible: dismissible as unknown as ReturnType<typeof signal>,
  },
  controls: [
    { kind: 'chips', name: 'detent', label: 'detent', options: ['auto', 'half', 'full'] },
    { kind: 'toggle', name: 'dismissible', label: 'dismissible' },
  ],
  snippet: (values) => {
    const s = values as { detent: string; dismissible: boolean };
    return `sheet.open(SheetBody, {\n  detent: '${s.detent}',\n  dismissible: ${s.dismissible},\n});`;
  },
};
