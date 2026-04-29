import { Component, Injectable, Type, computed, effect, inject, input, model, signal } from '@angular/core';
import { ReactiveFormsModule, FormControl, Validators } from '@angular/forms';

// Import all @kouji-ui/core directives that can appear in @doc-file examples
import {
  KjButtonDirective,
  KjInputDirective,
  KjCheckboxDirective,
  KjRadioGroupDirective, KjRadioDirective,
  KjToggleDirective,
  KjTabsDirective, KjTabListDirective, KjTabDirective, KjTabPanelDirective,
  KjBadgeDirective,
  KjAvatarDirective, KjAvatarImageDirective, KjAvatarFallbackDirective,
  KjDialogDirective, KjDialogTriggerDirective, KjDialogContentDirective,
  KjTooltipDirective, KjTooltipTriggerDirective, KjTooltipContentDirective,
  KjPopoverDirective, KjPopoverTriggerDirective, KjPopoverContentDirective,
  KjMenuDirective, KjMenuTriggerDirective, KjMenuItemDirective,
  KjToastDirective,
  KjAccordionDirective, KjAccordionItemDirective, KjAccordionTriggerDirective, KjAccordionContentDirective,
  KjSelectDirective, KjSelectTriggerDirective, KjSelectContentDirective, KjOptionDirective,
  KjTableDirective, KjTableHeaderDirective,
  KjFormFieldDirective, KjFormLabelDirective, KjFormErrorDirective,
} from '@kouji-ui/core';

/** Registry mapping import names to their resolved Angular class. */
const IMPORT_REGISTRY: Record<string, Type<unknown>> = {
  // @kouji-ui/core
  KjButtonDirective, KjInputDirective, KjCheckboxDirective,
  KjRadioGroupDirective, KjRadioDirective, KjToggleDirective,
  KjTabsDirective, KjTabListDirective, KjTabDirective, KjTabPanelDirective,
  KjBadgeDirective, KjAvatarDirective, KjAvatarImageDirective, KjAvatarFallbackDirective,
  KjDialogDirective, KjDialogTriggerDirective, KjDialogContentDirective,
  KjTooltipDirective, KjTooltipTriggerDirective, KjTooltipContentDirective,
  KjPopoverDirective, KjPopoverTriggerDirective, KjPopoverContentDirective,
  KjMenuDirective, KjMenuTriggerDirective, KjMenuItemDirective,
  KjToastDirective,
  KjAccordionDirective, KjAccordionItemDirective, KjAccordionTriggerDirective, KjAccordionContentDirective,
  KjSelectDirective, KjSelectTriggerDirective, KjSelectContentDirective, KjOptionDirective,
  KjTableDirective, KjTableHeaderDirective,
  KjFormFieldDirective, KjFormLabelDirective, KjFormErrorDirective,
  // Angular forms
  ReactiveFormsModule,
};

/** Angular APIs available inside dynamically evaluated class bodies. */
const DYNAMIC_APIS = { signal, computed, effect, inject, input, model, FormControl, Validators };

/**
 * Creates Angular components dynamically from @doc-file source code strings.
 * Parses template, styles, and imports; resolves import names to actual classes;
 * constructs a live Angular component — no physical demo files needed.
 */
@Injectable({ providedIn: 'root' })
export class DynamicComponentService {
  private readonly cache = new Map<string, Type<unknown>>();

  /**
   * Create an Angular component from a @doc-file code string.
   * Returns null if parsing fails (e.g. unsupported syntax).
   */
  create(source: string): Type<unknown> | null {
    if (this.cache.has(source)) return this.cache.get(source)!;

    try {
      const parsed = this.parse(source);
      if (!parsed.template) return null;

      const imports = parsed.importNames
        .map(name => IMPORT_REGISTRY[name])
        .filter((c): c is Type<unknown> => !!c);

      const ClassDef = this.buildClass(parsed.classBody);

      const DynComponent = Component({
        standalone: true,
        imports,
        template: parsed.template,
        styles: parsed.styles,
      })(ClassDef);

      this.cache.set(source, DynComponent);
      return DynComponent;
    } catch {
      return null;
    }
  }

  private parse(source: string) {
    // Template: extract the backtick content after `template:`
    // Use a state machine to handle nested backticks in the template content
    const template = this.extractBacktickValue(source, 'template');

    // Styles: extract each backtick string from `styles: [...]`
    const styles: string[] = [];
    const stylesBlockMatch = source.match(/styles:\s*\[([^\]]*(?:`[\s\S]*?`[^\]]*)*)\]/);
    if (stylesBlockMatch) {
      const re = /`([\s\S]*?)`/g;
      for (const m of stylesBlockMatch[1].matchAll(re)) {
        styles.push(m[1]);
      }
    }

    // Imports: names inside `imports: [...]`
    const importsMatch = source.match(/imports:\s*\[([^\]]+)\]/);
    const importNames = (importsMatch?.[1] ?? '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    // Class body: content between the last `{` and last `}` of the class declaration
    const classMatch = source.match(/export class \w+(?:\s+extends\s+\w+)?\s*\{([\s\S]*)\}\s*$/);
    const classBody = classMatch?.[1]?.trim() ?? '';

    return { template, styles, importNames, classBody };
  }

  /**
   * Extract the backtick-quoted value for a specific property name.
   * Handles nested backticks inside template literals (e.g. styles inside template).
   */
  private extractBacktickValue(source: string, prop: string): string {
    const propIndex = source.indexOf(`${prop}:`);
    if (propIndex === -1) return '';

    const afterProp = source.slice(propIndex + prop.length + 1).trimStart();
    if (!afterProp.startsWith('`')) return '';

    let depth = 0;
    let start = -1;
    let end = -1;

    for (let i = 0; i < afterProp.length; i++) {
      if (afterProp[i] === '`') {
        if (start === -1) { start = i + 1; depth = 1; }
        else { depth--; if (depth === 0) { end = i; break; } }
      } else if (afterProp[i] === '$' && afterProp[i + 1] === '{') {
        depth++;
      } else if (afterProp[i] === '}' && depth > 1) {
        depth--;
      }
    }

    return end !== -1 ? afterProp.slice(start, end) : '';
  }

  /**
   * Build an Angular class from the class body string.
   * For empty bodies, returns a plain class. For state-ful bodies (signals etc.),
   * uses Function constructor with Angular APIs pre-injected.
   */
  private buildClass(classBody: string): new () => unknown {
    if (!classBody.trim()) {
      return class {};
    }

    // Convert TypeScript class property declarations to constructor assignments
    // e.g. `terms = signal(false);` → `this.terms = signal(false);`
    const constructorBody = classBody
      .split('\n')
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('//'))
      .map(l => l.startsWith('readonly ') ? l.replace('readonly ', '') : l)
      .map(l => l.match(/^\w/) ? `this.${l}` : l)
      .join('\n');

    try {
      const { signal: s, computed: c, effect: e, inject: inj, input: inp, model: m, FormControl: FC, Validators: V } = DYNAMIC_APIS;
      // eslint-disable-next-line no-new-func
      const factory = new Function('signal', 'computed', 'effect', 'inject', 'input', 'model', 'FormControl', 'Validators',
        `return class { constructor() { ${constructorBody} } }`
      );
      return factory(s, c, e, inj, inp, m, FC, V);
    } catch {
      return class {};
    }
  }
}
