import { Component, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import {
  KjStep,
  KjStepContent,
  KjStepLabel,
  KjStepper,
  KjStepperNext,
  KjStepperPrevious,
  KjStepperReset,
} from '@kouji-ui/core';

/**
 * Styled root wrapper around the headless `KjStepper` directive.
 *
 * Renders an `<ol>` host carrying the directive, projects `<kj-step>` children,
 * and exposes the same kj-prefixed inputs as the directive — `kjActiveStep`
 * (two-way), `kjLinear`, `kjOrientation`, `kjLoop`, `kjArrowNavigation`,
 * `kjResetStepStates`.
 *
 * @example
 * ```html
 * <kj-stepper [(kjActiveStep)]="step" [kjLinear]="true">
 *   <kj-step [kjStepCompleted]="form1.valid()">
 *     <kj-step-label>Account</kj-step-label>
 *     <kj-step-content>...</kj-step-content>
 *   </kj-step>
 *   <kj-step>
 *     <kj-step-label>Confirm</kj-step-label>
 *     <kj-step-content>...</kj-step-content>
 *   </kj-step>
 * </kj-stepper>
 * ```
 *
 * @doc-example Default
 *   The default playground — three-step linear wizard with completion gating.
 *   @doc-file stepper.example.ts
 * @doc-example Usage
 *   A walkthrough of the most common stepper usages — linear vs non-linear,
 *   active step tracking, and Next / Previous / Reset commands.
 *   @doc-file stepper.usage.example.ts
 * @doc-example Non-linear
 *   `[kjLinear]="false"` lets the user jump to any step regardless of order.
 *   @doc-file stepper.non-linear.example.ts
 * @doc-example Vertical
 *   `kjOrientation="vertical"` stacks the steps top-to-bottom.
 *   @doc-file stepper.vertical.example.ts
 * @doc-example With error
 *   `[kjStepError]="true"` marks a step as failed; theme swaps the indicator.
 *   @doc-file stepper.with-error.example.ts
 * @doc-example Optional step
 *   `[kjStepOptional]="true"` lets the user skip without blocking advancement.
 *   @doc-file stepper.optional-step.example.ts
 *
 * @doc-keyboard
 *   ArrowRight|ArrowDown — Moves focus to the next step label (orientation-aware)
 *   ArrowLeft|ArrowUp    — Moves focus to the previous step label
 *   Home                 — Moves focus to the first step
 *   End                  — Moves focus to the last step
 *   Enter|Space          — Activates the focused step label (gated by `kjLinear`)
 *   Tab                  — Leaves the step list and moves into the active step content
 *
 * @doc-aria
 *   role="list"          — applied to the `<ol>` host of `<kj-stepper>`
 *   aria-current="step"  — set on the active step indicator
 *   aria-disabled        — set on steps that cannot be activated (linear + uncompleted)
 *   aria-orientation     — reflects `kjOrientation` ("horizontal" | "vertical")
 *   hidden / inert       — applied to inactive `<kj-step-content>` panels
 *
 * @doc-touch
 *   Step labels default to a ~44px hit area at `md` density. Pair with
 *   `kjOrientation="vertical"` on narrow viewports so labels stay tappable.
 *
 * @doc-a11y
 *   Implements the WAI-ARIA Wizard pattern. Roving tabindex via
 *   `KjRovingTabindex` keeps the step list as a single Tab stop; arrow keys
 *   move focus between labels. Linear mode disables steps the user has not
 *   yet earned — non-linear mode treats every step as freely reachable.
 *
 * @doc-related tabs,progress-bar,form
 *
 * @doc-css-var
 *   --kj-stepper-gap             — Vertical gap between steps in the list.
 *   --kj-stepper-indicator-size  — Diameter of the numbered step indicator circle.
 *   --kj-stepper-bg              — Default step indicator background.
 *   --kj-stepper-border          — Default step indicator and content border color.
 *   --kj-stepper-active          — Background/border color for the active step indicator.
 *   --kj-stepper-active-fg       — Foreground color rendered on top of the active indicator.
 *   --kj-stepper-completed       — Background color for steps marked completed (with check mark).
 *   --kj-stepper-error           — Background color for steps marked in error state.
 *   --kj-stepper-muted           — Foreground color for inactive step labels.
 *
 * @doc-category Library/Navigation
 * @doc
 * @doc-name stepper
 * @doc-description Themed multi-step wizard with linear or non-linear progression and built-in navigation controls.
 * @doc-is-main
 */
@Component({
  selector: 'kj-stepper',
  standalone: true,
  hostDirectives: [
    {
      directive: KjStepper,
      inputs: [
        'kjActiveStep',
        'kjLinear',
        'kjOrientation',
        'kjLoop',
        'kjArrowNavigation',
        'kjResetStepStates',
      ],
      outputs: ['kjActiveStepChange'],
    },
  ],
  template: `<ng-content />`,
  styleUrl: './stepper.css',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'kj-stepper',
    role: 'list',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjStepperComponent {}

/**
 * Single step within a `<kj-stepper>`. Forwards completion / error / optional /
 * disabled / key state down to the headless `KjStep` directive.
 *
 * Project a `<kj-step-label>` and (optionally) a `<kj-step-content>` inside.
 * @doc
 * @doc-name stepper
 */
@Component({
  selector: 'kj-step',
  standalone: true,
  hostDirectives: [
    {
      directive: KjStep,
      inputs: [
        'kjStepCompleted',
        'kjStepError',
        'kjStepOptional',
        'kjStepDisabled',
        'kjStepKey',
      ],
    },
  ],
  template: `<ng-content />`,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'kj-step' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjStepComponent {}

/**
 * Header / clickable label for a `<kj-step>`. Renders an inner `<button>`
 * carrying `[kjStepLabel]` so APG wizard semantics and roving tabindex
 * stay correct.
 * @doc
 * @doc-name stepper
 */
@Component({
  selector: 'kj-step-label',
  standalone: true,
  imports: [KjStepLabel],
  template: `<button type="button" kjStepLabel class="kj-step__label"><ng-content /></button>`,
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjStepLabelComponent {}

/**
 * Content panel for a `<kj-step>`. Renders an inner `<section>` carrying
 * `[kjStepContent]`; the directive host-binds `[hidden]` / `[inert]` so the
 * panel is visible only when its parent step is active.
 * @doc
 * @doc-name stepper
 */
@Component({
  selector: 'kj-step-content',
  standalone: true,
  imports: [KjStepContent],
  template: `<section kjStepContent class="kj-step__content"><ng-content /></section>`,
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjStepContentComponent {}

/**
 * Stepper-level *Next* command. Renders a `<button>` with `[kjStepperNext]`,
 * which host-binds `[disabled]` from the parent's `canAdvance()`.
 * @doc
 * @doc-name stepper
 */
@Component({
  selector: 'kj-stepper-next',
  standalone: true,
  imports: [KjStepperNext],
  template: `<button type="button" kjStepperNext class="kj-stepper-action kj-stepper-action--next"><ng-content /></button>`,
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjStepperNextComponent {}

/**
 * Stepper-level *Previous* command. Renders a `<button>` with
 * `[kjStepperPrevious]`, which host-binds `[disabled]` from the parent's
 * `canRetreat()`.
 * @doc
 * @doc-name stepper
 */
@Component({
  selector: 'kj-stepper-previous',
  standalone: true,
  imports: [KjStepperPrevious],
  template: `<button type="button" kjStepperPrevious class="kj-stepper-action kj-stepper-action--previous"><ng-content /></button>`,
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjStepperPreviousComponent {}

/**
 * Stepper-level *Reset* command. Renders a `<button>` with `[kjStepperReset]`;
 * never gated.
 * @doc
 * @doc-name stepper
 */
@Component({
  selector: 'kj-stepper-reset',
  standalone: true,
  imports: [KjStepperReset],
  template: `<button type="button" kjStepperReset class="kj-stepper-action kj-stepper-action--reset"><ng-content /></button>`,
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjStepperResetComponent {}
