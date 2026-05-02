import { render } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import {
  KjDialogTrigger, KjDialog, KjDialogOverlay,
  KjDialogTitle, KjDialogClose,
} from './dialog';

expect.extend(toHaveNoViolations);

const imports = [
  KjDialogTrigger, KjDialog, KjDialogOverlay,
  KjDialogTitle, KjDialogClose,
];

describe('KjDialogTrigger', () => {
  it('renders trigger button', async () => {
    const { getByRole } = await render(
      `<button [kjDialogTrigger]="dlg">Open</button>
       <ng-template #dlg>
         <div kjDialogOverlay><div kjDialog><h2 kjDialogTitle>T</h2></div></div>
       </ng-template>`,
      { imports },
    );
    expect(getByRole('button', { name: 'Open' })).toBeInTheDocument();
  });

  it('trigger has aria-haspopup=dialog', async () => {
    const { getByRole } = await render(
      `<button [kjDialogTrigger]="dlg">Open</button>
       <ng-template #dlg>
         <div kjDialogOverlay><div kjDialog><h2 kjDialogTitle>T</h2></div></div>
       </ng-template>`,
      { imports },
    );
    expect(getByRole('button', { name: 'Open' })).toHaveAttribute('aria-haspopup', 'dialog');
  });

  it('trigger has aria-expanded=false initially', async () => {
    const { getByRole } = await render(
      `<button [kjDialogTrigger]="dlg">Open</button>
       <ng-template #dlg>
         <div kjDialogOverlay><div kjDialog><h2 kjDialogTitle>T</h2></div></div>
       </ng-template>`,
      { imports },
    );
    expect(getByRole('button', { name: 'Open' })).toHaveAttribute('aria-expanded', 'false');
  });

  it('passes axe audit on trigger', async () => {
    const { container } = await render(
      `<button [kjDialogTrigger]="dlg">Open dialog</button>
       <ng-template #dlg>
         <div kjDialogOverlay><div kjDialog><h2 kjDialogTitle>Settings</h2></div></div>
       </ng-template>`,
      { imports },
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
