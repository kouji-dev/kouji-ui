export {
  KjChatAvatarComponent,
  KjChatBubbleComponent,
  KjChatComponent,
  KjChatFooterComponent,
  KjChatHeaderComponent,
  KjChatLogComponent,
  type KjChatBubbleSize,
  type KjChatBubbleVariant,
  type KjChatRole,
  type KjChatSide,
  type KjChatState,
} from './chat';

// AI / LLM streaming components (additive — coexist with the chat-bubble kit).
export { KjChatThread } from './chat-thread';
export { KjChatMessage } from './chat-message';
export { KjPromptInput } from './prompt-input';
export { renderMarkdown, type KjMdBlock } from './markdown';
