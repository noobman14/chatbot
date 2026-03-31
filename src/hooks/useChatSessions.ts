import { useState, useEffect } from 'react';
import { api } from '@/utils/api';

export interface Message {
  message: {
    content: string,
    reasoning_content: string | ''
  };
  sender: string;
  id: string;
  time: number;
  imageUrl?: string; // 用户上传的图片
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt?: number;
}

export function useChatSessions(user: { id: string } | null) {
  // 管理所有聊天会话的状态
  const [sessions, setSessions] = useState<ChatSession[]>([]);

  // 管理当前选中的会话 ID
  const [currentChatId, setCurrentChatId] = useState<string>('');

  // 加载状态
  const [isLoading, setIsLoading] = useState(true);

  // 获取当前选中的会话对象和消息列表
  const currentSession = sessions.find(s => s.id === currentChatId);
  const currentMessages = currentSession ? currentSession.messages : [];

  // 初始化：从后端加载会话列表，当用户变化时重新加载
  useEffect(() => {
    loadSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]); // 监听用户 ID 变化

  /**
   * 加载会话详情（包含消息列表）
   */
  const loadSessionDetails = async (sessionId: string) => {
    try {
      const data = await api.getSession(sessionId);
      setSessions(prev => prev.map(s =>
        s.id === sessionId ? data.session : s
      ));
    } catch (error) {
      console.error('Failed to load session details:', error);
    }
  };

  /**
   * 从后端加载会话列表
   */
  const loadSessions = async () => {
    // 检查是否有 token，没有 token 表示用户未登录
    const token = localStorage.getItem('token');
    if (!token) {
      setSessions([]);
      setCurrentChatId('');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const data = await api.getSessions();

      if (data.sessions.length > 0) {
        // 转换会话格式
        const formattedSessions: ChatSession[] = data.sessions.map(s => ({
          id: s.id,
          title: s.title,
          messages: [], // 消息列表按需加载
          createdAt: s.createdAt,
          updatedAt: s.updatedAt
        }));

        setSessions(formattedSessions);
        const firstSessionId = data.sessions[0].id;
        setCurrentChatId(firstSessionId);

        // 加载第一个会话的详情
        await loadSessionDetails(firstSessionId);
      } else {
        // 如果没有会话，自动创建一个默认会话
        const createdData = await api.createSession();
        const newSession: ChatSession = {
          id: createdData.session.id,
          title: createdData.session.title,
          messages: [],
          createdAt: createdData.session.createdAt,
          updatedAt: createdData.session.updatedAt
        };
        setSessions([newSession]);
        setCurrentChatId(newSession.id);
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
      // 出错时清空数据
      setSessions([]);
      setCurrentChatId('');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 创建一个新的聊天会话
   */
  const createNewChat = async () => {
    // 如果当前会话为空，则不创建新会话
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

      // 将新会话添加到列表开头，并设置为当前会话
      setSessions(prev => [newSession, ...prev]);
      setCurrentChatId(newSession.id);
    } catch (error) {
      console.error('Failed to create new chat:', error);
      throw error;
    }
  };

  /**
   * 切换当前会话
   */
  const switchChat = async (id: string) => {
    setCurrentChatId(id);

    // 如果该会话的消息还未加载，则加载
    const session = sessions.find(s => s.id === id);
    if (session && session.messages.length === 0) {
      await loadSessionDetails(id);
    }
  };

  /**
   * 删除指定会话
   */
  const deleteChat = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // 阻止事件冒泡

    try {
      await api.deleteSession(id);

      const newSessions = sessions.filter(s => s.id !== id);
      setSessions(newSessions);

      // 如果删除的是当前选中的会话，则需要重新选择一个会话
      if (currentChatId === id) {
        if (newSessions.length > 0) {
          const firstSessionId = newSessions[0].id;
          setCurrentChatId(firstSessionId);
          // 加载新选中会话的详情
          if (newSessions[0].messages.length === 0) {
            await loadSessionDetails(firstSessionId);
          }
        } else {
          // 所有会话都被删除，创建一个新会话
          await createNewChat();
        }
      }
    } catch (error: any) {
      console.error('Failed to delete chat:', error);
      // 如果是最后一个空会话，显示提示
      if (error.message?.includes('最后一个空会话')) {
        alert('无法删除最后一个空会话');
      }
      throw error;
    }
  };

  /**
   * 更新当前会话的消息列表
   */
  const setChatMessages = (newMessages: Message[] | ((prev: Message[]) => Message[])) => {
    setSessions(prevSessions => {
      return prevSessions.map(session => {
        if (session.id === currentChatId) {
          // 计算新的消息列表
          const updatedMessages = typeof newMessages === 'function'
            ? newMessages(session.messages)
            : newMessages;

          // 如果是"新对话"且有了第一条用户消息，则使用该消息的前20个字符作为标题
          let newTitle = session.title;
          if (session.title === 'New Chat' && updatedMessages.length > 0) {
            const firstUserMsg = updatedMessages.find(m => m.sender === 'user');
            if (firstUserMsg) {
              newTitle = firstUserMsg.message.content.slice(0, 20) + (firstUserMsg.message.content.length > 20 ? '...' : '');
              // 同步更新标题到后端
              api.updateSessionTitle(currentChatId, newTitle).catch((error: any) => {
                console.error('Failed to update session title:', error);
              });
            }
          }

          return { ...session, messages: updatedMessages, title: newTitle };
        }
        return session;
      });
    });
  };

  // 刷新当前会话消息（用于同步本地 ID 与服务器 ID）
  const refreshMessages = async () => {
    if (currentChatId) {
      await loadSessionDetails(currentChatId);
    }
  };

  return {
    sessions,
    currentChatId,
    currentMessages,
    isLoading,
    createNewChat,
    switchChat,
    deleteChat,
    setChatMessages,
    refreshMessages
  };
}
