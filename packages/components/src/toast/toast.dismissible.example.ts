import { Component, TemplateRef, inject, viewChild } from '@angular/core';
import { KjToastService } from '@kouji-ui/core';
import type { KjToastTemplateContext } from '@kouji-ui/core';
import { KjToastViewportComponent, KjToastComponent, KjToastCloseComponent } from './toast';

@Component({
  selector: 'kj-toast-dismissible-example',
  standalone: true,
  imports: [KjToastViewportComponent, KjToastComponent, KjToastCloseComponent],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); min-height: 8rem; }`],
  template: `
    <button type="button" (click)="show()">Show persistent toast</button>
    <kj-toast-viewport />
    <ng-template #tpl let-ctx>
      <kj-toast [variant]="ctx.variant" [id]="ctx.id">
        <span>{{ ctx.title }}</span>
        <kj-toast-close [toastId]="ctx.id" aria-label="Dismiss">×</kj-toast-close>
      </kj-toast>
    </ng-template>
  `,
})
export class KjToastDismissibleExample {
  private readonly svc = inject(KjToastService);
  readonly tpl = viewChild.required<TemplateRef<KjToastTemplateContext>>('tpl');

  show(): void {
    this.svc.show(this.tpl(), { title: 'I stay until dismissed.', duration: 0 });
  }
}
