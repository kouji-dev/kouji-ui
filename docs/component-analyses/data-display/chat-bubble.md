# Chat Bubble

A styled container for a single message in a chat thread. Renders as a
horizontal **row** keyed to a side (start = "their" message, end =
"your" message) with up to four projected slots: an **avatar** at the
side edge, a **header** carrying name + time, the **bubble body**
itself, and a **footer** for delivery / read state. Many bubbles
stacked inside a scroll surface form a chat history; the chat history,
not the bubble, is the live region that announces incoming messages.

> No code on disk. The component is greenfield. This analysis fixes
> the directive surface, ARIA story, and composition before any code
> lands so the v1 ships with the right boundary against
> [`avatar.md`](./avatar.md) (the sender face), [`badge.md`](./badge.md)
> (read-state pip), and the eventual `KjList` / `KjFeed` container.

The chat-bubble shape is daisyUI's: `chat`, `chat-image`,
`chat-header`, `chat-bubble`, `chat-footer`, all parameterised by a
`chat-start` / `chat-end` modifier. PrimeNG, Angular Material, and
shadcn/ui have **no first-class equivalent** — this is a category
where kouji can ship a clean primitive instead of letting every app
re-invent the geometry.

## Source comparison

| Concern                   | PrimeNG                                                                                                    | Angular Material                                                                                | shadcn/ui                                                                                  | daisyUI (canonical reference)                                                                                                  |
| ------------------------- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| Primary surface           | None. `<p-card>` + custom CSS or `<p-message>` repurposed.                                                  | None. Recipes glue `<mat-list-item>` + `<mat-card>` + manual flex.                              | None. Community recipes layer Tailwind utility classes onto a `<div>` per message.         | First-class: `chat`, `chat-image`, `chat-header`, `chat-bubble`, `chat-footer`. The `chat` class is the row; `chat-bubble` is the rounded body. |
| Side                      | n/a                                                                                                        | n/a                                                                                             | Recipes use `flex-row` / `flex-row-reverse`.                                                | `chat-start` / `chat-end` modifier on the row. RTL is a separate concern; daisyUI does not auto-flip for RTL.                  |
| Avatar slot               | n/a                                                                                                        | `<mat-list-item>` has a `matListItemAvatar` directive that is reused in chat recipes.            | Recipe drops a `<Avatar>` next to the bubble.                                              | `chat-image` slot, typically holding `avatar` markup. Sized to the bubble's font metrics.                                       |
| Header / footer           | n/a                                                                                                        | n/a                                                                                             | Recipe uses additional `<div>`s above / below.                                              | `chat-header` (name + time) above the bubble; `chat-footer` (status) below.                                                     |
| Variants                  | n/a                                                                                                        | n/a                                                                                             | Tailwind utility classes per consumer.                                                      | `chat-bubble-{primary,secondary,accent,info,success,warning,error}` on the bubble.                                              |
| Tail                      | n/a                                                                                                        | n/a                                                                                             | Recipe-driven; usually a CSS pseudo-element.                                                | Built-in: a CSS-drawn tail at the bottom corner of the bubble on the side that touches the avatar. Cannot be turned off without overriding CSS. |
| Grouping (consecutive same-sender) | n/a                                                                                                | n/a                                                                                             | Consumer-managed.                                                                           | Not handled. The consumer chooses to omit `chat-image` / `chat-header` on the second-and-subsequent messages from the same sender. |
| ARIA / role               | n/a                                                                                                        | n/a                                                                                             | Consumer-applied.                                                                          | None. daisyUI is CSS-only — no role wiring, no live region.                                                                     |
| Time element              | n/a                                                                                                        | n/a                                                                                             | Consumer-applied.                                                                           | Recommended `<time>` in the header per HTML spec, not enforced.                                                                  |
| Read state                | n/a                                                                                                        | n/a                                                                                             | Consumer-applied.                                                                           | Free-form text in `chat-footer`, e.g. "Seen 12:46". No semantic state machine.                                                  |
| Container                 | n/a                                                                                                        | `<mat-list>` if used at all.                                                                    | Recipe wraps in a `<div>` with overflow scrolling.                                          | None. The `chat` rows are siblings; the consumer wraps in a scroll container of their choice.                                   |

**Read-off.**

- **PrimeNG / Material / shadcn** all leave chat to userland. The
  recipes that exist out there agree on the *visual* (a row, an
  avatar, a rounded body, a tail) but disagree on the *semantics*
  (role, live region, time element, group-by-sender). Userland ends
  up shipping seven slightly different implementations per app.
- **daisyUI** is the only one that ships the geometry as named
  parts. Borrow the part names — `chat`, `chat-image`,
  `chat-header`, `chat-bubble`, `chat-footer` — because they are the
  vocabulary chat designers already use, then add the semantic layer
  daisyUI omits (role, time, read state, group-by-sender, RTL).

## Decision (core directive)

**Yes — ship a directive family, not just CSS.** The "do nothing
behavioural, just position five slots" temptation is wrong here for
three reasons:

1. **Side is logical, not physical.** Consumers will write
   `kjSide="start"` for "their" messages and `kjSide="end"` for "your"
   messages. In RTL the visual side flips. A class-only solution
   forces the consumer to compute `flex-row-reverse` based on
   `dir="rtl"` and the message author — error-prone and easily gets
   out of sync. A directive owns the mapping and writes
   `[attr.dir]` / a `data-side` attribute that CSS reads.
2. **Group-by-sender (tail / no-tail, header / no-header).** Whether
   to draw the tail and the header depends on the **previous**
   sibling's sender — a relationship that cannot be expressed in CSS
   without a sibling-selector hack that breaks the moment a
   non-`KjChat` element appears between rows. The directive can read
   the previous sibling's context (or take an explicit
   `kjChatGrouped` boolean from the consumer) and toggle a
   `data-grouped` attribute on the host that CSS uses to suppress
   the tail and the avatar slot.
3. **The list is the live region, not the bubble.** WCAG 4.1.3
   (Status Messages) and the chat-app convention is that *new
   incoming* messages are announced politely as they appear. That is
   a property of the **container** (the chat history), not of any
   one bubble. We ship a `KjChatLog` container directive that owns
   `role="log"` + `aria-live="polite"` + `aria-relevant="additions"`,
   and *each* `KjChat` row defaults to `role="article"` so an AT
   user can navigate message-by-message via the document's structure.
   Without a directive, neither the container ARIA nor the per-row
   article role gets wired correctly across consumer apps.

