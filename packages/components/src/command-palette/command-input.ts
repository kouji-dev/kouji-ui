import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  input,
} from '@angular/core';
import {
  KjCommandInput,
} from '@kouji-ui/core';

/**
 * Styled command input wrapper. Renders an `<input type="search">` with
 * the combobox ARIA wiring from `[kjCommandInput]`. Useful when consumers
 * build a custom palette layout outside `<kj-command-palette>`.
 *
 * @doc-category Library/Actions
 * @doc
 * @doc-name command-palette
 */
@Component({
  selector: 'kj-command-input',
  standalone: true,
  imports: [KjCommandInput],
  template: `
    <input
      kjCommandInput
      type="search"
      class="kj-command-input"
      [placeholder]="kjPlaceholder()"
    />
  `,
  styleUrl: './command-palette.css',
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjCommandInputComponent {
  /** Input placeholder text. */
  readonly kjPlaceholder = input<string>('Search commands…');
}
