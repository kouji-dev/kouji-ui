import { Directive, TemplateRef, inject } from '@angular/core';

/**
 * Template context handed to a `kjOverflowContent` template by the group
 * that collapsed its extra items behind a "+N" chip.
 */
export interface KjOverflowContext {
  /** Number of collapsed items. */
  readonly $implicit: number;
  /** Index of the first collapsed item in the consumer's own collection (`= max`). */
  readonly start: number;
  /** Exclusive end index (`= total`). `items.slice(start, end)` yields the collapsed ones. */
  readonly end: number;
  /** Accessible labels of the collapsed items, in order (tag text, avatar alt…). */
  readonly labels: readonly string[];
}

/**
 * Marks the template a collapsing group (`kj-tag-list`, `kj-avatar-group`)
 * renders inside the "+N" chip's panel instead of its default list of labels.
 * The context carries the collapsed range so the consumer slices its own
 * data and renders the hidden items with any layout or actions it needs.
 *
 * @example
 * ```html
 * <kj-tag-list [kjMax]="3">
 *   @for (u of users(); track u.id) { <kj-tag>{{ u.name }}</kj-tag> }
 *   <ng-template kjOverflowContent let-count let-start="start">
 *     @for (u of users().slice(start); track u.id) {
 *       <button (click)="remove(u)">Remove {{ u.name }}</button>
 *     }
 *   </ng-template>
 * </kj-tag-list>
 * ```
 * @doc-category Core/Data display
 * @doc
 * @doc-name overflow
 * @doc-is-main
 * @doc-description Provides the template a tag list or avatar group shows for the items collapsed behind its "+N" chip.
 */
@Directive({
  selector: 'ng-template[kjOverflowContent]',
  standalone: true,
})
export class KjOverflowContent {
  readonly template = inject<TemplateRef<KjOverflowContext>>(TemplateRef);

  /** Type guard for template type-checking (`*ngTemplateOutlet` context inference). */
  static ngTemplateContextGuard(_dir: KjOverflowContent, _ctx: unknown): _ctx is KjOverflowContext {
    return true;
  }
}
