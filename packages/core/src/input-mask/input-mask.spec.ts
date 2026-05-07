import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { render } from '@testing-library/angular';
import { describe, expect, it } from 'vitest';

import { compileMask } from './input-mask.compile';
import { MaskEngine } from './input-mask.engine';
import { KjInputMask } from './input-mask';

// ── compileMask ────────────────────────────────────────────────────────────────

describe('compileMask', () => {
  const tokens = { '9': /[0-9]/, 'a': /[A-Za-z]/, '*': /[A-Za-z0-9]/ };

  it('splits a phone mask into literal and variable slots', () => {
    const result = compileMask('(999) 999-9999', tokens);
    expect(result.variableCount).toBe(10);
    expect(result.literalCount).toBe(4);
    expect(result.slots[0]).toEqual({ kind: 'literal', char: '(' });
    expect(result.slots[1]).toMatchObject({ kind: 'variable', tokenId: '9' });
  });

  it('treats unknown token chars as literals', () => {
    const result = compileMask('X99', tokens);
    // X not in tokens → literal
    expect(result.slots[0]).toEqual({ kind: 'literal', char: 'X' });
    expect(result.slots[1]).toMatchObject({ kind: 'variable' });
    expect(result.slots[2]).toMatchObject({ kind: 'variable' });
    expect(result.variableCount).toBe(2);
  });

  it('handles escape syntax: \\9 → literal 9', () => {
    const result = compileMask('\\99', tokens);
    expect(result.slots[0]).toEqual({ kind: 'literal', char: '9' });
    expect(result.slots[1]).toMatchObject({ kind: 'variable', tokenId: '9' });
    expect(result.variableCount).toBe(1);
  });

  it('handles all-literal mask', () => {
    const result = compileMask('---', tokens);
    expect(result.variableCount).toBe(0);
    expect(result.literalCount).toBe(3);
  });

  it('builds variableIndices correctly', () => {
    // '9-9' → slot 0: variable, slot 1: literal, slot 2: variable
    const result = compileMask('9-9', tokens);
    expect(result.variableIndices).toEqual([0, 2]);
  });

  it('handles repeated escape sequences', () => {
    const result = compileMask('\\9\\9', tokens);
    expect(result.variableCount).toBe(0);
    expect(result.slots).toEqual([
      { kind: 'literal', char: '9' },
      { kind: 'literal', char: '9' },
    ]);
  });

  it('handles custom tokens', () => {
    const customTokens = { H: /[0-9A-Fa-f]/ };
    const result = compileMask('#HHHHHH', customTokens);
    expect(result.slots[0]).toEqual({ kind: 'literal', char: '#' });
    expect(result.variableCount).toBe(6);
    const slot = result.slots[1] as Extract<(typeof result.slots)[0], { kind: 'variable' }>;
    expect(slot.re.test('A')).toBe(true);
    expect(slot.re.test('G')).toBe(false);
  });
});

// ── MaskEngine ─────────────────────────────────────────────────────────────────

describe('MaskEngine.reconstructFromRaw', () => {
  const tokens = { '9': /[0-9]/, 'a': /[A-Za-z]/, '*': /[A-Za-z0-9]/ };

  function makeEngine(mask: string, options?: { mode?: 'unmasked' | 'masked'; slotChar?: string }) {
    let _value = '';
    let _caret = 0;
    let _emitted = '';

    const compiled = compileMask(mask, tokens);
    const engine = new MaskEngine({
      getCompiled: () => compiled,
      getSlotChar: () => options?.slotChar ?? '_',
      getMaskMode: () => options?.mode ?? 'unmasked',
      callbacks: {
        getValue: () => _value,
        setValue: (v) => { _value = v; },
        getCaret: () => _caret,
        setCaret: (p) => { _caret = p; },
        notifyChange: (v) => { _emitted = v; },
      },
    });

    return { engine, getValue: () => _value, getCaret: () => _caret, getEmitted: () => _emitted };
  }

  it('reconstructs phone from raw digits', () => {
    const { engine, getValue } = makeEngine('(999) 999-9999');
    engine.applyRawValue('4155551234');
    expect(getValue()).toBe('(415) 555-1234');
  });

  it('reconstructs partial raw value', () => {
    const { engine, getValue } = makeEngine('(999) 999-9999');
    engine.applyRawValue('415');
    expect(getValue()).toBe('(415) ___-____');
  });

  it('emits unmasked value by default', () => {
    const { engine, getEmitted } = makeEngine('(999) 999-9999');
    engine.applyRawValue('4155551234');
    expect(getEmitted()).toBe('4155551234');
  });

  it('emits masked value when mode is masked', () => {
    const { engine, getEmitted } = makeEngine('(999) 999-9999', { mode: 'masked' });
    engine.applyRawValue('4155551234');
    expect(getEmitted()).toBe('(415) 555-1234');
  });

  it('strips non-matching chars from raw (forgiving intake)', () => {
    const { engine, getValue } = makeEngine('(999) 999-9999');
    engine.applyRawValue('(415) 555-1234');
    expect(getValue()).toBe('(415) 555-1234');
  });
});

