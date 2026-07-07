---
'@kouji-ui/core': minor
'@kouji-ui/components': minor
---

feat(chat): provider-agnostic AI/LLM chat UI kit

Adds an AI streaming layer that coexists with the existing chat-bubble kit
(additive — no breaking changes).

**Core (`@kouji-ui/core`)**

- `KjChatStore` — headless, provider-agnostic streaming state: `messages`
  signal, `status` (`idle`/`streaming`/`error`), and the token-append API
  (`sendUser`, `beginAssistant`, `pushChunk`, `endAssistant`, `fail`, `stop`)
  plus tool-call + citation tracking. No LLM SDK, no backend.
- `KjChatAnnouncer` / `coalesceAnnouncement` — coalesces streamed tokens into
  whole-sentence **polite live-region** announcements (never char-by-char).
- `parseSlash` / `matchSlashCommands` — slash-command model reusing the
  command-palette filter engine.
- Types: `KjChatMessageData`, `KjChatMessageRole`, `KjChatStatus`,
  `KjChatToolCall`, `KjChatCitation`, `KjSlashCommand`.

**Components (`@kouji-ui/components`)**

- `KjChatThread` — AI thread surface; reuses `KjChatLog` (`role="log"`) and
  drives a dedicated coalesced polite live region for streaming.
- `KjChatMessage` — renders user/assistant/system/tool turns with safe markdown,
  code blocks (copy button), tool-call cards, citations, and a reduced-motion
  typing indicator.
- `KjPromptInput` — auto-grow textarea with Enter-send / Esc-stop / Shift+Enter
  newline, a slash-command listbox, and an attachment slot.
- `renderMarkdown` — minimal, XSS-safe markdown renderer.

WCAG 2.1 AAA: coalesced announcements, keyboard send/stop, message roles
conveyed to AT, reduced-motion, ≥44px targets.
