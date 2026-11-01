import { Component, TemplateRef, inject, viewChild, ChangeDetectionStrategy } from '@angular/core';
import { KjToastService } from '@kouji-ui/core';
import type { KjToastTemplateContext } from '@kouji-ui/core';
import { KjButtonComponent } from '../../button/button';
import { KjToastViewportComponent, KjToastComponent, KjToastCloseComponent } from '../toast';

@Component({
  selector: 'kj-toast-expanded-example',
  standalone: true,
  imports: [KjButtonComponent, KjToastViewportComponent, KjToastComponent, KjToastCloseComponent],
  styles: [
    `
      :host {
        display: block;
        min-height: 8rem;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <kj-button (click)="show()">Show toast</kj-button>
    <kj-toast-viewport kjToastExpand />
    <ng-template #tpl let-ctx>
      <kj-toast [variant]="ctx.variant" [id]="ctx.id">
        <span>{{ ctx.title }}</span>
        <kj-toast-close [toastId]="ctx.id">×</kj-toast-close>
      </kj-toast>
    </ng-template>
  `,
})
export class KjToastExpandedExample {
  private readonly svc = inject(KjToastService);
  readonly tpl = viewChild.required<TemplateRef<KjToastTemplateContext>>('tpl');
  private count = 0;

  show(): void {
    this.svc.show(this.tpl(), { title: `Toast ${++this.count}: stacked as a list.` });
  }
}
