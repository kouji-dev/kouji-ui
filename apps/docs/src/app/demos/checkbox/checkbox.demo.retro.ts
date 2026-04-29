import { Component, signal } from '@angular/core';
import { KjCheckboxDirective } from '@kouji-ui/core';

@Component({
  standalone: true,
  imports: [KjCheckboxDirective],
  styles: [`
    :host { display: block; padding: 2rem; background: #1c1410; }
    .list { display: flex; flex-direction: column; gap: 0.875rem; }
    .item { display: flex; align-items: center; gap: 0.875rem; cursor: pointer; }
    .box[kjCheckbox] { width: 18px; height: 18px; border: 2px solid #5a4030; background: #241810; display: flex; align-items: center; justify-content: center; flex-shrink: 0; border-radius: 3px; transition: all 0.2s; }
    .box[data-checked] { background: #f0a020; border-color: #f0a020; }
    .box[data-checked]::after { content: '✓'; color: #1c1410; font-size: 0.7rem; font-weight: bold; }
    span { color: #c8b090; font-family: Georgia, serif; font-size: 0.9rem; }
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
export class CheckboxDemoRetroComponent {
  terms = signal(false);
  newsletter = signal(true);
}
