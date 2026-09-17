import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  input,
} from '@angular/core';
import {
  KjCommandGroup,
} from '@kouji-ui/core';

/**
 * Styled command group. Auto-hides when all child items are filtered out.
 *
 * @doc-category Library/Actions
 * @doc
 * @doc-name command-palette
 */
@Component({
  selector: 'kj-command-group',
  standalone: true,
  hostDirectives: [KjCommandGroup],
  template: `
    @if (kjLabel()) {
      <div class="kj-command-group__label">{{ kjLabel() }}</div>
    }
    <ng-content />
  `,
  styleUrl: './command-palette.css',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'kj-command-group' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjCommandGroupComponent {
  /** Optional visible label for the group. */
  readonly kjLabel = input<string>('');
}
