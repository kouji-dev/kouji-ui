---
'@kouji-ui/components': patch
---

Make the `.kj-button` component knobs actually overridable from an ancestor.

`button.css` documented its knobs as "themes/users can override any of these",
but declared them on `.kj-button` itself. A custom property declared on an
element always beats an inherited one, so an ancestor could never set them —
including the `<kj-button>` host, which is the only element a consumer can put
an inline style on, and which is `display: contents` and therefore cannot be
styled directly either. In practice a knob could only be overridden by a rule
targeting `.kj-button`, i.e. a global stylesheet or `::ng-deep`.

Each knob is now read as `var(--kj-button-x, <previous default>)` at its use
site — the pattern `--kj-button-shadow` already used, and for the same reason.
Computed output is unchanged when nobody overrides anything.

Variant and size rules still declare knobs on the element on purpose: that is
the component's own logic and must keep winning, so `kjSize="sm"` still gets
`sm` padding regardless of what an ancestor sets.
