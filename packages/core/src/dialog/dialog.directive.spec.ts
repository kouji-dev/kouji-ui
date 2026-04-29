import { render, fireEvent } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { KjDialogDirective, KjDialogTriggerDirective, KjDialogContentDirective } from './dialog.directive';

expect.extend(toHaveNoViolations);
const imports = [KjDialogDirective, KjDialogTriggerDirective, KjDialogContentDirective];
const template = `<div kjDialog><button kjDialogTrigger>Open</button><div kjDialogContent role="dialog" aria-label="Test" aria-modal="true"><button>Close</button></div></div>`;

describe('KjDialogDirective', () => {
  it('content hidden by default', async () => {
    const { container } = await render(template, { imports });
    expect(container.querySelector('[kjDialogContent]')).toHaveAttribute('hidden', '');
  });
  it('trigger opens dialog', async () => {
    const { container } = await render(template, { imports });
    fireEvent.click(container.querySelector('[kjDialogTrigger]')!);
    expect(container.querySelector('[kjDialogContent]')).not.toHaveAttribute('hidden');
  });
  it('Escape closes dialog', async () => {
    const { container } = await render(template, { imports });
    fireEvent.click(container.querySelector('[kjDialogTrigger]')!);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(container.querySelector('[kjDialogContent]')).toHaveAttribute('hidden', '');
  });
  it('trigger has aria-expanded', async () => {
    const { container } = await render(template, { imports });
    expect(container.querySelector('[kjDialogTrigger]')).toHaveAttribute('aria-expanded', 'false');
  });
  it('passes axe audit when closed', async () => {
    const { container } = await render(template, { imports });
    expect(await axe(container)).toHaveNoViolations();
  });
});
