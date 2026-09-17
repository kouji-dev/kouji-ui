// Public API for @kouji-ui/components
export { KJ_COMPONENTS_VERSION } from './version';

export * from './accordion/index';
export * from './action-sheet/index';
export * from './alert/index';
export * from './avatar/index';
export * from './badge/index';
export * from './breadcrumb/index';
export * from './button/index';
export * from './button-group/index';
export * from './calendar/index';
export * from './card/index';
export * from './carousel/index';
export * from './chart/index';
export * from './chat/index';
export * from './checkbox/index';
export * from './color-picker/index';
export * from './combobox/index';
export * from './confirm-popup/index';
export * from './date-picker/index';
export * from './date-range-presets/index';
export * from './datetime-picker/index';
export * from './dialog/index';
export * from './direction-toggle/index';
export * from './drawer/index';
export * from './dropdown-menu/index';
export * from './editor/index';
export * from './empty-state/index';
export * from './field/index';
export * from './file-upload/index';
export * from './form/index';
export * from './icon/index';
export * from './input/index';
export * from './input-group/index';
export * from './input-mask/index';
export * from './input-otp/index';
export * from './kbd/index';
export * from './divider/index';
export * from './link/index';
export * from './list/index';
export * from './menubar/index';
export * from './number-input/index';
export * from './overlay-badge/index';
export * from './pagination/index';
export * from './password-input/index';
export * from './popover/index';
export * from './overflow/index';
export * from './progress-bar/index';
export * from './radio/index';
export * from './rich-text/index';
export * from './select/index';
export * from './sheet/index';
export * from './skeleton/index';
export * from './skip-link/index';
export * from './slider/index';
export * from './speed-dial/index';
export * from './spinner/index';
export * from './stepper/index';
export * from './table/index';
export * from './tabs/index';
export * from './tag/index';
export * from './textarea/index';
export * from './time-picker/index';
export * from './toast/index';
export * from './toggle/index';
export * from './tooltip/index';
export * from './cascade-select/index';
export * from './command-palette/index';
export * from './tree-select/index';
export * from './typography/index';

// Core directives/types surfaced through the components barrel so that public
// API referencing them (member types, host directives, input/output types)
// resolves for consumers importing from '@kouji-ui/components'. Without this,
// AOT template type-checking fails with NG3004 (as it did for KjOverlayPanel).
export {
  KjCarousel,
  KjCarouselSlide,
  KjCascadeSelectOption,
  KjChatAnnouncer,
  KjChatStore,
  KjColorPicker,
  KjCombobox,
  KjDatePicker,
  KjFileUpload,
  KjInput,
  KjLiveRegion,
  KjRichTextEditor,
  KjTabPanel,
  KjTable,
  KjTreeSelect,
} from '@kouji-ui/core';
export type {
  KjActiveOverlay,
  KjAlertMode,
  KjAvatarShape,
  KjBadgeVariant,
  KjButtonGroupOrientation,
  KjChatMessageData,
  KjDateRange,
  KjDateRangePreset,
  KjDividerAlign,
  KjDividerOrientation,
  KjEditorInstance,
  KjEditorLanguage,
  KjEditorLineNumbers,
  KjEditorWordWrap,
  KjFileRejection,
  KjHourCycle,
  KjListAs,
  KjListOrientation,
  KjNumberFilterType,
  KjPasswordAutocomplete,
  KjPasswordScore,
  KjResourceResult,
  KjRichTextFeature,
  KjRteToolbarItem,
  KjSkeletonAnimation,
  KjSkeletonShape,
  KjSlashCommand,
  KjSpinnerAnimation,
  KjStorageAdapter,
  KjTableState,
  KjTextareaAutoresize,
  KjTextareaResize,
  KjToastVariant,
  KjTreeNode,
  KjUploadableFile,
} from '@kouji-ui/core';

