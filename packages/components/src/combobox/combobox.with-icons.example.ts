import { Component, signal } from '@angular/core';
import { KjComboboxComponent, KjComboboxOptionComponent } from './combobox';

/**
 * Combobox options with leading icons. The option projects arbitrary
 * content; consumers can prepend a flag, avatar, or status indicator.
 */
@Component({
  selector: 'kj-combobox-with-icons-example',
  standalone: true,
  imports: [KjComboboxComponent, KjComboboxOptionComponent],
  styles: [`
    :host { display: block; padding: var(--kj-space-xl); background: var(--kj-bg-surface); }
    .flag {
      display: inline-block;
      width: 1.5rem;
      text-align: center;
      margin-right: var(--kj-space-sm);
      font-size: 1rem;
    }
  `],
  template: `
    <kj-combobox [(value)]="lang" placeholder="Pick a language…">
      <kj-combobox-option [value]="'en'"><span class="flag" aria-hidden="true">🇬🇧</span>English</kj-combobox-option>
      <kj-combobox-option [value]="'fr'"><span class="flag" aria-hidden="true">🇫🇷</span>French</kj-combobox-option>
      <kj-combobox-option [value]="'de'"><span class="flag" aria-hidden="true">🇩🇪</span>German</kj-combobox-option>
      <kj-combobox-option [value]="'es'"><span class="flag" aria-hidden="true">🇪🇸</span>Spanish</kj-combobox-option>
      <kj-combobox-option [value]="'jp'"><span class="flag" aria-hidden="true">🇯🇵</span>Japanese</kj-combobox-option>
    </kj-combobox>
  `,
})
export class KjComboboxWithIconsExample {
  readonly lang = signal<string | null>(null);
}
