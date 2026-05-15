import {
  Component,
  ChangeDetectionStrategy,
  DestroyRef,
  HostListener,
  PLATFORM_ID,
  ViewEncapsulation,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  KjAccordionComponent,
  KjAccordionContentComponent,
  KjAccordionItemComponent,
  KjBadgeComponent,
  KjButtonComponent,
  KjCardComponent,
  KjInputComponent,
  KjProgressBarComponent,
  KjTabComponent,
  KjTabListComponent,
  KjTabPanelComponent,
  KjTabsComponent,
  KjTagComponent,
  KjToggleComponent,
} from '@kouji-ui/components';
import { KjAriaLabelledBy, KjVisuallyHidden } from '@kouji-ui/core';
import { ClipboardService } from '../../services/clipboard.service';
import { AVAILABLE_THEMES, Theme, ThemeService } from '../../services/theme.service';
import { DocsService } from '../../services/docs.service';
import { KjThemeFigure } from './theme-figures';
import corePackage from '../../../../../../packages/core/package.json';

/** Theme metadata for the chip grid — keyed by the `data-theme` attribute. */
interface ThemeMeta {
  readonly id: Theme;
  /** Representative accent color — used as the swatch fill. */
  readonly swatch: string;
  /** Short editorial note shown next to the active pill. */
  readonly note: string;
}

/** Order mirrors `AVAILABLE_THEMES`. Swatches sampled from each theme's primary. */
const THEME_META: readonly ThemeMeta[] = [
  { id: 'kouji',     swatch: '#b8f500', note: 'brutalist near-black + lime, JetBrains Mono' },
  { id: 'dark',      swatch: '#4a7dff', note: 'cobalt mono — charcoal + cobalt blue' },
  { id: 'light',     swatch: '#d6a300', note: 'paper / ink — white + goldenrod' },
  { id: 'retro',     swatch: '#c84a2e', note: 'warm cream, terracotta + slate' },
  { id: 'cyberpunk', swatch: '#d80027', note: 'electric yellow body, crimson + violet' },
  { id: 'corporate', swatch: '#0a2540', note: 'off-white + deep navy' },
  { id: 'sakura',    swatch: '#c8265e', note: 'washi paper + cherry magenta' },
  { id: 'bauhaus',   swatch: '#d83b2e', note: 'primary blocks on cream, hard shadows' },
  { id: 'dune',      swatch: '#b54a25', note: 'desert coral + deep indigo text' },
  { id: 'mint',      swatch: '#1f7a4e', note: 'fresh herbal greens + crisp white' },
  { id: 'forest',    swatch: '#d4a017', note: 'moss & pine + mustard-gold' },
  { id: 'nord',      swatch: '#88c0d0', note: 'arctic polar-night, frost teal' },
  { id: 'terminal',  swatch: '#33ff66', note: 'pure black + phosphor green, CRT' },
];

/** Marquee feature strip — short, all-lowercase claims. */
const MARQUEE_ITEMS: readonly string[] = [
  'angular 21+', 'standalone', 'ssr ready', 'a11y first',
  '13 themes', 'design tokens', 'tree-shakable', 'typed events',
  'no peer hell', 'rtl friendly', 'framework-agnostic css',
];

/** FAQ entries — opinionated, short answers in the kouji voice. */
const FAQ_DATA: ReadonlyArray<{ value: string; q: string; a: string }> = [
  {
    value: 'what',
    q: 'what is kouji ui, exactly?',
    a: 'a small, opinionated angular component library. standalone components, ssr-safe by default, accessibility baked into every primitive, and a token system that lets the same components wear 13 (or your own) different skins.',
  },
  {
    value: 'themes',
    q: 'do i have to use all the themes?',
    a: 'no. ship with just one — or ship with all 13 and let your users pick. themes are tree-shakable; you only bundle what you import. you can also fork a theme by overriding tokens in your own css.',
  },
  {
    value: 'ssr',
    q: 'is it ssr / hydration safe?',
    a: 'yes. components avoid window/document at module scope, theme tokens resolve via css variables (no flash), and every interactive component has deterministic ids you control. tested against angular universal.',
  },
  {
    value: 'a11y',
    q: 'what about accessibility?',
    a: 'every interactive component is keyboard navigable, screen-reader labelled, respects prefers-reduced-motion, and ships axe-clean by default. focus rings are visible, never aesthetic-only.',
  },
  {
    value: 'byo-theme',
    q: 'can i bring my own theme?',
    a: 'of course. a theme is ~25 css variables — colors, radii, shadows, font stacks. there is a token generator in the docs that takes a few hex values and gives you a ready-made theme file.',
  },
  {
    value: 'name',
    q: "why the name 'kouji'?",
    a: 'it sounded good. that is the whole story.',
  },
];

