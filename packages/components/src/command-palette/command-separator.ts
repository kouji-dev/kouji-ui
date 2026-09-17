import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import {
  KjCommandSeparator,
} from '@kouji-ui/core';

/**
 * Styled separator between command groups.
 *
 * @doc-category Library/Actions
 * @doc
 * @doc-name command-palette
 */
@Component({
  selector: 'kj-command-separator',
  standalone: true,
  hostDirectives: [KjCommandSeparator],
  template: ``,
  styleUrl: './command-palette.css',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'kj-command-separator' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjCommandSeparatorComponent {}
