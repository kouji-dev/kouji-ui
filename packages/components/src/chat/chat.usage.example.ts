import { ChangeDetectionStrategy, Component } from '@angular/core';
import { KjAvatarComponent } from '../avatar/avatar';
import {
  KjChatAvatarComponent,
  KjChatBubbleComponent,
  KjChatComponent,
  KjChatFooterComponent,
  KjChatHeaderComponent,
  KjChatLogComponent,
} from './chat';

/**
 * Common chat-log shape — labelled log, two senders, sides, a primary
 * variant for self, and a footer read-state. Use this as the copy-paste
 * starting point for new screens.
 */
@Component({
  selector: 'kj-chat-usage-example',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
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
    kj-chat-log { max-height: 20rem; }
  `],
  template: `
    <kj-chat-log kjChatLogLabel="Conversation with Maya">
      <kj-chat kjSide="start" kjChatAuthor="maya">
        <kj-chat-avatar><kj-avatar content="MA" alt="Maya" /></kj-chat-avatar>
        <kj-chat-header>Maya <time datetime="2025-05-06T09:12">09:12</time></kj-chat-header>
        <kj-chat-bubble>Want to ship the token system this week?</kj-chat-bubble>
      </kj-chat>

      <kj-chat kjSide="end" kjChatAuthor="me">
        <kj-chat-bubble kjVariant="primary">Yes — PR's open, waiting on review.</kj-chat-bubble>
        <kj-chat-footer kjState="read">Read</kj-chat-footer>
      </kj-chat>
    </kj-chat-log>
  `,
})
export class KjChatUsageExample {}
