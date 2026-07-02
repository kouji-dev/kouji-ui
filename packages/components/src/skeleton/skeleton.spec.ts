import { Component, ChangeDetectionStrategy } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, test, beforeEach } from 'vitest';
import type { KjSkeletonAnimation, KjSkeletonShape } from '@kouji-ui/core';
import { KjSkeletonComponent } from './skeleton';

@Component({
  standalone: true,
  imports: [KjSkeletonComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<kj-skeleton
    [kjSkeletonShape]="shape"
    [kjSkeletonAnimation]="animation"
    [kjWidth]="width"
    [kjHeight]="height"
    [kjLines]="lines"
  />`,
})
class HostComponent {
  shape: KjSkeletonShape = 'rectangle';
  animation: KjSkeletonAnimation = 'shimmer';
  width: string | undefined = undefined;
  height: string | undefined = undefined;
  lines = 3;
}

describe('KjSkeletonComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
  });

  test('renders the host with the .kj-skeleton class', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const host = fixture.nativeElement.querySelector('kj-skeleton');
    expect(host).not.toBeNull();
    expect(host!.classList.contains('kj-skeleton')).toBe(true);
  });

  test('composed directive sets aria-hidden="true" on the host', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const host = fixture.nativeElement.querySelector('kj-skeleton')!;
    expect(host.getAttribute('aria-hidden')).toBe('true');
  });

  test('reflects default shape "rectangle" via data-shape', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const host = fixture.nativeElement.querySelector('kj-skeleton')!;
    expect(host.getAttribute('data-shape')).toBe('rectangle');
  });

  test('reflects default animation "shimmer" via data-animation', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const host = fixture.nativeElement.querySelector('kj-skeleton')!;
    expect(host.getAttribute('data-animation')).toBe('shimmer');
  });

  test('forwards kjSkeletonShape to the composed directive (data-shape)', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.shape = 'circle';
    fixture.detectChanges();
    const host = fixture.nativeElement.querySelector('kj-skeleton')!;
    expect(host.getAttribute('data-shape')).toBe('circle');
  });

  test('forwards kjSkeletonAnimation to the composed directive (data-animation)', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.animation = 'pulse';
    fixture.detectChanges();
    const host = fixture.nativeElement.querySelector('kj-skeleton')!;
    expect(host.getAttribute('data-animation')).toBe('pulse');
  });

  test('applies kjWidth and kjHeight as inline styles on the host', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.width = '12rem';
    fixture.componentInstance.height = '2rem';
    fixture.detectChanges();
    const host = fixture.nativeElement.querySelector('kj-skeleton')! as HTMLElement;
    expect(host.style.width).toBe('12rem');
    expect(host.style.height).toBe('2rem');
  });

  test('text-block shape renders N child line skeletons (default 3)', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.shape = 'text-block';
    fixture.detectChanges();
    const host = fixture.nativeElement.querySelector('kj-skeleton')!;
    expect(host.getAttribute('data-shape')).toBe('text-block');
    const lines = host.querySelectorAll('.kj-skeleton--line');
    expect(lines.length).toBe(3);
  });

  test('text-block honours kjLines and renders the last line at 60% width', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.shape = 'text-block';
    fixture.componentInstance.lines = 4;
    fixture.detectChanges();
    const host = fixture.nativeElement.querySelector('kj-skeleton')!;
    const lines = host.querySelectorAll('.kj-skeleton--line') as NodeListOf<HTMLElement>;
    expect(lines.length).toBe(4);
    expect(lines[lines.length - 1].style.width).toBe('60%');
    expect(lines[0].style.width).toBe('100%');
  });

  test('text-block child lines reflect data-shape="text" via the composed directive', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.shape = 'text-block';
    fixture.detectChanges();
    const host = fixture.nativeElement.querySelector('kj-skeleton')!;
    const firstLine = host.querySelector('.kj-skeleton--line')!;
    expect(firstLine.getAttribute('data-shape')).toBe('text');
    expect(firstLine.getAttribute('aria-hidden')).toBe('true');
  });

  test('non-text-block shapes do not render line children', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.shape = 'rectangle';
    fixture.detectChanges();
    const host = fixture.nativeElement.querySelector('kj-skeleton')!;
    expect(host.querySelectorAll('.kj-skeleton--line').length).toBe(0);
  });
});
