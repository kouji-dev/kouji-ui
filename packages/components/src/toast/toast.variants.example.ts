import { Component, TemplateRef, inject, viewChild } from '@angular/core';
import { KjToastService } from '@kouji-ui/core';
import type { KjToastVariant, KjToastTemplateContext } from '@kouji-ui/core';
import { KjToastViewportComponent, KjToastComponent, KjToastCloseComponent } from './toast';

@Component({
  selector: 'kj-toast-variants-example',
  standalone: true,
  imports: [KjToastViewportComponent, KjToastComponent, KjToastCloseComponent],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); min-height: 8rem; }`],
  template: `
    <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
      <button type="button" (click)="show('default')">Default</button>
      <button type="button" (click)="show('success')">Success</button>
      <button type="button" (click)="show('warning')">Warning</button>
      <button type="button" (click)="show('destructive')">Destructive</button>
    </div>
    <kj-toast-viewport />
    <ng-template #tpl let-ctx>
      <kj-toast [variant]="ctx.variant" [id]="ctx.id">
        <span>{{ ctx.title }}</span>
        <kj-toast-close [toastId]="ctx.id" aria-label="Dismiss">×</kj-toast-close>
      </kj-toast>
    </ng-template>
  `,
})
export class KjToastVariantsExample {
  private readonly svc = inject(KjToastService);
  readonly tpl = viewChild.required<TemplateRef<KjToastTemplateContext>>('tpl');
  show(variant: KjToastVariant): void {
    const label = variant[0].toUpperCase() + variant.slice(1);
    this.svc.show(this.tpl(), { variant, title: `${label} toast` });
  }
}
