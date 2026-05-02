import { render, fireEvent } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { KjToast, KjToastViewport, KjToastClose } from './toast';
import { KjToastService } from './toast.service';
import { Component, inject } from '@angular/core';

expect.extend(toHaveNoViolations);

describe('KjToast', () => {
  it('sets role=status by default', async () => {
    const { container } = await render(`<div kjToast>Saved</div>`, { imports: [KjToast] });
    expect(container.querySelector('[kjToast]')).toHaveAttribute('role', 'status');
  });

  it('sets role=alert for destructive', async () => {
    const { container } = await render(
      `<div kjToast [kjToastVariant]="'destructive'">Error</div>`,
      { imports: [KjToast] },
    );
    expect(container.querySelector('[kjToast]')).toHaveAttribute('role', 'alert');
  });

  it('sets data-variant attribute', async () => {
    const { container } = await render(
      `<div kjToast [kjToastVariant]="'success'">OK</div>`,
      { imports: [KjToast] },
    );
    expect(container.querySelector('[kjToast]')).toHaveAttribute('data-variant', 'success');
  });

  it('passes axe audit', async () => {
    const { container } = await render(`<div kjToast>Saved</div>`, { imports: [KjToast] });
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('KjToastViewport', () => {
  it('has aria-live=polite', async () => {
    const { container } = await render(`<div kjToastViewport></div>`, { imports: [KjToastViewport] });
    expect(container.querySelector('[kjToastViewport]')).toHaveAttribute('aria-live', 'polite');
  });

  it('has role=region', async () => {
    const { container } = await render(`<div kjToastViewport></div>`, { imports: [KjToastViewport] });
    expect(container.querySelector('[kjToastViewport]')).toHaveAttribute('role', 'region');
  });
});

describe('KjToastService', () => {
  it('show() adds a toast', async () => {
    const svc = new KjToastService();
    expect(svc.toasts().length).toBe(0);
    svc.show({ message: 'Hello', duration: 0 });
    expect(svc.toasts().length).toBe(1);
    expect(svc.toasts()[0].message).toBe('Hello');
  });

  it('dismiss() removes a toast', async () => {
    const svc = new KjToastService();
    const id = svc.show({ message: 'Test', duration: 0 });
    svc.dismiss(id);
    expect(svc.toasts().length).toBe(0);
  });

  it('success() sets variant=success', async () => {
    const svc = new KjToastService();
    svc.success('Done', { duration: 0 });
    expect(svc.toasts()[0].variant).toBe('success');
  });

  it('error() sets variant=destructive', async () => {
    const svc = new KjToastService();
    svc.error('Fail', { duration: 0 });
    expect(svc.toasts()[0].variant).toBe('destructive');
  });

  it('dismissAll() clears all toasts', async () => {
    const svc = new KjToastService();
    svc.show({ message: 'A', duration: 0 });
    svc.show({ message: 'B', duration: 0 });
    svc.dismissAll();
    expect(svc.toasts().length).toBe(0);
  });
});
