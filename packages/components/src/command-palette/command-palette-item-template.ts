import {
  Directive,
  TemplateRef,
  inject,
} from '@angular/core';

/**
 * Marker directive for the per-item template used by `<kj-command-palette>`
 * when the consumer passes `[kjItems]`. The template's implicit context is the
 * item itself; `index` is also exposed.
 *
 * @example
 * ```html
 * <kj-command-palette [kjItems]="results">
 *   <ng-template kjCommandPaletteItemTemplate let-item let-i="index">
 *     <kj-command-item [kjValue]="item.id">{{ item.label }}</kj-command-item>
 *   </ng-template>
 * </kj-command-palette>
 * ```
 * @doc
 * @doc-name command-palette
 */
@Directive({
  selector: 'ng-template[kjCommandPaletteItemTemplate]',
  standalone: true,
})
export class KjCommandPaletteItemTemplate<T = unknown> {
  readonly tpl = inject<TemplateRef<{ $implicit: T; index: number }>>(TemplateRef);
}
