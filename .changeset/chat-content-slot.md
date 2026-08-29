---
'@kouji-ui/components': minor
---

**chat:** add `<kj-chat-content>` and pin bubbles to their row's side.

`kj-chat-content` occupies the row's `bubble` grid area and stacks whatever is
projected into it, so a turn made of several parts — multiple bubbles plus
consumer content such as alert cards or action rows — renders as ONE `<kj-chat>`
article with a single avatar. Previously each part needed its own row, which
repeated the avatar and split one turn into several unrelated-looking articles;
stacking bubbles directly in a row was not possible because every
`.kj-chat-bubble` claims `grid-area: bubble` and they collided in the same cell.

```html
<kj-chat kjSide="start">
  <kj-chat-avatar>T</kj-chat-avatar>
  <kj-chat-content>
    <kj-chat-bubble>Welcome.</kj-chat-bubble>
    <kj-chat-bubble kjVariant="accent">A question?</kj-chat-bubble>
    <kj-alert kjVariant="info">…</kj-alert>
  </kj-chat-content>
</kj-chat>
```

Also fixes bubble alignment on `kjSide="end"` rows. The bubble is a grid item in
a `1fr` column, so it stretches — until `max-width` caps it, at which point a
stretched item settles at the *start* of its column. Long messages therefore
unpinned from the right edge and drifted inward while short ones stayed flush.
Header, bubble and footer now take an explicit `justify-self` per side, with the
same cascade-driven RTL flip the row already uses.
