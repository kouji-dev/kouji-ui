import { Component } from '@angular/core';
import {
  KjChatBubbleComponent,
  KjChatComponent,
  KjChatHeaderComponent,
  KjChatLogComponent,
} from './chat';

/**
 * Demonstrates the bubble variant set: `default` for theirs, `primary`
 * for yours, `info` / `success` / `warning` / `error` for system or
 * status messages, `accent` for highlighted (mention / quoted) replies.
 */
@Component({
  selector: 'kj-chat-bubble-variants-example',
  standalone: true,
  imports: [KjChatLogComponent, KjChatComponent, KjChatHeaderComponent, KjChatBubbleComponent],
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
  template: `
    <kj-chat-log kjChatLogLabel="Variants demo">
      <kj-chat kjSide="start">
        <kj-chat-header>System <time datetime="2025-05-06T08:00">08:00</time></kj-chat-header>
        <kj-chat-bubble kjVariant="info">Alice joined the conversation.</kj-chat-bubble>
      </kj-chat>

      <kj-chat kjSide="start">
        <kj-chat-header>Bot <time datetime="2025-05-06T08:01">08:01</time></kj-chat-header>
        <kj-chat-bubble kjVariant="success">Build #42 succeeded.</kj-chat-bubble>
      </kj-chat>

      <kj-chat kjSide="end">
        <kj-chat-bubble kjVariant="primary">Nice — pushing now.</kj-chat-bubble>
      </kj-chat>

      <kj-chat kjSide="end">
        <kj-chat-bubble kjVariant="error">Failed to send.</kj-chat-bubble>
      </kj-chat>

      <kj-chat kjSide="start">
        <kj-chat-header>Bot <time datetime="2025-05-06T08:05">08:05</time></kj-chat-header>
        <kj-chat-bubble kjVariant="warning">Tests took longer than usual.</kj-chat-bubble>
      </kj-chat>

      <kj-chat kjSide="start">
        <kj-chat-header>Alice <time datetime="2025-05-06T08:06">08:06</time></kj-chat-header>
        <kj-chat-bubble kjVariant="accent">@you can you take a look?</kj-chat-bubble>
      </kj-chat>
    </kj-chat-log>
  `,
})
export class KjChatBubbleVariantsExample {}
