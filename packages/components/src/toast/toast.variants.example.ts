import { Component, TemplateRef, inject, viewChild } from '@angular/core';
import { KjToastService } from '@kouji-ui/core';
import type { KjToastVariant, KjToastTemplateContext } from '@kouji-ui/core';
import { KjButtonComponent } from '../button/button';
import { KjToastViewportComponent, KjToastComponent, KjToastCloseComponent } from './toast';

@Component({
  selector: 'kj-toast-variants-example',
  standalone: true,
  imports: [KjButtonComponent, KjToastViewportComponent, KjToastComponent, KjToastCloseComponent],
  styles: [`:host { display: block; min-height: 8rem; }`],
  template: `
    <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
      <kj-button (click)="show('default')">Default</kj-button>
      <kj-button (click)="show('success')">Success</kj-button>
      <kj-button (click)="show('warning')">Warning</kj-button>
      <kj-button kjVariant="destructive" (click)="show('destructive')">Destructive</kj-button>
    </div>
    <kj-toast-viewport />
    <ng-template #tpl let-ctx>
      <kj-toast [variant]="ctx.variant" [id]="ctx.id">
        <span>{{ ctx.title }}</span>
        <kj-toast-close [toastId]="ctx.id">×</kj-toast-close>
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
