import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { KjToggleComponent } from '../toggle';

@Component({
  selector: 'kj-toggle-with-label-example',
  standalone: true,
  imports: [KjToggleComponent],
  styles: [
    `
      :host {
        display: block;
      }
      .row {
        display: inline-flex;
        align-items: center;
        gap: var(--kj-space-sm);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div class="row">
      <kj-toggle [(pressed)]="dark" ariaLabel="Dark mode"></kj-toggle>
      <span>Dark mode</span>
    </div>
  `,
})
export class KjToggleWithLabelExample {
  readonly dark = signal(false);
}
