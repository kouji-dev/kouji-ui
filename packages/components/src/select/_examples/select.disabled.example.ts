import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { KjSelectComponent, KjOptionComponent } from '../select';

@Component({
  selector: 'kj-select-disabled-example',
  standalone: true,
  imports: [KjSelectComponent, KjOptionComponent],
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <kj-select [(value)]="lang" [disabled]="true" placeholder="Locked">
      <kj-option [value]="'en'">English</kj-option>
    </kj-select>
  `,
})
export class KjSelectDisabledExample {
  readonly lang = signal<string | undefined>('en');
}
