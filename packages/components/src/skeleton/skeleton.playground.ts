import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { KjSkeletonComponent } from './skeleton';
import type { PlaygroundFile } from '@kouji-ui/components/playground-types';

type KjSkeletonShape = 'rectangle' | 'circle' | 'text' | 'text-block';
type KjSkeletonAnimation = 'shimmer' | 'pulse' | 'none';

const shape = signal<KjSkeletonShape>('rectangle');
const animation = signal<KjSkeletonAnimation>('shimmer');
const width = signal<string>('12rem');
const height = signal<string>('3rem');
const lines = signal<number>(3);

@Component({
  selector: 'kj-skeleton-playground',
  standalone: true,
  imports: [KjSkeletonComponent],
  template: `
    <kj-skeleton
      [kjSkeletonShape]="shape()"
      [kjSkeletonAnimation]="animation()"
      [kjWidth]="width()"
      [kjHeight]="height()"
      [kjLines]="lines()"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjSkeletonPlaygroundDemo {
  protected readonly shape = shape;
  protected readonly animation = animation;
  protected readonly width = width;
  protected readonly height = height;
  protected readonly lines = lines;
}

export const PLAYGROUND: PlaygroundFile = {
  component: KjSkeletonPlaygroundDemo,
  state: {
    shape: shape as unknown as ReturnType<typeof signal>,
    animation: animation as unknown as ReturnType<typeof signal>,
    width: width as unknown as ReturnType<typeof signal>,
    height: height as unknown as ReturnType<typeof signal>,
    lines: lines as unknown as ReturnType<typeof signal>,
  },
  controls: [
    {
      kind: 'chips',
      name: 'shape',
      label: 'shape',
      options: ['rectangle', 'circle', 'text', 'text-block'],
    },
    {
      kind: 'chips',
      name: 'animation',
      label: 'animation',
      options: ['shimmer', 'pulse', 'none'],
    },
    { kind: 'text', name: 'width', label: 'width' },
    { kind: 'text', name: 'height', label: 'height' },
    { kind: 'number', name: 'lines', label: 'lines (text-block)', min: 1, max: 10 },
  ],
  snippet: (values) => {
    const s = values as {
      shape: string;
      animation: string;
      width: string;
      height: string;
      lines: number;
    };
    const attrs: string[] = [
      `kjSkeletonShape="${s.shape}"`,
      `kjSkeletonAnimation="${s.animation}"`,
    ];
    if (s.width) attrs.push(`kjWidth="${s.width}"`);
    if (s.height) attrs.push(`kjHeight="${s.height}"`);
    if (s.shape === 'text-block') attrs.push(`[kjLines]="${s.lines}"`);
    return `<kj-skeleton\n  ${attrs.join('\n  ')}\n/>`;
  },
};
