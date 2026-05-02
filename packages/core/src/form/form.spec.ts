import { render } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { KjFormField, KjFormError, KjFormLabel } from './form';

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
});
