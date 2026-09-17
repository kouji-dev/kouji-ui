import {
  Component,
  ChangeDetectionStrategy,
  ViewEncapsulation,
} from '@angular/core';
import {
  KjPaginationEllipsis,
} from '@kouji-ui/core';

/**
 * Gap indicator within a `<kj-pagination>`. Wraps `KjPaginationEllipsis`;
 * the visible glyph is decorative, an AT-readable visually-hidden label
 * ("More pages") is appended at render time.
 *
 * @doc-category Library/Navigation
 * @doc
 * @doc-name pagination
 */
@Component({
  selector: 'kj-pagination-ellipsis',
  standalone: true,
  hostDirectives: [KjPaginationEllipsis],
  template: `<ng-content />`,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'kj-pagination-ellipsis' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjPaginationEllipsisComponent {}
