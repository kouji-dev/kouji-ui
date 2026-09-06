import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { KjChatStore, provideKjChat, type KjChatItemInput } from '@kouji-ui/core';
import { KjChatThread } from '../chat-thread';
import { KjButtonComponent } from '../../button/button';

/** A consumer-owned renderer. Nothing about it is special to the kit. */
@Component({
  selector: 'kj-demo-chart-item',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [
    `
      .bars {
        display: flex;
        align-items: flex-end;
        gap: 4px;
        height: 64px;
      }
      .bars i {
        flex: 1;
        background: var(--kj-bg-primary);
        border-radius: 2px;
      }
    `,
  ],
  template: `
    <figure>
      <div class="bars" role="img" [attr.aria-label]="item().data.label">
        @for (v of item().data.values; track $index) {
          <i [style.height.%]="v"></i>
        }
      </div>
      <figcaption class="kj-visually-hidden">{{ item().data.label }}</figcaption>
    </figure>
  `,
})
export class KjDemoChartItem {
  readonly item = input.required<KjChatItemInput<{ label: string; values: number[] }>>();
}

/**
 * Registering a custom thread item. `provideKjChat` maps `type` → component;
 * `store.addItem` puts one in the thread. Ordinary messages are untouched and
 * still render through the built-in markdown renderer.
 *
 * Note the `content` passed alongside `data`: it is the item's plain-text
 * equivalent, and what the thread's live region announces. A custom renderer
 * without it is invisible to a screen reader.
 */
@Component({
  selector: 'kj-ai-chat-custom-items-example',
  standalone: true,
  imports: [KjChatThread, KjButtonComponent],
  providers: [KjChatStore, provideKjChat({ renderers: { chart: KjDemoChartItem } })],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <kj-chat-thread [store]="store" kjLabel="Custom items" />
    <kj-button kjSize="sm" (click)="addChart()">Add a chart turn</kj-button>
  `,
})
export class KjAiChatCustomItemsExample {
  readonly store = inject(KjChatStore);

  constructor() {
    this.store.sendUser('How did revenue trend?');
    this.store.addSystem('Markdown still renders normally: **bold**, `code`, and lists.');
  }

  addChart(): void {
    this.store.addItem({
      type: 'chart',
      data: { label: 'Revenue, last 6 months', values: [30, 45, 40, 70, 65, 90] },
      content: 'Revenue rose from 30 to 90 over six months.',
    });
  }
}
