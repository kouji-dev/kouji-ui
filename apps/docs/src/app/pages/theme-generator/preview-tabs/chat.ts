import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  KjPopoverClose,
  KjPopoverContent,
  KjPopoverTitle,
  KjPopoverTrigger,
} from '@kouji-ui/core';
import {
  KjAvatarComponent,
  KjBadgeComponent,
  KjButtonComponent,
  KjChatAvatarComponent,
  KjChatBubbleComponent,
  KjChatComponent,
  KjChatFooterComponent,
  KjChatHeaderComponent,
  KjChatLogComponent,
  KjFileUploadComponent,
  KjInputComponent,
} from '@kouji-ui/components';
import { CONVERSATIONS, MESSAGES } from './fixtures';

@Component({
  selector: 'kj-preview-chat',
  standalone: true,
  imports: [
    FormsModule,
    KjAvatarComponent,
    KjBadgeComponent,
    KjButtonComponent,
    KjChatAvatarComponent,
    KjChatBubbleComponent,
    KjChatComponent,
    KjChatFooterComponent,
    KjChatHeaderComponent,
    KjChatLogComponent,
    KjFileUploadComponent,
    KjInputComponent,
    KjPopoverClose,
    KjPopoverContent,
    KjPopoverTitle,
    KjPopoverTrigger,
  ],
  templateUrl: './chat.html',
  styleUrl: './chat.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PreviewChat {
  protected readonly conversations = CONVERSATIONS;
  protected readonly messages = MESSAGES;
  protected readonly activeId = signal<string>(CONVERSATIONS[0]!.id);
  protected readonly draft = signal('');
  protected readonly emojis = ['😀', '😂', '👍', '🎉', '🙌', '🚀', '❤️', '🔥'] as const;

  protected select(id: string): void {
    this.activeId.set(id);
  }

  protected appendEmoji(e: string): void {
    this.draft.update((d) => d + e);
  }

  protected send(): void {
    this.draft.set('');
  }
}
