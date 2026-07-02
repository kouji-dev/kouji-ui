import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { KjInputComponent } from '../../input/input';
import { KjInputGroupComponent, KjInputGroupAddonComponent } from '../input-group';

/**
 * Search-icon prefix followed by a text input.
 * The icon addon is decorative (kjAriaHidden="true"); the input carries the
 * accessible label via aria-label.
 */
@Component({
  selector: 'kj-input-group-icon-example',
  standalone: true,
  imports: [KjInputGroupComponent, KjInputGroupAddonComponent, KjInputComponent, FormsModule],
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <kj-input-group>
      <kj-input-group-addon [kjAriaHidden]="true">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
          focusable="false"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </kj-input-group-addon>
      <kj-input type="search" placeholder="Search…" [(ngModel)]="query" aria-label="Search" />
    </kj-input-group>
  `,
})
export class KjInputGroupIconExample {
  readonly query = signal('');
}
