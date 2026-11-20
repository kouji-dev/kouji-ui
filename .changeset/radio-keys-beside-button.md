---
'@kouji-ui/core': minor
---

Add `kjRadioKeys`: the radio-group keyboard behaviour for options that are `kjButton` elements.

`[kjRadio]` composes `KjFocusRing` and `KjDisabled`, as `kjButton` does, so the two could not share an
element (NG0309). `kjRadioKeys` goes on the `role="radiogroup"` host and composes nothing: arrow keys pick
and focus the next / previous enabled option (wrapping, swapped under `dir="rtl"`), Home / End the ends, and
the group is one Tab stop that follows `aria-checked`. Picking is a `click()` on the option, so its own
`(click)` stays the one way the value changes. `kjRadioKeys="button.opt"` names the options when they are
rows wrapping a presentational `role="radio"` mark.

```html
<div role="radiogroup" aria-label="View" kjRadioKeys>
  <button kjButton type="button" role="radio" [attr.aria-checked]="view() === 'list'" (click)="view.set('list')">List</button>
  <button kjButton type="button" role="radio" [attr.aria-checked]="view() === 'grid'" (click)="view.set('grid')">Grid</button>
</div>
```

Limits: it does not hold the value or write `aria-checked` (bind it per option); options are found with
`querySelectorAll`, so a radio group nested inside an option is read as part of this one.