describe('MaskEngine keyboard interactions', () => {
  const tokens = { '9': /[0-9]/, 'a': /[A-Za-z]/, '*': /[A-Za-z0-9]/ };

  function makeEngine(mask: string) {
    let _value = '(___) ___-____';
    let _caret = 1; // starts after '('
    let _emitted = '';

    const compiled = compileMask(mask, tokens);
    // Initialise display
    const slotChar = '_';
    _value = compiled.slots
      .map(s => s.kind === 'literal' ? s.char : slotChar)
      .join('');

    const engine = new MaskEngine({
      getCompiled: () => compiled,
      getSlotChar: () => slotChar,
      getMaskMode: () => 'unmasked',
      callbacks: {
        getValue: () => _value,
        setValue: (v) => { _value = v; },
        getCaret: () => _caret,
        setCaret: (p) => { _caret = p; },
        notifyChange: (v) => { _emitted = v; },
      },
    });

    const key = (k: string) => {
      engine.onKeydown(new KeyboardEvent('keydown', { key: k }));
    };

    return { engine, getValue: () => _value, getCaret: () => _caret, getEmitted: () => _emitted, key, setCaret: (p: number) => { _caret = p; } };
  }

  it('types a digit into the first variable slot', () => {
    const { key, getValue, getEmitted } = makeEngine('(999) 999-9999');
    // caret = 1 (first variable slot after '(')
    key('4');
    expect(getValue()[1]).toBe('4');
    expect(getEmitted()).toBe('4');
  });

  it('rejects a non-matching character', () => {
    const { key, getValue } = makeEngine('(999) 999-9999');
    key('A'); // not a digit
    expect(getValue()[1]).toBe('_');
  });

  it('backspace clears the previous variable slot', () => {
    const s = makeEngine('(999) 999-9999');
    s.key('4');
    s.setCaret(2); // move to after slot 1
    s.key('Backspace');
    expect(s.getValue()[1]).toBe('_');
  });
});

describe('MaskEngine paste', () => {
  const tokens = { '9': /[0-9]/ };

  function makeEngine(mask: string) {
    let _value = '';
    let _caret = 0;

    const compiled = compileMask(mask, tokens);
    _value = compiled.slots
      .map(s => s.kind === 'literal' ? s.char : '_')
      .join('');

    const engine = new MaskEngine({
      getCompiled: () => compiled,
      getSlotChar: () => '_',
      getMaskMode: () => 'unmasked',
      callbacks: {
        getValue: () => _value,
        setValue: (v) => { _value = v; },
        getCaret: () => _caret,
        setCaret: (p) => { _caret = p; },
        notifyChange: () => {},
      },
    });

    return { engine, getValue: () => _value };
  }

  it('pastes digits filling the mask', () => {
    const { engine, getValue } = makeEngine('9999');
    const event = {
      preventDefault: () => {},
      clipboardData: { getData: () => '1234' },
    } as unknown as ClipboardEvent;
    engine.onPaste(event);
    expect(getValue()).toBe('1234');
  });

  it('strips non-digit characters from paste', () => {
    const { engine, getValue } = makeEngine('9999');
    const event = {
      preventDefault: () => {},
      clipboardData: { getData: () => '12-34' },
    } as unknown as ClipboardEvent;
    engine.onPaste(event);
    expect(getValue()).toBe('1234');
  });
});

// ── KjInputMask directive ─────────────────────────────────────────────────────

describe('KjInputMask directive', () => {
  it('renders with type="text"', async () => {
    const { container } = await render(
      `<input kjInputMask kjMask="(999) 999-9999" />`,
      { imports: [KjInputMask] },
    );
    expect(container.querySelector('input')!.getAttribute('type')).toBe('text');
  });

  it('sets inputmode=numeric for all-digit mask', async () => {
    const { container } = await render(
      `<input kjInputMask kjMask="9999" />`,
      { imports: [KjInputMask] },
    );
    expect(container.querySelector('input')!.getAttribute('inputmode')).toBe('numeric');
  });

  it('sets inputmode=text for mixed mask', async () => {
    const { container } = await render(
      `<input kjInputMask kjMask="aaa-999" />`,
      { imports: [KjInputMask] },
    );
    expect(container.querySelector('input')!.getAttribute('inputmode')).toBe('text');
  });

  it('sets placeholder from mask with slot chars', async () => {
    const { container } = await render(
      `<input kjInputMask kjMask="(999) 999-9999" />`,
      { imports: [KjInputMask] },
    );
    expect(container.querySelector('input')!.getAttribute('placeholder')).toBe(
      '(___) ___-____',
    );
  });

  it('emits mask validation error when partially filled', async () => {
    const ctrl = new FormControl('415');
    @Component({
      standalone: true,
      imports: [KjInputMask, ReactiveFormsModule],
      template: `<input kjInputMask kjMask="(999) 999-9999" [formControl]="ctrl" />`,
    })
    class Host {
      ctrl = ctrl;
    }
    await render(Host);
    // The mask validator should detect partial fill
    // raw='415' = 3 chars out of 10 required
    expect(ctrl.errors?.['mask']).toBeDefined();
    expect(ctrl.errors?.['mask'].required).toBe(10);
  });

  it('returns null validator error when empty (required handles it)', async () => {
    const ctrl = new FormControl('', [Validators.required]);
    @Component({
      standalone: true,
      imports: [KjInputMask, ReactiveFormsModule],
      template: `<input kjInputMask kjMask="(999) 999-9999" [formControl]="ctrl" />`,
    })
    class Host {
      ctrl = ctrl;
    }
    await render(Host);
    expect(ctrl.errors?.['mask']).toBeUndefined();
    expect(ctrl.errors?.['required']).toBeDefined();
  });
});
