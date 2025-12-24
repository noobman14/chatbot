import './App.css'
import { ChatInput } from './components/ChatInput';
import ChatMessages from './components/ChatMessages';
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { LoginPage } from './components/LoginPage';
import { useChatSessions } from './hooks/useChatSessions';
import { useAuth } from './hooks/useAuth';
import { ThemeProvider } from './components/theme-provider';
import { Header } from './components/Header';
import { useTranslation } from 'react-i18next';
import { useState, useEffect, useCallback } from 'react';
import { ImageHistory, type ImageItem } from './components/ImageHistory';
import { api } from './utils/api';

export function App() {
  const { t } = useTranslation();

  // 先获取用户信息
  const { user, isLoading: authLoading, register, login, logout, updateUser } = useAuth();

  // 使用自定义 Hooks 管理状态，传递 user 参数以监听用户变化
  const {
    sessions,
    currentChatId,
    currentMessages,
    createNewChat,
    switchChat,
    deleteChat,
    setChatMessages
  } = useChatSessions(user);

  // 视图模式：'chat' 或 'images'
  const [viewMode, setViewMode] = useState<'chat' | 'images'>('chat');

  // 历史图片数据
  const [historyImages, setHistoryImages] = useState<ImageItem[]>([]);

  // 获取历史图片
  const fetchImages = useCallback(async () => {
    if (!user) return;
    try {
      const images = await api.getImages();
      setHistoryImages(images);
    } catch (error) {
      console.error('Failed to fetch images:', error);
    }
  }, [user]);

  // 用户登录后获取历史图片
  useEffect(() => {
    if (user) {
      fetchImages();
    } else {
      setHistoryImages([]);
    }
  }, [user, fetchImages]);

  // 当消息变化时刷新图片（可能有新图片生成）
  useEffect(() => {
    if (user && currentMessages.length > 0) {
      // 检查最后一条消息是否是图片（URL开头）
      const lastMessage = currentMessages[currentMessages.length - 1];
      if (lastMessage?.sender === 'robot' && lastMessage?.message?.content?.startsWith('http')) {
        fetchImages();
      }
    }
  }, [currentMessages, user, fetchImages]);

  // 查看所有图片
  const handleViewImages = () => {
    setViewMode('images');
  };

  // 返回聊天
  const handleBackToChat = () => {
    setViewMode('chat');
  };

  // 等待认证检查完成
  if (authLoading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center">
        <div className="text-lg">{t('common.loading')}</div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLogin={login} onRegister={register} />;
  }

  return (
    <ThemeProvider>
      <SidebarProvider className='h-screen'>
        <div className="flex min-h-screen w-full app-container">
          {/* 左侧侧边栏组件，传递会话列表和操作函数 */}
          <AppSidebar
            sessions={sessions}
            currentChatId={currentChatId}
            onNewChat={createNewChat}
            onSwitchChat={(id) => {
              switchChat(id);
              setViewMode('chat');
            }}
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
                <ChatMessages chatMessages={currentMessages} userAvatar={user.avatar} />
                {/* 输入框组件 */}
                <ChatInput
                  currentChatId={currentChatId}
                  chatMessages={currentMessages}
                  setChatMessages={setChatMessages}
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

