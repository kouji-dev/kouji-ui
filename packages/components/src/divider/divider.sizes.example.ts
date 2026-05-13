import { Component } from '@angular/core';
import { KjDividerComponent } from './divider';

/**
 * Size presets — `sm` / `md` / `lg` — stacked vertically. The size
 * routing pairs a thicker stroke with looser surrounding spacing,
 * so the visual rhythm changes alongside the rule thickness.
 */
@Component({
  selector: 'kj-divider-sizes-example',
  standalone: true,
  imports: [KjDividerComponent],
  styles: [`
    :host { display: flex; flex-direction: column; gap: var(--kj-space-md); }
  `],
  template: `
    <p>Small — tight spacing, hairline rule.</p>
    <kj-divider kjSize="sm" />
    <p>Medium — the default size.</p>
    <kj-divider kjSize="md" />
    <p>Large — generous spacing, thicker rule.</p>
    <kj-divider kjSize="lg" />
    <p>Trailing content for the largest size.</p>
  `,
})
export class KjDividerSizesExample {}
