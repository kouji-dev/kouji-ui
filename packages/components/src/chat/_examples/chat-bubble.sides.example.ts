import { Component } from '@angular/core';
import {
  KjChatBubbleComponent,
  KjChatComponent,
  KjChatHeaderComponent,
  KjChatLogComponent,
} from '../chat';

/**
 * Demonstrates the `start` / `end` side mapping. Side is logical — CSS
 * reads `data-side` on the row and handles the physical column flip,
 * including RTL via cascade. DOM order (header → bubble → footer) is
 * fixed for meaningful-sequence reading order.
 */
@Component({
  selector: 'kj-chat-bubble-sides-example',
  standalone: true,
  imports: [
    KjChatLogComponent,
    KjChatComponent,
    KjChatHeaderComponent,
    KjChatBubbleComponent,
  ],
  styles: [`
    :host { display: block; }
  `],
  template: `
    <kj-chat-log kjChatLogLabel="Sides demo">
      <kj-chat kjSide="start">
        <kj-chat-header>Them <time datetime="2025-05-06T09:00">09:00</time></kj-chat-header>
        <kj-chat-bubble>Side: start (theirs)</kj-chat-bubble>
      </kj-chat>

      <kj-chat kjSide="end">
        <kj-chat-header>You <time datetime="2025-05-06T09:01">09:01</time></kj-chat-header>
        <kj-chat-bubble kjVariant="primary">Side: end (yours)</kj-chat-bubble>
      </kj-chat>
    </kj-chat-log>
  `,
})
export class KjChatBubbleSidesExample {}