/**
 * Landing page. Showcases the theme system by rendering a hero, a live demo
 * grid of `kj-*` components, an install block, and a FAQ accordion — all of
 * which restyle the moment a different theme is picked from the swatch grid
 * or cycled via the left/right arrow keys.
 */
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    KjAccordionComponent,
    KjAccordionContentComponent,
    KjAccordionItemComponent,
    KjAriaLabelledBy,
    KjBadgeComponent,
    KjButtonComponent,
    KjCardComponent,
    KjInputComponent,
    KjProgressBarComponent,
    KjTabComponent,
    KjTabListComponent,
    KjTabPanelComponent,
    KjTabsComponent,
    KjTagComponent,
    KjThemeFigure,
    KjToggleComponent,
    KjVisuallyHidden,
  ],
  templateUrl: './home.html',
  styleUrl: './home.css',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {
  private readonly themeService = inject(ThemeService);
  private readonly docs = inject(DocsService);
  private readonly clipboard = inject(ClipboardService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);

  /** Static metadata referenced in the template. */
  protected readonly themes = THEME_META;
  protected readonly marqueeItems = MARQUEE_ITEMS;
  /** Doubled track so the CSS marquee loops seamlessly. */
  protected readonly marqueeTrack: readonly string[] = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS];
  protected readonly faq = FAQ_DATA;

  /** Active theme id (mirrors `ThemeService.theme`). */
  protected readonly currentTheme = this.themeService.theme;
  /** 1-based index, padded to "01 / 13". */
  protected readonly themePosition = computed(() => {
    const idx = AVAILABLE_THEMES.indexOf(this.currentTheme());
    const pos = idx >= 0 ? idx + 1 : 1;
    return `${String(pos).padStart(2, '0')} / ${String(AVAILABLE_THEMES.length).padStart(2, '0')}`;
  });
  /** Editorial note for the active theme — shown next to the pill. */
  protected readonly themeNote = computed(
    () => THEME_META.find(t => t.id === this.currentTheme())?.note ?? '',
  );

  // ── Hero install command ──────────────────────────────────────────────
  protected readonly installCmd = 'pnpm add @kouji-ui/core @angular/cdk';
  protected readonly copied = signal(false);

  // ── Showcase demo state ───────────────────────────────────────────────
  protected readonly showcaseTab = signal<string>('preview');
  protected readonly demoName = signal('');
  protected readonly demoEmail = signal('');
  protected readonly notify = signal(true);
  protected readonly sound = signal(false);
  protected readonly autosave = signal(true);
  protected readonly progress = signal(64);

  // ── Stats — sourced from the manifest + core package metadata ────────
  protected readonly angularMajor = /(\d+)/.exec(
    corePackage.peerDependencies['@angular/core'] ?? '',
  )?.[1] ?? '21';
  protected readonly componentCount = computed(() => this.docs.pages().length);

  /** "kouji" glyphs, declared once so the wordmark re-mounts when needed. */
  protected readonly wordmarkGlyphs: ReadonlyArray<{ char: string; accent: boolean }> = [
    { char: 'k', accent: false },
    { char: 'o', accent: false },
    { char: 'u', accent: true },
    { char: 'j', accent: false },
    { char: 'i', accent: false },
  ];

  constructor() {
    afterNextRender(() => {
      if (!isPlatformBrowser(this.platformId)) return;

      // Tick the progress bar so the showcase looks alive. Bounded to a
      // reasonable range so the bar never visually pegs to 0 or 100.
      const id = setInterval(() => {
        const next = this.progress() + (Math.random() > 0.5 ? 5 : -3);
        this.progress.set(Math.max(20, Math.min(96, next)));
      }, 1800);
      this.destroyRef.onDestroy(() => clearInterval(id));
    });
  }

  /** Select a theme via the swatch chip grid. */
  protected selectTheme(id: Theme): void {
    this.themeService.set(id);
  }

  /** Random non-current theme — wired to the "surprise me" CTA. */
  protected shuffleTheme(): void {
    const current = this.currentTheme();
    let next: Theme = current;
    while (next === current) {
      const i = Math.floor(Math.random() * AVAILABLE_THEMES.length);
      next = AVAILABLE_THEMES[i];
    }
    this.themeService.set(next);
  }

  /**
   * Keyboard theme cycling — ArrowLeft / ArrowRight on the page.
   *
   * Ignores key events that originate inside form fields so typing in the
   * showcase inputs doesn't accidentally swap themes. Listens on `window`
   * (not the host) so the binding works even when focus is on the topbar
   * outside this component's DOM.
   */
  @HostListener('window:keydown', ['$event'])
  protected onWindowKey(event: KeyboardEvent): void {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;

    const target = event.target as HTMLElement | null;
    const tag = target?.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
    if (target?.isContentEditable) return;

    event.preventDefault();
    const idx = AVAILABLE_THEMES.indexOf(this.currentTheme());
    const delta = event.key === 'ArrowRight' ? 1 : -1;
    const nextIdx = (idx + delta + AVAILABLE_THEMES.length) % AVAILABLE_THEMES.length;
    this.themeService.set(AVAILABLE_THEMES[nextIdx]);
  }

  /** Copy the install command and show a transient "copied" state. */
  protected async onCopy(): Promise<void> {
    const ok = await this.clipboard.copy(this.installCmd);
    if (!ok) return;
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 1400);
  }
}
