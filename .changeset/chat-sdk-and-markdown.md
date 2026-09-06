---
'@kouji-ui/components': minor
'@kouji-ui/core': minor
---

Chat: real markdown, and a type → component registry for thread items.

**Markdown.** The kit shipped a hand-rolled parser covering only bold, italic,
code spans and links, so the block markdown a model actually emits — headings,
lists, tables, blockquotes — reached the bubble as literal `##`, `-` and `|`.
`renderMarkdown` now runs on `marked` (GFM, `breaks: true`), still splitting
fenced code out as structural blocks so the copy button keeps working.

`marked` drops raw HTML from the source rather than passing it through, and
`kj-chat-message` now *sanitises* the result (`SecurityContext.HTML`) instead
of calling `bypassSecurityTrustHtml`. A chat body is model or user output — the
one place in a UI kit where trusting a single layer is a bad bet.

Adds `marked` as a dependency of `@kouji-ui/components`.

**Item registry.** `provideKjChat` maps an item `type` to a component, so a
thread can render turns the kit knows nothing about:

```ts
provideKjChat({
  renderers: { chart: ChartBubble, diff: DiffBubble },
  fallback: UnknownItem,
})
```

```ts
store.addItem({ type: 'chart', data: series, content: 'Revenue, last 6 months' });
```

`KjChatMessageData` gains optional `type` and `data`. A message without a
`type` never consults the registry and is drawn by the built-in renderer as
before — the common path stays free. An unregistered `type` falls back to
`fallback`, and failing that to the built-in renderer, so an unknown item
degrades to readable text rather than a hole in the transcript.

`content` stays the item's plain-text equivalent: it is what the coalesced
live region announces, so a custom renderer is still accessible.
