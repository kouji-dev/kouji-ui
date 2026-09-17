import { Component, ElementRef, PLATFORM_ID, inject, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { render } from '@testing-library/angular';
import { KjDirectionality, provideKjDirectionality } from './directionality';

/**
 * Helpers — flush microtasks + the rAF that backs afterNextRender so the
 * service has a chance to run its initial read and attach the observer.
 */
async function flushAfterNextRender(): Promise<void> {
  // Allow any queued afterNextRender callbacks to run, then flush
  // microtasks twice (Angular batches signal updates).
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  await Promise.resolve();
  await Promise.resolve();
}

function setHtmlDir(value: string | null): void {
  if (value === null) {
    document.documentElement.removeAttribute('dir');
  } else {
    document.documentElement.setAttribute('dir', value);
  }
}

describe('KjDirectionality', () => {
  afterEach(() => {
    setHtmlDir(null);
    document.body.removeAttribute('dir');
  });

  it('reads "ltr" initially when <html dir="ltr">', async () => {
    setHtmlDir('ltr');

    @Component({ standalone: true, template: '' })
    class Host {
      readonly dir = inject(KjDirectionality);
    }
    const { fixture } = await render(Host);
    await flushAfterNextRender();

    expect(fixture.componentInstance.dir.current()).toBe('ltr');
  });

  it('reads "rtl" initially when <html dir="rtl">', async () => {
    setHtmlDir('rtl');

    @Component({ standalone: true, template: '' })
    class Host {
      readonly dir = inject(KjDirectionality);
    }
    const { fixture } = await render(Host);
    await flushAfterNextRender();

    expect(fixture.componentInstance.dir.current()).toBe('rtl');
  });

  it('defaults to "ltr" when no dir attribute is set on <html> or <body>', async () => {
    setHtmlDir(null);
    document.body.removeAttribute('dir');

    @Component({ standalone: true, template: '' })
    class Host {
      readonly dir = inject(KjDirectionality);
    }
    const { fixture } = await render(Host);
    await flushAfterNextRender();

    expect(fixture.componentInstance.dir.current()).toBe('ltr');
  });

  it('updates the signal when <html dir> changes via MutationObserver', async () => {
    setHtmlDir('ltr');

    @Component({ standalone: true, template: '' })
    class Host {
      readonly dir = inject(KjDirectionality);
    }
    const { fixture } = await render(Host);
    await flushAfterNextRender();

    const svc = fixture.componentInstance.dir;
    expect(svc.current()).toBe('ltr');

    setHtmlDir('rtl');
    // Allow MutationObserver microtask to deliver and the signal to update.
    await flushAfterNextRender();

    expect(svc.current()).toBe('rtl');

    setHtmlDir('ltr');
    await flushAfterNextRender();

    expect(svc.current()).toBe('ltr');
  });

  it('returns "ltr" on the server (PLATFORM_ID="server") without DOM access', () => {
    // Spy proves the SSR path never touches documentElement.getAttribute.
    const getAttrSpy = vi.spyOn(document.documentElement, 'getAttribute');

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
    });

    const svc = TestBed.inject(KjDirectionality);
    expect(svc.current()).toBe('ltr');
    expect(getAttrSpy).not.toHaveBeenCalled();

    getAttrSpy.mockRestore();
  });
});

describe('KjDirectionality — sub-tree scope (cust F-15)', () => {
  afterEach(() => {
    setHtmlDir(null);
    document.body.removeAttribute('dir');
  });

  it('a component-provided instance reads its nearest [dir] ancestor, not <html>', async () => {
    setHtmlDir('ltr');

    @Component({
      selector: 'kj-scoped-widget',
      standalone: true,
      template: '',
      providers: [...provideKjDirectionality()],
    })
    class ScopedWidget {
      readonly dir = inject(KjDirectionality);
    }

    @Component({
      standalone: true,
      imports: [ScopedWidget],
      template: `<section dir="rtl"><kj-scoped-widget /></section>`,
    })
    class Host {
      readonly widget = viewChild.required(ScopedWidget);
    }

    const { fixture } = await render(Host);
    await flushAfterNextRender();

    expect(fixture.componentInstance.widget().dir.isScoped).toBe(true);
    expect(fixture.componentInstance.widget().dir.current()).toBe('rtl');
    // The document-level singleton still answers for the page as a whole.
    expect(TestBed.inject(KjDirectionality).current()).toBe('ltr');
  });

  it('falls back to the document read when no ancestor carries [dir]', async () => {
    setHtmlDir('rtl');

    @Component({
      selector: 'kj-scoped-widget-2',
      standalone: true,
      template: '',
      providers: [...provideKjDirectionality()],
    })
    class ScopedWidget {
      readonly dir = inject(KjDirectionality);
    }

    @Component({
      standalone: true,
      imports: [ScopedWidget],
      template: `<section><kj-scoped-widget-2 /></section>`,
    })
    class Host {
      readonly widget = viewChild.required(ScopedWidget);
    }

    const { fixture } = await render(Host);
    await flushAfterNextRender();

    expect(fixture.componentInstance.widget().dir.current()).toBe('rtl');
  });

  it('follows a runtime change on the scoping ancestor', async () => {
    setHtmlDir('ltr');

    @Component({
      selector: 'kj-scoped-widget-3',
      standalone: true,
      template: '',
      providers: [...provideKjDirectionality()],
    })
    class ScopedWidget {
      readonly dir = inject(KjDirectionality);
    }

    @Component({
      standalone: true,
      imports: [ScopedWidget],
      template: `<section #scope dir="ltr"><kj-scoped-widget-3 /></section>`,
    })
    class Host {
      readonly scope = viewChild.required<ElementRef<HTMLElement>>('scope');
      readonly widget = viewChild.required(ScopedWidget);
    }

    const { fixture } = await render(Host);
    await flushAfterNextRender();
    expect(fixture.componentInstance.widget().dir.current()).toBe('ltr');

    fixture.componentInstance.scope().nativeElement.setAttribute('dir', 'rtl');
    await flushAfterNextRender();

    expect(fixture.componentInstance.widget().dir.current()).toBe('rtl');
  });

  it('the root singleton stays document-scoped (isScoped === false)', () => {
    TestBed.resetTestingModule();
    expect(TestBed.inject(KjDirectionality).isScoped).toBe(false);
  });
});
