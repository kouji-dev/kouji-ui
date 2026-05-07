import { Component, signal } from '@angular/core';
import { render, fireEvent, screen } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { KjTab, KjTabList, KjTabPanel, KjTabs } from './tabs';

expect.extend(toHaveNoViolations);

const imports = [KjTabs, KjTabList, KjTab, KjTabPanel];

@Component({
  standalone: true,
  imports,
  template: `
    <div kjTabs [(kjValue)]="active">
      <div kjTabList aria-label="Demo tabs">
        <button kjTab kjTabValue="overview">Overview</button>
        <button kjTab kjTabValue="billing">Billing</button>
        <button kjTab kjTabValue="usage">Usage</button>
      </div>
      <div kjTabPanel kjPanelValue="overview" #p1="kjTabPanel">
        @if (p1.mounted()) { <span data-testid="overview-content">Overview body</span> }
      </div>
      <div kjTabPanel kjPanelValue="billing" #p2="kjTabPanel">
        @if (p2.mounted()) { <span data-testid="billing-content">Billing body</span> }
      </div>
      <div kjTabPanel kjPanelValue="usage" #p3="kjTabPanel">
        @if (p3.mounted()) { <span data-testid="usage-content">Usage body</span> }
      </div>
    </div>
  `,
})
class HorizontalHost {
  readonly active = signal('overview');
}

@Component({
  standalone: true,
  imports,
  template: `
    <div kjTabs kjOrientation="vertical" [(kjValue)]="active">
      <div kjTabList>
        <button kjTab kjTabValue="a">A</button>
        <button kjTab kjTabValue="b">B</button>
        <button kjTab kjTabValue="c">C</button>
      </div>
      <div kjTabPanel kjPanelValue="a">A body</div>
      <div kjTabPanel kjPanelValue="b">B body</div>
      <div kjTabPanel kjPanelValue="c">C body</div>
    </div>
  `,
})
class VerticalHost {
  readonly active = signal('a');
}

@Component({
  standalone: true,
  imports,
  template: `
    <div kjTabs kjActivationMode="manual" [(kjValue)]="active">
      <div kjTabList>
        <button kjTab kjTabValue="one">One</button>
        <button kjTab kjTabValue="two">Two</button>
      </div>
      <div kjTabPanel kjPanelValue="one">One body</div>
      <div kjTabPanel kjPanelValue="two">Two body</div>
    </div>
  `,
})
class ManualHost {
  readonly active = signal('one');
}

@Component({
  standalone: true,
  imports,
  template: `
    <div kjTabs [(kjValue)]="active">
      <div kjTabList>
        <button kjTab kjTabValue="alpha">Alpha</button>
        <button kjTab kjTabValue="beta" [kjTabDisabled]="true">Beta</button>
        <button kjTab kjTabValue="gamma">Gamma</button>
      </div>
      <div kjTabPanel kjPanelValue="alpha">Alpha body</div>
      <div kjTabPanel kjPanelValue="beta">Beta body</div>
      <div kjTabPanel kjPanelValue="gamma">Gamma body</div>
    </div>
  `,
})
class DisabledHost {
  readonly active = signal('alpha');
}

@Component({
  standalone: true,
  imports,
  template: `
    <div kjTabs>
      <div kjTabList>
        <button kjTab kjTabValue="x">X</button>
        <button kjTab kjTabValue="y">Y</button>
      </div>
      <div kjTabPanel kjPanelValue="x">X body</div>
      <div kjTabPanel kjPanelValue="y">Y body</div>
    </div>
  `,
})
class DefaultValueHost {}

