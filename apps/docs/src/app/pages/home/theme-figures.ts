import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  input,
} from '@angular/core';
import { Theme } from '../../services/theme.service';

/**
 * Theme-specific decorative hero figure.
 *
 * Renders one of 13 hand-drawn SVG compositions — each picks visual cues
 * from its theme's identity (kouji's brutalist 工, dark's saturn-style orb,
 * sakura's petals, terminal's CRT, etc.). Switching the active theme
 * swaps the figure entirely; the wrapper's `key`-style remount restarts
 * any entry animations.
 *
 * Pure SVG + CSS; no JS animation. Decorative — `aria-hidden` on host.
 * Designs ported 1:1 from `design-revamp/kouji-ui-v2/theme-figures.jsx`.
 */
@Component({
  selector: 'kj-theme-figure',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    'class': 'theme-figure',
    'aria-hidden': 'true',
    '[attr.data-theme-key]': 'themeId()',
  },
  template: `
    @switch (themeId()) {
      @case ('kouji') {
        <svg viewBox="0 0 400 400" class="figure-svg" focusable="false">
          <rect width="400" height="400" fill="#0f0f0f" />
          <g stroke="#1f1f1f" stroke-width="1">
            @for (v of GRID7; track v) {
              <line [attr.x1]="0" [attr.y1]="v" [attr.x2]="400" [attr.y2]="v" />
              <line [attr.x1]="v" [attr.y1]="0" [attr.x2]="v" [attr.y2]="400" />
            }
          </g>
          <g fill="#ff5b3d" opacity="0.5" transform="translate(8, 8)">
            <rect x="80" y="100" width="240" height="36" />
            <rect x="184" y="100" width="32" height="200" />
            <rect x="80" y="264" width="240" height="36" />
          </g>
          <g fill="#c4ff3d" class="fig-pulse">
            <rect x="80" y="100" width="240" height="36" />
            <rect x="184" y="100" width="32" height="200" />
            <rect x="80" y="264" width="240" height="36" />
          </g>
          <g fill="#c4ff3d">
            <rect x="20" y="20" width="14" height="2" /><rect x="20" y="20" width="2" height="14" />
            <rect x="366" y="20" width="14" height="2" /><rect x="378" y="20" width="2" height="14" />
            <rect x="20" y="378" width="14" height="2" /><rect x="20" y="366" width="2" height="14" />
            <rect x="366" y="378" width="14" height="2" /><rect x="378" y="366" width="2" height="14" />
          </g>
          <text x="20" y="392" font-family="monospace" font-size="10" fill="#888" letter-spacing="0.18em">[KOUJI/UI · 01]</text>
        </svg>
      }

      @case ('dark') {
        <svg viewBox="0 0 400 400" class="figure-svg" focusable="false">
          <defs>
            <radialGradient id="dk-bg" cx="50%" cy="50%" r="70%">
              <stop offset="0%" stop-color="#262a33" />
              <stop offset="100%" stop-color="#15171c" />
            </radialGradient>
            <radialGradient id="dk-orb" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stop-color="#bcd0ff" />
              <stop offset="55%" stop-color="#4a7dff" />
              <stop offset="100%" stop-color="#16224a" />
            </radialGradient>
            <clipPath id="dk-front-clip">
              <rect x="0" y="200" width="400" height="200" />
            </clipPath>
          </defs>
          <rect width="400" height="400" fill="url(#dk-bg)" />
          <g stroke="#4a7dff" fill="none">
            <ellipse cx="200" cy="200" rx="160" ry="40" stroke-width="1.5" opacity="0.7" />
            <ellipse cx="200" cy="200" rx="184" ry="58" stroke-width="1" opacity="0.45" transform="rotate(8 200 200)" />
          </g>
          <g fill="#4a7dff" opacity="0.8">
            <circle cx="360" cy="200" r="2" />
            <circle cx="40" cy="200" r="2" />
            <circle cx="80" cy="80" r="1.2" />
            <circle cx="330" cy="320" r="1.2" />
          </g>
          <g transform="translate(200 200)">
            <g class="fig-breathe">
              <circle cx="0" cy="0" r="92" fill="url(#dk-orb)" />
              <circle cx="-28" cy="-28" r="20" fill="#fff" opacity="0.22" />
            </g>
          </g>
          <g stroke="#4a7dff" fill="none" clip-path="url(#dk-front-clip)">
            <ellipse cx="200" cy="200" rx="160" ry="40" stroke-width="1.5" opacity="0.85" />
            <ellipse cx="200" cy="200" rx="184" ry="58" stroke-width="1" opacity="0.55" transform="rotate(8 200 200)" />
          </g>
        </svg>
      }

      @case ('light') {
        <svg viewBox="0 0 400 400" class="figure-svg" focusable="false">
          <rect width="400" height="400" fill="#fbf9f4" />
          <g stroke="#e6e3da" stroke-width="0.8" opacity="0.6">
            @for (y of GRID6; track y) {
              <line [attr.x1]="0" [attr.y1]="y" [attr.x2]="400" [attr.y2]="y" />
            }
          </g>
          <circle cx="200" cy="200" r="120" fill="none" stroke="#111"
                  stroke-width="22" stroke-linecap="round"
                  stroke-dasharray="680 100"
                  transform="rotate(-30 200 200)"
                  class="fig-enso-draw" />
          <circle cx="262" cy="148" r="11" fill="#d6a300" class="fig-pulse-slow" />
          <g>
            <rect x="44" y="346" width="32" height="32" fill="#c84a2e" />
            <text x="60" y="368" font-family="serif" font-size="20" fill="#fbf9f4" text-anchor="middle" font-style="italic">k</text>
          </g>
        </svg>
      }

      @case ('retro') {
        <svg viewBox="0 0 400 400" class="figure-svg" focusable="false">
          <rect width="400" height="400" fill="#f5ecd9" />
          <g transform="translate(200 200)" class="fig-spin-slow">
            @for (s of RETRO_SPOKES; track $index) {
              <line x1="0" [attr.y1]="-65" x2="0" [attr.y2]="s.long ? -180 : -150"
                    [attr.stroke]="s.color" [attr.stroke-width]="s.long ? 7 : 4" stroke-linecap="square"
                    [attr.transform]="'rotate(' + s.angle + ')'" />
            }
          </g>
          <circle cx="200" cy="200" r="56" fill="#c84a2e" />
          <circle cx="200" cy="200" r="32" fill="#f5ecd9" />
          <circle cx="200" cy="200" r="14" fill="#c84a2e" />
          <text x="200" y="380" text-anchor="middle" font-family="serif" font-style="italic" font-size="14" fill="#4a6670" letter-spacing="0.1em">est. 1957</text>
        </svg>
      }

      @case ('cyberpunk') {
        <svg viewBox="0 0 400 400" class="figure-svg" focusable="false">
          <rect width="400" height="400" fill="#ecf043" />
          <g opacity="0.6">
            <rect x="0" y="70" width="400" height="6" fill="#6b1aaf" />
            <rect x="0" y="180" width="400" height="3" fill="#6b1aaf" />
            <rect x="0" y="310" width="400" height="8" fill="#6b1aaf" />
          </g>
          <path [attr.d]="CYBER_BOLT" fill="#6b1aaf" class="fig-cyber-shadow" />
          <path [attr.d]="CYBER_BOLT" fill="#d80027" stroke="#0a0a0a" stroke-width="3" class="fig-cyber-main" />
          <text x="20" y="32" font-family="monospace" font-size="12" font-weight="700" fill="#0a0a0a">[KOUJI//404]</text>
          <text x="380" y="384" text-anchor="end" font-family="monospace" font-size="12" font-weight="700" fill="#0a0a0a">↯ JOLT.JS</text>
        </svg>
      }

      @case ('corporate') {
        <svg viewBox="0 0 400 400" class="figure-svg" focusable="false">
          <rect width="400" height="400" fill="#f4f6f9" />
          <g stroke="#dfe5ed" stroke-width="1">
            <line x1="40" y1="110" x2="380" y2="110" />
            <line x1="40" y1="210" x2="380" y2="210" />
            <line x1="40" y1="310" x2="380" y2="310" />
          </g>
          <g fill="#0a2540">
            @for (b of CORP_BARS; track $index; let i = $index) {
              <rect [attr.x]="b.x" [attr.y]="b.y" width="28" [attr.height]="b.h"
                    class="fig-bar" [style.animation-delay.ms]="i * 80" />
            }
          </g>
          <polyline points="74,250 114,210 154,230 194,170 234,140 274,105 314,70 348,52"
                    stroke="#0a2540" stroke-width="2" fill="none" opacity="0.45" />
          <polygon points="348,52 338,62 354,64" fill="#0a2540" opacity="0.45" />
          <text x="40" y="384" font-family="sans-serif" font-size="11" fill="#5a6a7e" letter-spacing="0.18em">Q1 → Q4 · YoY +28%</text>
        </svg>
      }

      @case ('sakura') {
        <svg viewBox="0 0 400 400" class="figure-svg" focusable="false">
          <rect width="400" height="400" fill="#fbeaee" />
          <g stroke="#f5d5dc" stroke-width="1" opacity="0.5">
            @for (y of GRID6; track y) {
              <line [attr.x1]="0" [attr.y1]="y" [attr.x2]="400" [attr.y2]="y" />
            }
          </g>
          <path d="M 60 340 Q 170 290 230 230 T 350 100" stroke="#5a3622" stroke-width="6" fill="none" stroke-linecap="round" />
          <path d="M 210 240 Q 240 210 270 175" stroke="#5a3622" stroke-width="3" fill="none" stroke-linecap="round" />
          @for (b of SAKURA_BLOSSOMS; track $index) {
            <g [attr.transform]="'translate(' + b.cx + ' ' + b.cy + ')'">
              @for (a of [0, 72, 144, 216, 288]; track a) {
                <circle [attr.r]="b.small ? 9 : 13" cx="0" [attr.cy]="(b.small ? 9 : 13) * -1.05" fill="#c8265e" [attr.transform]="'rotate(' + a + ')'" opacity="0.92" />
              }
              <circle [attr.r]="(b.small ? 9 : 13) * 0.42" cx="0" cy="0" fill="#fff5f7" />
              <circle [attr.r]="(b.small ? 9 : 13) * 0.18" cx="0" cy="0" fill="#6b2e52" />
            </g>
          }
          <g class="fig-petals-layer">
            @for (p of SAKURA_PETALS; track $index) {
              <g class="fig-petal-fall" [style.animation-delay.s]="p.delay" [attr.transform]="'translate(' + p.startX + ' -20)'">
                <ellipse cx="0" cy="0" rx="6" ry="11" fill="#c8265e" opacity="0.78" />
              </g>
            }
          </g>
        </svg>
      }

      @case ('bauhaus') {
        <svg viewBox="0 0 400 400" class="figure-svg" focusable="false">
          <rect width="400" height="400" fill="#f3ead4" />
          <rect x="40" y="195" width="320" height="10" fill="#111" />
          <circle cx="280" cy="125" r="68" fill="#d83b2e" class="fig-bauhaus-piece" style="animation-delay: 0ms" />
          <polygon points="60,300 200,300 130,180" fill="#1d4ed8" class="fig-bauhaus-piece" style="animation-delay: 120ms" />
          <rect x="245" y="245" width="100" height="100" fill="#f5c443" class="fig-bauhaus-piece" style="animation-delay: 240ms" />
          <rect x="50" y="50" width="44" height="44" fill="#111" class="fig-bauhaus-piece" style="animation-delay: 360ms" />
          <text x="40" y="380" font-family="sans-serif" font-weight="900" font-size="12" fill="#111" letter-spacing="0.18em">KOUJI / DESSAU</text>
        </svg>
      }

      @case ('dune') {
        <svg viewBox="0 0 400 400" class="figure-svg" focusable="false">
          <defs>
            <linearGradient id="dune-sky" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stop-color="#f3d5b5" />
              <stop offset="55%" stop-color="#ecc4a0" />
              <stop offset="100%" stop-color="#d99a6c" />
            </linearGradient>
          </defs>
          <rect width="400" height="400" fill="url(#dune-sky)" />
          <circle cx="200" cy="180" r="56" fill="#1f2050" class="fig-dune-sun" />
          <path d="M 0 285 Q 100 250 200 275 T 400 250 L 400 400 L 0 400 Z" fill="#b87545" />
          <path d="M 0 320 Q 130 290 220 312 T 400 290 L 400 400 L 0 400 Z" fill="#925a32" />
          <path d="M 0 358 Q 150 340 250 350 T 400 340 L 400 400 L 0 400 Z" fill="#5e3920" />
          <ellipse cx="318" cy="288" rx="14" ry="8" fill="#1f2050" />
          <circle cx="318" cy="285" r="2.4" fill="#ecc4a0" />
          <text x="40" y="44" font-family="serif" font-style="italic" font-size="14" fill="#1f2050" letter-spacing="0.16em">— sietch tabr</text>
        </svg>
      }

      @case ('mint') {
        <svg viewBox="0 0 400 400" class="figure-svg" focusable="false">
          <rect width="400" height="400" fill="#e8f4ec" />
          <g stroke="#d6ecdc" stroke-width="0.8" opacity="0.6">
            @for (y of GRID6; track y) {
              <line [attr.x1]="0" [attr.y1]="y" [attr.x2]="400" [attr.y2]="y" />
            }
          </g>
          <g class="fig-mint-sway">
            <g transform="rotate(-15 200 200)">
              <path d="M 200 56 Q 332 128 332 200 Q 332 282 200 348 Q 68 282 68 200 Q 68 128 200 56 Z" fill="#1f7a4e" />
              <path d="M 200 56 Q 332 128 332 200 Q 332 282 200 348 Q 68 282 68 200 Q 68 128 200 56 Z" fill="#2ea065" opacity="0.55" />
              <path d="M 200 56 Q 332 128 332 200 Q 332 282 200 348 Q 68 282 68 200 Q 68 128 200 56 Z"
                    fill="none" stroke="#0e4b2d" stroke-width="2" opacity="0.45" />
              <path d="M 200 76 Q 199 200 200 330" stroke="#0e4b2d" stroke-width="2.6" opacity="0.6" fill="none" stroke-linecap="round" />
              <g stroke="#0e4b2d" stroke-width="1.5" opacity="0.45" fill="none" stroke-linecap="round">
                <path d="M 200 108 Q 234 124 288 142" />
                <path d="M 200 108 Q 166 124 112 142" />
                <path d="M 200 158 Q 252 178 322 198" />
                <path d="M 200 158 Q 148 178 78  198" />
                <path d="M 200 218 Q 250 238 316 252" />
                <path d="M 200 218 Q 150 238 84  252" />
                <path d="M 200 274 Q 240 290 280 300" />
                <path d="M 200 274 Q 160 290 120 300" />
              </g>
              <ellipse cx="158" cy="160" rx="22" ry="10" fill="#fff" opacity="0.18" transform="rotate(-30 158 160)" />
              <line x1="200" y1="348" x2="200" y2="386" stroke="#0e4b2d" stroke-width="4" stroke-linecap="round" />
            </g>
          </g>
        </svg>
      }

      @case ('forest') {
        <svg viewBox="0 0 400 400" class="figure-svg" focusable="false">
          <rect width="400" height="400" fill="#1a241c" />
          <circle cx="200" cy="190" r="110" fill="#d4a017" opacity="0.92" />
          <circle cx="200" cy="190" r="120" fill="none" stroke="#d4a017" stroke-width="1" opacity="0.4" />
          <polygon points="200,80 150,170 175,170 130,250 165,250 110,330 290,330 235,250 270,250 225,170 250,170"
                   fill="#0e1810" stroke="#243027" stroke-width="1" />
          <rect x="192" y="330" width="16" height="28" fill="#0e1810" />
          <g fill="#d4a017">
            @for (f of FOREST_FIREFLIES; track $index) {
              <circle [attr.cx]="f.cx" [attr.cy]="f.cy" [attr.r]="f.r" class="fig-firefly" [style.animation-delay.s]="f.delay" />
            }
          </g>
        </svg>
      }

      @case ('nord') {
        <svg viewBox="0 0 400 400" class="figure-svg" focusable="false">
          <defs>
            <linearGradient id="nord-sky" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stop-color="#2e3440" />
              <stop offset="100%" stop-color="#3b4252" />
            </linearGradient>
            <linearGradient id="aurora" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stop-color="#88c0d0" stop-opacity="0" />
              <stop offset="45%" stop-color="#88c0d0" stop-opacity="0.75" />
              <stop offset="75%" stop-color="#a3be8c" stop-opacity="0.4" />
              <stop offset="100%" stop-color="#a3be8c" stop-opacity="0" />
            </linearGradient>
          </defs>
          <rect width="400" height="400" fill="url(#nord-sky)" />
          <g class="fig-aurora-1">
            <path d="M -50 100 Q 100 60 200 90 T 460 80 L 460 190 Q 300 215 200 175 T -50 210 Z" fill="url(#aurora)" />
          </g>
          <g class="fig-aurora-2">
            <path d="M -50 150 Q 100 120 200 140 T 460 130 L 460 230 Q 300 240 200 220 T -50 240 Z" fill="url(#aurora)" opacity="0.6" />
          </g>
          <g fill="#eceff4">
            <circle cx="80" cy="50" r="1.5" />
            <circle cx="320" cy="40" r="1" />
            <circle cx="220" cy="60" r="1.2" />
            <circle cx="370" cy="120" r="1" />
            <circle cx="40" cy="180" r="1" />
          </g>
          <polygon points="0,400 50,250 110,310 180,210 240,290 320,200 400,280 400,400" fill="#1a1f28" />
          <polygon points="0,400 70,330 130,360 200,300 260,340 330,290 400,330 400,400" fill="#262e3a" />
          <g fill="#eceff4" opacity="0.85">
            <polygon points="50,250 55,260 45,260" />
            <polygon points="180,210 188,225 172,225" />
            <polygon points="320,200 330,215 310,215" />
          </g>
        </svg>
      }

      @case ('terminal') {
        <svg viewBox="0 0 400 400" class="figure-svg" focusable="false">
          <defs>
            <radialGradient id="crt-vignette" cx="50%" cy="50%" r="70%">
              <stop offset="55%" stop-color="#000" stop-opacity="0" />
              <stop offset="100%" stop-color="#000" stop-opacity="0.7" />
            </radialGradient>
          </defs>
          <rect width="400" height="400" fill="#000" />
          <g fill="#33ff66" opacity="0.05">
            @for (i of CRT_LINES; track i) {
              <rect x="0" [attr.y]="i * 4" width="400" height="2" />
            }
          </g>
          <g font-family="monospace" font-size="13" fill="#33ff66">
            <text x="20" y="40">kouji&#64;ui:~$ ng add &#64;kouji/ui</text>
            <text x="20" y="62" opacity="0.7">→ resolving 47 components…</text>
            <text x="20" y="84" opacity="0.7">→ resolving 13 themes…</text>
            <text x="20" y="106" opacity="0.7">→ tree-shaking unused…</text>
            <text x="20" y="128">✓ done in 1.2s</text>
            <text x="20" y="172">kouji&#64;ui:~$ ng build</text>
            <text x="20" y="194" opacity="0.7">⠿ bundling…</text>
            <text x="20" y="216">12.4 KB · gzipped</text>
            <text x="20" y="260">kouji&#64;ui:~$ ng test</text>
            <text x="20" y="282" opacity="0.7">Test Suites: 128 passed</text>
            <text x="20" y="304" opacity="0.7">Tests: 942 passed, 0 failed</text>
            <text x="20" y="326" opacity="0.7">Time: 4.1s · all green</text>
            <text x="20" y="370">kouji&#64;ui:~$<tspan dx="6" class="fig-cursor">█</tspan></text>
          </g>
          <rect width="400" height="400" fill="url(#crt-vignette)" />
        </svg>
      }
    }
  `,
})
export class KjThemeFigure {
  /** Active theme id — selects which figure to render. */
  readonly themeId = input.required<Theme>();

