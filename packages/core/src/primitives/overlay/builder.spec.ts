import { Component, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, it, expect } from 'vitest';
import { KjOverlayBuilder } from './builder';
import type { KjOverlayStrategies } from './controller';
import { bodyPortal } from './strategies/mount/body-portal';
import { viewportCentered } from './strategies/position/viewport-centered';
import { programmatic } from './strategies/trigger-event/programmatic';

function makeStrategies(): KjOverlayStrategies {
  return {
    mount: bodyPortal(),
    position: viewportCentered(),
    trigger: programmatic(),
  };
}

describe('KjOverlayBuilder', () => {
  it('create returns a controller with strategies attached', () => {
    const builder = TestBed.inject(KjOverlayBuilder);
    const ctrl = builder.create({ ...makeStrategies(), panelRole: 'dialog' });
    expect(ctrl.state()).toBe('closed');
  });

  it('attachComponent injects custom providers', () => {
    @Component({ standalone: true, template: '' })
    class Cmp {
      readonly value = inject('TOKEN' as never);
    }
    const builder = TestBed.inject(KjOverlayBuilder);
    const ctrl = builder.create({ ...makeStrategies(), panelRole: 'dialog' });
    const ref = builder.attachComponent(ctrl, Cmp, {
      providers: [{ provide: 'TOKEN' as never, useValue: 'hello' }],
    });
    expect((ref.instance as Cmp).value).toBe('hello');
    ref.destroy();
  });
});
