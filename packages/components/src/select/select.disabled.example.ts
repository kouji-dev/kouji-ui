import { Component, signal } from '@angular/core';
import { KjSelectComponent, KjSelectTriggerComponent, KjSelectContentComponent, KjOptionComponent } from './select';

@Component({
  selector: 'kj-select-disabled-example',
  standalone: true,
  imports: [KjSelectComponent, KjSelectTriggerComponent, KjSelectContentComponent, KjOptionComponent],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }`],
  template: `
    <kj-select [(value)]="lang" [disabled]="true">
      <kj-select-trigger>{{ lang() ?? 'Locked' }}</kj-select-trigger>
      <kj-select-content>
        <kj-option [value]="'en'">English</kj-option>
      </kj-select-content>
    </kj-select>
  `,
})
export class KjSelectDisabledExample { readonly lang = signal<string | undefined>('en'); }
