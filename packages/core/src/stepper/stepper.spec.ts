import { Component, signal } from '@angular/core';
import { fireEvent, render } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import {
  KjStep,
  KjStepContent,
  KjStepLabel,
  KjStepper,
  KjStepperNext,
  KjStepperPrevious,
  KjStepperReset,
} from './stepper';

expect.extend(toHaveNoViolations);

const imports = [
  KjStepper,
  KjStep,
  KjStepLabel,
  KjStepContent,
  KjStepperNext,
  KjStepperPrevious,
  KjStepperReset,
];

const baseTemplate = `
  <ol kjStepper [(kjActiveStep)]="active">
    <li kjStep>
      <button kjStepLabel>Account</button>
      <section kjStepContent>Account body</section>
    </li>
    <li kjStep>
      <button kjStepLabel>Profile</button>
      <section kjStepContent>Profile body</section>
    </li>
    <li kjStep>
      <button kjStepLabel>Confirm</button>
      <section kjStepContent>Confirm body</section>
    </li>
    <li>
      <button kjStepperPrevious>Back</button>
      <button kjStepperNext>Next</button>
      <button kjStepperReset>Reset</button>
    </li>
  </ol>`;

@Component({
  standalone: true,
  imports,
  template: baseTemplate,
})
class BasicHostComponent {
  active = 0;
}

