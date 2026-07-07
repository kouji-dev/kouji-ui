// Per-component gzipped bundle budgets — single source of truth.
// Spec: docs/superpowers/specs/2026-07-07-bundle-budgets-design.md
//
// Each budget imports ONE component and measures its tree-shaken, gzipped size.
// A broken tree-shake (stray side-effect / eager DI) balloons the number past
// its limit, so these budgets double as the tree-shaking regression guard.
//
// Add a component: append a row below. `symbol` must be the exact export name
// in the built FESM. Limits sit ~30% above the current measured size — tight
// enough to trip a real regression, loose enough for normal churn.

// Framework peers the consuming Angular app already provides — never shipped
// inside a component, so excluded from the measurement. Third-party runtime
// deps (@tanstack/*, lucide-static) are intentionally NOT ignored: if a
// component accidentally pulls one in, that IS a regression we want to catch.
export const IGNORE = [
  '@angular/core',
  '@angular/core/*',
  '@angular/common',
  '@angular/common/*',
  '@angular/forms',
  '@angular/cdk',
  '@angular/cdk/*',
  'rxjs',
  'rxjs/*',
];

const CORE = '@kouji-ui/core';
const COMPONENTS = '@kouji-ui/components';

/** @type {{ name: string, pkg: string, symbol: string, limit: string }[]} */
export const budgets = [
  // Headless core primitives.
  { name: 'core: KjButton', pkg: CORE, symbol: 'KjButton', limit: '2 kB' },
  { name: 'core: KjInput', pkg: CORE, symbol: 'KjInput', limit: '2 kB' },
  { name: 'core: KjCheckbox', pkg: CORE, symbol: 'KjCheckbox', limit: '2 kB' },
  { name: 'core: KjBadge', pkg: CORE, symbol: 'KjBadge', limit: '0.75 kB' },
  { name: 'core: KjIconDirective', pkg: CORE, symbol: 'KjIconDirective', limit: '1.5 kB' },
  { name: 'core: KjAvatar', pkg: CORE, symbol: 'KjAvatar', limit: '0.9 kB' },
  { name: 'core: KjTooltipTrigger', pkg: CORE, symbol: 'KjTooltipTrigger', limit: '4 kB' },
  { name: 'core: KjDialog', pkg: CORE, symbol: 'KjDialog', limit: '3.6 kB' },
  { name: 'core: KjSelect', pkg: CORE, symbol: 'KjSelect', limit: '6.5 kB' },
  { name: 'core: KjTable', pkg: CORE, symbol: 'KjTable', limit: '26 kB' },

  // Styled wrappers (bundle their headless core cousin — real shipped weight).
  { name: 'components: KjButton', pkg: COMPONENTS, symbol: 'KjButtonComponent', limit: '2.5 kB' },
  { name: 'components: KjInput', pkg: COMPONENTS, symbol: 'KjInputComponent', limit: '2.2 kB' },
  { name: 'components: KjCheckbox', pkg: COMPONENTS, symbol: 'KjCheckboxComponent', limit: '2.4 kB' },
  { name: 'components: KjBadge', pkg: COMPONENTS, symbol: 'KjBadgeComponent', limit: '1 kB' },
  { name: 'components: KjCard', pkg: COMPONENTS, symbol: 'KjCardComponent', limit: '1 kB' },
  { name: 'components: KjAlert', pkg: COMPONENTS, symbol: 'KjAlertComponent', limit: '5 kB' },
  { name: 'components: KjTooltip', pkg: COMPONENTS, symbol: 'KjTooltipComponent', limit: '6.8 kB' },
  { name: 'components: KjDialog', pkg: COMPONENTS, symbol: 'KjDialogComponent', limit: '0.75 kB' },
  { name: 'components: KjSelect', pkg: COMPONENTS, symbol: 'KjSelectComponent', limit: '12 kB' },
  { name: 'components: KjTable', pkg: COMPONENTS, symbol: 'KjTableComponent', limit: '68 kB' },
];
