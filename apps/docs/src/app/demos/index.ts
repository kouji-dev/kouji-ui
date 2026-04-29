import { DemoRegistryService } from './demo-registry';
import { APP_INITIALIZER, inject } from '@angular/core';

// Import all demos
import { ButtonDemoComponent } from './button/button.demo';
import { InputDemoComponent } from './input/input.demo';
import { CheckboxDemoComponent } from './checkbox/checkbox.demo';
import { TabsDemoComponent } from './tabs/tabs.demo';
import { BadgeDemoComponent } from './badge/badge.demo';
import { ToggleDemoComponent } from './toggle/toggle.demo';

export function provideDemos() {
  return {
    provide: APP_INITIALIZER,
    useFactory: () => {
      const registry = inject(DemoRegistryService);
      return () => {
        registry.register('button', ButtonDemoComponent);
        registry.register('input', InputDemoComponent);
        registry.register('checkbox', CheckboxDemoComponent);
        registry.register('tabs', TabsDemoComponent);
        registry.register('badge', BadgeDemoComponent);
        registry.register('toggle', ToggleDemoComponent);
      };
    },
    multi: true,
  };
}