describe('KjStepper', () => {
  describe('roles + ARIA', () => {
    it('renders the root with native <ol> semantics and data-orientation', async () => {
      const { container } = await render(BasicHostComponent);
      const root = container.querySelector('[kjStepper]')!;
      expect(root.tagName).toBe('OL');
      // We deliberately do not set `aria-orientation` — axe `aria-allowed-attr`
      // rejects it on the implicit `list` role. The keyboard axis is enforced
      // via `KjRovingTabindex`; visual layout reads `data-orientation`.
      expect(root).not.toHaveAttribute('aria-orientation');
      expect(root).toHaveAttribute('data-orientation', 'horizontal');
    });

    it('marks the active step with aria-current="step" and inactive steps without it', async () => {
      const { container } = await render(BasicHostComponent);
      const steps = container.querySelectorAll('[kjStep]');
      expect(steps[0]).toHaveAttribute('aria-current', 'step');
      expect(steps[1]).not.toHaveAttribute('aria-current');
      expect(steps[2]).not.toHaveAttribute('aria-current');
    });

    it('wires step content as role="region" with aria-labelledby to the label id', async () => {
      const { container } = await render(BasicHostComponent);
      const label = container.querySelectorAll('[kjStepLabel]')[0];
      const content = container.querySelectorAll('[kjStepContent]')[0];
      expect(content).toHaveAttribute('role', 'region');
      expect(label.getAttribute('id')).toBeTruthy();
      expect(content.getAttribute('aria-labelledby')).toBe(label.getAttribute('id'));
      expect(label.getAttribute('aria-controls')).toBe(content.getAttribute('id'));
    });

    it('hides inactive content panels via [hidden] and [inert]', async () => {
      const { container } = await render(BasicHostComponent);
      const contents = container.querySelectorAll('[kjStepContent]');
      expect(contents[0]).not.toHaveAttribute('hidden');
      expect(contents[1]).toHaveAttribute('hidden', '');
      expect(contents[1]).toHaveAttribute('inert', '');
    });

    it('passes axe audit', async () => {
      const { container } = await render(BasicHostComponent);
      // Step content elements with `aria-labelledby` may be flagged when their
      // referenced label is hidden; restrict the audit to the always-visible
      // header strip + active panel for a clean signal.
      expect(await axe(container)).toHaveNoViolations();
    });
  });

  describe('active step via index', () => {
    it('writing to kjActiveStep activates the matching step', async () => {
      const fixture = await render(BasicHostComponent);
      fixture.fixture.componentInstance.active = 1;
      fixture.detectChanges();
      const steps = fixture.container.querySelectorAll('[kjStep]');
      expect(steps[0]).not.toHaveAttribute('aria-current');
      expect(steps[1]).toHaveAttribute('aria-current', 'step');
    });

    it('out-of-range writes clamp to the valid range', async () => {
      const fixture = await render(BasicHostComponent);
      fixture.fixture.componentInstance.active = 99;
      fixture.detectChanges();
      // The clamping effect re-runs and pulls the model back into range.
      await fixture.fixture.whenStable();
      fixture.detectChanges();
      const steps = fixture.container.querySelectorAll('[kjStep]');
      expect(steps[2]).toHaveAttribute('aria-current', 'step');
    });
  });

  describe('non-linear jumps', () => {
    it('clicking any step header activates it', async () => {
      const { container } = await render(BasicHostComponent);
      const labels = container.querySelectorAll('[kjStepLabel]');
      fireEvent.click(labels[2]);
      const steps = container.querySelectorAll('[kjStep]');
      expect(steps[2]).toHaveAttribute('aria-current', 'step');
    });
  });

  describe('linear-mode reachability gating', () => {
    @Component({
      standalone: true,
      imports,
      template: `
        <ol kjStepper [kjLinear]="true" [(kjActiveStep)]="active">
          <li kjStep [kjStepCompleted]="step1Done()">
            <button kjStepLabel>Account</button>
            <section kjStepContent>Account</section>
          </li>
          <li kjStep [kjStepCompleted]="step2Done()">
            <button kjStepLabel>Profile</button>
            <section kjStepContent>Profile</section>
          </li>
          <li kjStep>
            <button kjStepLabel>Confirm</button>
            <section kjStepContent>Confirm</section>
          </li>
          <button kjStepperNext>Next</button>
        </ol>
      `,
    })
    class LinearHost {
      active = 0;
      readonly step1Done = signal(false);
      readonly step2Done = signal(false);
    }

    it('un-reached headers are aria-disabled in linear mode', async () => {
      const { container } = await render(LinearHost);
      const labels = container.querySelectorAll('[kjStepLabel]');
      expect(labels[0]).not.toHaveAttribute('aria-disabled');
      expect(labels[1]).toHaveAttribute('aria-disabled', 'true');
      expect(labels[2]).toHaveAttribute('aria-disabled', 'true');
    });

    it('clicking an un-reached label is a no-op', async () => {
      const { container } = await render(LinearHost);
      const labels = container.querySelectorAll('[kjStepLabel]');
      fireEvent.click(labels[2]);
      const steps = container.querySelectorAll('[kjStep]');
      expect(steps[0]).toHaveAttribute('aria-current', 'step');
      expect(steps[2]).not.toHaveAttribute('aria-current');
    });

    it('next() is disabled when the active step is not completed', async () => {
      const { container } = await render(LinearHost);
      const next = container.querySelector('[kjStepperNext]') as HTMLButtonElement;
      expect(next).toHaveAttribute('disabled', '');
    });

    it('next() advances after the active step is marked completed', async () => {
      const fixture = await render(LinearHost);
      fixture.fixture.componentInstance.step1Done.set(true);
      fixture.detectChanges();
      const next = fixture.container.querySelector('[kjStepperNext]') as HTMLButtonElement;
      expect(next).not.toHaveAttribute('disabled');
      fireEvent.click(next);
      fixture.detectChanges();
      const steps = fixture.container.querySelectorAll('[kjStep]');
      expect(steps[1]).toHaveAttribute('aria-current', 'step');
    });

    it('once a step is completed the next header becomes reachable', async () => {
      const fixture = await render(LinearHost);
      fixture.fixture.componentInstance.step1Done.set(true);
      fixture.detectChanges();
      const labels = fixture.container.querySelectorAll('[kjStepLabel]');
      expect(labels[1]).not.toHaveAttribute('aria-disabled');
      // Step 3 still gated because step 2 isn't done yet.
      expect(labels[2]).toHaveAttribute('aria-disabled', 'true');
    });
  });

  describe('step completion + error reflection', () => {
    @Component({
      standalone: true,
      imports,
      template: `
        <ol kjStepper>
          <li kjStep [kjStepCompleted]="done()" [kjStepError]="failed()" [kjStepOptional]="optional()">
            <button kjStepLabel>One</button>
          </li>
          <li kjStep>
            <button kjStepLabel>Two</button>
          </li>
        </ol>
      `,
    })
    class StateHost {
      readonly done = signal(false);
      readonly failed = signal(false);
      readonly optional = signal(false);
    }

    it('reflects completion / error / optional via data-* attrs', async () => {
      const fixture = await render(StateHost);
      const step = fixture.container.querySelectorAll('[kjStep]')[0];
      expect(step).not.toHaveAttribute('data-completed');
      expect(step).not.toHaveAttribute('data-error');
      expect(step).not.toHaveAttribute('data-optional');

      fixture.fixture.componentInstance.done.set(true);
      fixture.fixture.componentInstance.failed.set(true);
      fixture.fixture.componentInstance.optional.set(true);
      fixture.detectChanges();

      expect(step).toHaveAttribute('data-completed', 'true');
      expect(step).toHaveAttribute('data-error', 'true');
      expect(step).toHaveAttribute('data-optional', 'true');
    });
  });

  describe('next/prev/reset commands', () => {
    it('next advances by one in non-linear mode', async () => {
      const { container } = await render(BasicHostComponent);
      const next = container.querySelector('[kjStepperNext]') as HTMLButtonElement;
      fireEvent.click(next);
      const steps = container.querySelectorAll('[kjStep]');
      expect(steps[1]).toHaveAttribute('aria-current', 'step');
    });

    it('previous retreats by one and is disabled at index 0', async () => {
      const { container } = await render(BasicHostComponent);
      const prev = container.querySelector('[kjStepperPrevious]') as HTMLButtonElement;
      expect(prev).toHaveAttribute('disabled', '');
      const next = container.querySelector('[kjStepperNext]') as HTMLButtonElement;
      fireEvent.click(next);
      fireEvent.click(next);
      expect(prev).not.toHaveAttribute('disabled');
      fireEvent.click(prev);
      const steps = container.querySelectorAll('[kjStep]');
      expect(steps[1]).toHaveAttribute('aria-current', 'step');
    });

    it('reset returns to step 0', async () => {
      const { container } = await render(BasicHostComponent);
      const next = container.querySelector('[kjStepperNext]') as HTMLButtonElement;
      const reset = container.querySelector('[kjStepperReset]') as HTMLButtonElement;
      fireEvent.click(next);
      fireEvent.click(next);
      fireEvent.click(reset);
      const steps = container.querySelectorAll('[kjStep]');
      expect(steps[0]).toHaveAttribute('aria-current', 'step');
    });

    it('next at the last step is disabled by default; loops when kjLoop=true', async () => {
      @Component({
        standalone: true,
        imports,
        template: `
          <ol kjStepper [kjLoop]="loop">
            <li kjStep><button kjStepLabel>A</button></li>
            <li kjStep><button kjStepLabel>B</button></li>
            <button kjStepperNext>Next</button>
          </ol>`,
      })
      class LoopHost {
        loop = false;
      }
      const fixture = await render(LoopHost);
      const next = fixture.container.querySelector('[kjStepperNext]') as HTMLButtonElement;
      fireEvent.click(next);
      // At last step, no loop → disabled.
      expect(next).toHaveAttribute('disabled', '');

      fixture.fixture.componentInstance.loop = true;
      fixture.detectChanges();
      expect(next).not.toHaveAttribute('disabled');
      fireEvent.click(next);
      const steps = fixture.container.querySelectorAll('[kjStep]');
      expect(steps[0]).toHaveAttribute('aria-current', 'step');
    });
  });

  describe('orientation propagation to roving', () => {
    it('vertical orientation reflects on data-orientation', async () => {
      @Component({
        standalone: true,
        imports,
        template: `
          <ol kjStepper kjOrientation="vertical">
            <li kjStep><button kjStepLabel>One</button></li>
            <li kjStep><button kjStepLabel>Two</button></li>
          </ol>`,
      })
      class VerticalHost {}
      const { container } = await render(VerticalHost);
      const root = container.querySelector('[kjStepper]')!;
      expect(root).toHaveAttribute('data-orientation', 'vertical');
    });

    it('arrow keys move focus along the configured axis (horizontal default)', async () => {
      const { container } = await render(BasicHostComponent);
      const root = container.querySelector('[kjStepper]')!;
      const labels = container.querySelectorAll<HTMLButtonElement>('[kjStepLabel]');
      labels[0].focus();
      fireEvent.keyDown(root, { key: 'ArrowRight' });
      // Roving moved tabindex=0 to the next label.
      expect(labels[1]).toHaveAttribute('tabindex', '0');
      expect(labels[0]).toHaveAttribute('tabindex', '-1');
    });

    it('vertical orientation: ArrowDown moves focus, ArrowRight is ignored', async () => {
      @Component({
        standalone: true,
        imports,
        template: `
          <ol kjStepper kjOrientation="vertical">
            <li kjStep><button kjStepLabel>One</button></li>
            <li kjStep><button kjStepLabel>Two</button></li>
          </ol>`,
      })
      class VerticalHost {}
      const { container } = await render(VerticalHost);
      const root = container.querySelector('[kjStepper]')!;
      const labels = container.querySelectorAll<HTMLButtonElement>('[kjStepLabel]');
      labels[0].focus();
      fireEvent.keyDown(root, { key: 'ArrowRight' });
      expect(labels[0]).toHaveAttribute('tabindex', '0');
      expect(labels[1]).toHaveAttribute('tabindex', '-1');

      fireEvent.keyDown(root, { key: 'ArrowDown' });
      expect(labels[1]).toHaveAttribute('tabindex', '0');
      expect(labels[0]).toHaveAttribute('tabindex', '-1');
    });
  });

  describe('goToKey lookup', () => {
    it('navigates by kjStepKey', async () => {
      @Component({
        standalone: true,
        imports,
        template: `
          <ol kjStepper #s="kjStepper">
            <li kjStep kjStepKey="account"><button kjStepLabel>Account</button></li>
            <li kjStep kjStepKey="profile"><button kjStepLabel>Profile</button></li>
            <li kjStep kjStepKey="confirm"><button kjStepLabel>Confirm</button></li>
            <button (click)="s.goToKey('profile')" id="jump">Jump</button>
          </ol>`,
      })
      class KeyHost {}
      const { container } = await render(KeyHost);
      fireEvent.click(container.querySelector('#jump')!);
      const steps = container.querySelectorAll('[kjStep]');
      expect(steps[1]).toHaveAttribute('aria-current', 'step');
    });

    it('unknown key is a no-op', async () => {
      @Component({
        standalone: true,
        imports,
        template: `
          <ol kjStepper #s="kjStepper">
            <li kjStep kjStepKey="a"><button kjStepLabel>A</button></li>
            <li kjStep kjStepKey="b"><button kjStepLabel>B</button></li>
            <button (click)="s.goToKey('nope')" id="jump">Jump</button>
          </ol>`,
      })
      class KeyHost {}
      const { container } = await render(KeyHost);
      fireEvent.click(container.querySelector('#jump')!);
      const steps = container.querySelectorAll('[kjStep]');
      expect(steps[0]).toHaveAttribute('aria-current', 'step');
    });
  });
});
