import { Component, signal } from '@angular/core';
import { KjCheckboxDirective } from './checkbox.directive';

@Component({
  standalone: true,
  imports: [KjCheckboxDirective],
  styles: [`
    .row { display: flex; flex-direction: column; gap: 1rem; padding: 2rem; background: #0c0c0c; }
    .item { display: flex; align-items: center; gap: 0.75rem; }
    [kjCheckbox] { width: 18px; height: 18px; border: 2px solid #333; background: #111; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    [data-checked] { background: #b8f500; border-color: #b8f500; }
    [data-checked]::after { content: '✓'; color: #0c0c0c; font-size: 0.75rem; font-weight: bold; }
    span { color: #888; font-family: 'JetBrains Mono', monospace; font-size: 0.875rem; }
  `],
  template: `
    <div class="row">
      <div class="item">
        <div kjCheckbox tabindex="0" [(kjChecked)]="terms" aria-label="Accept terms"></div>
        <span>Accept terms — {{ terms() ? 'checked' : 'unchecked' }}</span>
      </div>
      <div class="item">
        <div kjCheckbox tabindex="0" [(kjChecked)]="newsletter" aria-label="Newsletter"></div>
        <span>Subscribe to newsletter</span>
      </div>
    </div>
  `,
})
export class CheckboxExampleComponent {
  terms = signal(false);
  newsletter = signal(true);
}
