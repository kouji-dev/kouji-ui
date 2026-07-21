import { FormControl, FormGroup, Validators } from '@angular/forms';
import { describe, expect, test } from 'vitest';
import { kjApplyServerErrors, kjServerErrorsOf } from './server-errors';

function makeForm(): FormGroup {
  return new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    name: new FormControl('', { nonNullable: true }),
    address: new FormGroup({
      street: new FormControl('', { nonNullable: true }),
    }),
  });
}

describe('kjApplyServerErrors', () => {
  test('sets server errors on matching controls and marks them touched', () => {
    const form = makeForm();
    const unmatched = kjApplyServerErrors(form, {
      email: 'E-mail invalide',
      name: ['Trop court', 'Caractères interdits'],
    });
    expect(unmatched).toEqual([]);
    expect(form.get('email')!.errors).toMatchObject({ server: ['E-mail invalide'] });
    expect(form.get('name')!.errors).toEqual({ server: ['Trop court', 'Caractères interdits'] });
    expect(form.get('email')!.touched).toBe(true);
    expect(form.get('email')!.invalid).toBe(true);
  });

  test('merges with existing validator errors instead of replacing them', () => {
    const form = makeForm();
    form.get('email')!.markAsTouched();
    form.get('email')!.updateValueAndValidity();
    kjApplyServerErrors(form, { email: 'Déjà utilisé' });
    expect(form.get('email')!.errors).toMatchObject({
      required: true,
      server: ['Déjà utilisé'],
    });
  });

  test('reaches nested controls via dotted paths', () => {
    const form = makeForm();
    kjApplyServerErrors(form, { 'address.street': 'Rue inconnue' });
    expect(form.get('address.street')!.errors).toEqual({ server: ['Rue inconnue'] });
  });

  test('returns unmatched paths and empty-message paths', () => {
    const form = makeForm();
    const unmatched = kjApplyServerErrors(form, { nope: 'Message', email: [] });
    expect(unmatched).toEqual(['nope', 'email']);
    // Only the control's own validator errors remain — no server key was set.
    expect(form.get('email')!.errors).toEqual({ required: true });
  });

  test('honours errorKey and markTouched options', () => {
    const form = makeForm();
    kjApplyServerErrors(form, { name: 'Invalide' }, { errorKey: 'backend', markTouched: false });
    expect(form.get('name')!.errors).toEqual({ backend: ['Invalide'] });
    expect(form.get('name')!.touched).toBe(false);
  });

  test('server error clears when the control revalidates on user edit', () => {
    const form = makeForm();
    kjApplyServerErrors(form, { name: 'Pris' });
    expect(form.get('name')!.invalid).toBe(true);
    form.get('name')!.setValue('new value');
    expect(form.get('name')!.errors).toBeNull();
  });
});

describe('kjServerErrorsOf', () => {
  test('reads messages set by kjApplyServerErrors, null otherwise', () => {
    const form = makeForm();
    expect(kjServerErrorsOf(form.get('email'))).toBeNull();
    kjApplyServerErrors(form, { email: 'E-mail invalide' });
    expect(kjServerErrorsOf(form.get('email'))).toEqual(['E-mail invalide']);
    expect(kjServerErrorsOf(null)).toBeNull();
  });
});
