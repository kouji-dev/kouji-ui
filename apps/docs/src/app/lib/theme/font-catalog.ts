export interface CuratedFont {
  id: string;
  family: string;            // CSS font-family value (single name, no fallbacks)
  category: 'sans' | 'mono' | 'display' | 'serif';
  /** Google Fonts CSS2 query string after `family=`. Empty = system/built-in. */
  query: string;
}

export const CURATED_FONTS: readonly CuratedFont[] = [
  // sans
  { id: 'inter',          family: 'Inter',           category: 'sans',    query: 'family=Inter:wght@400;500;600;700' },
  { id: 'roboto',         family: 'Roboto',          category: 'sans',    query: 'family=Roboto:wght@400;500;700' },
  { id: 'manrope',        family: 'Manrope',         category: 'sans',    query: 'family=Manrope:wght@400;600;700' },
  { id: 'outfit',         family: 'Outfit',          category: 'sans',    query: 'family=Outfit:wght@400;600;700' },
  { id: 'geist',          family: 'Geist',           category: 'sans',    query: 'family=Geist:wght@400;600;700' },
  { id: 'plex-sans',      family: 'IBM Plex Sans',   category: 'sans',    query: 'family=IBM+Plex+Sans:wght@400;600' },
  { id: 'space-grotesk',  family: 'Space Grotesk',   category: 'sans',    query: 'family=Space+Grotesk:wght@400;600' },
  { id: 'figtree',        family: 'Figtree',         category: 'sans',    query: 'family=Figtree:wght@400;600' },
  // mono
  { id: 'jetbrains-mono', family: 'JetBrains Mono',  category: 'mono',    query: 'family=JetBrains+Mono:wght@400;600' },
  { id: 'fira-mono',      family: 'Fira Mono',       category: 'mono',    query: 'family=Fira+Mono:wght@400;700' },
  { id: 'plex-mono',      family: 'IBM Plex Mono',   category: 'mono',    query: 'family=IBM+Plex+Mono:wght@400;600' },
  { id: 'space-mono',     family: 'Space Mono',      category: 'mono',    query: 'family=Space+Mono:wght@400;700' },
  // display
  { id: 'syne',           family: 'Syne',            category: 'display', query: 'family=Syne:wght@600;700;800' },
  { id: 'fraunces',       family: 'Fraunces',        category: 'display', query: 'family=Fraunces:wght@600;700' },
  { id: 'playfair',       family: 'Playfair Display',category: 'display', query: 'family=Playfair+Display:wght@600;700' },
  { id: 'lora',           family: 'Lora',            category: 'display', query: 'family=Lora:wght@600;700' },
  // serif
  { id: 'plex-serif',     family: 'IBM Plex Serif',  category: 'serif',   query: 'family=IBM+Plex+Serif:wght@400;600' },
  { id: 'georgia',        family: 'Georgia',         category: 'serif',   query: '' },
  // generic
  { id: 'system-ui',      family: 'system-ui',       category: 'sans',    query: '' },
  { id: 'monospace',      family: 'monospace',       category: 'mono',    query: '' },
];
