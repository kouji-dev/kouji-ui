import { Component, signal } from '@angular/core';
import { KjCheckboxDirective } from '@kouji-ui/core';

@Component({
  selector: 'kj-demo-checkbox-finance',
  standalone: true,
  imports: [KjCheckboxDirective],
  styles: [`
    :host { display: block; padding: 1.5rem; background: #0a0e14; font-family: 'Courier New', monospace; }
    .list { display: flex; flex-direction: column; gap: 0.75rem; }
    .item { display: flex; align-items: center; gap: 0.75rem; cursor: pointer; }
    .box[kjCheckbox] {
      width: 14px; height: 14px;
      border: 1px solid #1f2d3d;
      background: #0d1117;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .box[data-checked] { background: #ff8c00; border-color: #ff8c00; }
    .box[data-checked]::after { content: '✓'; color: #0a0e14; font-size: 0.65rem; font-weight: 900; }
    span { color: #8b949e; font-size: 0.72rem; letter-spacing: 0.06em; text-transform: uppercase; }
    .status-dot { width: 6px; height: 6px; border-radius: 50%; background: #00b050; flex-shrink: 0; }
  `],
  template: `
    <div class="list">
      <label class="item">
        <div class="status-dot"></div>
        <div class="box" kjCheckbox tabindex="0" [(kjChecked)]="terms" aria-label="Confirm"></div>
        <span>CONFIRM ORDER TERMS</span>
      </label>
      <label class="item">
        <div class="status-dot" style="background:#00a3e0"></div>
        <div class="box" kjCheckbox tabindex="0" [(kjChecked)]="alerts" aria-label="Alerts"></div>
        <span>ENABLE PRICE ALERTS</span>
      </label>
    </div>
  `,
})
export class CheckboxDemoFinanceComponent {
  terms = signal(false);
  alerts = signal(true);
}
