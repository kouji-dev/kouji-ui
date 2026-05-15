import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  KjPopoverTrigger,
  KjPopoverContent,
  KjPopoverTitle,
  KjPopoverClose,
} from './popover';
import { KjButtonComponent } from '../button/button';
import type { PlaygroundFile } from '@kouji-ui/components/playground-types';

type KjPopoverSide = 'top' | 'right' | 'bottom' | 'left';
type KjPopoverAlign = 'start' | 'center' | 'end';

const triggerLabel = signal<string>('Open popover');
const title = signal<string>('Notification settings');
const body = signal<string>('Control how and when you receive notifications.');
const side = signal<KjPopoverSide>('bottom');
const align = signal<KjPopoverAlign>('center');
const showClose = signal(true);

@Component({
  selector: 'kj-popover-playground',
  standalone: true,
  imports: [
    KjButtonComponent,
    KjPopoverTrigger,
    KjPopoverContent,
    KjPopoverTitle,
    KjPopoverClose,
  ],
  template: `
    <kj-button kjPopoverTrigger #t="kjPopoverTrigger">{{ triggerLabel() }}</kj-button>
    <kj-popover-content
      [kjFor]="t"
      [kjSide]="side()"
      [kjAlign]="align()"
    >
      <h3 kjPopoverTitle>{{ title() }}</h3>
      <p>{{ body() }}</p>
      @if (showClose()) {
        <kj-button kjPopoverClose>Close</kj-button>
      }
    </kj-popover-content>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjPopoverPlaygroundDemo {
  protected readonly triggerLabel = triggerLabel;
  protected readonly title = title;
  protected readonly body = body;
  protected readonly side = side;
  protected readonly align = align;
  protected readonly showClose = showClose;
}

export const PLAYGROUND: PlaygroundFile = {
  component: KjPopoverPlaygroundDemo,
  state: {
    triggerLabel: triggerLabel as unknown as ReturnType<typeof signal>,
    title: title as unknown as ReturnType<typeof signal>,
    body: body as unknown as ReturnType<typeof signal>,
    side: side as unknown as ReturnType<typeof signal>,
    align: align as unknown as ReturnType<typeof signal>,
    showClose: showClose as unknown as ReturnType<typeof signal>,
  },
  controls: [
    { kind: 'text', name: 'triggerLabel', label: 'trigger label' },
    { kind: 'text', name: 'title', label: 'title' },
    { kind: 'text', name: 'body', label: 'body' },
    { kind: 'chips', name: 'side', label: 'side', options: ['top', 'right', 'bottom', 'left'] },
    { kind: 'chips', name: 'align', label: 'align', options: ['start', 'center', 'end'] },
    { kind: 'toggle', name: 'showClose', label: 'show close button' },
  ],
  snippet: (values) => {
    const s = values as {
      triggerLabel: string;
      title: string;
      body: string;
      side: string;
      align: string;
      showClose: boolean;
    };
    const closeMarkup = s.showClose ? `\n  <kj-button kjPopoverClose>Close</kj-button>` : '';
    return `<kj-button kjPopoverTrigger #t="kjPopoverTrigger">${s.triggerLabel}</kj-button>\n<kj-popover-content [kjFor]="t" kjSide="${s.side}" kjAlign="${s.align}">\n  <h3 kjPopoverTitle>${s.title}</h3>\n  <p>${s.body}</p>${closeMarkup}\n</kj-popover-content>`;
  },
};
