import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import {
  KjCommandEmpty,
} from '@kouji-ui/core';

/**
 * Styled empty state slot. Shown when no items match the current query.
 *
 * @doc-category Library/Actions
 * @doc
 * @doc-name command-palette
 */
@Component({
  selector: 'kj-command-empty',
  standalone: true,
  hostDirectives: [KjCommandEmpty],
  template: `<ng-content />`,
  styleUrl: './command-palette.css',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'kj-command-empty' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjCommandEmptyComponent {}
