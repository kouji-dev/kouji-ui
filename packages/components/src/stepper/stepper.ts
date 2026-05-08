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
 *   @doc-file stepper.example.ts
 * @doc-example Non-linear
 *   @doc-file stepper.non-linear.example.ts
 * @doc-example Vertical
 *   @doc-file stepper.vertical.example.ts
 * @doc-example With error
 *   @doc-file stepper.with-error.example.ts
 * @doc-example Optional step
 *   @doc-file stepper.optional-step.example.ts
 * @category Library/Navigation
 * @doc
 * @doc-name stepper
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
