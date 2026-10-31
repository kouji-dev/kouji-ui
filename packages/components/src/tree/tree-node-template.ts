import { Directive, TemplateRef, inject } from '@angular/core';
import type { KjTreeNodeContext } from './tree.types';

/**
 * Replaces the default row content of a `<kj-tree>` (the label) with custom
 * markup. The twisty, indentation, roles and keyboard stay the tree's.
 *
 * ```html
 * <kj-tree [nodes]="nodes">
 *   <ng-template kjTreeNode let-node let-level="level">
 *     <span kjIcon="folder"></span> {{ node.label }}
 *   </ng-template>
 * </kj-tree>
 * ```
 *
 * @doc-category Library/Data display
 * @doc
 * @doc-name tree
 */
@Directive({ selector: 'ng-template[kjTreeNode]', standalone: true })
export class KjTreeNodeTemplate {
  /** @internal */
  readonly template = inject<TemplateRef<KjTreeNodeContext>>(TemplateRef);

  /** Types `let-` variables in the template. */
  static ngTemplateContextGuard(_dir: KjTreeNodeTemplate, _ctx: unknown): _ctx is KjTreeNodeContext {
    return true;
  }
}
