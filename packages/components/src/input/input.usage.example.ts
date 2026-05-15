import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { KjInputComponent } from './input';

/**
 * Common input shapes — text/email/password types, invalid state, disabled,
 * and (ngModel) two-way binding. Copy-paste starting point for forms.
 */
@Component({
  selector: 'kj-input-usage-example',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [KjInputComponent, FormsModule],
  styles: [`
    :host { display: flex; flex-direction: column; gap: var(--kj-space-md); max-width: 360px; }
    label { font: 500 var(--kj-text-sm)/1.4 var(--kj-font-sans); color: var(--kj-fg-default); }
    .row { display: flex; flex-direction: column; gap: var(--kj-space-xs); }
    code { font: var(--kj-text-xs)/1 var(--kj-font-mono); color: var(--kj-fg-muted); }
  `],
  template: `
    <div class="row">
      <label for="usage-name">Name</label>
      <kj-input id="usage-name" type="text" [(ngModel)]="name" placeholder="Ada Lovelace" />
      <code>value: {{ name() || '—' }}</code>
    </div>

    <div class="row">
      <label for="usage-email">Email</label>
      <kj-input id="usage-email" type="email" [invalid]="true" value="not-an-email" />
    </div>

    <div class="row">
      <label for="usage-pwd">Password</label>
      <kj-input id="usage-pwd" type="password" [disabled]="true" value="••••••••" />
    </div>
  `,
})
export class KjInputUsageExample {
  readonly name = signal('');
}
