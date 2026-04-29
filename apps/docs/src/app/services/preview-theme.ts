/** The 3 visual style themes available in the docs preview. */
export type PreviewTheme = 'default' | 'retro' | 'finance';

export const PREVIEW_THEMES: { value: PreviewTheme; label: string; description: string }[] = [
  { value: 'default', label: 'Default', description: 'Minimal, editorial' },
  { value: 'retro',   label: 'Retro',   description: 'Warm, vintage' },
  { value: 'finance', label: 'Finance', description: 'Sharp, professional' },
];
