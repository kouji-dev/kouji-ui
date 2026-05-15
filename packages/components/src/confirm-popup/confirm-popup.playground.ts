import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  KjConfirmPopupActionComponent,
  KjConfirmPopupActionsComponent,
  KjConfirmPopupCancelComponent,
  KjConfirmPopupComponent,
  KjConfirmPopupContentComponent,
} from './confirm-popup';
import { KjConfirmPopupMessage } from '@kouji-ui/core';
import { KjConfirmPopupTrigger } from '@kouji-ui/core';
import { KjButtonComponent } from '../button/button';
import type { PlaygroundFile } from '@kouji-ui/components/playground-types';

/**
 * Playground state — module-scope signals. Knobs cover the destructive
 * posture, the trigger / message text, and which control (`'cancel'` /
 * `'action'`) receives initial focus when the panel opens.
 */
const triggerLabel = signal('Delete item');
const message = signal('Delete this item?');
const destructive = signal(true);
const defaultFocus = signal<'cancel' | 'confirm'>('cancel');

@Component({
  selector: 'kj-confirm-popup-playground',
  standalone: true,
  imports: [
    KjConfirmPopupComponent,
    KjConfirmPopupTrigger,
    KjConfirmPopupContentComponent,
    KjConfirmPopupMessage,
    KjConfirmPopupActionComponent,
    KjConfirmPopupCancelComponent,
    KjConfirmPopupActionsComponent,
    KjButtonComponent,
  ],
  styles: [`:host { display: flex; padding: var(--kj-space-lg); min-height: 14rem; }`],
  template: `
    <kj-confirm-popup
      [kjDestructive]="destructive()"
      [kjDefaultFocus]="defaultFocus()"
    >
      <kj-button
        kjConfirmPopupTrigger
        #trig="kjConfirmPopupTrigger"
        [kjVariant]="destructive() ? 'destructive' : 'default'"
      >{{ triggerLabel() }}</kj-button>
      <kj-confirm-popup-content [kjFor]="trig">
        <p kjConfirmPopupMessage class="kj-confirm-popup-message">{{ message() }}</p>
        <kj-confirm-popup-actions>
          <kj-confirm-popup-cancel>
            <kj-button kjVariant="ghost">Cancel</kj-button>
          </kj-confirm-popup-cancel>
          <kj-confirm-popup-action>
            <kj-button [kjVariant]="destructive() ? 'destructive' : 'default'">Confirm</kj-button>
          </kj-confirm-popup-action>
        </kj-confirm-popup-actions>
      </kj-confirm-popup-content>
    </kj-confirm-popup>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjConfirmPopupPlaygroundDemo {
  protected readonly triggerLabel = triggerLabel;
  protected readonly message = message;
  protected readonly destructive = destructive;
  protected readonly defaultFocus = defaultFocus;
}

export const PLAYGROUND: PlaygroundFile = {
  component: KjConfirmPopupPlaygroundDemo,
  state: {
    triggerLabel: triggerLabel as unknown as ReturnType<typeof signal>,
    message: message as unknown as ReturnType<typeof signal>,
    destructive: destructive as unknown as ReturnType<typeof signal>,
    defaultFocus: defaultFocus as unknown as ReturnType<typeof signal>,
  },
  controls: [
    { kind: 'text', name: 'triggerLabel', label: 'trigger' },
    { kind: 'text', name: 'message', label: 'message' },
    { kind: 'chips', name: 'defaultFocus', label: 'default focus', options: ['cancel', 'confirm'] },
    { kind: 'toggle', name: 'destructive', label: 'destructive' },
  ],
  snippet: (values) => {
    const s = values as {
      triggerLabel: string;
      message: string;
      destructive: boolean;
      defaultFocus: string;
    };
    const popupAttrs: string[] = [];
    if (s.destructive) popupAttrs.push('[kjDestructive]="true"');
    if (s.defaultFocus !== 'cancel') popupAttrs.push(`kjDefaultFocus="${s.defaultFocus}"`);
    const variant = s.destructive ? 'destructive' : 'default';
    const head = popupAttrs.length ? `<kj-confirm-popup\n  ${popupAttrs.join('\n  ')}\n>` : '<kj-confirm-popup>';
    return [
      head,
      `  <kj-button kjConfirmPopupTrigger #trig="kjConfirmPopupTrigger" kjVariant="${variant}">${s.triggerLabel}</kj-button>`,
      `  <kj-confirm-popup-content [kjFor]="trig">`,
      `    <p kjConfirmPopupMessage>${s.message}</p>`,
      `    <kj-confirm-popup-actions>`,
      `      <kj-confirm-popup-cancel><kj-button kjVariant="ghost">Cancel</kj-button></kj-confirm-popup-cancel>`,
      `      <kj-confirm-popup-action><kj-button kjVariant="${variant}">Confirm</kj-button></kj-confirm-popup-action>`,
      `    </kj-confirm-popup-actions>`,
      `  </kj-confirm-popup-content>`,
      `</kj-confirm-popup>`,
    ].join('\n');
  },
};