What does **not** justify a directive: the `start` vs. `end` visual
itself (just CSS reading `data-side`), the bubble's rounded chrome
(pure CSS using shared radius tokens), the colour variants (delegated
to `KjVariant` on the bubble part), or the tail shape (a CSS pseudo).
Those stay in the components-package stylesheet.

The directive layer earns its keep on **side mapping, group-by-sender
co-ordination, ARIA roles, and the live-region container**. Visual
chrome stays in CSS.

## Composition

shadcn / Radix-style sub-components — five directives + one container,
one injection token. Each directive maps one part of daisyUI's
vocabulary; the container is the new piece daisyUI doesn't ship.

```
chat/
  chat-log.ts          ← KjChatLog (container, role="log", aria-live)
  chat.ts              ← KjChat (row, owns kjSide, role="article", grouping)
  chat-avatar.ts       ← KjChatAvatar (slot at the side edge; wraps a KjAvatar)
  chat-header.ts       ← KjChatHeader (name + <time>)
  chat-bubble.ts       ← KjChatBubble (rounded body; KjVariant + KjSize)
  chat-footer.ts       ← KjChatFooter (read receipt / delivery status)
  chat.context.ts      ← KjChatContext, KjChatLogContext, KJ_CHAT, KJ_CHAT_LOG
  chat.spec.ts
  index.ts
```

Six directives, two injection tokens (`KJ_CHAT_LOG` for the
container, `KJ_CHAT` for the row). Children inject `KJ_CHAT`
optionally — they all work standalone if the consumer wants to render
a single bubble outside a log (e.g. a quoted-message preview inside an
input).

### `KjChatLog` (`[kjChatLog]`) — the container

```ts
@Directive({
  selector: '[kjChatLog]',
  providers: [{ provide: KJ_CHAT_LOG, useExisting: KjChatLog }],
  host: {
    'role': 'log',
    '[attr.aria-live]': 'kjChatLogLive()',
    '[attr.aria-relevant]': '"additions"',
    '[attr.aria-atomic]': '"false"',
    '[attr.aria-label]': 'kjChatLogLabel() ?? null',
  },
})
export class KjChatLog {
  readonly kjChatLogLive = input<'polite' | 'off'>('polite');
  readonly kjChatLogLabel = input<string | undefined>(undefined);
  // Internal registry of KjChat rows for group-by-sender lookups (Q3).
  register(row: KjChatContext): void { /* … */ }
  unregister(row: KjChatContext): void { /* … */ }
  previousSibling(row: KjChatContext): KjChatContext | undefined { /* … */ }
}
```

