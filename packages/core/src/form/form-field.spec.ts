import { render } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { KjFormField, KjFormError, KjFormLabel } from './form-field';

expect.extend(toHaveNoViolations);
const imports = [KjFormField, KjFormError, KjFormLabel];

describe('KjFormField', () => {
  it('sets data-invalid when invalid', async () => {
    const { container } = await render(`<div kjFormField [kjFieldInvalid]="true"><label kjFormLabel for="f">Name</label><input id="f" /><span kjFormError>Required</span></div>`, { imports });
    expect(container.querySelector('[kjFormField]')).toHaveAttribute('data-invalid', '');
  });
  it('error visible when invalid', async () => {
    const { getByText } = await render(`<div kjFormField [kjFieldInvalid]="true"><label kjFormLabel for="f">Name</label><input id="f" /><span kjFormError>Required</span></div>`, { imports });
    expect(getByText('Required')).not.toHaveAttribute('hidden');
  });
  it('error hidden when valid', async () => {
    const { getByText } = await render(`<div kjFormField [kjFieldInvalid]="false"><label kjFormLabel for="f">Name</label><input id="f" /><span kjFormError>Required</span></div>`, { imports });
    expect(getByText('Required').closest('[kjFormError]')).toHaveAttribute('hidden', '');
  });
  it('passes axe audit', async () => {
    const { container } = await render(`<div kjFormField [kjFieldInvalid]="false"><label kjFormLabel for="e">Email</label><input id="e" type="email" /></div>`, { imports });
    expect(await axe(container)).toHaveNoViolations();
  });

  // arch F-2 — the bare attribute form used to bind '' and stay false.
  it('kjFieldInvalid reflects from the bare attribute form', async () => {
    const { container } = await render(
      `<div kjFormField kjFieldInvalid><label kjFormLabel for="e">Email</label><input id="e" /><span kjFormError>Bad</span></div>`,
      { imports },
    );
    expect(container.querySelector('[kjFormField]')).toHaveAttribute('data-invalid', '');
    expect(container.querySelector('[kjFormError]')).not.toHaveAttribute('hidden');
  });
});
