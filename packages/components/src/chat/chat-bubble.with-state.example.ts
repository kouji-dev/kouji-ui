import { Component } from '@angular/core';
import {
  KjChatBubbleComponent,
  KjChatComponent,
  KjChatFooterComponent,
  KjChatLogComponent,
} from './chat';

/**
 * Read-receipt progression: `sending` → `sent` → `delivered` → `read`
 * plus the `error` terminal. Footer's `data-state` drives the glyph;
 * the directive injects an `aria-label` so AT users hear "Sending",
 * "Sent", "Delivered", "Read", or "Failed to send" regardless of the
 * visual glyph.
 */
@Component({
  selector: 'kj-chat-bubble-with-state-example',
  standalone: true,
  imports: [
    KjChatLogComponent,
    KjChatComponent,
    KjChatBubbleComponent,
    KjChatFooterComponent,
  ],
  styles: [`
    :host { display: block; }
  `],
  template: `
    <kj-chat-log kjChatLogLabel="Read receipts">
      <kj-chat kjSide="end">
        <kj-chat-bubble kjVariant="primary">Drafting…</kj-chat-bubble>
        <kj-chat-footer kjState="sending">Sending</kj-chat-footer>
      </kj-chat>

      <kj-chat kjSide="end">
        <kj-chat-bubble kjVariant="primary">Off it goes.</kj-chat-bubble>
        <kj-chat-footer kjState="sent">Sent 12:46</kj-chat-footer>
      </kj-chat>

      <kj-chat kjSide="end">
        <kj-chat-bubble kjVariant="primary">Hope this lands.</kj-chat-bubble>
        <kj-chat-footer kjState="delivered">Delivered</kj-chat-footer>
      </kj-chat>

      <kj-chat kjSide="end">
        <kj-chat-bubble kjVariant="primary">She read it.</kj-chat-bubble>
        <kj-chat-footer kjState="read">Read 12:48</kj-chat-footer>
      </kj-chat>

      <kj-chat kjSide="end">
        <kj-chat-bubble kjVariant="error">Tried to send a 50MB GIF.</kj-chat-bubble>
        <kj-chat-footer kjState="error">Tap to retry</kj-chat-footer>
      </kj-chat>
    </kj-chat-log>
  `,
})
export class KjChatBubbleWithStateExample {}
