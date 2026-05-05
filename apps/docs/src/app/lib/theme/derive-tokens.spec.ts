import { deriveContent, deriveBaseShades, deriveTokens } from './derive-tokens';
import type { DraftTheme } from './types';

describe('deriveContent', () => {
  test('light slot (L > 60) → dark content', () => {
    const c = deriveContent('oklch(98% 0.002 247)');
    expect(c).toMatch(/^oklch\(15%/);
  });

  test('dark slot (L ≤ 60) → light content', () => {
    const c = deriveContent('oklch(20% 0.05 250)');
    expect(c).toMatch(/^oklch\(98%/);
  });

  test('hue is inherited from slot', () => {
    const c = deriveContent('oklch(50% 0.2 145)');
    expect(c).toContain('145');
  });
});

describe('deriveBaseShades', () => {
  test('light base → darker 200/300', () => {
    const { base200, base300 } = deriveBaseShades('oklch(98% 0.002 247)');
    expect(base200).toMatch(/^oklch\(94%/);
    expect(base300).toMatch(/^oklch\(90%/);
  });

  test('dark base → lighter 200/300', () => {
    const { base200, base300 } = deriveBaseShades('oklch(15% 0.01 0)');
    expect(base200).toMatch(/^oklch\(19%/);
    expect(base300).toMatch(/^oklch\(23%/);
  });
});

describe('deriveTokens — content overrides', () => {
  test('manual override wins over derivation', () => {
    const draft: DraftTheme = MOCK_DRAFT();
    draft.contentOverrides['primary-content'] = 'oklch(50% 0.1 0)';
    const out = deriveTokens(draft);
    expect(out.contents['primary-content']).toBe('oklch(50% 0.1 0)');
  });

  test('without override, content is derived from slot', () => {
    const draft = MOCK_DRAFT();
    draft.colors.primary = 'oklch(95% 0.05 240)';
    const out = deriveTokens(draft);
    expect(out.contents['primary-content']).toMatch(/^oklch\(15%/);
  });
});

function MOCK_DRAFT(): DraftTheme {
  return {
    name: 'test',
    colors: {
      'base-100':    'oklch(98% 0.002 247)',
      'primary':     'oklch(57% 0.245 27)',
      'secondary':   'oklch(44% 0.03 256)',
      'accent':      'oklch(60% 0.12 184)',
      'neutral':     'oklch(44% 0.03 256)',
      'info':        'oklch(54% 0.245 262)',
      'success':     'oklch(64% 0.2 131)',
      'warning':     'oklch(66% 0.179 58)',
      'destructive': 'oklch(57% 0.245 27)',
    },
    contentOverrides: {},
    shape:  { radiusBox: 8, radiusField: 4, radiusSelector: 4, border: 1, depth: 1 },
    type:   { fontSans: 'system-ui', fontMono: 'monospace', fontDisplay: 'system-ui' },
    motion: { transition: '0.2s ease' },
  };
}
