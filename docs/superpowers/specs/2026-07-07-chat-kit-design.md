# KjChat — Provider-agnostic AI/LLM chat UI kit (design)

**Date:** 2026-07-07
**Branch:** `feat/chat`
**Status:** Design → build

## 0. Premise & coexistence (IMPORTANT)

`origin/main` already ships a `chat` component — but it is a **presentational
chat-bubble / message-row data-display kit** (daisyUI-style rows), *not* an
AI/LLM streaming kit. It occupies `packages/core/src/chat/` and
`packages/components/src/chat/` with classes `KjChat`, `KjChatLog`,
`KjChatBubble`, `KjChatAvatar`, `KjChatHeader`, `KjChatFooter` and types
`KjChatRole` (an ARIA role: `'article' | 'listitem' | null`), `KjChatSide`,
`KjChatState` (delivery states).

**Decision (from coordinator): ADAPT + EXTEND, not overwrite, not a separate
namespace.** We build the AI streaming layer *on top of* the existing
primitives and add AI-specific pieces under **non-colliding names** inside the
same `chat/` folders. The existing chat-bubble kit stays fully working —
**additive changes only, no breaking removals.**

### What we REUSE
- **`KjChatLog`** (core) — already `role="log"` + `aria-live="polite"` +
  `aria-relevant="additions"`. This is the accessible message-log surface for
  the AI thread. We drive it correctly for streaming (see §4).
- **`KjChat` / `KjChatBubble`** rows — used to render user & assistant bubbles
  where they fit (user → `kjSide="end"`, assistant → `kjSide="start"`).
- **Command-palette engine** (`packages/core/src/command-palette/`) — the slash
  menu is a real `KjCommandPalette` instance; matching reuses
  `kjSubstringFilter` from `command-palette.filters.ts`. No re-implementation of
  filtering / keyboard nav / `aria-activedescendant`.
- **Existing kj primitives** — `KjButton`, `KjAvatar`, icon.

### What we ADD (new, non-colliding)
Core (`packages/core/src/chat/`, additive files):
- `chat-stream.ts` — headless streaming state (`KjChatStore`) + AI message /
  tool-call / citation types + `KjChatMessageRole` / `KjChatStatus`.
- `chat-announcer.ts` — the differentiator: **coalesced polite live-region**
  logic (pure `coalesceAnnouncement()` + `KjChatAnnouncer`).
- `chat-slash.ts` — slash-command model + matcher over the palette filter.

Components (`packages/components/src/chat/`, additive files):
- `chat-thread.ts` — `KjChatThread` (message log driven by a store).
- `chat-message.ts` — `KjChatMessage` (renders user/assistant/system/tool,
  markdown + code blocks w/ copy, tool-call cards, citations, typing dots).
- `prompt-input.ts` — `KjPromptInput` (auto-grow textarea, send/stop,
  slash menu, attachment slot).
- `markdown.ts` — lightweight **safe** markdown → HTML (no external dep exists
  in `main`; see §6).

No CDK. Signals + standalone throughout.

## 1. Data model (`chat-stream.ts`)

```ts
export type KjChatMessageRole = 'user' | 'assistant' | 'system' | 'tool';
export type KjChatStatus = 'idle' | 'streaming' | 'error';

export interface KjChatCitation {
  id: string; title: string; url?: string; snippet?: string;
}
export interface KjChatToolCall {
  id: string; name: string; args?: unknown;
  status: 'pending' | 'running' | 'done' | 'error';
  result?: unknown; error?: string;
}
export interface KjChatMessageData {
  id: string;
  role: KjChatMessageRole;
  content: string;
  streaming?: boolean;          // in-flight assistant message
  error?: string | null;
  toolCalls?: readonly KjChatToolCall[];
  citations?: readonly KjChatCitation[];
  createdAt?: number;
}
```

These extend the AI surface additively; the existing `KjChatRole` /
`KjChatState` types are untouched (different concern, different names).

## 2. Streaming engine (`KjChatStore`)

Plain `@Injectable()` (no `providedIn` — one instance per thread, provided by
the consumer or by `KjChatThread`). Provider-agnostic: **no LLM SDK, no fetch,
no backend.** The consumer wires their own model/stream and pushes chunks in.

Signals: `messages`, `status`, `streamingId`, `error`, `isStreaming`.

Append / lifecycle API:
- `sendUser(content): string` — append a user message, returns id.
- `beginAssistant(seed?): string` — create empty in-flight assistant message,
  `status → 'streaming'`, set `streamingId`. Returns id.
- `pushChunk(text)` — append a token/chunk to the in-flight assistant message
  (the core streaming append). Feeds the announcer.
- `addToolCall(tc)` / `updateToolCall(id, patch)` — tool-call lifecycle.
- `addCitations(citations)` — attach citations to the in-flight message.
- `endAssistant()` — mark streaming complete, flush announcer, `status → 'idle'`.
- `fail(message)` — `status → 'error'`, set error on the in-flight message.
- `stop()` — consumer-initiated abort: freeze partial content, `status → 'idle'`.
- `reset()` — clear the thread.

Status transitions (state machine):
`idle → (beginAssistant) → streaming → (endAssistant) → idle`
`streaming → (fail) → error → (beginAssistant / reset) → streaming|idle`
`streaming → (stop) → idle`

## 3. Slash commands (`chat-slash.ts`) — palette reuse