  /** Grid line offsets — used by kouji figure (7 horizontal/vertical lines). */
  protected readonly GRID7 = [50, 100, 150, 200, 250, 300, 350];
  /** Grid line offsets — used by light/sakura/mint (6 horizontal lines). */
  protected readonly GRID6 = [60, 120, 180, 240, 300, 360];

  /** Retro figure — 24 spokes around the central starburst. */
  protected readonly RETRO_SPOKES = Array.from({ length: 24 }, (_, i) => ({
    angle: (i * 360) / 24,
    color: i % 2 === 0 ? '#c84a2e' : '#4a6670',
    long: i % 3 === 0,
  }));

  /** Cyberpunk lightning-bolt path. */
  protected readonly CYBER_BOLT =
    'M 220 60 L 130 215 L 195 215 L 145 340 L 280 175 L 215 175 L 270 60 Z';

  /** Corporate bar-chart series — ascending trend. */
  protected readonly CORP_BARS: ReadonlyArray<{ x: number; y: number; h: number }> = [
    { x: 60,  y: 250, h: 100 },
    { x: 100, y: 210, h: 140 },
    { x: 140, y: 230, h: 120 },
    { x: 180, y: 170, h: 180 },
    { x: 220, y: 140, h: 210 },
    { x: 260, y: 105, h: 245 },
    { x: 300, y: 70,  h: 280 },
  ];

