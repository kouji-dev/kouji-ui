import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewEncapsulation,
  booleanAttribute,
  computed,
  effect,
  input,
  model,
  output,
  signal,
  viewChild,
  inject,
} from '@angular/core';
import {
  matchSlashCommands,
  parseSlash,
  type KjSlashCommand,
  KjId,
  KjTranslateService,
} from '@kouji-ui/core';

/**
 * Prompt composer for an AI thread: an auto-growing textarea with send / stop
 * controls, an optional attachment slot (`[kjPromptAttachments]`), and a
 * slash-command menu.
 *
 * **Keyboard:** `Enter` sends, `Shift+Enter` inserts a newline, `Esc` stops the
 * stream (when streaming) or closes the slash menu; `↑/↓` move the slash
 * selection and `Enter` picks it. The menu is a `role="listbox"`; the textarea
 * keeps DOM focus and points `aria-activedescendant` at the active option.
 *
 * **Slash matching reuses the command-palette engine** via
 * `matchSlashCommands` (backed by the palette's `kjSubstringFilter`).
 *
 * @doc
 * @doc-name ai-chat
 */
@Component({
  selector: 'kj-prompt-input',
  standalone: true,
  template: `
    <form class="kj-prompt" (submit)="onSubmit($event)">
      @if (slashOpen()) {
        <ul
          class="kj-prompt__slash"
          role="listbox"
          [id]="listboxId"
          [attr.aria-label]="slashCommandsLabel()"
        >
          @for (cmd of slashMatches(); track cmd.name; let i = $index) {
            <li
              class="kj-prompt__slash-item"
              role="option"
              [id]="optionId(i)"
              [attr.aria-selected]="i === activeIndex()"
              [class.is-active]="i === activeIndex()"
              (mousedown)="pickSlash($event, cmd)"
            >
              <span class="kj-prompt__slash-name">{{ cmd.name }}</span>
              @if (cmd.description) {
                <span class="kj-prompt__slash-desc">{{ cmd.description }}</span>
              }
            </li>
          }
        </ul>
      }

      <label class="kj-visually-hidden" [attr.for]="textareaId">{{ kjLabel() }}</label>
      <textarea
        #ta
        class="kj-prompt__textarea"
        [id]="textareaId"
        [attr.placeholder]="kjPlaceholder()"
        [attr.aria-label]="kjLabel()"
        [attr.role]="slashOpen() ? 'combobox' : null"
        [attr.aria-expanded]="slashOpen() ? 'true' : null"
        [attr.aria-controls]="slashOpen() ? listboxId : null"
        [attr.aria-activedescendant]="slashOpen() ? optionId(activeIndex()) : null"
        [attr.aria-haspopup]="slashOpen() ? 'listbox' : null"
        [attr.aria-autocomplete]="slashOpen() ? 'list' : null"
        [disabled]="kjDisabled()"
        [value]="kjValue()"
        rows="1"
        (input)="onInput($event)"
        (keydown)="onKeydown($event)"
      ></textarea>

      <div class="kj-prompt__actions">
        <span class="kj-prompt__attachments">
          <ng-content select="[kjPromptAttachments]" />
        </span>
        @if (kjStreaming()) {
          <button
            type="button"
            class="kj-prompt__btn kj-prompt__btn--stop"
            [attr.aria-label]="stopLabel()"
            (click)="onStop()"
          >
            <span aria-hidden="true">■</span>
          </button>
        } @else {
          <button
            type="submit"
            class="kj-prompt__btn kj-prompt__btn--send"
            [attr.aria-label]="sendLabel()"
            [disabled]="kjDisabled() || kjValue().trim().length === 0"
          >
            <span aria-hidden="true">↥</span>
          </button>
        }
      </div>
    </form>
  `,
  styleUrl: './chat-ai.css',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'kj-prompt-host' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjPromptInput {
  private readonly ids = inject(KjId);
  private readonly i18n = inject(KjTranslateService);

  /**
   * Accessible name of the slash-command listbox, from the i18n catalog
   * (`chat.slashCommands`) — cust F-7: no assistive string is baked into this
   * template.
   */
  protected readonly slashCommandsLabel = this.i18n.translation('chat.slashCommands');

  /** Accessible name of the stop-streaming button (`chat.stop`). */
  protected readonly stopLabel = this.i18n.translation('chat.stop');

  /** Accessible name of the send button (`chat.send`). */
  protected readonly sendLabel = this.i18n.translation('chat.send');
  readonly textareaId = this.ids.mint('prompt');
  readonly listboxId = this.ids.mint('prompt-slash');

  /** Two-way bound draft text. */
  readonly kjValue = model<string>('');
  /** Placeholder text. */
  readonly kjPlaceholder = input('Message the assistant…');
  /** Accessible label for the textarea. */
  readonly kjLabel = input('Message');
  /** When true, show the Stop button instead of Send. Default `false`. */
  readonly kjStreaming = input(false, { transform: booleanAttribute });
  /** Disable the composer entirely. Default `false`. */
  readonly kjDisabled = input(false, { transform: booleanAttribute });
  /** Available slash commands. */
  readonly kjSlashCommands = input<readonly KjSlashCommand[]>([]);

  /** Emits the trimmed message text on send. */
  readonly kjSend = output<string>();
  /** Emits when the user requests a stop. */
  readonly kjStop = output<void>();
  /** Emits the picked slash command. */
  readonly kjSlashSelect = output<KjSlashCommand>();

  private readonly ta = viewChild.required<ElementRef<HTMLTextAreaElement>>('ta');
  private readonly _active = signal(0);
  readonly activeIndex = this._active.asReadonly();

  private readonly slash = computed(() => parseSlash(this.kjValue()));
  readonly slashMatches = computed<KjSlashCommand[]>(() => {
    const s = this.slash();
    if (!s.active) return [];
    return matchSlashCommands(s.query, this.kjSlashCommands());
  });
  readonly slashOpen = computed(() => this.slashMatches().length > 0);

  constructor() {
    // Keep the active index in range as matches change.
    effect(() => {
      const n = this.slashMatches().length;
      if (this._active() >= n) this._active.set(0);
    });
    // Auto-grow whenever the value changes (incl. programmatic resets).
    effect(() => {
      this.kjValue();
      queueMicrotask(() => this.autogrow());
    });
  }

  optionId(i: number): string {
    return `${this.listboxId}-opt-${i}`;
  }

  onInput(ev: Event): void {
    this.kjValue.set((ev.target as HTMLTextAreaElement).value);
    this.autogrow();
  }

  onKeydown(ev: KeyboardEvent): void {
    if (this.slashOpen()) {
      if (ev.key === 'ArrowDown') {
        ev.preventDefault();
        this._active.update((i) => (i + 1) % this.slashMatches().length);
        return;
      }
      if (ev.key === 'ArrowUp') {
        ev.preventDefault();
        const n = this.slashMatches().length;
        this._active.update((i) => (i - 1 + n) % n);
        return;
      }
      if (ev.key === 'Enter') {
        ev.preventDefault();
        const cmd = this.slashMatches()[this._active()];
        if (cmd) this.commitSlash(cmd);
        return;
      }
      if (ev.key === 'Escape') {
        ev.preventDefault();
        // Close the menu by clearing the in-progress slash token.
        this.kjValue.set('');
        return;
      }
    }

    if (ev.key === 'Enter' && !ev.shiftKey) {
      ev.preventDefault();
      this.send();
      return;
    }
    if (ev.key === 'Escape' && this.kjStreaming()) {
      ev.preventDefault();
      this.onStop();
    }
  }

  onSubmit(ev: Event): void {
    ev.preventDefault();
    this.send();
  }

  onStop(): void {
    this.kjStop.emit();
  }

  pickSlash(ev: Event, cmd: KjSlashCommand): void {
    ev.preventDefault(); // keep textarea focus
    this.commitSlash(cmd);
  }

  private commitSlash(cmd: KjSlashCommand): void {
    this.kjSlashSelect.emit(cmd);
    this.kjValue.set(cmd.name + ' ');
    this.ta().nativeElement.focus();
  }

  private send(): void {
    const text = this.kjValue().trim();
    if (!text || this.kjDisabled() || this.kjStreaming()) return;
    this.kjSend.emit(text);
    this.kjValue.set('');
    this.autogrow();
  }

  private autogrow(): void {
    const el = this.ta().nativeElement;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }
}
