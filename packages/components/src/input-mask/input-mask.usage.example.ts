import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { KjInputMaskComponent } from './input-mask';

/**
 * Common mask patterns assembled into one screen — phone, date, and credit
 * card. Copy-paste starting point for masked forms.
 */
@Component({
  selector: 'kj-input-mask-usage-example',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [KjInputMaskComponent, FormsModule],
  styles: [`
    :host { display: flex; flex-direction: column; gap: var(--kj-space-md); max-width: 360px; }
    label { font: 500 var(--kj-text-sm)/1.4 var(--kj-font-sans); }
    .row { display: flex; flex-direction: column; gap: var(--kj-space-xs); }
    code { font: var(--kj-text-xs)/1 var(--kj-font-mono); color: var(--kj-fg-muted); }
  `],
  template: `
    <div class="row">
      <label for="usage-phone">Phone</label>
      <kj-input-mask id="usage-phone" kjMask="(999) 999-9999" [(ngModel)]="phone" />
      <code>{{ phone() || '—' }}</code>
    </div>

    <div class="row">
      <label for="usage-date">Date</label>
      <kj-input-mask id="usage-date" kjMask="9999-99-99" [(ngModel)]="date" />
      <code>{{ date() || '—' }}</code>
    </div>

    <div class="row">
      <label for="usage-card">Card</label>
      <kj-input-mask id="usage-card" kjMask="9999 9999 9999 9999" [(ngModel)]="card" />
      <code>{{ card() || '—' }}</code>
    </div>
  `,
})
export class KjInputMaskUsageExample {
  readonly phone = signal('');
  readonly date = signal('');
  readonly card = signal('');
}
