export { KjChatLog } from './chat-log';
export { KjChat } from './chat';
export { KjChatAvatar } from './chat-avatar';
export { KjChatHeader } from './chat-header';
export { KjChatBubble } from './chat-bubble';
export { KjChatFooter } from './chat-footer';
export {
  KJ_CHAT,
  KJ_CHAT_LOG,
  type KjChatContext,
  type KjChatLogContext,
  type KjChatRole,
  type KjChatSide,
  type KjChatState,
} from './chat.context';
export {
  KJ_CHAT_BUBBLE_CONFIG,
  KJ_CHAT_BUBBLE_DEFAULTS,
  provideKjChatBubble,
  type KjChatBubbleConfig,
} from './config';

// AI / LLM streaming layer (additive — coexists with the chat-bubble kit above).
export {
  KjChatStore,
  nextChatMessageId,
  type KjChatMessageData,
  type KjChatMessageRole,
  type KjChatStatus,
  type KjChatCitation,
  type KjChatToolCall,
  type KjChatToolStatus,
} from './chat-stream';
export {
  KjChatAnnouncer,
  coalesceAnnouncement,
  type KjCoalesceOptions,
  type KjCoalesceResult,
} from './chat-announcer';
export {
  parseSlash,
  matchSlashCommands,
  type KjSlashCommand,
  type KjSlashParse,
} from './chat-slash';