describe('KjTabs', () => {
  describe('roles + ARIA wiring', () => {
    it('hosts role="tablist" with aria-orientation', async () => {
      const { container } = await render(HorizontalHost);
      const list = container.querySelector('[kjTabList]')!;
      expect(list).toHaveAttribute('role', 'tablist');
      expect(list).toHaveAttribute('aria-orientation', 'horizontal');
    });

    it('every tab gets role="tab" and ids/aria-controls/aria-labelledby pair up', async () => {
      const { container } = await render(HorizontalHost);
      const tabs = container.querySelectorAll<HTMLElement>('[kjTab]');
      const panels = container.querySelectorAll<HTMLElement>('[kjTabPanel]');
      expect(tabs).toHaveLength(3);
      expect(panels).toHaveLength(3);
      tabs.forEach((t, i) => {
        expect(t).toHaveAttribute('role', 'tab');
        const id = t.getAttribute('id');
        const controls = t.getAttribute('aria-controls');
        expect(id).toBeTruthy();
        expect(controls).toBeTruthy();
        expect(panels[i]).toHaveAttribute('role', 'tabpanel');
        expect(panels[i].id).toBe(controls);
        expect(panels[i].getAttribute('aria-labelledby')).toBe(id);
      });
    });

    it('active tab has aria-selected="true" and tabindex="0"; others have aria-selected="false" and tabindex="-1"', async () => {
      await render(HorizontalHost);
      const tabs = screen.getAllByRole('tab');
      expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
      expect(tabs[0]).toHaveAttribute('tabindex', '0');
      expect(tabs[1]).toHaveAttribute('aria-selected', 'false');
      expect(tabs[1]).toHaveAttribute('tabindex', '-1');
    });

    it('inactive panels are hidden; active panel is not', async () => {
      const { container } = await render(HorizontalHost);
      const panels = container.querySelectorAll<HTMLElement>('[kjTabPanel]');
      expect(panels[0]).not.toHaveAttribute('hidden');
      expect(panels[1]).toHaveAttribute('hidden', '');
      expect(panels[2]).toHaveAttribute('hidden', '');
    });

    it('passes axe audit', async () => {
      const { container } = await render(HorizontalHost);
      expect(await axe(container)).toHaveNoViolations();
    });
  });

  describe('default value', () => {
    it('activates the first tab when kjValue is left unset', async () => {
      await render(DefaultValueHost);
      // Allow the reconciliation microtask + an effect tick to run.
      await new Promise<void>((resolve) => queueMicrotask(() => resolve()));
      // A second tick lets the resulting render settle.
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      const tabs = screen.getAllByRole('tab');
      expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
      expect(tabs[1]).toHaveAttribute('aria-selected', 'false');
    });
  });

  describe('programmatic value change', () => {
    it('flipping the model activates the matching tab and panel', async () => {
      const { fixture, container } = await render(HorizontalHost);
      const host = fixture.componentInstance as HorizontalHost;
      host.active.set('billing');
      fixture.detectChanges();
      const tabs = screen.getAllByRole('tab');
      expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
      const panels = container.querySelectorAll<HTMLElement>('[kjTabPanel]');
      expect(panels[1]).not.toHaveAttribute('hidden');
      expect(panels[0]).toHaveAttribute('hidden', '');
    });
  });

  describe('keyboard — horizontal', () => {
    it('ArrowRight moves focus to the next tab and (in automatic mode) activates it', async () => {
      const { container } = await render(HorizontalHost);
      const tabs = screen.getAllByRole('tab');
      tabs[0].focus();
      fireEvent.keyDown(container.querySelector('[kjTabList]')!, { key: 'ArrowRight' });
      expect(tabs[1]).toHaveAttribute('tabindex', '0');
      expect(tabs[0]).toHaveAttribute('tabindex', '-1');
      // Automatic activation: aria-selected updates as focus moves.
      expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
    });

    it('ArrowLeft moves focus to the previous tab', async () => {
      const { container } = await render(HorizontalHost);
      const tabs = screen.getAllByRole('tab');
      tabs[1].focus();
      fireEvent.keyDown(container.querySelector('[kjTabList]')!, { key: 'ArrowLeft' });
      expect(tabs[0]).toHaveAttribute('tabindex', '0');
    });

    it('Home moves focus to the first tab; End to the last', async () => {
      const { container } = await render(HorizontalHost);
      const tabs = screen.getAllByRole('tab');
      tabs[1].focus();
      fireEvent.keyDown(container.querySelector('[kjTabList]')!, { key: 'End' });
      expect(tabs[2]).toHaveAttribute('tabindex', '0');
      fireEvent.keyDown(container.querySelector('[kjTabList]')!, { key: 'Home' });
      expect(tabs[0]).toHaveAttribute('tabindex', '0');
    });
  });

  describe('keyboard — vertical', () => {
    it('ArrowDown moves focus to the next tab in vertical orientation', async () => {
      const { container } = await render(VerticalHost);
      const tabs = screen.getAllByRole('tab');
      tabs[0].focus();
      fireEvent.keyDown(container.querySelector('[kjTabList]')!, { key: 'ArrowDown' });
      expect(tabs[1]).toHaveAttribute('tabindex', '0');
    });

    it('ArrowUp moves focus to the previous tab', async () => {
      const { container } = await render(VerticalHost);
      const tabs = screen.getAllByRole('tab');
      tabs[1].focus();
      fireEvent.keyDown(container.querySelector('[kjTabList]')!, { key: 'ArrowUp' });
      expect(tabs[0]).toHaveAttribute('tabindex', '0');
    });

    it('ArrowRight is ignored in vertical orientation', async () => {
      const { container } = await render(VerticalHost);
      const tabs = screen.getAllByRole('tab');
      tabs[0].focus();
      fireEvent.keyDown(container.querySelector('[kjTabList]')!, { key: 'ArrowRight' });
      expect(tabs[0]).toHaveAttribute('tabindex', '0');
      expect(tabs[1]).toHaveAttribute('tabindex', '-1');
    });
  });

  describe('orientation propagation', () => {
    it('aria-orientation reflects vertical orientation', async () => {
      const { container } = await render(VerticalHost);
      const list = container.querySelector('[kjTabList]')!;
      expect(list).toHaveAttribute('aria-orientation', 'vertical');
      expect(list).toHaveAttribute('data-orientation', 'vertical');
    });

    it('horizontal arrow keys are ignored in vertical orientation (orientation forwarded to roving primitive)', async () => {
      const { container } = await render(VerticalHost);
      const tabs = screen.getAllByRole('tab');
      tabs[0].focus();
      fireEvent.keyDown(container.querySelector('[kjTabList]')!, { key: 'ArrowRight' });
      expect(tabs[1]).toHaveAttribute('tabindex', '-1');
      expect(tabs[0]).toHaveAttribute('tabindex', '0');
    });

    it('vertical arrow keys are ignored in horizontal orientation (orientation forwarded to roving primitive)', async () => {
      const { container } = await render(HorizontalHost);
      const tabs = screen.getAllByRole('tab');
      tabs[0].focus();
      fireEvent.keyDown(container.querySelector('[kjTabList]')!, { key: 'ArrowDown' });
      expect(tabs[1]).toHaveAttribute('tabindex', '-1');
      expect(tabs[0]).toHaveAttribute('tabindex', '0');
    });
  });

  describe('manual activation mode', () => {
    it('arrow keys move focus only; activation requires Enter', async () => {
      const { container, fixture } = await render(ManualHost);
      const tabs = screen.getAllByRole('tab');
      tabs[0].focus();
      fireEvent.keyDown(container.querySelector('[kjTabList]')!, { key: 'ArrowRight' });
      // Focus moved, but the active value did not change.
      expect(tabs[1]).toHaveAttribute('tabindex', '0');
      expect((fixture.componentInstance as ManualHost).active()).toBe('one');

      // Enter on the focused tab activates it.
      fireEvent.keyDown(tabs[1], { key: 'Enter' });
      fixture.detectChanges();
      expect((fixture.componentInstance as ManualHost).active()).toBe('two');
      expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
    });

    it('Space also activates in manual mode', async () => {
      const { fixture } = await render(ManualHost);
      const tabs = screen.getAllByRole('tab');
      fireEvent.keyDown(tabs[1], { key: ' ' });
      fixture.detectChanges();
      expect((fixture.componentInstance as ManualHost).active()).toBe('two');
    });
  });

  describe('lazy panel mount', () => {
    it('panel content renders only after first activation, and stays mounted thereafter', async () => {
      const { fixture, queryByTestId } = await render(HorizontalHost);
      // Initially active = overview.
      expect(queryByTestId('overview-content')).toBeInTheDocument();
      expect(queryByTestId('billing-content')).not.toBeInTheDocument();
      expect(queryByTestId('usage-content')).not.toBeInTheDocument();

      // Activate billing → its content mounts.
      (fixture.componentInstance as HorizontalHost).active.set('billing');
      fixture.detectChanges();
      expect(queryByTestId('billing-content')).toBeInTheDocument();
      // Overview is still mounted (lazy-then-persistent).
      expect(queryByTestId('overview-content')).toBeInTheDocument();

      // Switch back to overview — billing remains mounted.
      (fixture.componentInstance as HorizontalHost).active.set('overview');
      fixture.detectChanges();
      expect(queryByTestId('billing-content')).toBeInTheDocument();
      expect(queryByTestId('usage-content')).not.toBeInTheDocument();
    });
  });

  describe('disabled tab', () => {
    it('disabled tab is not activated by click', async () => {
      const { fixture } = await render(DisabledHost);
      const tabs = screen.getAllByRole('tab');
      fireEvent.click(tabs[1]);
      fixture.detectChanges();
      expect((fixture.componentInstance as DisabledHost).active()).toBe('alpha');
      expect(tabs[1]).toHaveAttribute('aria-disabled', 'true');
    });

    it('disabled tab is skipped when calling next()', async () => {
      const { fixture } = await render(DisabledHost);
      const root = fixture.debugElement.query((d) => !!d.injector.get(KjTabs, null));
      const tabs = root.injector.get(KjTabs);
      tabs.next();
      fixture.detectChanges();
      // Should land on 'gamma', not on 'beta' (disabled).
      expect((fixture.componentInstance as DisabledHost).active()).toBe('gamma');
    });
  });
});
