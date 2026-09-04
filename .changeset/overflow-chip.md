---
'@kouji-ui/core': minor
'@kouji-ui/components': minor
---

**tag list / avatar group:** collapse the extra items behind a "+N" chip with a hover panel.

`<kj-tag-list [kjMax]="3">` now hides the chips past the cap (`[hidden]` +
`data-overflow`, same contract as `kj-avatar-group`) and renders a "+N" chip.
Hovering, focusing or tapping the chip opens a panel listing the collapsed
chips by their text; `kj-avatar-group`'s existing "+N" avatar gets the same
panel (names from `alt`). Both accept an `<ng-template kjOverflowContent>` to
render the panel themselves — the context carries the collapsed range
(`$implicit` count, `start`, `end`, `labels`) so a consumer slices its own data
and adds actions (remove a user, open a profile…).

```html
<kj-tag-list [kjMax]="3">
  @for (u of users(); track u.id) { <kj-tag>{{ u.name }}</kj-tag> }
  <ng-template kjOverflowContent let-start="start">
    @for (u of users().slice(start); track u.id) {
    <kj-button kjVariant="ghost" (click)="remove(u)">Remove {{ u.name }}</kj-button>
    }
  </ng-template>
</kj-tag-list>
```

The chip is a real button: Tab reaches it and opens the panel, ArrowDown /
Enter move focus inside, Escape returns focus, focus leaving the panel closes
it. Labels are translatable (`overflow.more`, `overflow.show`) and overridable
per instance (`kjOverflowLabel`, `kjOverflowAriaLabel`).

**popover:** `kjTrigger="hover"` now works. `KjPopoverTrigger` declared the
input but always wired the click strategy; it now switches strategies from the
input, and the hover kind keeps the panel open while the pointer rests on it
(`interactive` option of the `onHover` strategy) and also opens on focus and on
an open-only click, so hover popovers with controls stay reachable from the
keyboard and on touch. New `kjOpenDelay` / `kjCloseDelay` inputs (150 ms). The trigger now also
exposes `aria-haspopup="dialog"`, which its spec always expected.
`onClick({ openOnly })`, `composeTriggerEvents()` and `switchableTriggerEvent()`
are new trigger-event primitives.

New core directive `KjOverflowContent` (`ng-template[kjOverflowContent]`) and
components `KjOverflowPanelComponent` (`<kj-overflow-panel>`), shared by both
groups. `KjTagListContext` gains `total`, `visibleCount`, `overflowCount`,
`hiddenLabels`.
