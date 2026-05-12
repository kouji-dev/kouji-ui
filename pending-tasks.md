# Pending Tasks

## Design Token System Overhaul

**Status:** Backlog  
**Priority:** Medium (do after accessibility pipeline)

### Summary
The current base token scale (`base-100` through `base-300` etc.) is too coarse to support precise layering, nuanced theming, and full accessibility compliance. We need a richer, more expressive token vocabulary.

### Goals
- Support more UI layers (surface, overlay, sunken, raised, etc.) without ambiguity
- Enable precise contrast control at each layer for WCAG AAA compliance
- Allow more meaningful customization per theme without token collisions
- Align with best-in-class reference systems (Radix Colors, Material 3, Tailwind v4)

### Approach (TBD — needs research sprint)
- Audit current token usage across all components
- Research: Radix Colors scale (1–12), Material 3 tonal palettes, Tailwind v4 semantic tokens
- Define new token taxonomy (semantic + primitive layers)
- Migrate existing components incrementally

### Dependencies
- Accessibility pipeline (subject 1) — its contrast audit output should inform which token gaps are most critical