Default `aria-live="polite"` is correct for the **incoming** stream
(see APG's [Log
pattern](https://www.w3.org/WAI/ARIA/apg/patterns/log/)). When the log
holds outgoing-only echoes (e.g. an admin tool replaying a thread
read-only), the consumer sets `kjChatLogLive="off"` to suppress
re-announcement. We do **not** ship `assertive` — it would interrupt
a user mid-typing on every inbound message and is the canonical
chat-app a11y bug.

`aria-relevant="additions"` confines announcements to *new* messages.
Without this, edits to existing bubbles would re-announce the full
edited message — annoying and incorrect (the user already heard it).

### `KjChat` (`[kjChat]`) — the row

```ts
@Directive({
  selector: '[kjChat]',
  providers: [{ provide: KJ_CHAT, useExisting: KjChat }],
  host: {
    'role': 'article',
    '[attr.data-side]': 'kjSide()',
    '[attr.data-grouped]': 'grouped() ? "" : null',
    '[attr.aria-labelledby]': 'headerId() ?? null',
    '[attr.aria-describedby]': 'footerId() ?? null',
  },
})
export class KjChat implements KjChatContext {
  readonly kjSide = input<'start' | 'end'>('start');
  readonly kjChatGrouped = input<boolean | undefined>(undefined);
  readonly kjChatAuthor = input<string | undefined>(undefined); // sender id used for auto-grouping
  // …
  readonly grouped = computed(() => this.kjChatGrouped() ?? this.autoGrouped());
}
```

`role="article"` per row gives AT users a structural landmark per
message — `H` (heading) navigation hits the chat-header's name, and
`M` (article) navigation in JAWS / NVDA jumps message-by-message.
This is the convention used by Slack, Teams, and accessible chat
recipes. The two listed alternatives — `role="listitem"` (requires
the parent to be `role="list"`) and no-role (default `generic`) — are
weaker:

- `role="list"` + `role="listitem"` is structurally correct but loses
  the per-message landmark; `H`-navigation across messages becomes
  awkward inside a list.
- No role makes per-message navigation impossible; the screen reader
  has to walk character by character.

We pick `role="article"` and document it. Consumers who **insist** on
listitem semantics can override via host binding; we don't gate.

`data-side` is the single source of side truth. CSS reads it:

```css
.kj-chat[data-side="end"]     { flex-direction: row-reverse; }
.kj-chat[data-side="start"]   { flex-direction: row; }
[dir="rtl"] .kj-chat[data-side="end"]   { flex-direction: row; }
[dir="rtl"] .kj-chat[data-side="start"] { flex-direction: row-reverse; }
```

The directive does **not** read `dir` itself — the cascade does. This
keeps the directive small and means the consumer can override
direction per-row by setting `dir="ltr"` on the `KjChat` element if a
single message needs to break out of the surrounding RTL flow.

`data-grouped` is set when the previous `KjChat` row in the same
`KjChatLog` carries the same `kjChatAuthor`. CSS uses it to:

- hide the avatar slot (`[data-grouped] [kjChatAvatar] { visibility: hidden; }` — visibility, not display, so the layout doesn't collapse and tighten the gap),
- hide the header slot,
- omit the tail.

Auto-grouping requires a `KjChatLog` parent (so the directive has a
sibling registry). Standalone `KjChat` rows don't auto-group; the
consumer sets `[kjChatGrouped]="true"` explicitly.

`aria-labelledby` points at the header's id when a `KjChatHeader` is
present (the header carries the sender's name — the message's
accessible name). `aria-describedby` points at the footer's id when a
`KjChatFooter` is present (read state — useful description, not the
name).

### `KjChatAvatar` (`[kjChatAvatar]`) — the side-edge slot

```ts
@Directive({
  selector: '[kjChatAvatar]',
  host: {
    'role': 'presentation',
    '[attr.aria-hidden]': '"true"',
  },
})
export class KjChatAvatar { /* no inputs */ }
```

The slot itself is **always decorative** — the sender's identity is
already announced by the row's `aria-labelledby` → header → name. If
we let the avatar's `<img alt>` re-announce the name, AT users hear
"Jane Doe, Jane Doe, [message]". The directive forces
`aria-hidden="true"` on the slot. Consumers project a `<kj-avatar
[kjDecorative]="true">` into it, or any other ornamental marker. See
[`avatar.md`](./avatar.md) for the decorative-mode contract on Avatar.

The slot is a real element (not just a CSS pseudo) because the
consumer must be able to project arbitrary content — a status-dot,
their own SVG, a fall-back monogram component — and because the slot's
size must match the bubble's font metrics, which is layout, not paint.

### `KjChatHeader` (`[kjChatHeader]`)

```ts
@Directive({
  selector: '[kjChatHeader]',
  host: {
    '[id]': 'id()',
  },
})
export class KjChatHeader {
  // mints a stable id and registers it with KJ_CHAT for aria-labelledby
}
```

A thin directive whose job is to **mint a stable id and register it
with the parent `KjChat`** so the row's `aria-labelledby` can target
it. Visual chrome (small font, muted colour, spacing above the bubble)
lives in CSS. The header **must contain** a `<time datetime="…">` for
the message timestamp — see *Time element* below — but the directive
does not enforce this; the wrapper template does, and a dev-mode
warning fires if the projected content has no `<time>`.

### `KjChatBubble` (`[kjChatBubble]`) — the rounded body

```ts
@Directive({
  selector: '[kjChatBubble]',
  hostDirectives: [
    { directive: KjVariant, inputs: ['kjVariant'] },
    { directive: KjSize, inputs: ['kjSize'] },
  ],
  host: {
    '[attr.data-tail]': 'showTail() ? "" : null',
  },
})
export class KjChatBubble {
  readonly kjChatBubbleNoTail = input<boolean>(false);
  readonly showTail = computed(() =>
    !this.kjChatBubbleNoTail() && !this.row?.grouped(),
  );
}
```

This is where `KjVariant` and `KjSize` live — not on `KjChat`, not on
`KjChatLog`, but on the **bubble** itself. The variant decides the
message's visual register: `primary` for "your" messages, `secondary`
or `default` for theirs, `info` / `success` / `warning` / `error` for
system / status / alert messages, `accent` for highlighted (e.g. a
mention or a quoted reply). `KjSize` (sm / md / lg) controls density
for compact threads.

The `data-tail` attribute (presence-only, no value) is what the CSS
pseudo-element tail keys off:

```css
.kj-chat-bubble[data-tail]::before { /* draw the tail */ }
.kj-chat[data-side="start"] .kj-chat-bubble[data-tail]::before { /* left tail */ }
.kj-chat[data-side="end"]   .kj-chat-bubble[data-tail]::before { /* right tail */ }
```

The tail is suppressed when `kjChatBubbleNoTail` is true *or* the row
is grouped (the tail belongs only to the first message in a run from
the same sender).

### `KjChatFooter` (`[kjChatFooter]`)

```ts
@Directive({
  selector: '[kjChatFooter]',
  host: {
    '[id]': 'id()',
    '[attr.data-state]': 'kjChatFooterState()',
  },
})
export class KjChatFooter {
  readonly kjChatFooterState = input<'sending' | 'sent' | 'delivered' | 'read' | 'error' | undefined>(undefined);
}
```

Mints an id and registers with `KJ_CHAT` for `aria-describedby`.
Carries the **read-state** as a `data-state` attribute the components-package
CSS uses to render a check-mark / double-check / clock / exclamation
glyph. `kjChatFooterState` is optional — consumers may project free
text ("Seen 12:46") instead, and `data-state` simply isn't reflected.
When set, the directive also injects an `aria-label` ("Read", "Sent",
etc.) on the footer so the description is intelligible to AT.

### Reused primitives

| Primitive            | Where                                  | Why                                                                                                                             |
| -------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `KjVariant`          | `hostDirectives` on `KjChatBubble`     | Per-message visual register (your-msg primary, system info, error red). Same preset machinery as Badge, Tag, Button.            |
| `KjSize`             | `hostDirectives` on `KjChatBubble`     | Density tokens: `sm` for compact ops dashboards, `lg` for friendly consumer chats. Default `md`.                                |
| `KjAvatar` (composed in user templates) | projected into `[kjChatAvatar]`        | The face of the sender. Always rendered with `[kjDecorative]="true"` because the row's accessible name comes from the header. See [`avatar.md`](./avatar.md). |
| `KjBadge`            | optional, projected into the footer    | When the read-state needs a coloured pip ("3" pending, "!" error). The footer accepts arbitrary projected content; Badge is one common choice. See [`badge.md`](./badge.md). |
| `KjLiveRegion`       | **not** used                           | `KjChatLog` host-binds `aria-live` directly. `KjLiveRegion` is for *imperative* announcements (toast-style); chat history's announcements are *declarative* — a new DOM child appears, AT picks it up. Reaching for `KjLiveRegion` would force a content-management API the chat doesn't need. |
| `KjFocusRing`, `KjDisabled`, `KjFormControl` | **not** used                  | Chat parts are non-interactive. Bubbles can contain interactive content (links, action buttons), but those carry their own focus / disabled contracts independently. |
| `KjRovingTabindex`   | **not** used in v1                     | Chat history is read flow, not menu flow. Up/Down arrows scroll naturally. If a future "navigate message-by-message with arrows" UX is required, that's a separate KjChatNavigator directive. See [Q7](#open-questions--risks). |

### Wrapper composition (components package)

Wrapper components mirror the directive set 1:1:

```
<kj-chat-log>
  <kj-chat kjSide="start" kjChatAuthor="alice">
    <kj-chat-avatar>
      <kj-avatar [src]="alice.photo" [kjDecorative]="true" />
    </kj-chat-avatar>
    <kj-chat-header>
      Alice <time [attr.datetime]="msg.iso">{{ msg.time }}</time>
    </kj-chat-header>
    <kj-chat-bubble kjVariant="default">{{ msg.body }}</kj-chat-bubble>
    <kj-chat-footer kjChatFooterState="read">Read 12:46</kj-chat-footer>
  </kj-chat>

  <kj-chat kjSide="end" kjChatAuthor="me">
    <kj-chat-bubble kjVariant="primary">{{ reply.body }}</kj-chat-bubble>
    <kj-chat-footer kjChatFooterState="delivered" />
  </kj-chat>
</kj-chat-log>
```

The wrapper components carry `display: contents` on their hosts; the
real DOM is what the directive annotates. Variant / size are typed at
the wrapper layer for IDE autocomplete (`'default' | 'primary' |
'secondary' | 'accent' | 'info' | 'success' | 'warning' | 'error'`)
while the directive widens to `string` via `KjVariant`.

### Cross-component pointers

- [`avatar.md`](./avatar.md) — the sender's face. `<kj-avatar>` is
  always projected with `[kjDecorative]="true"` inside
  `[kjChatAvatar]` because the row's accessible name comes from the
  header. Avatar's overlay slot can host an online-status dot here
  too — the chat row does not need its own status indicator API.
- [`badge.md`](./badge.md) — the read-state pip in the footer when
  the consumer wants a coloured indicator (e.g. an `error`
  destructive badge for failed-to-send). Footer's `data-state`
  drives a built-in glyph; Badge is for richer cases.
- [`tag.md`](./tag.md) — when a message contains inline tags
  (mentions, hashtags), `<kj-tag>` lives **inside** the bubble's
  projected content. The tag retains its own removable / selectable
  contract independently. Bubble does not coordinate.
- [`overlay-badge.md`](./overlay-badge.md) — when a system message
  needs an overlaid count (e.g. a thread-summary card with "12
  replies"), the consumer wraps the bubble in `<kj-overlay-badge>`.
  Bubble does not own the positioning.
- [`../layout/`](../layout/) — when a chat is embedded in a
  card/sheet/dialog (e.g. a customer-support widget on a marketing
  page), the surrounding container owns scroll and shape; the
  `KjChatLog` is just its scrolled child. No special integration —
  the log's `role="log"` does not conflict with the surrounding
  surface's role.
- *List* (analysis pending) — when one is finally written, document
  there that **chat history is not a `KjList`**: lists with
  `role="list"` swallow per-row landmarks, while chat history
  benefits from per-message `role="article"` for AT navigation. The
  log primitive (`role="log"`) is purpose-built and we keep it
  separate from the generic List container.
- *Typography* (analysis pending) — the bubble's body is consumer
  content. When it is plain text, the components-package stylesheet
  applies the prose density tokens (`--kj-line-height-relaxed`)
  that match the rest of the typography stack. Document the cross-
  reference once typography lands.

## What exists today

Nothing on disk. No `packages/core/src/chat/`, no
`packages/components/src/chat/`. No forward references in sibling
analyses. This is a clean greenfield introduction.

## Base features

| Feature                              | Where it lives                     | Notes                                                                                                                                                          |
| ------------------------------------ | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Side (start / end)                   | `KjChat.kjSide`                    | `'start' \| 'end'`. Reflected to `data-side`. CSS handles physical direction including RTL.                                                                    |
| Avatar slot                          | `KjChatAvatar` directive + content projection | Always `aria-hidden`. Projects a `<kj-avatar>` typically. Sized to match bubble line-height.                                                                  |
| Header (name + time)                 | `KjChatHeader` directive            | Mints id, registers with `KJ_CHAT` for `aria-labelledby`. Wrapper template ships `<time>` slot (see *Time element*).                                            |
| Bubble body                          | `KjChatBubble` directive            | Owns `KjVariant` + `KjSize`. Rounded chrome, tail pseudo-element, padding tokens.                                                                              |
| Footer (read state)                  | `KjChatFooter` directive            | Mints id, registers for `aria-describedby`. `kjChatFooterState` drives a `data-state` attribute and an injected `aria-label`.                                  |
| `kjVariant`                          | `KjVariant` host directive on bubble | Presets: `default` (theirs), `primary` (yours), `secondary`, `accent` (mention / quoted), `info` (system note), `success`, `warning`, `error` (failed). Configurable via `provideKjChatBubble(...)`. |
| `kjSize`                             | `KjSize` host directive on bubble  | Presets: `sm`, `md`, `lg`. Default `md`. Drives padding, border-radius, font-size on the bubble; cascades to header / footer through `em`-based CSS sizing.    |
| Tail / no-tail                       | `KjChatBubble.showTail()` computed | Tail draws when not grouped *and* not explicitly suppressed. CSS pseudo on `[data-tail]`.                                                                       |
| Group-by-sender (auto)               | `KjChat.autoGrouped()` computed    | Reads previous sibling row's `kjChatAuthor` from `KJ_CHAT_LOG`'s registry. Suppresses avatar / header / tail in CSS via `data-grouped`.                          |
| Group-by-sender (explicit)           | `KjChat.kjChatGrouped: input<boolean \| undefined>` | When defined, overrides auto. Lets consumers control grouping when they don't have a `KjChatLog` parent.                                                       |
| Container live region                | `KjChatLog` directive              | `role="log"`, `aria-live="polite"` by default, `aria-relevant="additions"`, `aria-atomic="false"`. Configurable `kjChatLogLive: 'polite' \| 'off'`.              |
| Container label                      | `KjChatLog.kjChatLogLabel`         | Optional `aria-label` on the log (e.g. "Conversation with Alice"). When unset, the log is a generic log landmark.                                              |
| Time element                         | wrapper template                   | The wrapper renders `<time [attr.datetime]="iso()">{{ display() }}</time>` inside the header. Inputs: `kjChatHeaderTime` (Date / ISO string) plus a formatter token `KJ_CHAT_TIME_FORMATTER`. Default formatter is `Intl.RelativeTimeFormat` for ≤ 1 day, otherwise `Intl.DateTimeFormat`. |
| Read-state glyph                     | components-package CSS             | Glyphs for `sending` (clock), `sent` (single check), `delivered` (double check), `read` (filled double check), `error` (exclamation). Driven by `[data-state]`. Override via theme. |
| Reduced motion                       | components-package CSS             | Tail-draw / fade-in animations gated on `prefers-reduced-motion`. The log itself does not animate scroll on new messages — that's the consumer's scroll container's choice. |

## Accessibility (WCAG 2.1 AAA)

Reference: [WAI-ARIA APG — Log
Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/log/) for the
container; [HTML `<time>`
element](https://html.spec.whatwg.org/multipage/text-level-semantics.html#the-time-element)
for timestamps; [WCAG 4.1.3 Status
Messages](https://www.w3.org/TR/WCAG21/#status-messages) for the
incoming-message announcement contract.

### Per-criterion checklist

| WCAG 2.1 criterion             | Requirement                                                       | Where it lives                                                                                                                                                              |
| ------------------------------ | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.1.1 Non-text Content         | The avatar image carries `alt=""` (decorative); the message body is real text | Avatar slot forces `aria-hidden="true"`; consumers project `<kj-avatar [kjDecorative]="true">`. Bubble body is consumer-supplied real text or projected interactive content. |
| 1.3.1 Info & Relationships     | Sender, time, and message body are programmatically related      | Row is `role="article"`. `aria-labelledby` targets header (sender name). `aria-describedby` targets footer (read state). Header contains `<time datetime>` so the time is machine-readable. |
| 1.3.2 Meaningful Sequence      | Reading order is sender → message → state, regardless of visual side | DOM order is fixed: header, bubble, footer. CSS `flex-direction: row-reverse` only flips the **avatar's** physical position; it does not reorder the header/bubble/footer column. |
| 1.4.3 Contrast (AA) / 1.4.6 (AAA) | Bubble text against bubble background ≥ 7:1                  | Theme tokens. Each `kjVariant` ships a paired `--kj-color-*` / `--kj-color-*-content`. `accent` and `secondary` are the highest risk for AAA — verify per palette before locking. |
| 1.4.11 Non-text Contrast       | The tail's edge (when on a same-toned background) ≥ 3:1, and the read-state glyphs ≥ 3:1 against their backgrounds | Tail inherits the bubble's `--kj-color-*` so contrast against the page background follows the bubble's contrast. Glyphs use a `currentColor` stroke, computed against the footer's foreground. |
| 1.4.12 Text Spacing            | Bubble layout survives 1.5× line-height, 0.12em letter-spacing  | Padding tokens are `em`-based; bubble grows with text-spacing overrides. No fixed pixel heights. |
| 2.1.1 Keyboard                 | Bubble is non-interactive by default — nothing to test           | Inherent. Interactive content **inside** the bubble (links, mentions, action buttons) keeps its own keyboard contract.                                                    |
| 2.4.1 Bypass Blocks            | Long chat histories should be skippable                          | The log itself is a landmark (`role="log"`). Consumers wrap it in a `<section aria-label="Conversation">` if they want a skip-link target with a stable name. The log's optional `aria-label` is the integrated alternative. |
| 2.4.6 Headings & Labels        | Each message is identifiable                                     | `aria-labelledby` ties row to header (sender's name + time). The combination is the row's accessible name.                                                                  |
| 2.5.5 Target Size (AAA)        | Interactive content inside bubbles ≥ 44×44                       | Bubble itself is not a target. Links / mentions inside use `KjLink` / `KjButton` which already enforce 44×44. Tap-to-react / long-press patterns (out of scope v1) would need their own target audit. |
| 4.1.2 Name, Role, Value        | Each row announces as "{sender}, {time}, article"               | `role="article"` + `aria-labelledby` on the header (which contains both the name and the `<time>` text node). AT reads "Alice, 12:46, article".                              |
| 4.1.3 Status Messages          | New messages announce on arrival without focus moving            | `KjChatLog` is `role="log"` + `aria-live="polite"` + `aria-relevant="additions"` + `aria-atomic="false"`. New `KjChat` rows appended to the log are announced as "{sender} {time} {body}" (the row's full text content). |

### Keyboard contract

None at the bubble level. Chat history is a read flow, not a menu
flow. The user scrolls with arrow keys (the scroll container's native
behaviour), reads with screen-reader navigation (`H` for headings, `M`
for articles in JAWS / NVDA, `Arrow-Down` for next item in browse
mode). The bubble does not register `keydown` listeners.

**Interactive content inside a bubble** — a `<kj-link>` to a quoted
message, a `<kj-button>` for "react", a `<kj-tag>` for a mention —
keeps its own keyboard contract independently. Tab order through the
log is determined by the interactive descendants in DOM order, which
is sender-then-message-then-state — the natural read order.

**Future consideration:** an opt-in `KjChatNavigator` directive that
adds Up/Down arrow navigation message-by-message when focus is inside
the log. Out of scope for v1 — see [Q7](#open-questions--risks).

### Where each piece lives (directive vs. wrapper)

- **All `aria-*` and `role` attributes** live on the **core
  directives** (`KjChatLog`, `KjChat`, `KjChatAvatar`, `KjChatHeader`,
  `KjChatFooter`).
- **The `<time>` element** is rendered by the **wrapper** (it's
  template-level structure), but the **`datetime` attribute** is
  computed by a wrapper input (`kjChatHeaderTime: Date | string`)
  with a configurable formatter token (`KJ_CHAT_TIME_FORMATTER`)
  declared in core. Consumers using `[kjChatHeader]` directly project
  their own `<time>`; the directive only mints the id.
- **The read-state glyph** is a CSS pseudo-element keyed off
  `data-state`. **The injected `aria-label`** for the state ("Read",
  "Sent", etc.) lives on the **directive** so it's available even
  when consumers use `[kjChatFooter]` without the components-package
  stylesheet.

## Inputs / Outputs / Models

All public bindings `kj`-prefixed. No models — chat parts are
unidirectional rendering.

### `KjChatLog` (`[kjChatLog]`)

| Name                       | Kind      | Type                               | Default                  | Notes                                                                                                       |
| -------------------------- | --------- | ---------------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `kjChatLogLive`            | `input`   | `'polite' \| 'off'`                | `'polite'`               | Reflects to `aria-live`. We do not expose `'assertive'` — it interrupts the user mid-typing on every inbound message. |
| `kjChatLogLabel`           | `input`   | `string \| undefined`              | `undefined`              | Optional `aria-label` for the log landmark, e.g. "Conversation with Alice".                                |

No outputs. The container only co-ordinates registry and live region; it does not emit events.

### `KjChat` (`[kjChat]`)

| Name                  | Kind      | Type                       | Default      | Notes                                                                                                      |
| --------------------- | --------- | -------------------------- | ------------ | ---------------------------------------------------------------------------------------------------------- |
| `kjSide`              | `input`   | `'start' \| 'end'`         | `'start'`    | Logical side. CSS handles RTL flip via cascade.                                                            |
| `kjChatAuthor`        | `input`   | `string \| undefined`      | `undefined`  | Sender id used for auto-group-by-sender. Optional.                                                          |
| `kjChatGrouped`       | `input`   | `boolean \| undefined`     | `undefined`  | When defined, overrides auto-grouping. Use when no `KjChatLog` parent exists.                              |

No outputs.

### `KjChatAvatar` (`[kjChatAvatar]`)

No inputs, no outputs. Pure slot annotation — forces `aria-hidden="true"`.

### `KjChatHeader` (`[kjChatHeader]`)

No public inputs at the directive layer. Wrapper adds:

| Wrapper input         | Type                       | Notes                                                                                                                |
| --------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `kjChatHeaderTime`    | `Date \| string \| number` | Optional. When provided, the wrapper renders `<time [attr.datetime]="iso()">{{ formatted() }}</time>`. Formatter is `KJ_CHAT_TIME_FORMATTER` (default `Intl.RelativeTimeFormat` short-style for ≤ 24h, otherwise `Intl.DateTimeFormat`). |

### `KjChatBubble` (`[kjChatBubble]`)

| Name                         | Kind     | Type                                                | Default      | Notes                                                                                                  |
| ---------------------------- | -------- | --------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------ |
| `kjVariant`                  | `input`  | preset string (validated against `KJ_CHAT_BUBBLE_CONFIG`) | `'default'`  | Forwarded to `KjVariant`. Presets: `default`, `primary`, `secondary`, `accent`, `info`, `success`, `warning`, `error`. |
| `kjSize`                     | `input`  | preset string                                       | `'md'`       | Forwarded to `KjSize`. Presets: `sm`, `md`, `lg`.                                                       |
| `kjChatBubbleNoTail`         | `input`  | `boolean`                                           | `false`      | Suppresses the tail unconditionally. Auto-suppression on grouped rows is independent.                  |

### `KjChatFooter` (`[kjChatFooter]`)

| Name                         | Kind     | Type                                                            | Default      | Notes                                                                                                              |
| ---------------------------- | -------- | --------------------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------ |
| `kjChatFooterState`          | `input`  | `'sending' \| 'sent' \| 'delivered' \| 'read' \| 'error' \| undefined` | `undefined`  | Drives `[data-state]` for the glyph and an injected `aria-label`. When undefined, footer renders only projected content. |

### Wrapper inputs (components package)

| Element                | Input                  | Maps to                                |
| ---------------------- | ---------------------- | -------------------------------------- |
| `<kj-chat-log>`        | `live`                 | `KjChatLog.kjChatLogLive`              |
| `<kj-chat-log>`        | `label`                | `KjChatLog.kjChatLogLabel`             |
| `<kj-chat>`            | `side`                 | `KjChat.kjSide`                        |
| `<kj-chat>`            | `author`               | `KjChat.kjChatAuthor`                  |
| `<kj-chat>`            | `grouped`              | `KjChat.kjChatGrouped`                 |
| `<kj-chat-header>`     | `time`                 | `kjChatHeaderTime` (wrapper-owned, see above) |
| `<kj-chat-bubble>`     | `variant`              | `KjChatBubble.kjVariant`               |
| `<kj-chat-bubble>`     | `size`                 | `KjChatBubble.kjSize`                  |
| `<kj-chat-bubble>`     | `noTail`               | `KjChatBubble.kjChatBubbleNoTail`      |
| `<kj-chat-footer>`     | `state`                | `KjChatFooter.kjChatFooterState`       |

## Examples to ship

1. **Two-party conversation** (`chat.example.ts`) — a `<kj-chat-log>`
   with five alternating messages between two senders. Anchors
   `kjSide`, the avatar slot, header + `<time>`, bubble variants
   (`default` for theirs, `primary` for mine), and footer read-state.
2. **Grouped consecutive messages** (`chat.grouped.example.ts`) —
   three messages from Alice in a row, then one from me. Demonstrates
   auto-grouping: avatar / header / tail appear only on the first
   Alice message, suppressed on the next two.
3. **System message** (`chat.system.example.ts`) — an `info`-variant
   bubble with no avatar and no side (centred), e.g. "Alice joined the
   conversation". Demonstrates that the side is optional in spirit
   (the bubble can render centrally via a separate
   `kjSide="center"`-style override) — see Q5.
4. **Read-state progression** (`chat.read-state.example.ts`) — the
   same outgoing message animated through `sending` → `sent` →
   `delivered` → `read`. Anchors the footer's `data-state` glyph
   transitions and the injected `aria-label`.
5. **Failed-to-send with retry** (`chat.error.example.ts`) — `error`
   footer state plus an inline `<kj-button kjVariant="ghost">Retry</kj-button>`
   inside the footer. Demonstrates that footer accepts arbitrary
   interactive content.
6. **Live-region announcement demo** (`chat.live.example.ts`) — a
   button "Send incoming" that appends a new `<kj-chat>` to the log.
   Used in the docs site to show AT users that arrivals announce
   politely. Includes a "Pause announcements" toggle that switches
   `kjChatLogLive` to `'off'`.
7. **RTL conversation** (`chat.rtl.example.ts`) — wraps the log in
   `<div dir="rtl">`. Visual sides flip; DOM order doesn't. Verifies
   the cascade-driven RTL story.
8. **Mention inside bubble** (`chat.mention.example.ts`) — bubble
   contains a `<kj-tag kjVariant="accent">@alice</kj-tag>` inline.
   Demonstrates that interactive descendants compose without bubble
   coordination.
9. **Avatar with status dot** (`chat.avatar-status.example.ts`) —
   `<kj-avatar>` with an `[kj-avatar-overlay]` slot carrying a
   `success` `<kj-badge mode="dot">`. Confirms the cross-component
   composition path with Avatar + Overlay Badge + Badge.
10. **Configured presets** (`chat.configured.example.ts`) —
    `provideKjChatBubble({ variants: [...defaults, 'brand'] })` for
    a custom bubble variant.
11. **Themed (core-only)** — `chat.example.ts`,
    `chat.retro.example.ts`, `chat.finance.example.ts` under
    `packages/core/`. Confirms the headless directives work under
    arbitrary theme CSS with no components-package dependency.

## Open questions / risks

1. **`role="log"` vs. wrapping in a labelled `<section>`.** APG's Log
   pattern says the log should have an accessible name. Two options:
   - **(a)** the directive accepts `kjChatLogLabel` and host-binds
     `aria-label`. Simple; one input.
   - **(b)** the consumer wraps `<kj-chat-log>` in a `<section
     aria-labelledby="…">` whose heading is a `<h2>` outside the log.
     More flexible (the heading is visible); more boilerplate.
   **Decision:** ship (a) as the directive's contract. Document (b)
   as an alternative for consumers who already have a heading
   structure (e.g. a sidebar with conversation title above the log).
   Both are valid; the directive does not stop (b).

2. **`role="article"` per row vs. `role="listitem"`.** Two valid
   choices, no clear winner. Slack uses `role="listitem"` inside a
   `role="list"`; Teams uses no role at all and relies on landmark
   regions. The argument for **`article`**: per-message landmark for
   AT navigation (`M` key); independent of any list parent; doesn't
   force the log to be `role="list"` (which would conflict with
   `role="log"`). The argument for **`listitem`**: standard in many
   chat apps; a screen-reader hears "1 of 50, 2 of 50, …" which is
   useful in long histories. **Decision:** ship `role="article"` by
   default, expose a `kjChatRole: 'article' | 'listitem' | 'none'`
   override on `KjChat` for consumers who prefer the list semantics.
   When `'listitem'` is chosen, the log must adopt `role="list"` —
   document that combination explicitly. **Risk:** mixing
   `role="log"` and `role="list"` on the same element is invalid; the
   log directive must accept a `kjChatLogRole: 'log' | 'list' |
   'feed'` override that mirrors. Consumers pick a coherent pair.
   v1 ships `'article'` + `'log'` as the default and the override
   surface; the alternative pairs are tested but not the default.

3. **Group-by-sender registry race.** `KjChatLog.previousSibling()`
   queries the registry. New rows mount in DOM order, but the
   registry is populated on `ngOnInit`, which fires bottom-up in
   Angular — children before parent. **Risk:** the first row can
   ask for its previous sibling before the previous row has
   registered. **Mitigation:** auto-grouping reads from
   `afterNextRender()` (or the `KjChat`'s own DOM-traversal:
   `el.previousElementSibling` and walks until it finds an element
   with `KJ_CHAT` provided via `getInjector()`). Prefer the DOM
   traversal — it's deterministic and doesn't depend on injection
   order. Registry is for higher-level batch operations (e.g.
   "scroll to first unread") not for grouping.

4. **`<time>` on the directive vs. wrapper.** Three options:
   - **(a) Wrapper-only.** Directive `KjChatHeader` only mints id;
     wrapper renders `<time>`. Consumer using `[kjChatHeader]`
     directly projects their own `<time>`. **Cleanest separation.**
   - **(b) Sibling directive `KjChatTime` (`[kjChatTime]`)** that owns
     the `<time>` element and the `datetime` attribute, projected
     into the header. Consumers using the directive layer get a
     ready-made time control. More moving parts.
   - **(c) Input on `KjChatHeader`** (`kjChatHeaderTime: Date | string`)
     that the directive renders into the host. Conflicts with
     `<ng-content />` projection.
   **Recommendation:** ship (a). The directive layer is for ARIA
   wiring; the time element is layout. Wrapper does the rendering;
   `KJ_CHAT_TIME_FORMATTER` is the configurable seam. Revisit (b)
   if a real consumer asks for a directive-level time control.

5. **Centre-aligned system messages.** A "Alice joined" or "Today,
   12:46" divider is conceptually neither start nor end — it sits in
   the middle. Three options:
   - **(a) Add `kjSide: 'start' | 'end' | 'center'`.** Simple; a
     centred row has no avatar slot rendered.
   - **(b) Ship a separate `KjChatDivider` directive.** Different
     visual (no bubble chrome at all — just inline text with rules).
     More accurate semantically.
   - **(c) Let consumers do nothing — render plain text outside the
     log.** Misses the live-region announcement.
   **Recommendation:** **(a)** for the system-bubble case (variant
   `info`, centred, no avatar) and **(b)** later for the inline
   divider case (no bubble chrome). v1 ships (a); flag (b) for the
   timeline / divider work item. **Risk:** centred bubbles still
   need a tail story — decision: no tail on `kjSide="center"`.

6. **Long messages and the live region.** A 500-word incoming
   message announced via `aria-live="polite"` will be read in full
   to the user, possibly while they're typing. APG explicitly
   recommends polite for chat logs, accepting this trade-off, but
   real apps mitigate by:
   - announcing only the sender + truncated preview ("Alice: Hey,
     I think we should…"),
   - or by adding a "stop announcing" button that flips
     `kjChatLogLive` to `'off'` once a long message arrives.
   **Decision:** v1 honours full-message announcement (correct
   default per APG). Document the truncation pattern as a recipe
   (consumer renders a visually-hidden `<span class="kj-sr-only">`
   inside the bubble with a truncated version, marks the visible
   bubble `aria-hidden="true"`). Don't bake truncation into the
   directive — too app-specific.

7. **`KjChatNavigator` for arrow-key message navigation.** A power-
   user UX where focus inside the log can `ArrowUp` / `ArrowDown` to
   jump message-by-message. Useful for keyboard-first messaging
   apps; un-needed for casual consumer chat. **Out of scope for v1.**
   When added, lives in a separate directive composed alongside
   `KjChatLog`; it would set `tabindex="0"` on each `KjChat`,
   manage roving focus, and own `Home` / `End` / `PageUp` / `PageDown`
   semantics. Document the seam now so the v1 directive surface
   doesn't lock anything in that's hostile to a future navigator.

8. **Auto-scroll to bottom on new message.** A common chat-app
   behaviour. Lives **outside** `KjChatLog` — the consumer's scroll
   container handles it. The log directive does not introspect or
   manipulate scroll position. **Risk:** consumers wire scroll
   incorrectly and break "scroll up to read history, then a new
   message arrives — don't yank me to the bottom." Document the
   convention in examples (track scroll-bottom-distance, only
   auto-scroll if user is within ~50px of the bottom). Not the
   directive's responsibility.

9. **Hydration of timestamps.** SSR renders `<time datetime="..."
   >12:46</time>` with a server-side wall-clock, which may diverge
   from the client's locale / timezone seconds later. **Mitigation:**
   `KJ_CHAT_TIME_FORMATTER` runs on both server and client; if it
   uses `Intl.RelativeTimeFormat` (e.g. "2 minutes ago"), the
   server's "2 minutes ago" may be the client's "3 minutes ago"
   after hydration. Two paths:
   - **(a) Always emit ISO `datetime` and a fixed wall-clock
     visible time on the server**, then re-format on `afterNextRender`.
     Brief flicker.
   - **(b) Use absolute time only ("12:46") on the server** and
     switch to relative on the client. No flicker but server-side
     output is less friendly.
   **Recommendation:** ship (b) by default (deterministic,
   accessible on a server-only render where JS is disabled), with
   (a) available via formatter token override.

10. **Read-state state machine boundaries.** `sending → sent →
    delivered → read → error` is a directed graph but real apps
    have edges: `sending → error → sending` (retry), `read → error`
    (the receiving end fails to acknowledge a re-sync). The
    directive does not enforce a state machine — `kjChatFooterState`
    accepts any value at any time. **Risk:** consumers rely on
    transitions for animations and we change the rendered glyph in
    a future release. **Mitigation:** document the canonical state
    set; don't ship `kjPreviousState` / transition events. If
    consumers want animated transitions, they `effect()` on the
    state change themselves. Shadcn-style: the directive renders
    state, the consumer manages animation.

11. **Variant set drift from Badge / Tag.** Bubble's variant set
    overlaps Badge / Tag (`primary`, `secondary`, `info`, `success`,
    `warning`, `error`) plus its own `accent`. **Plan:** share the
    base preset list across the three components (and Button /
    Alert) — `default`, `primary`, `secondary`, `accent`, `info`,
    `success`, `warning`, `error` — via a shared config in
    `packages/core/src/presets/variant.ts`. Each component then
    declares which subset it supports through its `_CONFIG` token
    (e.g. Badge omits `accent` if the design doesn't pair `accent`
    with badge chrome). Risk: drift if one component adds a variant
    the others don't. Document explicitly which variants are
    bubble-only, badge-only, etc.

12. **Tail on grouped messages with rounded-corner edges.** When
    messages are grouped, the standard daisyUI treatment is to
    suppress the tail and slightly tighten the vertical spacing
    between bubbles. The visual question: do consecutive bubbles
    *share* a corner radius (the first message in a run has rounded
    top + flat bottom, the middle messages have flat top + flat
    bottom, the last has flat top + rounded bottom)? **Decision:**
    yes — match daisyUI / iMessage convention. CSS reads
    `data-grouped` (this row is grouped to the previous) and a new
    `data-grouped-next` (the next row continues the group), set by
    the directive based on the next sibling's author. The directive
    needs to **invalidate the next-row attribute** when its successor
    changes — handled by re-running the computation in an
    `afterRenderEffect()` keyed off the registry.

13. **`role="article"` accessible-name source.** When the row has
    `aria-labelledby` pointing at the header, AT reads the
    header's full text content as the row's name — including the
    `<time>` text node. That gives "Alice 12:46" as the row name,
    which is right. **Risk:** if the consumer puts other elements
    in the header (e.g. an editing-status icon), those text nodes
    leak into the announcement. **Mitigation:** document that
    only the sender name and time should live in the header;
    decorative / status icons go in the footer or as overlay-badge
    on the avatar.

14. **`aria-describedby` on a footer with no semantic state.** When
    the footer is purely decorative ("Sent at 12:46"), pointing
    `aria-describedby` at it is harmless — AT reads the footer text
    after the row name. When the footer carries a glyph-only
    state with an injected `aria-label`, the description is the
    label ("Read"). **Decision:** always wire `aria-describedby`
    when a footer is projected; the consumer controls the
    description content.

15. **Empty `KjChatLog`.** A log with no rows is still a `role="log"`
    element. AT will not announce its existence beyond the
    landmark name. Risk: an empty log on first render triggers a
    "log, empty" announcement in some readers. **Mitigation:** the
    log's initial paint emits `aria-busy="true"` until the first
    row renders, then drops to `false`. Cheap; quiets the
    first-paint announcement.

16. **`provideClientHydration()` and the registry.** The log's
    sibling registry is rebuilt on hydration. Auto-grouping
    re-evaluates, which may flicker the avatar / header / tail
    visibility for one frame on the first paint. Mitigation: the
    grouping computation is also performed on the server (using
    `el.previousElementSibling` against the SSR DOM, which exists)
    and stamped into `data-grouped` server-side. Hydration sees a
    matching DOM and does not flicker.

17. **`KjChat` outside `KjChatLog`.** A standalone bubble used in a
    quoted-message preview inside an input, or in a feature-card
    illustration. The directive injects `KJ_CHAT_LOG` optionally
    (`{ optional: true }`); when absent, auto-grouping is disabled
    and the consumer must set `kjChatGrouped` explicitly if they
    want group styling. The `role="article"` still applies — a
    standalone message is still a message. **Risk:** consumers use
    the standalone bubble on a marketing page and inadvertently
    create an unlabelled article landmark. **Mitigation:** dev-mode
    warning in `KjChat` when the row has no `aria-labelledby`
    (i.e. no `KjChatHeader` projected) and is not inside a labelled
    parent.

18. **`KJ_CHAT_TIME_FORMATTER` API surface.** The token is a
    function with the shape `(date: Date) => { iso: string;
    display: string }`. Consumers override per-app to plug their
    locale / library (date-fns, dayjs, Luxon). **Risk:** the
    default uses `Intl.RelativeTimeFormat` which is browser-only;
    SSR runs on Node which has supported it since 18. Verify
    against the Angular SSR target version. Fallback: if the
    formatter throws on the server, render `iso` as both `iso`
    and `display`.

19. **Reduced motion and the tail.** The tail is a static CSS pseudo
    — no motion. No `prefers-reduced-motion` action needed unless
    we add a "draw" animation when a new bubble appears. v1: no
    bubble-arrival animation; the consumer's scroll container
    handles arrival visuals.

20. **Selection / copy across messages.** A user selects text
    spanning Alice's message, the timestamp, and into my reply.
    Browser-native selection works because everything is real text.
    No directive intervention. **Risk:** the avatar slot's
    `aria-hidden="true"` does not affect selection — `aria-hidden`
    only hides from AT, not from the selection model. Verify
    visually that selecting through an avatar slot doesn't produce
    weird selection rectangles; CSS `user-select: none` on the
    avatar slot if it does. Cheap; flag for the implementation
    pass.

21. **Cross-reference reconciliation.** No existing analyses
    forward-reference `KjChat*`. This file is the canonical
    introduction. When *List*, *Typography*, and *Feed* analyses
    are written, they must cross-reference back here for the
    `role="log"` vs. `role="list"` vs. `role="feed"` decision tree.
    Add a one-line "see chat-bubble.md for the log primitive"
    pointer to whichever lands first.
