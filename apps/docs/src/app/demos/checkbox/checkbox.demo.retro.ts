import { Component, signal } from '@angular/core';
import { KjCheckboxDirective } from '@kouji-ui/core';

@Component({
  selector: 'kj-demo-checkbox-retro',
  standalone: true,
  imports: [KjCheckboxDirective],
  styles: [`
    :host { display: block; padding: 2rem; background: #fef9c3; font-family: 'Courier New', monospace; }
    .list { display: flex; flex-direction: column; gap: 1rem; }
    .item { display: flex; align-items: center; gap: 0.875rem; cursor: pointer; }
    .box[kjCheckbox] {
      width: 18px; height: 18px;
      border: 2px solid #000;
      background: #fff;
      border-radius: 0;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
      box-shadow: 2px 2px 0 #000;
      transition: box-shadow 0.08s, transform 0.08s;
    }
    .box:hover { transform: translate(-1px, -1px); box-shadow: 3px 3px 0 #000; }
    .box[data-checked] { background: #16a34a; border-color: #000; }
    .box[data-checked]::after { content: '✓'; color: #fff; font-size: 0.75rem; font-weight: 900; font-family: 'Courier New', monospace; }
    span { color: #000; font-size: 0.82rem; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; }
  `],
  template: `
    <div class="list">
      <label class="item">
        <div class="box" kjCheckbox tabindex="0" [(kjChecked)]="terms" aria-label="Accept terms"></div>
        <span>I ACCEPT THE TERMS [{{ terms() ? 'YES' : 'NO' }}]</span>
      </label>
      <label class="item">
        <div class="box" kjCheckbox tabindex="0" [(kjChecked)]="newsletter" aria-label="Newsletter"></div>
        <span>SUBSCRIBE TO NEWSLETTER</span>
      </label>
    </div>
  `,
})
export class CheckboxDemoRetroComponent {
  terms = signal(false);
  newsletter = signal(true);
}
