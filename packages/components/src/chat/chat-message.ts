import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';
import { KjChat, type KjChatMessageData, type KjChatMessageRole } from '@kouji-ui/core';
import { renderMarkdown, type KjMdBlock } from './markdown';

/** Human-readable accessible name per role. */
const ROLE_LABEL: Record<KjChatMessageRole, string> = {
  user: 'You',
  assistant: 'Assistant',
  system: 'System',
  tool: 'Tool',
};

/**
 * Renders a single AI-thread message. Reuses the core `KjChat` row directive
 * for `role="article"` + side semantics, and renders the body per role:
 * user/assistant get a bubble with **safe markdown** (code blocks carry a copy
 * button), system gets a centered note, tool gets a tool-call card. Assistant
 * turns also surface tool-call cards, citations, and a reduced-motion typing
 * indicator while streaming.
 *
 * The message is given an `aria-label` (its role name) so AT announces
 * "Assistant, article" rather than an anonymous region — the visible content is
 * the message text itself.
 *
 * @doc
 * @doc-name ai-chat
 */
@Component({
  selector: 'kj-chat-message',
  standalone: true,
  imports: [KjChat],
  template: `
    <div
      kjChat
      class="kj-chat-msg"
      [kjSide]="side()"
      [attr.data-role]="message().role"
      [attr.aria-label]="roleLabel()"
    >
      @if (showAvatar()) {
        <div class="kj-chat-msg__avatar" aria-hidden="true">{{ avatarGlyph() }}</div>
      }

      <div class="kj-chat-msg__bubble">
        <!-- Tool-call cards (assistant turns) -->
        @for (tc of message().toolCalls ?? []; track tc.id) {
          <div
            class="kj-chat-tool"
            [attr.data-status]="tc.status"
            role="group"
            [attr.aria-label]="'Tool call: ' + tc.name"
          >
            <span class="kj-chat-tool__icon" aria-hidden="true">⚙</span>
            <span class="kj-chat-tool__name">{{ tc.name }}</span>
            <span class="kj-chat-tool__status">{{ tc.status }}</span>
            @if (tc.error) {
              <span class="kj-chat-tool__error">{{ tc.error }}</span>
            }
          </div>
        }

        <!-- Body -->
        <div class="kj-chat-msg__body">
          @for (block of blocks(); track $index) {
            @if (block.kind === 'code') {
              <div class="kj-chat-code">
                <div class="kj-chat-code__bar">
                  <span class="kj-chat-code__lang">{{ block.lang || 'code' }}</span>
                  <button
                    type="button"
                    class="kj-chat-code__copy"
                    [attr.aria-label]="copiedIndex() === $index ? 'Copied' : 'Copy code'"
                    (click)="copy(block.code, $index)"
                  >
                    {{ copiedIndex() === $index ? 'Copied' : 'Copy' }}
                  </button>
                </div>
                <pre class="kj-chat-code__pre"><code>{{ block.code }}</code></pre>
              </div>
            } @else {
              <div class="kj-chat-md" [innerHTML]="safe(block.html)"></div>
            }
          }

          <!-- Typing indicator while streaming with no content yet -->
          @if (message().streaming && message().content.length === 0) {
            <div class="kj-chat-typing" role="status" aria-label="Assistant is typing">
              <span class="kj-chat-typing__dot"></span>
              <span class="kj-chat-typing__dot"></span>
              <span class="kj-chat-typing__dot"></span>
            </div>
          }
        </div>

        <!-- Error -->
        @if (message().error) {
          <p class="kj-chat-msg__error" role="alert">{{ message().error }}</p>
        }

        <!-- Citations -->
        @if ((message().citations ?? []).length > 0) {
          <ul class="kj-chat-cites" aria-label="Sources">
            @for (c of message().citations ?? []; track c.id) {
              <li class="kj-chat-cite">
                @if (c.url) {
                  <a
                    class="kj-chat-cite__link"
                    [href]="c.url"
                    rel="noopener noreferrer"
                    target="_blank"
                    >{{ c.title }}</a
                  >
                } @else {
                  <span class="kj-chat-cite__link">{{ c.title }}</span>
                }
                @if (c.snippet) {
                  <span class="kj-chat-cite__snippet">{{ c.snippet }}</span>
                }
              </li>
            }
          </ul>
        }
      </div>
    </div>
  `,
  styleUrl: './chat-ai.css',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'kj-chat-msg-host' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjChatMessage {
  private readonly sanitizer = inject(DomSanitizer);

  /** The message to render. */
  readonly message = input.required<KjChatMessageData>();

  /** User messages sit on the `end` side; everyone else on `start`. */
  readonly side = computed(() => (this.message().role === 'user' ? 'end' : 'start'));

  readonly roleLabel = computed(() => ROLE_LABEL[this.message().role]);
  readonly avatarGlyph = computed(() => this.roleLabel().charAt(0));
  readonly showAvatar = computed(() => this.message().role !== 'system');

  /** Parsed markdown blocks for the body. */
  readonly blocks = computed<KjMdBlock[]>(() => renderMarkdown(this.message().content));

  private readonly _copied = signal<number | null>(null);
  readonly copiedIndex = this._copied.asReadonly();

  safe(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  async copy(code: string, index: number): Promise<void> {
    try {
      await navigator.clipboard?.writeText(code);
      this._copied.set(index);
      setTimeout(() => this._copied.set(null), 2000);
    } catch {
      /* clipboard unavailable — no-op */
    }
  }
}
