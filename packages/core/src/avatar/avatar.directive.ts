import { Directive, InjectionToken, inject, signal } from '@angular/core';

export interface KjAvatarContext { imageLoaded: ReturnType<typeof signal<boolean>>; }
export const KJ_AVATAR = new InjectionToken<KjAvatarContext>('KjAvatar');

/**
 * Container for avatar. Tracks image load state.
 * @example `<span kjAvatar><img kjAvatarImage src="..." alt="..." /><span kjAvatarFallback>JD</span></span>`
 * @category Foundation/Avatar
 */
@Directive({ selector: '[kjAvatar]', standalone: true, providers: [{ provide: KJ_AVATAR, useExisting: KjAvatarDirective }] })
export class KjAvatarDirective implements KjAvatarContext { readonly imageLoaded = signal(false); }

/**
 * Image element within a `[kjAvatar]` container.
 * @category Foundation/Avatar
 */
@Directive({ selector: '[kjAvatarImage]', standalone: true, host: { '(load)': 'ctx.imageLoaded.set(true)', '(error)': 'ctx.imageLoaded.set(false)', '[attr.data-loaded]': 'ctx.imageLoaded() ? "" : null' } })
export class KjAvatarImageDirective { readonly ctx = inject(KJ_AVATAR); }

/**
 * Fallback shown when image is unavailable.
 * @category Foundation/Avatar
 */
@Directive({ selector: '[kjAvatarFallback]', standalone: true, host: { '[attr.data-visible]': '!ctx.imageLoaded() ? "" : null' } })
export class KjAvatarFallbackDirective { readonly ctx = inject(KJ_AVATAR); }
