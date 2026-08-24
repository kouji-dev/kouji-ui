---
"@kouji-ui/core": patch
---

fix(confirm-popup): resolve confirm/cancel when the trigger is a child

`[kjConfirmPopup]` read the overlay controller from its OWN element injector,
but every documented composition puts `[kjConfirmPopupTrigger]` on a child
(`<kj-confirm-popup><kj-confirm-popup-trigger>…`). The controller was therefore
never found: `close()` bailed out early, so clicking the action or cancel slot
did nothing, `(kjConfirmed)` / `(kjCancelled)` / `(kjResult)` never emitted, the
panel stayed open, and — because `ctx.open()` was permanently `false` — the
panel kept `role="dialog"` instead of being promoted to `alertdialog` with its
`aria-describedby` wiring and default focus.

The trigger now hands its controller to the enclosing confirm-popup context, so
the documented markup resolves as written.
