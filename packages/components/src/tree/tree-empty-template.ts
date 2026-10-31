import { Directive, TemplateRef, inject } from '@angular/core';

/**
 * Content shown by a `<kj-tree>` whose `nodes` is empty. Without it an empty
 * tree renders nothing. Instantiated only while the tree is empty.
 *
 * ```html
 * <kj-tree [nodes]="[]">
 *   <ng-template kjTreeEmpty>No files yet.</ng-template>
 * </kj-tree>
 * ```
 *
 * @doc-category Library/Data display
 * @doc
 * @doc-name tree
 */
@Directive({ selector: 'ng-template[kjTreeEmpty]', standalone: true })
export class KjTreeEmptyTemplate {
  /** @internal */
  readonly template = inject(TemplateRef);
}
