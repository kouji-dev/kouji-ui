import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import {
  KjSpeedDialActionComponent,
  KjSpeedDialActionsComponent,
  KjSpeedDialComponent,
  KjSpeedDialTriggerComponent,
} from './speed-dial';
import type { PlaygroundFile } from '@kouji-ui/components/playground-types';

type KjSpeedDialDirection = 'up' | 'down' | 'left' | 'right';
type KjSpeedDialPosition = 'static' | 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';

const direction = signal<KjSpeedDialDirection>('up');
const position = signal<KjSpeedDialPosition>('static');
const actionCount = signal<2 | 3 | 4 | 5>(3);
const triggerVariant = signal<'default' | 'outline' | 'ghost' | 'destructive'>('default');
const disabled = signal(false);
const openOnHover = signal(false);

const ACTIONS: ReadonlyArray<{ label: string; glyph: string }> = [
  { label: 'Edit', glyph: 'E' },
  { label: 'Share', glyph: 'S' },
  { label: 'Delete', glyph: 'D' },
  { label: 'Archive', glyph: 'A' },
  { label: 'Pin', glyph: 'P' },
];

@Component({
  selector: 'kj-speed-dial-playground',
  standalone: true,
  imports: [
    KjSpeedDialComponent,
    KjSpeedDialTriggerComponent,
    KjSpeedDialActionsComponent,
    KjSpeedDialActionComponent,
  ],
  template: `
    <kj-speed-dial
      [kjDirection]="direction()"
      [kjPosition]="position()"
      [kjDisabled]="disabled()"
      [kjOpenOnHover]="openOnHover()"
    >
      <kj-speed-dial-trigger
        [kjVariant]="triggerVariant()"
        kjAriaLabel="Open quick actions"
      >
        +
      </kj-speed-dial-trigger>
      <kj-speed-dial-actions>
        @for (action of visibleActions(); track action.label) {
          <kj-speed-dial-action [kjAriaLabel]="action.label">
            {{ action.glyph }}
          </kj-speed-dial-action>
        }
      </kj-speed-dial-actions>
    </kj-speed-dial>
  `,
  styles: [`
    :host {
      display: flex;
      justify-content: flex-end;
      align-items: flex-end;
      padding: var(--kj-space-2xl);
      min-height: 14rem;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjSpeedDialPlaygroundDemo {
  protected readonly direction = direction;
  protected readonly position = position;
  protected readonly actionCount = actionCount;
  protected readonly triggerVariant = triggerVariant;
  protected readonly disabled = disabled;
  protected readonly openOnHover = openOnHover;

  protected readonly visibleActions = computed(() => ACTIONS.slice(0, actionCount()));
}

export const PLAYGROUND: PlaygroundFile = {
  component: KjSpeedDialPlaygroundDemo,
  state: {
    direction: direction as unknown as ReturnType<typeof signal>,
    position: position as unknown as ReturnType<typeof signal>,
    actionCount: actionCount as unknown as ReturnType<typeof signal>,
    triggerVariant: triggerVariant as unknown as ReturnType<typeof signal>,
    disabled: disabled as unknown as ReturnType<typeof signal>,
    openOnHover: openOnHover as unknown as ReturnType<typeof signal>,
  },
  controls: [
    {
      kind: 'chips',
      name: 'direction',
      label: 'direction',
      options: ['up', 'down', 'left', 'right'],
    },
    {
      kind: 'chips',
      name: 'position',
      label: 'position',
      options: ['static', 'bottom-right', 'bottom-left', 'top-right', 'top-left'],
    },
    { kind: 'chips', name: 'actionCount', label: 'actions', options: [2, 3, 4, 5] },
    {
      kind: 'chips',
      name: 'triggerVariant',
      label: 'trigger variant',
      options: ['default', 'outline', 'ghost', 'destructive'],
    },
    { kind: 'toggle', name: 'disabled', label: 'disabled' },
    { kind: 'toggle', name: 'openOnHover', label: 'open on hover' },
  ],
  snippet: (values) => {
    const s = values as {
      direction: string;
      position: string;
      actionCount: number;
      triggerVariant: string;
      disabled: boolean;
      openOnHover: boolean;
    };
    const attrs: string[] = [
      `kjDirection="${s.direction}"`,
      `kjPosition="${s.position}"`,
    ];
    if (s.disabled) attrs.push('[kjDisabled]="true"');
    if (s.openOnHover) attrs.push('[kjOpenOnHover]="true"');
    const actions = ACTIONS.slice(0, s.actionCount)
      .map(
        (a) =>
          `    <kj-speed-dial-action kjAriaLabel="${a.label}">${a.glyph}</kj-speed-dial-action>`,
      )
      .join('\n');
    return `<kj-speed-dial\n  ${attrs.join('\n  ')}\n>\n  <kj-speed-dial-trigger kjVariant="${s.triggerVariant}" kjAriaLabel="Open quick actions">+</kj-speed-dial-trigger>\n  <kj-speed-dial-actions>\n${actions}\n  </kj-speed-dial-actions>\n</kj-speed-dial>`;
  },
};
