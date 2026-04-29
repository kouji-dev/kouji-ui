import { render, fireEvent } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { KjTabsDirective, KjTabListDirective, KjTabDirective, KjTabPanelDirective } from './tabs.directive';

expect.extend(toHaveNoViolations);

const imports = [KjTabsDirective, KjTabListDirective, KjTabDirective, KjTabPanelDirective];
const template = `
  <div kjTabs [kjTabsValue]="'tab1'">
    <div kjTabList aria-label="Demo tabs">
      <button kjTab [kjTabValue]="'tab1'">Tab 1</button>
      <button kjTab [kjTabValue]="'tab2'">Tab 2</button>
    </div>
    <div kjTabPanel [kjPanelFor]="'tab1'">Content 1</div>
    <div kjTabPanel [kjPanelFor]="'tab2'">Content 2</div>
  </div>`;

describe('KjTabsDirective', () => {
  it('active tab has aria-selected=true', async () => {
    const { getAllByRole } = await render(template, { imports });
    expect(getAllByRole('tab')[0]).toHaveAttribute('aria-selected', 'true');
    expect(getAllByRole('tab')[1]).toHaveAttribute('aria-selected', 'false');
  });

  it('inactive panel is hidden', async () => {
    const { getByText } = await render(template, { imports });
    expect(getByText('Content 2').closest('[kjTabPanel]')).toHaveAttribute('hidden', '');
  });

  it('clicking a tab activates it', async () => {
    const { getAllByRole } = await render(template, { imports });
    fireEvent.click(getAllByRole('tab')[1]);
    expect(getAllByRole('tab')[1]).toHaveAttribute('aria-selected', 'true');
  });

  it('passes axe audit', async () => {
    const { container } = await render(template, { imports });
    expect(await axe(container)).toHaveNoViolations();
  });
});
