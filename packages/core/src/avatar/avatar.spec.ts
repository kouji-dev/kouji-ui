import { render } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { KjAvatar, KjAvatarImage, KjAvatarFallback } from './avatar';

expect.extend(toHaveNoViolations);

const imports = [KjAvatar, KjAvatarImage, KjAvatarFallback];

describe('KjAvatar', () => {
  it('renders container', async () => {
    const { container } = await render(`<span kjAvatar><img kjAvatarImage src="" alt="JD" /><span kjAvatarFallback>JD</span></span>`, { imports });
    expect(container.querySelector('[kjAvatar]')).toBeInTheDocument();
  });
  it('passes axe audit', async () => {
    const { container } = await render(`<span kjAvatar><img kjAvatarImage src="/p.jpg" alt="Jane Doe" /><span kjAvatarFallback aria-hidden="true">JD</span></span>`, { imports });
    expect(await axe(container)).toHaveNoViolations();
  });
});
