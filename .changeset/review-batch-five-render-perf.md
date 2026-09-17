---
'@kouji-ui/core': minor
'@kouji-ui/components': minor
---

review batch 5 (rendering): charts, the rich-text editor and the chat thread stop re-doing work on every change-detection tick

**`[kjChart]` re-reads its option only when the option changes (perf F-1).**
The directive drove ECharts from `afterEveryRender`, so every change-detection
pass anywhere in the app re-ran `setOption` and re-resolved the themed palette
(one `getComputedStyle` plus up to eleven custom-property reads). Both now run
from an `effect()`. The palette is memoised and refreshed by the theme
`MutationObserver`, which additionally observes the host's nearest
`[data-theme]` ancestor so a scoped theme wrapper still re-colours its chart;
new public `KjChart.refreshPalette()` is the escape hatch for an ancestor that
gains `data-theme` after initialisation.

*Behaviour note:* `[kjChartOption]` must now be **replaced**, not mutated in
place. `afterEveryRender` re-read the same object every tick, so an in-place
mutation was eventually picked up; an `effect` compares by identity.

**`<kj-chart>` honours `provideECharts` and reacts to `theme` (lazy F-3, perf
F-19).** The styled wrapper hard-imported the full `echarts` build, so an app
that registered a tree-shaken loader still paid for the whole library. It now
resolves `KJ_ECHARTS` and falls back to `import('echarts')`. Its
`ResizeObserver` is coalesced through `requestAnimationFrame` and cancelled on
destroy, and `theme` — read once at init and silently inert before — now
disposes and re-creates the instance, guarded so a superseded or
destroyed-during-await initialisation bails.

**Rich text: one document walk per update instead of four (perf F-2).**
`onValue` now hands over a snapshot whose `text()` and `json()` are thunks over
the immutable editor state, and the `empty` flag behind `data-empty` (the
placeholder) short-circuits on the first non-empty block rather than
materialising the whole document's text. `KjRichTextEditor`'s emptiness
semantics are unchanged, including that two empty paragraphs are not an empty
document.

*Behaviour note:* `textChange` and `jsonChange` are now coalesced to one
animation frame (latest value wins). `onChange` / `valueChange` and the
`ControlValueAccessor` form value stay synchronous.

**Chat: streaming markdown is linear, not quadratic (perf F-10, F-11, F-20).**
New exported `createMarkdownRenderer()` keeps a per-message renderer that
re-parses only the block still being written and hands committed blocks back by
reference, so a long streamed reply is no longer re-lexed and re-sanitised from
the top on every token. `<kj-chat-message>` binds `block.html` directly — an
`[innerHTML]` binding *is* `DomSanitizer` at `SecurityContext.HTML` — so the
sanitiser runs once per change instead of once per check; `KjChatMessage.safe()`
is removed (batch 7's clean-break ruling — bind `block.html` directly).
`<kj-chat-thread>` memoises its rows by message
identity, so a registered custom renderer's `item` input is no longer re-set on
every streamed token.

*Behaviour note:* while a reply streams, its body renders one `.kj-chat-md`
block per committed markdown block rather than a single one. The blocks are
role-less `<div>`s, so the accessibility tree is unchanged, but a consumer
stylesheet using `:only-child` or sibling selectors on `.kj-chat-md` needs
re-checking. A message containing a link reference definition (`[id]: url`)
falls back to a full parse, because a definition resolves links above it.