```ts
export interface KjSlashCommand {
  name: string; label: string; description?: string; value?: unknown;
}
export function parseSlash(text): { active: boolean; query: string };
export function matchSlashCommands(
  query, commands, filter = kjSubstringFilter,
): KjSlashCommand[];
```

`parseSlash` returns `active: true` only when the text begins with `/` and the
slash token has no whitespace yet (i.e. the user is still typing the command
name). `matchSlashCommands` scores each command's `[name, label, description]`
haystack with the **command-palette filter** (`kjSubstringFilter`, diacritic-
insensitive) and keeps score > 0.

In `KjPromptInput`, the menu is a live `<div kjCommandPalette>` with
`<kj-command-item>` per match — so highlight, arrow-key nav, `Enter` to pick,
and `aria-activedescendant` all come from the existing engine, not new code.

## 4. Live-region strategy — THE DIFFERENTIATOR

Screen readers spammed with char-by-char streaming are unusable. Our approach:

1. **Visible thread does not announce deltas.** `KjChatThread` renders the log
   with `kjChatLogLive="off"` when a store drives streaming, because streamed
   text mutates an *existing* message node — and `KjChatLog`'s
   `aria-relevant="additions"` already means node mutations don't re-announce.
   So the visible DOM updates silently as tokens arrive.
2. **One dedicated, visually-hidden `aria-live="polite"` region** carries
   announcements, fed by the **coalescer**.
3. **Coalescing (`coalesceAnnouncement`)** — pure function. Given the buffer of
   not-yet-announced streamed text, it flushes only up to the **last sentence
   boundary** (`.`, `!`, `?`, newline). The trailing partial sentence stays in
   the buffer until the next boundary. If the buffer grows past a **max length
   (default 160 chars)** with no boundary, it flushes at the last **word**
   boundary so a long clause is not held silent indefinitely.
4. **Idle + completion flush.** A short debounce (default 500ms after the last
   chunk) and `endAssistant()` both force any remainder out, so the final
   partial sentence is always announced once.
5. **Status announcements.** Errors and "stopped" are announced politely too.

Net effect: AT users hear the assistant reply as **whole sentences, once each**
— never char-by-char, never duplicated.

## 5. Keyboard & focus contract

- **Enter** (no Shift) in `KjPromptInput` → send. **Shift+Enter** → newline.
- **Esc** → stop streaming (when `status === 'streaming'`), else close slash menu.
- Slash menu open: **↑/↓** move active item, **Enter** picks, **Esc** closes
  (does not send). Menu is `role="listbox"` via the palette; textarea keeps DOM
  focus and points `aria-activedescendant` at the active item.
- Send/Stop buttons are ≥44×44 (WCAG 2.5.5). Textarea has an associated label.
- On send, focus stays in the textarea (cleared) for rapid multi-turn.

## 6. Markdown rendering

`main` has **no** markdown/codemirror-markdown library (only `codemirror` at
root, used by unrelated branches). To stay dependency-honest and XSS-safe we
ship a **small, self-contained renderer** (`markdown.ts`): it HTML-escapes
first, then applies a whitelist of inline transforms (bold, italic, inline
code, links → `rel="noopener"`), splits fenced code blocks out structurally,
and renders each code block as a `<pre><code>` with a **copy button**. This is
deliberately minimal (documented as such); swapping in a full markdown engine
later is a drop-in.

## 7. Reduced motion

The typing/stream indicator (three dots) animates via CSS keyframes guarded by
`@media (prefers-reduced-motion: reduce)` → animation replaced with a static
"…" glyph / opacity hold. No motion is required to perceive streaming state
(the live region + visible text convey it).

## 8. Public API (additive exports)

Core `@kouji-ui/core`: `KjChatStore`, `KjChatMessageData`, `KjChatMessageRole`,
`KjChatStatus`, `KjChatToolCall`, `KjChatCitation`, `coalesceAnnouncement`,
`KjChatAnnouncer`, `KjSlashCommand`, `parseSlash`, `matchSlashCommands`.

Components `@kouji-ui/components`: `KjChatThread`, `KjChatMessage`,
`KjPromptInput`, `renderMarkdown`.

## 9. Testing

- **Unit (core, vitest):** store append + status transitions; `stop()`;
  coalescer boundary / max-length / remainder-flush; slash parse + match.
- **Component:** thread renders messages, streaming message shows indicator,
  prompt-input emits send/stop, slash menu filters. (testing-library + jest-axe.)
- **Docs example:** a **simulated** streaming source (fake token generator on a
  timer) — no backend.
- **E2E (Playwright):** against `ng serve docs` — send a message, assert the
  simulated streamed reply renders. If chromium/dev-server is unavailable in the
  sandbox, fall back to a prerender-markup assertion and commit the spec for CI.
  (Reported honestly.)

## 10. Scope — done vs deferred

**In scope:** thread + message + prompt input + streaming append + status +
coalesced live region + slash commands (palette reuse) + tool-call cards +
citations + typing indicator (reduced-motion) + safe markdown + copy button +
simulated-stream docs example + unit tests + changeset + PR.

**Deferred (honest):** full CommonMark (tables/nested lists) — minimal renderer
ships; real attachment upload pipeline (slot only); virtualized log for very
long threads; persistence/history.

## 11. Accessibility target

WCAG 2.1 **AAA**. Focus: coalesced polite announcements, keyboard send/stop,
role/name/value for messages, reduced-motion, ≥44px targets, contrast via
existing tokens.