// Configuration surface re-exported from @kouji-ui/core so that a consumer who
// installed only @kouji-ui/components can configure the components they just
// imported — without adding a second package to their import list. Every
// `provideKj*` plus its `KJ_*_CONFIG` token and `KJ_*_DEFAULTS` value is
// listed; `provideKjX(…)` deep-merges over `KJ_X_DEFAULTS` (see
// `mergeKjConfig`), and arrays replace, so spread the defaults to extend one.
export {
  // Preset-driven components
  provideKjAlert,
  provideKjBadge,
  provideKjBreadcrumb,
  provideKjButton,
  provideKjChatBubble,
  provideKjLink,
  provideKjPagination,
  provideKjProgressBar,
  provideKjSpinner,
  provideKjTabs,
  provideKjTag,
  provideKjTextarea,
  // Feature-level configuration
  provideKjChat,
  provideKjDirectionality,
  provideKjDocumentDirection,
  provideKjMotion,
  provideKjFilterParams,
  provideKjInputMaskTokens,
  provideKjLocale,
  provideKjRichText,
  provideKjTableStorage,
  provideKjTableStorageKeyPrefix,
  provideKjToastListStrategy,
  provideKjToastSonnerStrategy,
  provideKjToastStrategy,
  provideKjTranslations,
  // Config tokens
  KJ_ALERT_CONFIG,
  KJ_BADGE_CONFIG,
  KJ_BREADCRUMB_CONFIG,
  KJ_BUTTON_CONFIG,
  KJ_CHAT_BUBBLE_CONFIG,
  KJ_CHAT_CONFIG,
  KJ_LINK_CONFIG,
  KJ_LOCALE_CONFIG,
  KJ_MOTION_CONFIG,
  KJ_PAGINATION_CONFIG,
  KJ_PROGRESS_BAR_CONFIG,
  KJ_SPINNER_CONFIG,
  KJ_TABS_CONFIG,
  KJ_TAG_CONFIG,
  KJ_TEXTAREA_CONFIG,
  // Shipped defaults — spread to extend an array preset
  KJ_ALERT_DEFAULTS,
  KJ_BADGE_DEFAULTS,
  KJ_BREADCRUMB_DEFAULTS,
  KJ_BUTTON_DEFAULTS,
  KJ_CHAT_BUBBLE_DEFAULTS,
  KJ_LINK_DEFAULTS,
  KJ_MOTION_DEFAULTS,
  KJ_PAGINATION_DEFAULTS,
  KJ_PROGRESS_BAR_DEFAULTS,
  KJ_SPINNER_DEFAULTS,
  KJ_TABS_DEFAULTS,
  KJ_TAG_DEFAULTS,
  KJ_TEXTAREA_DEFAULTS,
  // Build-your-own: the preset mechanism the shipped components use
  KjVariant,
  KjSize,
  KJ_VARIANT_PRESET,
  KJ_SIZE_PRESET,
  KJ_VARIANT_FALLBACK,
  KJ_SIZE_FALLBACK,
  bindPresets,
  mergeKjConfig,
  // i18n: the single source of truth for every visible / assistive string
  EN_CATALOG,
  FR_CATALOG,
  KjTranslateService,
} from '@kouji-ui/core';
export type {
  KjAlertConfig,
  KjBadgeConfig,
  KjBindablePresetConfig,
  KjBreadcrumbConfig,
  KjButtonConfig,
  KjDeepPartial,
  KjExtensible,
  KjLinkConfig,
  KjLocaleConfig,
  KjMotionConfig,
  KjPaginationConfig,
  KjProgressBarConfig,
  KjSizePreset,
  KjSpinnerConfig,
  KjTabsConfig,
  KjTagConfig,
  KjTextareaConfig,
  KjTranslationCatalog,
  KjTranslationCatalogs,
  KjTranslationKey,
  KjTranslationParams,
  KjVariantPreset,
} from '@kouji-ui/core';
