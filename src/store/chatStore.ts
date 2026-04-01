import { create } from 'zustand';
import { api } from '@/utils/api';

export interface ChatMessage {
  id: string | number;
  message: {
    content: string;
    reasoning_content: string | '';
  };
  sender: string;
  time: number;
  imageUrl?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt?: number;
}

interface ChatStore {
  // State
  sessions: ChatSession[];
  currentChatId: string | null;
  isLoading: boolean;

  // Sync actions
  setSessions: (updater: ChatSession[] | ((prev: ChatSession[]) => ChatSession[])) => void;
  setCurrentChatId: (id: string | null) => void;
  setIsLoading: (loading: boolean) => void;
  setChatMessages: (updater: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void;
  clearStore: () => void;

  // Async actions (App Logic)
  loadSessionDetails: (sessionId: string) => Promise<void>;
  loadSessions: () => Promise<void>;
  createNewChat: () => Promise<void>;
  switchChat: (id: string) => Promise<void>;
  deleteChat: (id: string) => Promise<void>;
  refreshMessages: () => Promise<void>;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  sessions: [],
  currentChatId: null,
  isLoading: true,

  setSessions: (updater) => set((state) => ({
    sessions: typeof updater === 'function' ? updater(state.sessions) : updater
  })),

  setCurrentChatId: (id) => set({ currentChatId: id }),

  setIsLoading: (loading) => set({ isLoading: loading }),

  clearStore: () => set({ sessions: [], currentChatId: null, isLoading: false }),

  setChatMessages: (updater) => set((state) => {
    const { sessions, currentChatId } = state;
    if (!currentChatId) return state;

    return {
      sessions: sessions.map(session => {
        if (session.id === currentChatId) {
          const updatedMessages = typeof updater === 'function'
            ? updater(session.messages)
            : updater;

          let newTitle = session.title;
          if (session.title === 'New Chat' && updatedMessages.length > 0) {
            const firstUserMsg = updatedMessages.find(m => m.sender === 'user');
            if (firstUserMsg && typeof firstUserMsg.message.content === 'string') {
              const content = firstUserMsg.message.content;
              newTitle = content.slice(0, 20) + (content.length > 20 ? '...' : '');
              api.updateSessionTitle(currentChatId, newTitle).catch((error: any) => {
                console.error('Failed to update session title:', error);
              });
            }
          }

          return { ...session, messages: updatedMessages, title: newTitle };
        }
        return session;
      })
    };
  }),

  loadSessionDetails: async (sessionId: string) => {
    try {
      const data = await api.getSession(sessionId);
      set((state) => ({
        sessions: state.sessions.map(s => s.id === sessionId ? data.session : s)
      }));
    } catch (error) {
      console.error('Failed to load session details:', error);
    }
  },

  loadSessions: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      get().clearStore();
      return;
    }

    try {
      set({ isLoading: true });
      const data = await api.getSessions();

      if (data.sessions.length > 0) {
        const formattedSessions: ChatSession[] = data.sessions.map((s: any) => ({
          id: s.id,
          title: s.title,
          messages: [], 
          createdAt: s.createdAt,
          updatedAt: s.updatedAt
        }));

        set({ sessions: formattedSessions });
        const firstSessionId = data.sessions[0].id;
        set({ currentChatId: firstSessionId });

        await get().loadSessionDetails(firstSessionId);
      } else {
        const createdData = await api.createSession();
        const newSession: ChatSession = {
          id: createdData.session.id,
          title: createdData.session.title,
          messages: [],
          createdAt: createdData.session.createdAt,
          updatedAt: createdData.session.updatedAt
        };
        set({ sessions: [newSession], currentChatId: newSession.id });
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
      set({ sessions: [], currentChatId: null });
    } finally {
      set({ isLoading: false });
    }
  },

  createNewChat: async () => {
    const { sessions, currentChatId } = get();
    const currentSession = sessions.find(s => s.id === currentChatId);
    if (currentSession && currentSession.messages.length === 0) {
      return;
    }

    try {
      const data = await api.createSession();
      const newSession: ChatSession = {
        id: data.session.id,
        title: data.session.title,
        messages: [],
        createdAt: data.session.createdAt,
        updatedAt: data.session.updatedAt
      };

      set((state) => ({
        sessions: [newSession, ...state.sessions],
        currentChatId: newSession.id
      }));
    } catch (error) {
      console.error('Failed to create new chat:', error);
      throw error;
    }
  },

  switchChat: async (id: string) => {
    set({ currentChatId: id });
    const session = get().sessions.find(s => s.id === id);
    if (session && session.messages.length === 0) {
      await get().loadSessionDetails(id);
    }
  },

  deleteChat: async (id: string) => {
    try {
      await api.deleteSession(id);
      
      const { sessions, currentChatId } = get();
      const newSessions = sessions.filter(s => s.id !== id);
      set({ sessions: newSessions });

      if (currentChatId === id) {
        if (newSessions.length > 0) {
          const firstSessionId = newSessions[0].id;
          set({ currentChatId: firstSessionId });
          if (newSessions[0].messages.length === 0) {
            await get().loadSessionDetails(firstSessionId);
          }
        } else {
          await get().createNewChat();
        }
      }
    } catch (error: any) {
      console.error('Failed to delete chat:', error);
      if (error.message?.includes('最后一个空会话')) {
        alert('无法删除最后一个空会话');
      }
      throw error;
    }
  },

  refreshMessages: async () => {
    const cid = get().currentChatId;
    if (cid) {
      await get().loadSessionDetails(cid);
    }
  }
}));
