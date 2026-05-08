export type KjLivePoliteness = 'polite' | 'assertive';

const SR_ONLY_STYLE = `
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`;

const regions: Partial<Record<KjLivePoliteness, HTMLElement>> = {};

const ensureRegion = (politeness: KjLivePoliteness): HTMLElement => {
  let region = regions[politeness];
  if (region) return region;
  region = document.createElement('div');
  region.setAttribute('data-kj-live-region', politeness);
  region.setAttribute('aria-live', politeness);
  region.setAttribute('aria-atomic', 'true');
  region.style.cssText = SR_ONLY_STYLE;
  document.body.appendChild(region);
  regions[politeness] = region;
  return region;
};

export const announce = (message: string, politeness: KjLivePoliteness = 'polite'): void => {
  if (typeof document === 'undefined') return;
  const region = ensureRegion(politeness);
  region.textContent = '';
  requestAnimationFrame(() => { region.textContent = message; });
};
