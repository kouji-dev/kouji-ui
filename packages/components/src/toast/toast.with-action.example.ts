import { Component, TemplateRef, inject, viewChild } from '@angular/core';
import { KjToastService } from '@kouji-ui/core';
import type { KjToastContext, KjToastTemplateContext } from '@kouji-ui/core';
import { KjButtonComponent } from '../button/button';
import { KjToastViewportComponent, KjToastComponent, KjToastCloseComponent } from './toast';

@Component({
  selector: 'kj-toast-with-action-example',
  standalone: true,
  imports: [KjButtonComponent, KjToastViewportComponent, KjToastComponent, KjToastCloseComponent],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); min-height: 8rem; }`],
  template: `
    <kj-button variant="destructive" (click)="deleteItem()">Delete item</kj-button>
    <kj-toast-viewport />
    <ng-template #tpl let-ctx>
      <kj-toast [variant]="ctx.variant" [id]="ctx.id">
        <span>{{ ctx.title }}</span>
        <kj-button size="sm" variant="ghost" style="margin-left:auto" (click)="undo(ctx)">Undo</kj-button>
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
