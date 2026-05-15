import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { KjInputComponent } from '../input/input';
import { KjButtonComponent } from '../button/button';
import { KjInputGroupComponent, KjInputGroupAddonComponent } from './input-group';

/**
 * Input with a Search button suffix.
 */
@Component({
  selector: 'kj-input-group-button-example',
  standalone: true,
  imports: [
    KjInputGroupComponent,
    KjInputGroupAddonComponent,
    KjInputComponent,
    FormsModule,
    KjButtonComponent,
  ],
  styles: [`:host { display: block; }`],
  template: `
    <kj-input-group>
      <kj-input type="search" placeholder="Search…" [(ngModel)]="query" aria-label="Search" />
      <kj-input-group-addon>
        <kj-button kjVariant="default" (click)="onSearch()">Search</kj-button>
      </kj-input-group-addon>
    </kj-input-group>
  `,
})
export class KjInputGroupButtonExample {
  readonly query = signal('');

  onSearch(): void {
    // Search logic would go here.
  }
}