  /** Sakura cherry blossoms — positions + size variant. */
  protected readonly SAKURA_BLOSSOMS: ReadonlyArray<{ cx: number; cy: number; small?: boolean }> = [
    { cx: 110, cy: 310 },
    { cx: 190, cy: 250 },
    { cx: 260, cy: 195, small: true },
    { cx: 300, cy: 155 },
    { cx: 335, cy: 110, small: true },
    { cx: 272, cy: 172, small: true },
  ];

  /** Sakura falling petals — staggered start X + animation delay. */
  protected readonly SAKURA_PETALS: ReadonlyArray<{ startX: number; delay: number }> = [
    { startX: 70,  delay: 0 },
    { startX: 150, delay: 1.2 },
    { startX: 230, delay: 0.6 },
    { startX: 310, delay: 2.0 },
    { startX: 360, delay: 1.6 },
  ];

  /** Forest fireflies — position, radius, blink phase offset. */
  protected readonly FOREST_FIREFLIES: ReadonlyArray<{ cx: number; cy: number; r: number; delay: number }> = [
    { cx: 70,  cy: 120, r: 3,   delay: 0 },
    { cx: 340, cy: 100, r: 3,   delay: 1 },
    { cx: 60,  cy: 300, r: 2.5, delay: 2 },
    { cx: 350, cy: 280, r: 3,   delay: 0.5 },
    { cx: 120, cy: 50,  r: 2,   delay: 1.5 },
    { cx: 290, cy: 60,  r: 2,   delay: 2.4 },
  ];

  /** Terminal CRT scanlines — 100 horizontal stripes. */
  protected readonly CRT_LINES = Array.from({ length: 100 }, (_, i) => i);
}
