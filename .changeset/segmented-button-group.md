---
'@kouji-ui/components': minor
'@kouji-ui/core': minor
---

Add a `segmented` button-group variant.

`kjVariant="segmented"` moves the border and rounded corners onto the group
and leaves the children borderless, filling only the pressed segment — a
mode switcher rather than a toolbar. Works in both orientations.

```html
<kj-button-group kjVariant="segmented" kjSize="sm" kjAriaLabel="Mode">
  <kj-button [kjPressed]="true">Chat</kj-button>
  <kj-button [kjDisabled]="true">Images</kj-button>
</kj-button-group>
```

Supporting changes:

- `KjButtonGroup` mirrors `kjVariant` to `data-variant` on its host, so
  group-level looks — a shared shell, dividers — can be drawn in CSS. The
  attribute is absent when no variant is set.
- `.kj-button` reads a new `--kj-button-text-transform` knob (default
  `none`), the one typographic property that had no hook.
- The pressed fill is reached through `--kj-segmented-bg-on` /
  `--kj-segmented-fg-on`, and the shell through `--kj-segmented-border`.
  Variant rules declare knobs on the element and would otherwise beat a
  consumer's ancestor value; the rest of the look needs no indirection,
  since every other knob is already read as `var(name, default)`.
