import { useState, useEffect } from 'react';

export interface Message {
  message: {
    content: string,
    reasoning_content: string | ''
  };
  sender: string;
  id: string;
  time: number;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
}

export function useChatSessions() {
  // 管理所有聊天会话的状态，初始化时从 localStorage 读取
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const saved = localStorage.getItem('chat_sessions');
    return saved ? JSON.parse(saved) : [];
  });

  // 管理当前选中的会话 ID，初始化时从 localStorage 读取
  const [currentChatId, setCurrentChatId] = useState<string>(() => {
    return localStorage.getItem('current_chat_id') || '';
  });

  // 获取当前选中的会话对象和消息列表
  const currentSession = sessions.find(s => s.id === currentChatId);
  const currentMessages = currentSession ? currentSession.messages : [];

  // 当 sessions 状态变化时，同步保存到 localStorage
  useEffect(() => {
    localStorage.setItem('chat_sessions', JSON.stringify(sessions));
  }, [sessions]);

  // 当 currentChatId 变化时，同步保存到 localStorage
  useEffect(() => {
    localStorage.setItem('current_chat_id', currentChatId);
  }, [currentChatId]);

  // 创建一个新的聊天会话
  const createNewChat = () => {
    // 如果当前会话为空，则不创建新会话，直接返回
    if (currentSession && currentSession.messages.length === 0) {
      return;
    }

    const newSession: ChatSession = {
      id: crypto.randomUUID(),
      title: 'New Chat',
      messages: [],
      createdAt: Date.now(),
    };

    // 将新会话添加到列表开头，并设置为当前会话
    setSessions(prev => [newSession, ...prev]);
    setCurrentChatId(newSession.id);
  };

  // 初始化逻辑：如果没有会话则创建一个新会话，或者如果没有选中会话但有会话列表，则选中第一个
  useEffect(() => {
    if (sessions.length === 0) {
      // 如果完全没有会话，创建一个新的
      const newSession: ChatSession = {
        id: crypto.randomUUID(),
        title: 'New Chat',
        messages: [],
        createdAt: Date.now(),
      };
      setSessions([newSession]);
      setCurrentChatId(newSession.id);
    } else if (!currentChatId && sessions.length > 0) {
      setCurrentChatId(sessions[0].id);
    }
  }, []); // Empty dependency array to run only once on mount

  // 切换当前会话
  const switchChat = (id: string) => {
    setCurrentChatId(id);
  };

  // 删除指定会话
  const deleteChat = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // 阻止事件冒泡，避免触发切换会话

    const delSessions = sessions.filter(s => s.id === id);
    const newSessions = sessions.filter(s => s.id !== id);

    if (newSessions.length === 0 && delSessions[0].title === 'New Chat') {
      return;
    }

    setSessions(newSessions);

    // 如果删除的是当前选中的会话，则需要重新选择一个会话,仅剩的新对话不能删除
    if (currentChatId === id) {
      if (newSessions.length > 0) {
        setCurrentChatId(newSessions[0].id);
      } else {
        // 如果所有会话都被删除，则创建一个新的空会话
        const newSession: ChatSession = {
          id: crypto.randomUUID(),
          title: 'New Chat',
          messages: [],
          createdAt: Date.now(),
        };
        setSessions([newSession]);
        setCurrentChatId(newSession.id);
      }
    }
  };

  // 更新当前会话的消息列表
  // 这是一个高阶函数，用于适配 ChatInput 组件的 setChatMessages 接口
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
            }
          }

          return { ...session, messages: updatedMessages, title: newTitle };
        }
        return session;
      });
    });
  };

  return {
    sessions,
    currentChatId,
    currentMessages,
    createNewChat,
    switchChat,
    deleteChat,
    setChatMessages
  };
}
