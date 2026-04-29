import { Component, signal } from '@angular/core';
import { KjCheckboxDirective } from '@kouji-ui/core';

@Component({
  selector: 'kj-demo-checkbox-retro',
  standalone: true,
  imports: [KjCheckboxDirective],
  styles: [`
    :host {
      display: block;
      padding: 1.5rem;
      background: #0d0208;
      background-image: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,136,0.03) 2px, rgba(0,255,136,0.03) 4px);
      font-family: 'Courier New', monospace;
    }
    .list { display: flex; flex-direction: column; gap: 1rem; }
    .item { display: flex; align-items: center; gap: 0.875rem; cursor: pointer; }
    .box[kjCheckbox] {
      width: 16px; height: 16px;
      border: 1px solid #00ff88;
      background: transparent;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 0 4px rgba(0,255,136,0.4);
    }
    .box[data-checked] { background: rgba(0,255,136,0.2); box-shadow: 0 0 8px #00ff88; }
    .box[data-checked]::after { content: '✓'; color: #00ff88; font-size: 0.7rem; font-weight: bold; text-shadow: 0 0 6px #00ff88; }
    span { color: #00ff88; font-size: 0.75rem; letter-spacing: 0.1em; text-transform: uppercase; }
  `],
  template: `
    <div class="list">
      <label class="item">
        <div class="box" kjCheckbox tabindex="0" [(kjChecked)]="terms" aria-label="Accept terms"></div>
        <span>ACCEPT TERMS [{{ terms() ? 'ON' : 'OFF' }}]</span>
      </label>
      <label class="item">
        <div class="box" kjCheckbox tabindex="0" [(kjChecked)]="newsletter" aria-label="Subscribe"></div>
        <span>SUBSCRIBE TO ALERTS</span>
      </label>
    </div>
  `,
})
export class CheckboxDemoRetroComponent {
  terms = signal(false);
  newsletter = signal(true);
}
