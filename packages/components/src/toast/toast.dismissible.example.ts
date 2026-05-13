import { Component, TemplateRef, inject, viewChild } from '@angular/core';
import { KjToastService } from '@kouji-ui/core';
import type { KjToastTemplateContext } from '@kouji-ui/core';
import { KjButtonComponent } from '../button/button';
import { KjToastViewportComponent, KjToastComponent, KjToastCloseComponent } from './toast';

@Component({
  selector: 'kj-toast-dismissible-example',
  standalone: true,
  imports: [KjButtonComponent, KjToastViewportComponent, KjToastComponent, KjToastCloseComponent],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-bg-surface); min-height: 8rem; }`],
  template: `
    <kj-button (click)="show()">Show persistent toast</kj-button>
    <kj-toast-viewport />
    <ng-template #tpl let-ctx>
      <kj-toast [variant]="ctx.variant" [id]="ctx.id">
        <span>{{ ctx.title }}</span>
        <kj-toast-close [toastId]="ctx.id">×</kj-toast-close>
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
