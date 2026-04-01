import { useEffect } from 'react';
import { useChatStore } from '@/store/chatStore';
import type { ChatSession, ChatMessage } from '@/store/chatStore';

export type { ChatSession, ChatMessage as Message };

export function useChatSessions(user: { id: string } | null) {
  const store = useChatStore();

  const currentSession = store.sessions.find(s => s.id === store.currentChatId);
  const currentMessages = currentSession ? currentSession.messages : [];

  useEffect(() => {
    store.loadSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const deleteChatWrapper = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await store.deleteChat(id);
  };

  return {
    sessions: store.sessions,
    currentChatId: store.currentChatId,
    currentMessages,
    isLoading: store.isLoading,
    createNewChat: store.createNewChat,
    switchChat: store.switchChat,
    deleteChat: deleteChatWrapper,
    setChatMessages: store.setChatMessages,
    refreshMessages: store.refreshMessages
  };
}
