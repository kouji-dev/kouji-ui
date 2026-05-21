import { Component } from '@angular/core';
import { KjAvatarComponent } from '../../avatar/avatar';
import {
  KjChatAvatarComponent,
  KjChatBubbleComponent,
  KjChatComponent,
  KjChatFooterComponent,
  KjChatHeaderComponent,
  KjChatLogComponent,
} from '../chat';

/**
 * Default usage example for the Chat Bubble family. A four-message
 * conversation between two senders inside a `<kj-chat-log>` — anchors
 * `kjSide`, the avatar slot, header + `<time>`, bubble variants
 * (`default` for theirs, `primary` for mine), and the footer state glyph.
 */
@Component({
  selector: 'kj-chat-bubble-example',
  standalone: true,
  imports: [
    KjChatLogComponent,
    KjChatComponent,
    KjChatAvatarComponent,
    KjChatHeaderComponent,
    KjChatBubbleComponent,
    KjChatFooterComponent,
    KjAvatarComponent,
  ],
  styles: [`
    :host { display: block; }
    kj-chat-log { max-height: 22rem; }
  `],
  template: `
    <kj-chat-log kjChatLogLabel="Conversation with Alice">
      <kj-chat kjSide="start" kjChatAuthor="alice">
        <kj-chat-avatar>
          <kj-avatar content="AL" alt="Alice" />
        </kj-chat-avatar>
        <kj-chat-header>Alice <time datetime="2025-05-06T12:46">12:46</time></kj-chat-header>
        <kj-chat-bubble>Hey! Did you see the new spec?</kj-chat-bubble>
      </kj-chat>

      <kj-chat kjSide="end" kjChatAuthor="me">
        <kj-chat-bubble kjVariant="primary">Just landed, reading it now.</kj-chat-bubble>
        <kj-chat-footer kjState="read">Read 12:47</kj-chat-footer>
      </kj-chat>

      <kj-chat kjSide="start" kjChatAuthor="alice">
        <kj-chat-avatar>
          <kj-avatar content="AL" alt="Alice" />
        </kj-chat-avatar>
        <kj-chat-header>Alice <time datetime="2025-05-06T12:48">12:48</time></kj-chat-header>
        <kj-chat-bubble>Section 3 is the interesting part.</kj-chat-bubble>
      </kj-chat>

      <kj-chat kjSide="end" kjChatAuthor="me">
        <kj-chat-bubble kjVariant="primary">Agreed — let's pair on it tomorrow.</kj-chat-bubble>
        <kj-chat-footer kjState="delivered">Delivered</kj-chat-footer>
      </kj-chat>
    </kj-chat-log>
  `,
})
export class KjChatBubbleExample {}
