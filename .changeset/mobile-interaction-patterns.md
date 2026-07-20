---
"@kouji-ui/core": minor
"@kouji-ui/components": minor
---

feat: mobile-first interaction patterns — bottom sheet + action sheet

Adds two mobile-first overlay patterns composed on the existing overlay
primitive stack (no new overlay engine):

- **Bottom sheet** (`KjSheetService` / `KjSheet` / `KjSheetRef` in core, styled
  `kj-sheet` in components): a bottom-anchored modal surface with a grab handle,
  drag-to-dismiss, `detent` initial-height option, focus trap, scroll lock, and
  reduced-motion-aware transitions.
- **Action sheet** (`KjActionSheetService` / `KjActionSheetRef` in components):
  a data-driven, iOS-style `role="menu"` list of actions presented in a bottom
  sheet, with default / destructive action roles, resolving the selected value.

Swipe-to-reveal list rows and a generalized gesture-overlay abstraction are
intentionally deferred to a follow-up (see the design spec).
