import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { KjTooltipTrigger, KjTooltipContent } from '@kouji-ui/core';
import { KjButtonComponent } from '../button/button';
import type { PlaygroundFile } from '@kouji-ui/components/playground-types';
import type { KjSide, KjAlign } from '@kouji-ui/core';

/**
 * Playground state — module-scope signals. Tooltip wakes on hover/focus of
 * the trigger; knobs control placement + delay + disabled state.
 */
const side = signal<KjSide>('top');
const align = signal<KjAlign>('center');
const openDelay = signal<200 | 0 | 500 | 1000>(200);
const disabled = signal(false);
const body = signal('Save the document');

@Component({
  selector: 'kj-tooltip-playground',
  standalone: true,
  imports: [KjButtonComponent, KjTooltipTrigger, KjTooltipContent],
  styles: [`
    :host { display: block; min-height: 6rem; }
    .hint { margin-block-start: var(--kj-space-md); font: 0.8125rem var(--kj-font-sans); color: var(--kj-fg-muted); }
  `],
  template: `
    <kj-button
      kjTooltipTrigger
      #t="kjTooltipTrigger"
      [kjOpenDelay]="openDelay()"
      [kjDisabled]="disabled()"
    >Hover me</kj-button>
    <kj-tooltip-content [kjFor]="t" [kjSide]="side()" [kjAlign]="align()">
      {{ body() }}
    </kj-tooltip-content>
    <p class="hint">Tip: hover or focus the trigger to reveal the tooltip.</p>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjTooltipPlaygroundDemo {
  protected readonly side = side;
  protected readonly align = align;
  protected readonly openDelay = openDelay;
  protected readonly disabled = disabled;
  protected readonly body = body;
}

export const PLAYGROUND: PlaygroundFile = {
  component: KjTooltipPlaygroundDemo,
  state: {
    side: side as unknown as ReturnType<typeof signal>,
    align: align as unknown as ReturnType<typeof signal>,
    openDelay: openDelay as unknown as ReturnType<typeof signal>,
    disabled: disabled as unknown as ReturnType<typeof signal>,
    body: body as unknown as ReturnType<typeof signal>,
  },
  controls: [
    { kind: 'chips', name: 'side', label: 'side', options: ['top', 'right', 'bottom', 'left'] },
    { kind: 'chips', name: 'align', label: 'align', options: ['start', 'center', 'end'] },
    { kind: 'chips', name: 'openDelay', label: 'open delay', options: [0, 200, 500, 1000] },
    { kind: 'toggle', name: 'disabled', label: 'disabled' },
    { kind: 'text', name: 'body', label: 'content' },
  ],
  snippet: (values) => {
    const s = values as {
      side: string;
      align: string;
      openDelay: number;
      disabled: boolean;
      body: string;
    };
    const triggerAttrs: string[] = ['kjTooltipTrigger', '#t="kjTooltipTrigger"'];
    if (s.openDelay !== 200) triggerAttrs.push(`[kjOpenDelay]="${s.openDelay}"`);
    if (s.disabled) triggerAttrs.push('[kjDisabled]="true"');
    const contentAttrs: string[] = ['[kjFor]="t"'];
    if (s.side !== 'top') contentAttrs.push(`kjSide="${s.side}"`);
    if (s.align !== 'center') contentAttrs.push(`kjAlign="${s.align}"`);
    return `<kj-button\n  ${triggerAttrs.join('\n  ')}\n>Hover me</kj-button>\n<kj-tooltip-content\n  ${contentAttrs.join('\n  ')}\n>${s.body}</kj-tooltip-content>`;
  },
};
