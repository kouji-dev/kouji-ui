import { Component, signal } from '@angular/core';
import { KjCheckboxDirective } from '@kouji-ui/core';

@Component({
  standalone: true,
  imports: [KjCheckboxDirective],
  styles: [`
    :host { display: block; padding: 2rem; background: #0c0c0c; }
    .list { display: flex; flex-direction: column; gap: 0.875rem; }
    .item { display: flex; align-items: center; gap: 0.875rem; cursor: pointer; }
    .box[kjCheckbox] { width: 18px; height: 18px; border: 2px solid #333; background: #111; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: background 0.15s, border-color 0.15s; }
    .box[data-checked] { background: #b8f500; border-color: #b8f500; }
    .box[data-checked]::after { content: '✓'; color: #0c0c0c; font-size: 0.7rem; font-weight: bold; }
    span { color: #888; font-family: 'JetBrains Mono', monospace; font-size: 0.875rem; }
  `],
  template: `
    <div class="list">
      <label class="item">
        <div class="box" kjCheckbox tabindex="0" [(kjChecked)]="terms" aria-label="Accept terms"></div>
        <span>Accept terms — {{ terms() ? '✓' : '○' }}</span>
      </label>
      <label class="item">
        <div class="box" kjCheckbox tabindex="0" [(kjChecked)]="newsletter" aria-label="Newsletter"></div>
        <span>Subscribe to newsletter</span>
      </label>
    </div>
  `,
})
export class CheckboxDemoComponent {
  terms = signal(false);
  newsletter = signal(true);
}
