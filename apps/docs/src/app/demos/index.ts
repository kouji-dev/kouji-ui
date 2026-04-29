import { DemoRegistryService } from './demo-registry';
import { APP_INITIALIZER, inject } from '@angular/core';

// Import all demos
import { ButtonDemoComponent } from './button/button.demo';
import { ButtonDemoRetroComponent } from './button/button.demo.retro';
import { ButtonDemoFinanceComponent } from './button/button.demo.finance';
import { InputDemoComponent } from './input/input.demo';
import { CheckboxDemoComponent } from './checkbox/checkbox.demo';
import { CheckboxDemoRetroComponent } from './checkbox/checkbox.demo.retro';
import { CheckboxDemoFinanceComponent } from './checkbox/checkbox.demo.finance';
import { TabsDemoComponent } from './tabs/tabs.demo';
import { BadgeDemoComponent } from './badge/badge.demo';
import { ToggleDemoComponent } from './toggle/toggle.demo';
import { AccordionDemoComponent } from './accordion/accordion.demo';
import { DialogDemoComponent } from './dialog/dialog.demo';
import { ToastDemoComponent } from './toast/toast.demo';
import { SelectDemoComponent } from './select/select.demo';

export function provideDemos() {
  return {
    provide: APP_INITIALIZER,
    useFactory: () => {
      const registry = inject(DemoRegistryService);
      return () => {
        registry.register('button',    { default: ButtonDemoComponent, retro: ButtonDemoRetroComponent, finance: ButtonDemoFinanceComponent });
        registry.register('input',     { default: InputDemoComponent });
        registry.register('checkbox',  { default: CheckboxDemoComponent, retro: CheckboxDemoRetroComponent, finance: CheckboxDemoFinanceComponent });
        registry.register('tabs',      { default: TabsDemoComponent });
        registry.register('badge',     { default: BadgeDemoComponent });
        registry.register('toggle',    { default: ToggleDemoComponent });
        registry.register('accordion', { default: AccordionDemoComponent });
        registry.register('dialog',    { default: DialogDemoComponent });
        registry.register('toast',     { default: ToastDemoComponent });
        registry.register('select',    { default: SelectDemoComponent });
      };
    },
    multi: true,
  };
}
