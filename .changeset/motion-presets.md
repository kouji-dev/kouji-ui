---
"@kouji-ui/core": minor
"@kouji-ui/themes": minor
---

feat(core): motion preset library + shared reduced-motion service.

- `KjReducedMotion` (`providedIn: 'root'`) exposes an SSR-safe
  `prefersReducedMotion` signal derived from `matchMedia`, updating live when
  the OS setting flips.
- Named, composable CSS motion presets shipped as `@kouji-ui/core/motion/motion.css`
  (`fade`, `slide-up/down/left/right`, `scale`, `slide-up-fade`, `scale-spring`)
  with matching entrance/exit keyframes, keyed off `--kj-motion-*` custom props.
- `KjMotion` directive (`[kjMotion]`) applies a named preset + enter/exit state
  to any element and surfaces the `reduced()` signal.
- Every preset collapses to a ~1ms opacity fade with no transform under
  `prefers-reduced-motion: reduce` (WCAG 2.1 AAA 2.3.3).

themes: adds `--kj-motion-duration-*`, `--kj-motion-ease*`, and
`--kj-motion-distance` tokens (plus base duration/easing primitives) so presets
are retunable per theme.
