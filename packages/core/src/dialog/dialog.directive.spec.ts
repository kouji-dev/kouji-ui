import { render, fireEvent } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { KjDialogDirective, KjDialogTriggerDirective, KjDialogContentDirective } from './dialog.directive';

expect.extend(toHaveNoViolations);

const imports = [KjDialogDirective, KjDialogTriggerDirective, KjDialogContentDirective];

describe('KjDialogDirective', () => {
  it('trigger button renders', async () => {
    const { getByRole } = await render(
      `<div kjDialog>
        <button kjDialogTrigger>Open</button>
        <ng-template kjDialogContent>
          <div role="dialog" aria-label="Test" aria-modal="true"><button>Close</button></div>
        </ng-template>
      </div>`,
      { imports },
    );
    expect(getByRole('button', { name: 'Open' })).toBeInTheDocument();
  });

  it('trigger has aria-haspopup=dialog', async () => {
    const { getByRole } = await render(
      `<div kjDialog>
        <button kjDialogTrigger>Open</button>
        <ng-template kjDialogContent>
          <div role="dialog" aria-label="T" aria-modal="true"></div>
        </ng-template>
      </div>`,
      { imports },
    );
    expect(getByRole('button', { name: 'Open' })).toHaveAttribute('aria-haspopup', 'dialog');
  });

  it('trigger has aria-expanded=false initially', async () => {
    const { getByRole } = await render(
      `<div kjDialog>
        <button kjDialogTrigger>Open</button>
        <ng-template kjDialogContent>
          <div role="dialog" aria-label="T" aria-modal="true"></div>
        </ng-template>
      </div>`,
      { imports },
    );
    expect(getByRole('button', { name: 'Open' })).toHaveAttribute('aria-expanded', 'false');
  });

  it('passes axe audit', async () => {
    const { container } = await render(
      `<div kjDialog>
        <button kjDialogTrigger>Open dialog</button>
        <ng-template kjDialogContent>
          <div role="dialog" aria-label="Settings" aria-modal="true"></div>
        </ng-template>
      </div>`,
      { imports },
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
