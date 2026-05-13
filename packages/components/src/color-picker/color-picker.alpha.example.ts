import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { KjColorPickerComponent } from './color-picker';

/**
 * Color-picker with the alpha slider mounted. When alpha < 1 the
 * trigger swatch shows a checkerboard backdrop and the emitted hex
 * grows to eight digits (`#rrggbbaa`).
 */
@Component({
  selector: 'kj-color-picker-alpha-example',
  standalone: true,
  imports: [KjColorPickerComponent, FormsModule],
  styles: [`
    :host { display: flex; gap: var(--kj-space-md); align-items: center;
            padding: var(--kj-space-xl); background: var(--kj-bg-surface); min-height: 280px; }
    code { font: 0.8125rem/1 var(--kj-font-mono, monospace); color: var(--kj-fg-muted); }
  `],
  template: `
    <kj-color-picker [(ngModel)]="hex" [kjShowAlpha]="true" />
    <code>{{ hex() }}</code>
  `,
})
export class KjColorPickerAlphaExample {
  readonly hex = signal('#ec489980');
}
