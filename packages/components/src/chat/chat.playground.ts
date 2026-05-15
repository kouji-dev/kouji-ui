import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  KjChatAvatarComponent,
  KjChatBubbleComponent,
  KjChatComponent,
  KjChatFooterComponent,
  KjChatHeaderComponent,
  KjChatLogComponent,
} from './chat';
import { KjAvatarComponent } from '../avatar/avatar';
import type { PlaygroundFile } from '@kouji-ui/components/playground-types';

/**
 * Playground state — module-scope signals. Tunes the variant assigned to the
 * outbound bubble, the size of every bubble, the read-state glyph, the
 * message count, and whether to render the avatar / footer slots.
 */
const variant = signal<
  'default' | 'primary' | 'secondary' | 'accent' | 'info' | 'success' | 'warning' | 'error'
>('primary');
const bubbleSize = signal<'sm' | 'md' | 'lg'>('md');
const state = signal<'sending' | 'sent' | 'delivered' | 'read' | 'error'>('read');
const messageCount = signal<2 | 3 | 4>(3);
const showAvatar = signal(true);
const showFooter = signal(true);

interface Msg {
  side: 'start' | 'end';
  author: string;
  name: string;
  time: string;
  body: string;
}

const MESSAGES: ReadonlyArray<Msg> = [
  { side: 'start', author: 'assistant', name: 'Assistant', time: '12:46', body: 'How can I help you today?' },
  { side: 'end', author: 'me', name: 'You', time: '12:47', body: "Summarise yesterday's release notes." },
  { side: 'start', author: 'assistant', name: 'Assistant', time: '12:48', body: 'Three highlights — token system, accordion polish, and overlay fixes.' },
  { side: 'end', author: 'me', name: 'You', time: '12:49', body: 'Thanks — share the changelog link please.' },
];

@Component({
  selector: 'kj-chat-playground',
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
    kj-chat-log { max-height: 22rem; }
  `],
  template: `
    <kj-chat-log kjChatLogLabel="Conversation with the assistant">
      @for (msg of visibleMessages(); track $index) {
        <kj-chat [kjSide]="msg.side" [kjChatAuthor]="msg.author">
          @if (showAvatar() && msg.side === 'start') {
            <kj-chat-avatar>
              <kj-avatar [content]="msg.name === 'Assistant' ? 'AI' : 'ME'" [alt]="msg.name" />
            </kj-chat-avatar>
          }
          <kj-chat-header>{{ msg.name }} <time>{{ msg.time }}</time></kj-chat-header>
          <kj-chat-bubble
            [kjVariant]="msg.side === 'end' ? variant() : 'default'"
            [kjSize]="bubbleSize()"
          >{{ msg.body }}</kj-chat-bubble>
          @if (showFooter() && msg.side === 'end') {
            <kj-chat-footer [kjState]="state()">{{ stateLabel() }}</kj-chat-footer>
          }
        </kj-chat>
      }
    </kj-chat-log>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjChatPlaygroundDemo {
  protected readonly variant = variant;
  protected readonly bubbleSize = bubbleSize;
  protected readonly state = state;
  protected readonly messageCount = messageCount;
  protected readonly showAvatar = showAvatar;
  protected readonly showFooter = showFooter;

  protected visibleMessages(): readonly Msg[] {
    return MESSAGES.slice(0, messageCount());
  }

  protected stateLabel(): string {
    const labels: Record<string, string> = {
      sending: 'Sending',
      sent: 'Sent',
      delivered: 'Delivered',
      read: 'Read',
      error: 'Failed',
    };
    return labels[state()] ?? 'Sent';
  }
}

export const PLAYGROUND: PlaygroundFile = {
  component: KjChatPlaygroundDemo,
  state: {
    variant: variant as unknown as ReturnType<typeof signal>,
    bubbleSize: bubbleSize as unknown as ReturnType<typeof signal>,
    state: state as unknown as ReturnType<typeof signal>,
    messageCount: messageCount as unknown as ReturnType<typeof signal>,
    showAvatar: showAvatar as unknown as ReturnType<typeof signal>,
    showFooter: showFooter as unknown as ReturnType<typeof signal>,
  },
  controls: [
    {
      kind: 'chips',
      name: 'variant',
      label: 'self variant',
      // Full `KjChatBubbleVariant` set — keeps the panel coherent with the
      // bubble component's actual API surface so every chip resolves to a
      // real token, not a "best of" subset.
      options: ['default', 'primary', 'secondary', 'accent', 'info', 'success', 'warning', 'error'],
    },
    { kind: 'chips', name: 'bubbleSize', label: 'bubble size', options: ['sm', 'md', 'lg'] },
    {
      kind: 'chips',
      name: 'state',
      label: 'read state',
      options: ['sending', 'sent', 'delivered', 'read', 'error'],
    },
    { kind: 'chips', name: 'messageCount', label: 'messages', options: [2, 3, 4] },
    { kind: 'toggle', name: 'showAvatar', label: 'show avatars' },
    { kind: 'toggle', name: 'showFooter', label: 'show read state' },
  ],
  snippet: (values) => {
    const s = values as {
      variant: string;
      bubbleSize: string;
      state: string;
      messageCount: number;
      showAvatar: boolean;
      showFooter: boolean;
    };
    const stateLabel: Record<string, string> = {
      sending: 'Sending',
      sent: 'Sent',
      delivered: 'Delivered',
      read: 'Read',
      error: 'Failed',
    };
    const rows = MESSAGES.slice(0, s.messageCount)
      .map((msg) => {
        const parts: string[] = [];
        if (s.showAvatar && msg.side === 'start') {
          const initials = msg.name === 'Assistant' ? 'AI' : 'ME';
          parts.push(`    <kj-chat-avatar>\n      <kj-avatar content="${initials}" alt="${msg.name}" />\n    </kj-chat-avatar>`);
        }
        parts.push(`    <kj-chat-header>${msg.name} <time>${msg.time}</time></kj-chat-header>`);
        const bubbleVariant = msg.side === 'end' ? s.variant : 'default';
        parts.push(
          `    <kj-chat-bubble kjVariant="${bubbleVariant}" kjSize="${s.bubbleSize}">${msg.body}</kj-chat-bubble>`,
        );
        if (s.showFooter && msg.side === 'end') {
          parts.push(`    <kj-chat-footer kjState="${s.state}">${stateLabel[s.state] ?? 'Sent'}</kj-chat-footer>`);
        }
        return `  <kj-chat kjSide="${msg.side}" kjChatAuthor="${msg.author}">\n${parts.join('\n')}\n  </kj-chat>`;
      })
      .join('\n');
    return `<kj-chat-log kjChatLogLabel="Conversation with the assistant">\n${rows}\n</kj-chat-log>`;
  },
};
