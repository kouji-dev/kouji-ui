import { Component } from '@angular/core';
import { KjAvatarComponent } from '../avatar/avatar';
import {
  KjChatAvatarComponent,
  KjChatBubbleComponent,
  KjChatComponent,
  KjChatHeaderComponent,
  KjChatLogComponent,
} from './chat';

/**
 * Auto-grouping by sender. Three messages from Alice in a row, then one
 * from me — the avatar slot, header, and tail appear only on the first
 * Alice message; the next two are visually grouped (avatar visibility
 * hidden, header hidden, no tail). Grouping is computed by the row
 * directive walking `previousElementSibling` against a shared registry.
 */
@Component({
  selector: 'kj-chat-bubble-grouped-example',
  standalone: true,
  imports: [
    KjChatLogComponent,
    KjChatComponent,
    KjChatAvatarComponent,
    KjChatHeaderComponent,
    KjChatBubbleComponent,
    KjAvatarComponent,
  ],
  styles: [`
    :host { display: block; }
  `],
  template: `
    <kj-chat-log kjChatLogLabel="Grouped messages">
      <kj-chat kjSide="start" kjChatAuthor="alice">
        <kj-chat-avatar>
          <kj-avatar content="AL" alt="Alice" />
        </kj-chat-avatar>
        <kj-chat-header>Alice <time datetime="2025-05-06T10:00">10:00</time></kj-chat-header>
        <kj-chat-bubble>Hey, quick question —</kj-chat-bubble>
      </kj-chat>

      <kj-chat kjSide="start" kjChatAuthor="alice">
        <kj-chat-avatar>
          <kj-avatar content="AL" alt="Alice" />
        </kj-chat-avatar>
        <kj-chat-header>Alice <time datetime="2025-05-06T10:00">10:00</time></kj-chat-header>
        <kj-chat-bubble>are you free for 15 mins?</kj-chat-bubble>
      </kj-chat>

      <kj-chat kjSide="start" kjChatAuthor="alice">
        <kj-chat-avatar>
          <kj-avatar content="AL" alt="Alice" />
        </kj-chat-avatar>
        <kj-chat-header>Alice <time datetime="2025-05-06T10:01">10:01</time></kj-chat-header>
        <kj-chat-bubble>around 2pm?</kj-chat-bubble>
      </kj-chat>

      <kj-chat kjSide="end" kjChatAuthor="me">
        <kj-chat-bubble kjVariant="primary">Yep, 2pm works.</kj-chat-bubble>
      </kj-chat>
    </kj-chat-log>
  `,
})
export class KjChatBubbleGroupedExample {}
