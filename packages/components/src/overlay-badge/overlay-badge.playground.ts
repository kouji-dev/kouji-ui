import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { KjOverlayBadgeComponent } from './overlay-badge';
import { KjButtonComponent } from '../button/button';
import type { PlaygroundFile } from '@kouji-ui/components/playground-types';

type KjOverlayBadgePosition = 'top-end' | 'top-start' | 'bottom-end' | 'bottom-start';
type KjOverlayBadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';
type KjOverlayBadgeSize = 'sm' | 'md' | 'lg';

const badgeValue = signal<number>(4);
const variant = signal<KjOverlayBadgeVariant>('destructive');
const size = signal<KjOverlayBadgeSize>('md');
const position = signal<KjOverlayBadgePosition>('top-end');
const dot = signal(false);
const hidden = signal(false);

@Component({
  selector: 'kj-overlay-badge-playground',
  standalone: true,
  imports: [KjOverlayBadgeComponent, KjButtonComponent],
  template: `
    <kj-overlay-badge
      [kjValue]="badgeValue()"
      [kjVariant]="variant()"
      [kjSize]="size()"
      [kjPosition]="position()"
      [kjDot]="dot()"
      [kjHidden]="hidden()"
      kjDescription="Unread notifications"
    >
      <kj-button kjVariant="outline">Inbox</kj-button>
    </kj-overlay-badge>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjOverlayBadgePlaygroundDemo {
  protected readonly badgeValue = badgeValue;
  protected readonly variant = variant;
  protected readonly size = size;
  protected readonly position = position;
  protected readonly dot = dot;
  protected readonly hidden = hidden;
}

export const PLAYGROUND: PlaygroundFile = {
  component: KjOverlayBadgePlaygroundDemo,
  state: {
    badgeValue: badgeValue as unknown as ReturnType<typeof signal>,
    variant: variant as unknown as ReturnType<typeof signal>,
    size: size as unknown as ReturnType<typeof signal>,
    position: position as unknown as ReturnType<typeof signal>,
    dot: dot as unknown as ReturnType<typeof signal>,
    hidden: hidden as unknown as ReturnType<typeof signal>,
  },
  controls: [
    { kind: 'number', name: 'badgeValue', label: 'value', min: 0, max: 999 },
    {
      kind: 'chips',
      name: 'variant',
      label: 'variant',
      options: ['default', 'secondary', 'destructive', 'outline'],
    },
    { kind: 'chips', name: 'size', label: 'size', options: ['sm', 'md', 'lg'] },
    {
      kind: 'chips',
      name: 'position',
      label: 'position',
      options: ['top-end', 'top-start', 'bottom-end', 'bottom-start'],
    },
    { kind: 'toggle', name: 'dot', label: 'dot' },
    { kind: 'toggle', name: 'hidden', label: 'hidden' },
  ],
  snippet: (values) => {
    const s = values as {
      badgeValue: number;
      variant: string;
      size: string;
      position: string;
      dot: boolean;
      hidden: boolean;
    };
    const attrs: string[] = [];
    if (!s.dot) attrs.push(`[kjValue]="${s.badgeValue}"`);
    attrs.push(`kjVariant="${s.variant}"`);
    attrs.push(`kjSize="${s.size}"`);
    attrs.push(`kjPosition="${s.position}"`);
    if (s.dot) attrs.push('[kjDot]="true"');
    if (s.hidden) attrs.push('[kjHidden]="true"');
    attrs.push('kjDescription="Unread notifications"');
    return `<kj-overlay-badge\n  ${attrs.join('\n  ')}\n>\n  <kj-button kjVariant="outline">Inbox</kj-button>\n</kj-overlay-badge>`;
  },
};
