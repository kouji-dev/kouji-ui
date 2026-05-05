import { Component, TemplateRef, inject, viewChild } from '@angular/core';
import { KjToastService } from '@kouji-ui/core';
import type { KjToastContext, KjToastTemplateContext } from '@kouji-ui/core';
import { KjToastViewportComponent, KjToastComponent, KjToastCloseComponent } from './toast';

@Component({
  selector: 'kj-toast-with-action-example',
  standalone: true,
  imports: [KjToastViewportComponent, KjToastComponent, KjToastCloseComponent],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); min-height: 8rem; }`],
  template: `
    <button type="button" (click)="deleteItem()">Delete item</button>
    <kj-toast-viewport />
    <ng-template #tpl let-ctx>
      <kj-toast [variant]="ctx.variant" [id]="ctx.id">
        <span>{{ ctx.title }}</span>
        <button
          type="button"
          style="margin-left:auto; background:transparent; border:1px solid currentColor; border-radius:4px; padding:2px 8px; cursor:pointer; color:inherit; font-size:0.8125rem;"
          (click)="undo(ctx)"
        >Undo</button>
        <kj-toast-close [toastId]="ctx.id" aria-label="Dismiss">×</kj-toast-close>
      </kj-toast>
    </ng-template>
  `,
})
export class KjToastWithActionExample {
  private readonly svc = inject(KjToastService);
  readonly tpl = viewChild.required<TemplateRef<KjToastTemplateContext>>('tpl');

  deleteItem(): void {
    this.svc.show(this.tpl(), { title: 'Item deleted', variant: 'default' });
  }

  undo(ctx: KjToastContext): void {
    console.log('Undo triggered');
    ctx.dismiss();
  }
}
