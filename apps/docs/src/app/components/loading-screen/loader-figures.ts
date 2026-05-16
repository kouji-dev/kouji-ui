import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  input,
} from '@angular/core';
import { Theme } from '../../services/theme.service';

/**
 * Per-theme ambient-loop figure for the first-paint splash.
 *
 * Mirrors the shape of `KjThemeFigure`: a single component dispatches to one
 * of 13 inlined SVG compositions via `@switch (themeId())`. Animations are
 * pure declarative SVG (`<animate>` / `<animateTransform>`) + a couple of CSS
 * keyframes for transform-origin-anchored shrink/grow. No JS animation.
 *
 * Hard-coded colors are intentional — each figure speaks its theme's visual
 * dialect. We switch the figure when the theme changes; we do not re-color
 * a single figure.
 *
 * Ported 1:1 from design-revamp/kouji-ui-v3/loader-figures.jsx.
 * Decorative — host carries aria-hidden="true".
 */
@Component({
  selector: 'kj-loader-figure',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'loader-fig-svg-wrap', 'aria-hidden': 'true' },
  template: `
    @switch (themeId()) {
      @case ('kouji') {
        <svg viewBox="0 0 400 400" class="lf-svg" focusable="false">
          <rect width="400" height="400" fill="#0a0a0a" />
          <g stroke="#1f1f1f" stroke-width="1">
            <line x1="50" y1="100" x2="350" y2="100" /><line x1="50" y1="200" x2="350" y2="200" /><line x1="50" y1="300" x2="350" y2="300" />
            <line x1="100" y1="50" x2="100" y2="350" /><line x1="200" y1="50" x2="200" y2="350" /><line x1="300" y1="50" x2="300" y2="350" />
          </g>
          <g fill="#c4ff3d">
            <rect x="80" y="100" width="240" height="36" style="transform-origin: left center">
              <animateTransform attributeName="transform" type="scale" values="0 1; 1 1; 1 1; 1 1" keyTimes="0; 0.18; 0.8; 1" dur="2.4s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="1; 1; 1; 0" keyTimes="0; 0.7; 0.85; 1" dur="2.4s" repeatCount="indefinite" />
            </rect>
            <rect x="184" y="100" width="32" height="200" style="transform-origin: center top">
              <animateTransform attributeName="transform" type="scale" values="1 0; 1 0; 1 1; 1 1; 1 1" keyTimes="0; 0.18; 0.36; 0.8; 1" dur="2.4s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="1; 1; 1; 0" keyTimes="0; 0.7; 0.85; 1" dur="2.4s" repeatCount="indefinite" />
            </rect>
            <rect x="80" y="264" width="240" height="36" style="transform-origin: left center">
              <animateTransform attributeName="transform" type="scale" values="0 1; 0 1; 1 1; 1 1; 1 1" keyTimes="0; 0.36; 0.54; 0.8; 1" dur="2.4s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="1; 1; 1; 0" keyTimes="0; 0.7; 0.85; 1" dur="2.4s" repeatCount="indefinite" />
            </rect>
          </g>
        </svg>
      }
      @case ('dark') {
        <svg viewBox="0 0 400 400" class="lf-svg" focusable="false">
          <defs>
            <radialGradient id="lfd-bg" cx="50%" cy="50%" r="70%">
              <stop offset="0%" stop-color="#262a33" /><stop offset="100%" stop-color="#15171c" />
            </radialGradient>
            <radialGradient id="lfd-orb" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stop-color="#bcd0ff" /><stop offset="55%" stop-color="#4a7dff" /><stop offset="100%" stop-color="#16224a" />
            </radialGradient>
          </defs>
          <rect width="400" height="400" fill="url(#lfd-bg)" />
          <g>
            <circle cx="200" cy="200" r="120" fill="none" stroke="#4a7dff" stroke-width="3" stroke-dasharray="200 600" stroke-linecap="round" />
            <animateTransform attributeName="transform" type="rotate" from="0 200 200" to="360 200 200" dur="1.5s" repeatCount="indefinite" />
          </g>
          <g>
            <circle cx="200" cy="200" r="160" fill="none" stroke="#4a7dff" stroke-width="1" stroke-dasharray="60 600" opacity="0.6" />
            <animateTransform attributeName="transform" type="rotate" from="360 200 200" to="0 200 200" dur="2.4s" repeatCount="indefinite" />
          </g>
          <g transform="translate(200 200)">
            <circle cx="0" cy="0" r="50" fill="url(#lfd-orb)">
              <animate attributeName="r" values="48; 56; 48" dur="2s" repeatCount="indefinite" />
            </circle>
            <circle cx="-15" cy="-15" r="11" fill="#fff" opacity="0.25" />
          </g>
        </svg>
      }
      @case ('light') {
        <svg viewBox="0 0 400 400" class="lf-svg" focusable="false">
          <rect width="400" height="400" fill="#fbf9f4" />
          <g stroke="#e6e3da" stroke-width="0.8" opacity="0.6">
            <line x1="0" y1="60" x2="400" y2="60" /><line x1="0" y1="120" x2="400" y2="120" /><line x1="0" y1="180" x2="400" y2="180" />
            <line x1="0" y1="240" x2="400" y2="240" /><line x1="0" y1="300" x2="400" y2="300" /><line x1="0" y1="360" x2="400" y2="360" />
          </g>
          <circle cx="200" cy="200" r="120" fill="none" stroke="#111111" stroke-width="22" stroke-linecap="round" stroke-dasharray="680 720" transform="rotate(-30 200 200)">
            <animate attributeName="stroke-dashoffset" values="680; 0; 0; -680; -680" keyTimes="0; 0.4; 0.5; 0.9; 1" dur="3.2s" repeatCount="indefinite" />
          </circle>
          <circle cx="262" cy="148" r="9" fill="#d6a300">
            <animate attributeName="r" values="9; 13; 9" dur="1.6s" repeatCount="indefinite" />
          </circle>
        </svg>
      }
      @case ('retro') {
        <svg viewBox="0 0 400 400" class="lf-svg" focusable="false">
          <rect width="400" height="400" fill="#f5ecd9" />
          <g opacity="0.18" transform="translate(200 200)">
            @for (i of RAYS_24; track i) {
              <line x1="0" y1="-70" x2="0" y2="-160"
                    [attr.stroke]="i % 2 === 0 ? '#c84a2e' : '#4a6670'" stroke-width="3"
                    [attr.transform]="'rotate(' + (i * 15) + ')'" />
            }
          </g>
          <g>
            <line x1="200" y1="40" x2="200" y2="130" stroke="#c84a2e" stroke-width="8" stroke-linecap="square" />
            <line x1="200" y1="56" x2="200" y2="128" stroke="#4a6670" stroke-width="3" stroke-linecap="square" />
            <animateTransform attributeName="transform" type="rotate" from="0 200 200" to="360 200 200" dur="2.5s" repeatCount="indefinite" />
          </g>
          <circle cx="200" cy="200" r="56" fill="#c84a2e" />
          <circle cx="200" cy="200" r="32" fill="#f5ecd9" />
          <circle cx="200" cy="200" r="14" fill="#c84a2e">
            <animate attributeName="r" values="12; 16; 12" dur="1s" repeatCount="indefinite" />
          </circle>
        </svg>
      }
      @case ('cyberpunk') {
        <svg viewBox="0 0 400 400" class="lf-svg" focusable="false">
          <rect width="400" height="400" fill="#ecf043" />
          <g opacity="0.5">
            <rect x="0" y="80" width="400" height="4" fill="#6b1aaf">
              <animate attributeName="x" values="0; -20; 0" dur="0.6s" repeatCount="indefinite" />
            </rect>
            <rect x="0" y="200" width="400" height="2" fill="#6b1aaf">
              <animate attributeName="x" values="0; 30; 0" dur="0.4s" repeatCount="indefinite" />
            </rect>
            <rect x="0" y="316" width="400" height="6" fill="#6b1aaf">
              <animate attributeName="x" values="0; -15; 0" dur="0.5s" repeatCount="indefinite" />
            </rect>
          </g>
          <path [attr.d]="BOLT" fill="#6b1aaf">
            <animateTransform attributeName="transform" type="translate" values="8 0; -6 3; 12 -3; 8 0" keyTimes="0; 0.5; 0.6; 1" dur="1s" repeatCount="indefinite" />
          </path>
          <path [attr.d]="BOLT" fill="#d80027" stroke="#0a0a0a" stroke-width="3">
            <animate attributeName="opacity" values="1; 0.7; 1; 1" keyTimes="0; 0.5; 0.55; 1" dur="0.8s" repeatCount="indefinite" />
          </path>
        </svg>
      }
      @case ('corporate') {
        <svg viewBox="0 0 400 400" class="lf-svg" focusable="false">
          <rect width="400" height="400" fill="#f4f6f9" />
          <g stroke="#dfe5ed" stroke-width="1">
            <line x1="40" y1="120" x2="360" y2="120" />
            <line x1="40" y1="200" x2="360" y2="200" />
            <line x1="40" y1="280" x2="360" y2="280" />
          </g>
          <g fill="#0a2540">
            @for (b of CORP_BARS; track b.x) {
              <rect [attr.x]="b.x" y="100" width="40" height="220" style="transform-origin: bottom">
                <animateTransform attributeName="transform" type="scale" values="1 0; 1 1; 1 1; 1 0" keyTimes="0; 0.3; 0.7; 1" dur="2s" repeatCount="indefinite" [attr.begin]="b.delay + 's'" />
              </rect>
            }
          </g>
          <text x="40" y="368" font-family="sans-serif" font-size="11" fill="#5a6a7e" letter-spacing="0.18em">PROCESSING</text>
        </svg>
      }
      @case ('sakura') {
        <svg viewBox="0 0 400 400" class="lf-svg" focusable="false">
          <rect width="400" height="400" fill="#fbeaee" />
          <g stroke="#f5d5dc" stroke-width="1" opacity="0.6">
            <line x1="0" y1="80" x2="400" y2="80" /><line x1="0" y1="160" x2="400" y2="160" />
            <line x1="0" y1="240" x2="400" y2="240" /><line x1="0" y1="320" x2="400" y2="320" />
          </g>
          <g transform="translate(80 80)">
            <circle r="16" cx="0" cy="-17" fill="#c8265e" transform="rotate(0)" opacity="0.9" />
            <circle r="16" cx="0" cy="-17" fill="#c8265e" transform="rotate(72)" opacity="0.9" />
            <circle r="16" cx="0" cy="-17" fill="#c8265e" transform="rotate(144)" opacity="0.9" />
            <circle r="16" cx="0" cy="-17" fill="#c8265e" transform="rotate(216)" opacity="0.9" />
            <circle r="16" cx="0" cy="-17" fill="#c8265e" transform="rotate(288)" opacity="0.9" />
            <circle r="6" fill="#fff5f7" />
          </g>
          @for (p of SAKURA_PETALS; track p.x; let i = $index) {
            <g>
              <ellipse [attr.cx]="p.x" cy="-30" rx="8" ry="14" fill="#c8265e" opacity="0.85">
                <animateTransform attributeName="transform" type="translate" from="0 0" [attr.to]="(30 + i * 6) + ' 480'" [attr.dur]="p.d + 's'" repeatCount="indefinite" [attr.begin]="p.delay + 's'" />
                <animate attributeName="opacity" values="0; 0.85; 0.85; 0" keyTimes="0; 0.1; 0.9; 1" [attr.dur]="p.d + 's'" repeatCount="indefinite" [attr.begin]="p.delay + 's'" />
              </ellipse>
            </g>
          }
        </svg>
      }
      @case ('bauhaus') {
        <svg viewBox="0 0 400 400" class="lf-svg" focusable="false">
          <rect width="400" height="400" fill="#f3ead4" />
          <line x1="40" y1="200" x2="360" y2="200" stroke="#111" stroke-width="8" />
          <g>
            <circle cx="200" cy="120" r="36" fill="#d83b2e" />
            <animateTransform attributeName="transform" type="rotate" from="0 200 200" to="360 200 200" dur="3s" repeatCount="indefinite" />
          </g>
          <g>
            <polygon points="174,290 226,290 200,332" fill="#1d4ed8" />
            <animateTransform attributeName="transform" type="rotate" from="0 200 200" to="-360 200 200" dur="3.6s" repeatCount="indefinite" />
          </g>
          <g>
            <rect x="70" y="180" width="40" height="40" fill="#f5c443" />
            <animateTransform attributeName="transform" type="rotate" from="0 200 200" to="360 200 200" dur="4.2s" repeatCount="indefinite" />
          </g>
        </svg>
      }
      @case ('dune') {
        <svg viewBox="0 0 400 400" class="lf-svg" focusable="false">
          <defs>
            <linearGradient id="lfdun-sky" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stop-color="#f3d5b5" /><stop offset="55%" stop-color="#ecc4a0" /><stop offset="100%" stop-color="#d99a6c" />
            </linearGradient>
          </defs>
          <rect width="400" height="400" fill="url(#lfdun-sky)" />
          <circle cx="200" cy="180" r="60" fill="#1f2050">
            <animate attributeName="r" values="56; 68; 56" dur="2.4s" repeatCount="indefinite" />
          </circle>
          <circle cx="200" cy="180" r="80" fill="none" stroke="#1f2050" stroke-width="1" opacity="0.4">
            <animate attributeName="r" values="74; 92; 74" dur="2.4s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.4; 0; 0.4" dur="2.4s" repeatCount="indefinite" />
          </circle>
          <path d="M 0 285 Q 100 250 200 275 T 400 250 L 400 400 L 0 400 Z" fill="#b87545">
            <animate attributeName="d"
              values="M 0 285 Q 100 250 200 275 T 400 250 L 400 400 L 0 400 Z;
                      M 0 285 Q 100 265 200 285 T 400 260 L 400 400 L 0 400 Z;
                      M 0 285 Q 100 250 200 275 T 400 250 L 400 400 L 0 400 Z"
              dur="6s" repeatCount="indefinite" />
          </path>
          <path d="M 0 320 Q 130 290 220 312 T 400 290 L 400 400 L 0 400 Z" fill="#925a32" />
          <path d="M 0 358 Q 150 340 250 350 T 400 340 L 400 400 L 0 400 Z" fill="#5e3920" />
        </svg>
      }
      @case ('mint') {
        <svg viewBox="0 0 400 400" class="lf-svg" focusable="false">
          <rect width="400" height="400" fill="#e8f4ec" />
          <g stroke="#d6ecdc" stroke-width="0.8" opacity="0.6">
            <line x1="0" y1="80" x2="400" y2="80" /><line x1="0" y1="160" x2="400" y2="160" />
            <line x1="0" y1="240" x2="400" y2="240" /><line x1="0" y1="320" x2="400" y2="320" />
          </g>
          <line x1="200" y1="395" x2="200" y2="348" stroke="#0e4b2d" stroke-width="4" stroke-linecap="round" />
          <g class="lfmint-leaf">
            <path d="M 200 56 Q 332 128 332 200 Q 332 282 200 348 Q 68 282 68 200 Q 68 128 200 56 Z" fill="#1f7a4e" />
            <path d="M 200 76 Q 199 200 200 330" stroke="#0e4b2d" stroke-width="2.6" opacity="0.6" fill="none" stroke-linecap="round" />
            <g stroke="#0e4b2d" stroke-width="1.5" opacity="0.45" fill="none" stroke-linecap="round">
              <path d="M 200 108 Q 234 124 288 142" /><path d="M 200 108 Q 166 124 112 142" />
              <path d="M 200 158 Q 252 178 322 198" /><path d="M 200 158 Q 148 178 78 198" />
              <path d="M 200 218 Q 250 238 316 252" /><path d="M 200 218 Q 150 238 84 252" />
              <path d="M 200 274 Q 240 290 280 300" /><path d="M 200 274 Q 160 290 120 300" />
            </g>
          </g>
        </svg>
      }
      @case ('forest') {
        <svg viewBox="0 0 400 400" class="lf-svg" focusable="false">
          <rect width="400" height="400" fill="#1a241c" />
          <circle cx="200" cy="200" r="46" fill="#d4a017" opacity="0.7">
            <animate attributeName="opacity" values="0.5; 1; 0.5" dur="2s" repeatCount="indefinite" />
          </circle>
          @for (f of FIREFLIES; track $index) {
            <g>
              <circle [attr.cx]="200 + f.r" cy="200" [attr.r]="f.size" fill="#d4a017">
                <animate attributeName="opacity" values="0.3; 1; 0.3" dur="1.2s" repeatCount="indefinite" [attr.begin]="(-f.delay * 0.3) + 's'" />
              </circle>
              <animateTransform attributeName="transform" type="rotate" from="0 200 200" to="360 200 200" [attr.dur]="f.dur + 's'" repeatCount="indefinite" [attr.begin]="f.delay + 's'" />
            </g>
          }
        </svg>
      }
      @case ('nord') {
        <svg viewBox="0 0 400 400" class="lf-svg" focusable="false">
          <defs>
            <linearGradient id="lfn-sky" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stop-color="#2e3440" /><stop offset="100%" stop-color="#3b4252" />
            </linearGradient>
            <linearGradient id="lfn-aurora" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stop-color="#88c0d0" stop-opacity="0" />
              <stop offset="50%" stop-color="#88c0d0" stop-opacity="0.85" />
              <stop offset="100%" stop-color="#88c0d0" stop-opacity="0" />
            </linearGradient>
          </defs>
          <rect width="400" height="400" fill="url(#lfn-sky)" />
          <path fill="url(#lfn-aurora)">
            <animate attributeName="d"
              values="M -50 140 Q 100 110 200 130 T 460 120 L 460 220 Q 300 240 200 210 T -50 240 Z;
                      M -50 130 Q 100 160 200 130 T 460 150 L 460 240 Q 300 220 200 245 T -50 220 Z;
                      M -50 140 Q 100 110 200 130 T 460 120 L 460 220 Q 300 240 200 210 T -50 240 Z"
              dur="5s" repeatCount="indefinite" />
          </path>
          <g fill="#eceff4">
            <circle cx="80"  cy="50"  r="1.5"><animate attributeName="opacity" values="0.5;1;0.5" dur="3s"   repeatCount="indefinite" /></circle>
            <circle cx="320" cy="40"  r="1"><animate attributeName="opacity" values="1;0.5;1"   dur="3.6s" repeatCount="indefinite" /></circle>
            <circle cx="220" cy="60"  r="1.2"><animate attributeName="opacity" values="0.4;1;0.4" dur="2.4s" repeatCount="indefinite" /></circle>
            <circle cx="370" cy="120" r="1" />
            <circle cx="40"  cy="180" r="1" />
          </g>
          <polygon points="0,400 50,250 110,310 180,210 240,290 320,200 400,280 400,400" fill="#1a1f28" />
          <polygon points="0,400 70,330 130,360 200,300 260,340 330,290 400,330 400,400" fill="#262e3a" />
        </svg>
      }
      @case ('terminal') {
        <svg viewBox="0 0 400 400" class="lf-svg" focusable="false">
          <defs>
            <radialGradient id="lft-vignette" cx="50%" cy="50%" r="70%">
              <stop offset="55%" stop-color="#000" stop-opacity="0" />
              <stop offset="100%" stop-color="#000" stop-opacity="0.7" />
            </radialGradient>
          </defs>
          <rect width="400" height="400" fill="#000" />
          <g fill="#33ff66" opacity="0.05">
            @for (i of SCANLINES_100; track i) {
              <rect x="0" [attr.y]="i * 4" width="400" height="2" />
            }
          </g>
          <text x="24" y="36"  font-family="JetBrains Mono, ui-monospace, monospace" font-size="11" fill="#1f9a3d" letter-spacing="2">KOUJI&#64;UI · INIT</text>
          <text x="376" y="36" text-anchor="end" font-family="JetBrains Mono, ui-monospace, monospace" font-size="11" fill="#33ff66" font-weight="700" letter-spacing="2">BOOTING</text>
          <g font-family="JetBrains Mono, ui-monospace, monospace" font-size="15">
            @for (line of TERM_LINES; track line.y) {
              <text x="24" [attr.y]="line.y" [attr.fill]="line.cls === 'ok' ? '#33ff66' : '#1f9a3d'" opacity="0">
                {{ line.text }}
                <animate attributeName="opacity" values="0; 1; 1; 0" [attr.keyTimes]="'0; ' + (line.at / 4 + 0.05) + '; 0.93; 1'" dur="4s" repeatCount="indefinite" />
                <animateTransform attributeName="transform" type="translate" values="0 4; 0 0; 0 0; 0 0" [attr.keyTimes]="'0; ' + (line.at / 4 + 0.05) + '; 0.93; 1'" dur="4s" repeatCount="indefinite" />
              </text>
            }
            <text x="24" y="312" fill="#33ff66" opacity="0">
              $&#160;
              <animate attributeName="opacity" values="0; 0; 1; 1; 0" keyTimes="0; 0.75; 0.78; 0.93; 1" dur="4s" repeatCount="indefinite" />
            </text>
            <rect x="40" y="298" width="11" height="18" fill="#33ff66">
              <animate attributeName="opacity" values="0; 0; 1; 0; 1; 0; 1; 1; 0" keyTimes="0; 0.75; 0.78; 0.82; 0.86; 0.90; 0.93; 0.95; 1" dur="4s" repeatCount="indefinite" />
            </rect>
          </g>
          <rect width="400" height="400" fill="url(#lft-vignette)" />
          <rect width="400" height="400" fill="#33ff66" opacity="0">
            <animate attributeName="opacity" values="0; 0.04; 0; 0; 0.02; 0" keyTimes="0; 0.02; 0.04; 0.5; 0.52; 1" dur="3.7s" repeatCount="indefinite" />
          </rect>
        </svg>
      }
    }
  `,
})
export class KjLoaderFigure {
  readonly themeId = input.required<Theme>();

