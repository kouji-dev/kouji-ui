import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  input,
} from '@angular/core';
import {
  KjChat,
  KjChatAvatar,
  KjChatBubble,
  KjChatFooter,
  KjChatHeader,
  KjChatLog,
  type KjChatRole,
  type KjChatSide,
  type KjChatState,
} from '@kouji-ui/core';

/**
 * Typed bubble variant set. Mirrors the analysis preset list so consumer
 * templates get IDE autocomplete; the underlying `KjVariant` widens to
 * `string` and is validated against `KJ_CHAT_BUBBLE_CONFIG` in dev mode.
 */
export type KjChatBubbleVariant =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'info'
  | 'success'
  | 'warning'
  | 'error';

/** Typed bubble size set. Backed by `KjSize` host directive. */
export type KjChatBubbleSize = 'sm' | 'md' | 'lg';

/** Live-region politeness for the log container. */
export type KjChatLogLive = 'polite' | 'off';

/**
 * Chat log container. Composes `KjChatLog` via `hostDirectives` so the
 * `role="log"` / `aria-live` / `aria-relevant` host bindings land on the
 * `<kj-chat-log>` custom element itself — that element IS the live region
 * announced by APG's Log pattern, AND the `KJ_CHAT_LOG` provider lives
 * here so projected `<kj-chat>` children find it through their consumer-
 * declared injector chain (content projection preserves the original
 * injection context).
 *
 * Per the analysis we ship `aria-live="polite"` by default and deliberately
 * do not expose `'assertive'` — interrupting the user mid-typing on every
 * inbound message is the canonical chat-app a11y bug.
 *
 * @doc-example Default
 *   @doc-file chat-bubble.example.ts
 * @doc-example Sides
 *   @doc-file chat-bubble.sides.example.ts
 * @doc-example Variants
 *   @doc-file chat-bubble.variants.example.ts
 * @doc-example With state
 *   @doc-file chat-bubble.with-state.example.ts
 * @doc-example Grouped
 *   @doc-file chat-bubble.grouped.example.ts
 * @category Library/Data display
 */
@Component({
  selector: 'kj-chat-log',
  standalone: true,
  hostDirectives: [
    {
      directive: KjChatLog,
      inputs: ['kjChatLogLive', 'kjChatLogLabel'],
    },
  ],
  template: `<ng-content />`,
  styleUrl: './chat.css',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'kj-chat-log' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjChatLogComponent {}

/**
 * Chat row. Composes `KjChat` via `hostDirectives` so `role="article"` (or
 * the consumer's `kjRole` override), `data-side`, `data-grouped`, and the
 * `aria-labelledby` / `aria-describedby` wiring all land on the `<kj-chat>`
 * host. The `KJ_CHAT` provider lives on the host so projected
 * `<kj-chat-header>`, `<kj-chat-bubble>`, `<kj-chat-footer>` children find
 * it through their original consumer-declared injector chain.
 *
 * Group-by-sender uses `previousElementSibling` traversal — that walk stays
 * deterministic even with the wrapper because the grouping `KjChat`
 * instances live on the visible custom elements that ARE physical DOM
 * siblings inside the log.
 */
@Component({
  selector: 'kj-chat',
  standalone: true,
  hostDirectives: [
    {
      directive: KjChat,
      inputs: ['kjSide', 'kjChatAuthor', 'kjChatGrouped', 'kjRole'],
    },
  ],
  template: `<ng-content />`,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'kj-chat' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjChatComponent {}

/**
 * Sender face slot. Composes `KjChatAvatar` so the slot is forced
 * `aria-hidden="true"` (the row's accessible name comes from the header;
 * letting the avatar's `<img alt>` re-announce the name causes AT users
 * to hear "Jane Doe, Jane Doe, [message]"). Project a decorative
 * `<kj-avatar>` (or any ornamental marker) inside.
 */
@Component({
  selector: 'kj-chat-avatar',
  standalone: true,
  hostDirectives: [KjChatAvatar],
  template: `<ng-content />`,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'kj-chat-avatar' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjChatAvatarComponent {}

/**
 * Sender name + time header. The directive mints a stable id and registers
 * it with the parent row for `aria-labelledby`; the wrapper supplies the
 * `<ng-content>` slot. Per the analysis the header should contain a
 * `<time datetime="…">` element; the directive does not enforce this — the
 * consumer renders it.
 */
@Component({
  selector: 'kj-chat-header',
  standalone: true,
  hostDirectives: [KjChatHeader],
  template: `<ng-content />`,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'kj-chat-header' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjChatHeaderComponent {}

/**
 * Rounded message body. Renders an inner `[kjChatBubble]` host (which
 * itself composes `KjVariant` + `KjSize` via `hostDirectives`) so
 * `data-variant`, `data-size`, and `data-tail` land on the visible bubble
 * element where the CSS expects them. The bubble does not provide DI
 * tokens to descendants, so projecting through an inner template does not
 * break any injection chain.
 *
 * Variant / size are typed at the wrapper layer for IDE autocomplete; they
 * widen to `string` at the directive layer where they are validated against
 * `KJ_CHAT_BUBBLE_CONFIG` in dev mode.
 */
@Component({
  selector: 'kj-chat-bubble',
  standalone: true,
  imports: [KjChatBubble],
  template: `
    <p
      kjChatBubble
      class="kj-chat-bubble"
      [kjVariant]="kjVariant()"
      [kjSize]="kjSize()"
      [kjChatBubbleNoTail]="kjChatBubbleNoTail()"
    >
      <ng-content />
    </p>
  `,
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjChatBubbleComponent {
  /** Visual register. Validated against `KJ_CHAT_BUBBLE_CONFIG`. */
  readonly kjVariant = input<KjChatBubbleVariant>('default');
  /** Density preset. Drives padding + font-size on the bubble. */
  readonly kjSize = input<KjChatBubbleSize>('md');
  /** Suppresses the tail unconditionally. Auto-suppression on grouped rows is independent. */
  readonly kjChatBubbleNoTail = input(false);
}

/**
 * Read-state footer. Composes `KjChatFooter` so the directive mints an id,
 * registers it with the parent row for `aria-describedby`, reflects
 * `kjState` to `data-state`, and injects an `aria-label` so the glyph is
 * intelligible to AT.
 */
@Component({
  selector: 'kj-chat-footer',
  standalone: true,
  hostDirectives: [
    {
      directive: KjChatFooter,
      inputs: ['kjState'],
    },
  ],
  template: `<ng-content />`,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'kj-chat-footer' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjChatFooterComponent {}

export type { KjChatRole, KjChatSide, KjChatState };
