import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, test, beforeEach } from 'vitest';
import {
  KjStepperComponent,
  KjStepComponent,
  KjStepLabelComponent,
  KjStepContentComponent,
  KjStepperNextComponent,
  KjStepperPreviousComponent,
  KjStepperResetComponent,
} from './stepper';

@Component({
  standalone: true,
  imports: [
    KjStepperComponent,
    KjStepComponent,
    KjStepLabelComponent,
    KjStepContentComponent,
    KjStepperNextComponent,
    KjStepperPreviousComponent,
    KjStepperResetComponent,
  ],
  template: `
    <kj-stepper
      [(kjActiveStep)]="active"
      [kjLinear]="linear"
      [kjOrientation]="orientation"
    >
      <kj-step [kjStepCompleted]="step0Completed">
        <kj-step-label>Account</kj-step-label>
        <kj-step-content>Account body</kj-step-content>
      </kj-step>
      <kj-step [kjStepCompleted]="step1Completed" [kjStepOptional]="step1Optional">
        <kj-step-label>Profile</kj-step-label>
        <kj-step-content>Profile body</kj-step-content>
      </kj-step>
      <kj-step>
        <kj-step-label>Confirm</kj-step-label>
        <kj-step-content>Confirm body</kj-step-content>
      </kj-step>
      <div>
        <kj-stepper-previous>Back</kj-stepper-previous>
        <kj-stepper-next>Next</kj-stepper-next>
        <kj-stepper-reset>Reset</kj-stepper-reset>
      </div>
    </kj-stepper>
  `,
})
class HostComponent {
  active = signal(0);
  linear = false;
  orientation: 'horizontal' | 'vertical' = 'horizontal';
  step0Completed = false;
  step1Completed = false;
  step1Optional = false;
}

describe('KjStepperComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
  });

  test('renders the wrapper with .kj-stepper class and a step per <kj-step>', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement.querySelector('kj-stepper.kj-stepper');
    expect(root).not.toBeNull();
    const steps = fixture.nativeElement.querySelectorAll('kj-step');
    expect(steps.length).toBe(3);
  });

  test('forwards kjOrientation to the directive (data-orientation host attr)', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.orientation = 'vertical';
    fixture.detectChanges();
    const root = fixture.nativeElement.querySelector('kj-stepper');
    expect(root.getAttribute('data-orientation')).toBe('vertical');
  });

  test('forwards kjLinear to the directive (data-linear host attr)', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.linear = true;
    fixture.detectChanges();
    const root = fixture.nativeElement.querySelector('kj-stepper');
    expect(root.getAttribute('data-linear')).toBe('true');
  });

  test('marks the active step with aria-current="step"', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const steps = fixture.nativeElement.querySelectorAll('kj-step');
    expect(steps[0].getAttribute('aria-current')).toBe('step');
    expect(steps[1].getAttribute('aria-current')).toBeNull();
  });

  test('two-way binding: programmatic write to kjActiveStep moves the active step', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    fixture.componentInstance.active.set(2);
    fixture.detectChanges();
    const steps = fixture.nativeElement.querySelectorAll('kj-step');
    expect(steps[2].getAttribute('aria-current')).toBe('step');
    expect(steps[2].getAttribute('data-active')).toBe('true');
  });

  test('clicking <kj-stepper-next> advances when canAdvance() is true (non-linear)', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const nextBtn = fixture.nativeElement.querySelector(
      'kj-stepper-next button[kjStepperNext]',
    ) as HTMLButtonElement;
    nextBtn.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.active()).toBe(1);
  });

  test('linear mode gates next: disabled when active step not completed', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.linear = true;
    fixture.detectChanges();
    const nextBtn = fixture.nativeElement.querySelector(
      'kj-stepper-next button[kjStepperNext]',
    ) as HTMLButtonElement;
    expect(nextBtn.getAttribute('disabled')).toBe('');
    expect(nextBtn.getAttribute('aria-disabled')).toBe('true');
  });

  test('linear mode advances once active step is marked completed', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.linear = true;
    fixture.componentInstance.step0Completed = true;
    fixture.detectChanges();
    const nextBtn = fixture.nativeElement.querySelector(
      'kj-stepper-next button[kjStepperNext]',
    ) as HTMLButtonElement;
    expect(nextBtn.getAttribute('disabled')).toBeNull();
    nextBtn.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.active()).toBe(1);
  });

  test('clicking <kj-stepper-previous> retreats one step', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    fixture.componentInstance.active.set(2);
    fixture.detectChanges();
    const prevBtn = fixture.nativeElement.querySelector(
      'kj-stepper-previous button[kjStepperPrevious]',
    ) as HTMLButtonElement;
    prevBtn.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.active()).toBe(1);
  });

  test('<kj-stepper-reset> returns to step 0 when clicked', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    fixture.componentInstance.active.set(2);
    fixture.detectChanges();
    const resetBtn = fixture.nativeElement.querySelector(
      'kj-stepper-reset button[kjStepperReset]',
    ) as HTMLButtonElement;
    resetBtn.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.active()).toBe(0);
  });

  test('kjStepOptional permits linear advancement without completion', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.linear = true;
    fixture.componentInstance.step0Completed = true;
    fixture.componentInstance.step1Optional = true;
    fixture.detectChanges();
    fixture.componentInstance.active.set(1);
    fixture.detectChanges();
    const nextBtn = fixture.nativeElement.querySelector(
      'kj-stepper-next button[kjStepperNext]',
    ) as HTMLButtonElement;
    expect(nextBtn.getAttribute('disabled')).toBeNull();
    nextBtn.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.active()).toBe(2);
  });

  test('<kj-step-content> for inactive steps is hidden', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const contents = fixture.nativeElement.querySelectorAll('section[kjStepContent]');
    expect(contents[0].hasAttribute('hidden')).toBe(false);
    expect(contents[1].hasAttribute('hidden')).toBe(true);
    expect(contents[2].hasAttribute('hidden')).toBe(true);
  });

  test('<kj-step-label> renders an inner <button kjStepLabel>', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const labels = fixture.nativeElement.querySelectorAll('kj-step-label button[kjStepLabel]');
    expect(labels.length).toBe(3);
    expect(labels[0].textContent.trim()).toBe('Account');
  });
});
