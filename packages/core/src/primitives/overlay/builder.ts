import { ApplicationRef, ComponentRef, EnvironmentInjector, Injectable, Injector, Type, createComponent, inject, runInInjectionContext } from '@angular/core';
import { KjOverlayController, type KjOverlayStrategies } from './controller';
import type { KjPanelRole } from './types';

export interface KjOverlayBuilderConfig extends KjOverlayStrategies {
  panelRole: KjPanelRole;
  closeOnEsc?: boolean;
  closeOnOutside?: boolean;
}

export interface KjAttachOptions<D = unknown> {
  data?: D;
  providers?: Array<{ provide: unknown; useValue?: unknown }>;
}

@Injectable({ providedIn: 'root' })
export class KjOverlayBuilder {
  private readonly appRef = inject(ApplicationRef);
  private readonly env    = inject(EnvironmentInjector);

  create(config: KjOverlayBuilderConfig): KjOverlayController {
    const injector = Injector.create({
      providers: [KjOverlayController],
      parent: this.env,
    });
    const ctrl = injector.get(KjOverlayController);
    ctrl.attachStrategies(config);
    return ctrl;
  }

  attachComponent<T>(
    controller: KjOverlayController,
    component: Type<T>,
    opts: KjAttachOptions = {},
  ): ComponentRef<T> {
    const container = controller['strategies']!.mount.resolveContainer();
    const injector = Injector.create({
      providers: opts.providers as never[] ?? [],
      parent: this.env,
    });
    const ref = createComponent(component, {
      environmentInjector: this.env,
      elementInjector: injector,
      hostElement: container,
    });
    this.appRef.attachView(ref.hostView);
    controller.bindPanel(ref.location.nativeElement);
    return ref;
  }
}