  protected readonly RAYS_24 = Array.from({ length: 24 }, (_, i) => i);
  protected readonly BOLT = 'M 220 60 L 130 215 L 195 215 L 145 340 L 280 175 L 215 175 L 270 60 Z';
  protected readonly CORP_BARS: ReadonlyArray<{ x: number; delay: number }> = [
    { x: 80,  delay: 0   },
    { x: 130, delay: 0.1 },
    { x: 180, delay: 0.2 },
    { x: 230, delay: 0.3 },
    { x: 280, delay: 0.4 },
  ];
  protected readonly SAKURA_PETALS: ReadonlyArray<{ x: number; delay: number; d: number }> = [
    { x: 100, delay: 0,   d: 4.5 },
    { x: 170, delay: 0.8, d: 5.0 },
    { x: 240, delay: 0.4, d: 4.2 },
    { x: 300, delay: 1.6, d: 5.4 },
    { x: 360, delay: 2.4, d: 4.7 },
  ];
  protected readonly FIREFLIES: ReadonlyArray<{ r: number; dur: number; delay: number; size: number }> = [
    { r: 60,  dur: 3,   delay: 0,    size: 4   },
    { r: 60,  dur: 3,   delay: -1.5, size: 3   },
    { r: 100, dur: 4.6, delay: 0,    size: 3.5 },
    { r: 100, dur: 4.6, delay: -2.3, size: 3   },
    { r: 140, dur: 6.5, delay: -1,   size: 4   },
    { r: 140, dur: 6.5, delay: -4,   size: 2.5 },
  ];
  protected readonly SCANLINES_100 = Array.from({ length: 100 }, (_, i) => i);
  protected readonly TERM_LINES: ReadonlyArray<{ y: number; at: number; text: string; cls: 'ok' | 'dim' }> = [
    { y: 64,  at: 0.0, text: '$ kouji init',              cls: 'ok'  },
    { y: 92,  at: 0.4, text: '→ resolving 47 components', cls: 'dim' },
    { y: 120, at: 0.8, text: '→ resolving 13 themes',     cls: 'dim' },
    { y: 148, at: 1.2, text: '→ tokens.css …',            cls: 'dim' },
    { y: 176, at: 1.6, text: '✓ stylesheet · 12.4kb',     cls: 'ok'  },
    { y: 204, at: 2.0, text: '✓ runtime · 8.1kb',         cls: 'ok'  },
    { y: 232, at: 2.4, text: '✓ a11y · axe clean',        cls: 'ok'  },
    { y: 260, at: 2.8, text: '✓ ready in 2.1s',           cls: 'ok'  },
  ];
}
