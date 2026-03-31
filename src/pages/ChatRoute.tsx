/**
 * 聊天主页面 - 受保护路由
 * 
 * 路由 / 下的用户聊天应用
 * 未登录用户自动重定向到 /login
 * 包含侧边栏、聊天消息、历史图片切换等功能
 */

import { Navigate } from 'react-router-dom';
import { ChatInput } from '@/components/chat/ChatInput';
import ChatMessages from '@/components/chat/ChatMessages';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { useChatSessions } from '@/hooks/useChatSessions';
import { useAuth } from '@/hooks/useAuth';
import { ThemeProvider } from '@/components/theme-provider';
import { Header } from '@/components/layout/Header';
import { useState, useMemo, useEffect } from 'react';
import { getHiddenMessagesForSession } from '@/utils/hiddenMessages';
import { ImageHistory, type ImageItem } from '@/components/history/ImageHistory';
import { api } from '@/utils/api';

export default function ChatRoute() {
  const { user, isLoading: authLoading, logout, updateUser } = useAuth();

  // 使用自定义 Hooks 管理聊天会话状态
  const {
    sessions,
    currentChatId,
    currentMessages,
    createNewChat,
    switchChat,
    deleteChat,
    setChatMessages,
    refreshMessages
  } = useChatSessions(user);

  // 编辑状态：存储正在编辑的消息 ID 和内容
  const [editingMessage, setEditingMessage] = useState<{ id: string | number; content: string } | null>(null);

  // 过滤掉隐藏的消息
  const visibleMessages = useMemo(() => {
    if (!currentChatId) return currentMessages;
    const hiddenIds = getHiddenMessagesForSession(currentChatId);
    return currentMessages.filter(msg => !hiddenIds.includes(msg.id.toString()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMessages, currentChatId]);

  // 历史图片状态和视图模式
  const [historyImages, setHistoryImages] = useState<ImageItem[]>([]);
  const [viewMode, setViewMode] = useState<'chat' | 'history'>('chat');

  // 加载历史图片
  const loadHistoryImages = async () => {
    try {
      const images = await api.getHistoryImages();
      setHistoryImages(images);
    } catch (error) {
      console.error('Failed to load history images:', error);
    }
  };

  // 用户登录后自动加载历史图片
  useEffect(() => {
    if (user) {
      loadHistoryImages();
    }
  }, [user]);

  // 切换到历史图片视图
  const handleViewImages = () => {
    loadHistoryImages();
    setViewMode('history');
  };

  // 返回聊天视图
  const handleBackToChat = () => {
    setViewMode('chat');
  };

  // 等待认证检查完成
  if (authLoading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // 未登录用户重定向到 /login 路由
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <ThemeProvider>
      <SidebarProvider className='h-screen'>
        <div className="flex min-h-screen w-full app-container">
          {/* 左侧侧边栏 */}
          <AppSidebar
            sessions={sessions}
            currentChatId={currentChatId}
            onNewChat={createNewChat}
            onSwitchChat={switchChat}
            onDeleteChat={deleteChat}
            user={user}
            onLogout={logout}
            onUserUpdate={updateUser}
            historyImages={historyImages.slice(0, 3)}
            onViewImages={handleViewImages}
          />

          {/* 主内容区域 */}
          <main className="content-area">
            <Header />
            {viewMode === 'chat' ? (
              <>
                {/* 消息展示组件 */}
                <ChatMessages
                  chatMessages={visibleMessages}
                  userAvatar={user.avatar}
                  onStartEdit={(id: string | number, content: string) => {
                    setEditingMessage({ id, content });
                  }}
                />
                {/* 输入框组件 */}
                <ChatInput
                  currentChatId={currentChatId}
                  chatMessages={currentMessages}
                  setChatMessages={setChatMessages}
                  editingMessage={editingMessage}
                  onCancelEdit={() => setEditingMessage(null)}
                  refreshMessages={refreshMessages}
                />
              </>
            ) : (
              /* 历史图片组件 */
              <ImageHistory
                images={historyImages}
                onBack={handleBackToChat}
              />
            )}
          </main>
        </div>
      </SidebarProvider>
    </ThemeProvider>
  );
}
