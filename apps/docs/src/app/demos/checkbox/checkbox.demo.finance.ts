import { Component, signal } from '@angular/core';
import { KjCheckboxDirective } from '@kouji-ui/core';

@Component({
  selector: 'kj-demo-checkbox-finance',
  standalone: true,
  imports: [KjCheckboxDirective],
  styles: [`
    :host { display: block; padding: 1.75rem 2rem; background: #f9fafb; font-family: system-ui, -apple-system, sans-serif; }
    .list { display: flex; flex-direction: column; gap: 0.875rem; }
    .item { display: flex; align-items: center; gap: 0.625rem; cursor: pointer; }
    .box[kjCheckbox] {
      width: 16px; height: 16px;
      border: 1.5px solid #d1d5db;
      background: #ffffff;
      border-radius: 4px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
      transition: border-color 0.12s, background 0.12s, box-shadow 0.12s;
      box-shadow: 0 1px 2px rgba(0,0,0,0.04);
    }
    .box:hover { border-color: #3b82f6; }
    .box[data-checked] {
      background: #3b82f6;
      border-color: #3b82f6;
      box-shadow: 0 1px 3px rgba(59,130,246,0.3);
    }
    .box[data-checked]::after { content: '✓'; color: #fff; font-size: 0.65rem; font-weight: 700; }
    span { color: #374151; font-size: 0.875rem; font-weight: 500; }
    .sub { color: #6b7280; font-size: 0.75rem; font-weight: 400; margin-top: 1px; }
    .label-col { display: flex; flex-direction: column; }
  `],
  template: `
    <div class="list">
      <label class="item">
        <div class="box" kjCheckbox tabindex="0" [(kjChecked)]="terms" aria-label="Accept terms"></div>
        <div class="label-col">
          <span>Accept Terms &amp; Conditions</span>
          <span class="sub">You agree to our Terms of Service and Privacy Policy.</span>
        </div>
      </label>
      <label class="item">
        <div class="box" kjCheckbox tabindex="0" [(kjChecked)]="marketing" aria-label="Marketing"></div>
        <div class="label-col">
          <span>Marketing emails</span>
          <span class="sub">Receive product updates and announcements.</span>
        </div>
      </label>
    </div>
  `,
})
export class CheckboxDemoFinanceComponent {
  terms = signal(false);
  marketing = signal(true);
}
