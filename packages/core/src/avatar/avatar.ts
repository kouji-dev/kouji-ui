import { Directive, InjectionToken, inject, signal } from '@angular/core';

export interface KjAvatarContext { imageLoaded: ReturnType<typeof signal<boolean>>; }
export const KJ_AVATAR = new InjectionToken<KjAvatarContext>('KjAvatar');

/**
 * Container for avatar. Tracks image load state.
 *
 * Compose `[kjAvatar]` with `[kjAvatarImage]` and `[kjAvatarFallback]` onto any
 * elements to toggle visibility between the image and the fallback
 * automatically when the image fails or is still loading. No styling attached.
 *
 * @example `<span kjAvatar><img kjAvatarImage src="..." alt="..." /><span kjAvatarFallback>JD</span></span>`
 * @doc-category Core/Data display
 * @doc
 * @doc-name avatar
 * @doc-description Unstyled avatar container that swaps between an image and a fallback when loading or failing.
 * @doc-is-main
 */
@Directive({ selector: '[kjAvatar]', standalone: true, providers: [{ provide: KJ_AVATAR, useExisting: KjAvatar }] })
export class KjAvatar implements KjAvatarContext { readonly imageLoaded = signal(false); }

/**
 * Image element within a `[kjAvatar]` container.
 * @doc-category Core/Data display
 * @doc
 * @doc-name avatar
 */
@Directive({ selector: '[kjAvatarImage]', standalone: true, host: { '(load)': 'ctx.imageLoaded.set(true)', '(error)': 'ctx.imageLoaded.set(false)', '[attr.data-loaded]': 'ctx.imageLoaded() ? "" : null' } })
export class KjAvatarImage { readonly ctx = inject(KJ_AVATAR); }

/**
 * Fallback shown when image is unavailable.
 * @doc-category Core/Data display
 * @doc
 * @doc-name avatar
 */
@Directive({ selector: '[kjAvatarFallback]', standalone: true, host: { '[attr.data-visible]': '!ctx.imageLoaded() ? "" : null' } })
export class KjAvatarFallback { readonly ctx = inject(KJ_AVATAR); }
