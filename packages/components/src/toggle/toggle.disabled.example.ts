import { Component, signal } from '@angular/core';
import { KjToggleComponent } from './toggle';

@Component({
  selector: 'kj-toggle-disabled-example',
  standalone: true,
  imports: [KjToggleComponent],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }`],
  template: `
    <kj-toggle [(pressed)]="off" [disabled]="true" ariaLabel="Off (disabled)">Off</kj-toggle>
    <kj-toggle [(pressed)]="on" [disabled]="true" ariaLabel="On (disabled)" style="margin-left:1rem">On</kj-toggle>
  `,
})
export class KjToggleDisabledExample {
  readonly off = signal(false);
  readonly on = signal(true);
}
