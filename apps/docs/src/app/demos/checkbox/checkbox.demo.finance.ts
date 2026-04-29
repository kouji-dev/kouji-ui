import { Component, signal } from '@angular/core';
import { KjCheckboxDirective } from '@kouji-ui/core';

@Component({
  standalone: true,
  imports: [KjCheckboxDirective],
  styles: [`
    :host { display: block; padding: 2rem; background: #0a0d12; }
    .list { display: flex; flex-direction: column; gap: 0.75rem; }
    .item { display: flex; align-items: center; gap: 0.75rem; cursor: pointer; }
    .box[kjCheckbox] { width: 16px; height: 16px; border: 1px solid #1e2530; background: #0d1118; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all 0.1s; }
    .box[data-checked] { background: #00d4aa; border-color: #00d4aa; }
    .box[data-checked]::after { content: '✓'; color: #0a0d12; font-size: 0.65rem; font-weight: 700; }
    span { color: #8090a8; font-family: 'JetBrains Mono', monospace; font-size: 0.78rem; letter-spacing: 0.04em; }
  `],
  template: `
    <div class="list">
      <label class="item">
        <div class="box" kjCheckbox tabindex="0" [(kjChecked)]="terms" aria-label="Accept terms"></div>
        <span>ACCEPT TERMS — {{ terms() ? 'YES' : 'NO' }}</span>
      </label>
      <label class="item">
        <div class="box" kjCheckbox tabindex="0" [(kjChecked)]="newsletter" aria-label="Newsletter"></div>
        <span>SUBSCRIBE TO ALERTS</span>
      </label>
    </div>
  `,
})
export class CheckboxDemoFinanceComponent {
  terms = signal(false);
  newsletter = signal(true);
}
